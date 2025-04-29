// This file is used to contain the internal state of the Worker's observability without requiring the user
// to include all the code in `./observability.ts` in their bundle.

import { env } from "cloudflare:workers";
import type { Agent } from "..";
import type { Message as ChatMessage } from "ai";
import type { Schedule } from "..";
/**
 * Symbol used to store observability state in a specific agent instance.
 */
export const observabilitySymbol = Symbol("cf-agents-observability");

/**
 * Events are both the things we consider logs and messages we send over the WebSocket,
 * if an event contains a `log: true` then we log it to the console and persist it to
 * SQL storage (up to 2k events) but we send to any WebSockets regardless.
 */
type ObservabilityEvent =
  | {
      type: "state-update";
      log: true;
      state: unknown;
    }
  | {
      type: "message";
      log: true;
      message: ChatMessage;
    }
  | { type: "schedule"; log: true; schedule: Schedule<unknown> }
  | { type: "schedule-ran"; log: true; schedule: Schedule<unknown> }
  | { type: "schedule-cancel"; log: true; scheduleId: string }
  | {
      type: "rpc";
      log: true;
      id: string;
      method: string;
      args: unknown[];
      streaming?: boolean;
    }
  | { type: "messages"; messages: ChatMessage[] }
  | {
      type: "initial";
      state: unknown;
      schedules: Schedule<unknown>[];
      messages: ChatMessage[] | null;
      events: PersistedEvent[];
    };

type LoggedOrNever<T> = T extends { log: true } ? T : never;
export type PersistedEvent = LoggedOrNever<ObservabilityEvent>;

export type ObservabilityState = {
  connections: Set<WebSocket>;
  msg(event: ObservabilityEvent): void;
};

export type ObservableOptions = {
  /**
   * If present, returns a list of the instances of the given Agent class so that the UI can auto-complete
   * the instance on the select Agent screen.
   *
   * @param {string} agentClass The name of the agent's class that we're interested in instances of.
   * @returns {string[]} a list of the named Agents for the given agent class.
   */
  fetchInstances?: (agentClass: string) => Promise<string[]>;
};

export type ObservableAgent = {
  name: string;
  // A list of all the instances of an agent in memory, this only really
  // works in local-dev since memory isn't persisted in typical production
  // deployments.
  memoryInstances: string[];
  options: ObservableOptions;
};

export function observabilityState<Env, State>(
  agent: Agent<Env, State>
): ObservabilityState | undefined {
  // @ts-ignore
  return agent[observabilitySymbol];
}

/**
 * the `@observable` decorator is ran, it will add the details any observable agents to this
 * map so that the internals of the agents sdk can determine if extra instrumentation is needed.
 */
export const observedAgents: Record<string, ObservableAgent> = {};

/**
 * The assets that are needed for the observability spa. By default this is empty,
 * but is populated when the @observable decorator is ran so we don't have to include
 * the SPA assets in the output bundle unless the decorator is used.
 */
export const observabilitySpaAssets = new Map<string, string>();

const OBSERVABILITY_SPA_PATTERN = new URLPattern({
  pathname: "/@obs/*",
});

export const OBSERVABILITY_INSTANCE_PATTERN = new URLPattern({
  pathname: "/@obs/agents/:name/:instance",
});

export async function maybeRouteObservability(
  request: Request
): Promise<Response | undefined> {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/@obs")) {
    return undefined;
  }

  if (url.pathname === "/@obs/agents") {
    const agents = await listAgentsAndInstances();
    return Response.json(agents);
  }

  const match = OBSERVABILITY_INSTANCE_PATTERN.exec(request.url);
  if (match) {
    const { name, instance } = match.pathname.groups;

    if (!(name in env)) {
      return new Response("Agent not found  ", {
        status: 404,
      });
    }

    const agent = env[name as keyof typeof env] as DurableObjectNamespace;
    const agentStub = agent.idFromName(instance);
    const agentInstance = agent.get(agentStub);

    if (!agentInstance) {
      return new Response("Agent not found", {
        status: 404,
      });
    }

    return agentInstance.fetch(request);
  }

  return maybeRouteObservabilitySpaAssets(request);
}

function maybeRouteObservabilitySpaAssets(
  request: Request
): Response | undefined {
  if (observabilitySpaAssets.size === 0) {
    return undefined;
  }

  const url = new URL(request.url);
  if (url.pathname === "/@obs") {
    const response = new Response(observabilitySpaAssets.get("index.html"), {
      headers: {
        "Content-Type": "text/html",
      },
    });

    return new HTMLRewriter()
      .on("script", {
        element(element) {
          const src = element.getAttribute("src");
          if (!src) {
            return;
          }
          element.setAttribute("src", `/@obs${src}`);
        },
      })
      .on("link", {
        element(element) {
          const href = element.getAttribute("href");
          if (!href) {
            return;
          }
          element.setAttribute("href", `/@obs${href}`);
        },
      })
      .transform(response);
  }

  const match = OBSERVABILITY_SPA_PATTERN.exec(request.url);
  const path = match?.pathname?.groups?.[0];
  if (!path || path === "index.html") {
    return undefined;
  }

  const asset = observabilitySpaAssets.get(path);
  if (!asset) {
    return undefined;
  }

  const contentType = path.endsWith(".js") ? "text/javascript" : "text/css";
  return new Response(asset, {
    headers: {
      "Content-Type": contentType,
    },
  });
}

async function listAgentsAndInstances() {
  const agents = [];

  for (const [name, agent] of Object.entries(observedAgents)) {
    const { fetchInstances } = agent.options;
    if (fetchInstances) {
      agents.push({ name, instances: await fetchInstances(name) });
    } else {
      agents.push({ name, instances: agent.memoryInstances });
    }
  }

  return agents;
}
