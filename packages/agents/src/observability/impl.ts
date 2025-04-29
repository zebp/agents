import type { Agent } from "../index.js";
import {
  observedAgents,
  observabilitySpaAssets,
  observabilitySymbol,
  observabilityState,
  OBSERVABILITY_INSTANCE_PATTERN,
  type ObservabilityState,
  type ObservableOptions,
} from "./internal.js";
import { AIChatAgent } from "../ai-chat-agent.js";

// The SPA for the web UI are bundled into a package with an map of
// asset file name to content.
import { assets } from "observability-spa";

// biome-ignore lint/suspicious/noExplicitAny: any is required for decorator
type AgentConstructor<Env, State> = new (...args: any[]) => Agent<Env, State>;

export function observable<T extends AgentConstructor<Env, State>, Env, State>(
  target: T,
  context: ClassDecoratorContext
): T;
export function observable<T extends AgentConstructor<Env, State>, Env, State>(
  options: ObservableOptions
): (target: T, context: ClassDecoratorContext) => T;
export function observable<T extends AgentConstructor<Env, State>, Env, State>(
  ...args: unknown[]
): T | ((target: T, context: ClassDecoratorContext) => T) {
  const typedArgs = args as [T, ClassDecoratorContext] | [ObservableOptions];

  if (typedArgs.length === 2) {
    return observableImpl(...typedArgs, undefined);
  }

  return (target: T, context: ClassDecoratorContext) =>
    observableImpl(target, context, typedArgs[0]);
}

function observableImpl<T extends AgentConstructor<Env, State>, Env, State>(
  target: T,
  { name }: ClassDecoratorContext,
  options: ObservableOptions = {}
): T {
  if (!name) {
    throw new Error("Observed agents must be named");
  }

  // Add our assets to the shared observability context.
  if (observabilitySpaAssets.size === 0) {
    for (const [path, asset] of assets.entries()) {
      observabilitySpaAssets.set(path, asset);
    }
  }

  observedAgents[name] = { name, memoryInstances: [], options };

  return class extends target {
    // biome-ignore lint/suspicious/noExplicitAny: required for type hackery
    constructor(...args: any[]) {
      super(...args);
      this.sql`CREATE TABLE IF NOT EXISTS cf_agents_events (
        id INTEGER PRIMARY KEY,
        type TEXT NOT NULL,
        event TEXT NOT NULL,
        created_at INTEGER NOT NULL
      )`;
    }

    onStart(): void | Promise<void> {
      this.#initializeObservability();
      super.onStart();
    }

    override async fetch(request: Request): Promise<Response> {
      const match = OBSERVABILITY_INSTANCE_PATTERN.exec(request.url);
      if (match) {
        const { instance } = match.pathname.groups;
        this.#initializeObservability(instance);

        const [client, server] = Object.values(new WebSocketPair());

        const state = observabilityState(this)!;
        state.connections.add(server);

        server.accept();
        server.onclose = () => state.connections.delete(server);

        server.onmessage = (event) => {
          const message: IncomingMessage = JSON.parse(event.data);
          if (message.type === "sql") {
            const id = Math.random().toString(36).substring(2, 15);
            try {
              const results = this.ctx.storage.sql
                .exec(message.query)
                .toArray();
              server.send(JSON.stringify({ type: "sql", id, results }));
            } catch (error) {
              server.send(
                JSON.stringify({
                  type: "sql",
                  id,
                  results: [
                    {
                      error:
                        error instanceof Error ? error.message : String(error),
                    },
                  ],
                })
              );
            }
          }
        };

        state.msg({
          type: "initial",
          state: this.state,
          schedules: this.getSchedules(),
          messages: this instanceof AIChatAgent ? this.messages : null,
          events: this.sql`select event from cf_agents_events`.map((it) =>
            JSON.parse(it.event as string)
          ),
        });

        return new Response(null, {
          status: 101,
          webSocket: client,
        });
      }

      return super.fetch(request);
    }

    #initializeObservability(instance?: string) {
      initializeObservability(this, name, instance);
    }
  };
}

function initializeObservability(
  agent: Agent<unknown, unknown>,
  className: string,
  instance?: string
) {
  // @ts-expect-error - We sneak this symbol into the Agent so we can check
  // if it's observable from within the sdk for instrumentation.
  if (agent[observabilitySymbol]) {
    return;
  }

  const instanceName = instance ?? agent.name;

  // @ts-expect-error - We sneak this symbol into the Agent so we can check
  // if it's observable from within the sdk for instrumentation.
  agent[observabilitySymbol] = {
    connections: new Set(),
    msg(event) {
      const timestamp = Date.now();
      let eventText = JSON.stringify({ ...event, timestamp });

      if ("log" in event && event.log) {
        console.log({
          ...event,
          $agent: {
            instance: instanceName,
            className,
          },
        });

        const { id } = agent.sql<{
          id: number;
        }>`insert into cf_agents_events (type, event, created_at) values (${event.type}, ${JSON.stringify({ ...event, timestamp })}, ${timestamp}) returning id`[0];
        agent.sql`DELETE FROM cf_agents_events WHERE id < ${id - 20000}`;

        eventText = JSON.stringify({ ...event, eventId: id, timestamp });
      }

      for (const connection of this.connections) {
        connection.send(eventText);
      }
    },
  } satisfies ObservabilityState;

  const observedAgent = observedAgents[className];
  if (!observedAgent) {
    throw new Error("Agent not found");
  }

  if (!observedAgent.memoryInstances.includes(instanceName)) {
    observedAgent.memoryInstances.push(instanceName);
  }
}

type IncomingMessage = { type: "sql"; query: string };
