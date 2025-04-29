// biome-ignore lint/style/useImportType: <explanation>
import React, {
  FormEventHandler,
  Suspense,
  use,
  useMemo,
  useRef,
  useState,
} from "react";
import Messages from "./sections/messages";
import State from "./sections/state";
import Schedules from "./sections/schedules";
import Events from "./sections/events";
import { getAgents, type Agent, useLiveAgentData } from "./agents";
import { Sql } from "./sections/sql";

export default function App() {
  const agentsPromise = useMemo(() => getAgents(), []);
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center h-screen max-h-screen bg-bg-primary dark:bg-dark-bg-primary text-primary dark:text-dark-primary">
          <div className="flex flex-col items-center justify-center gap-4">
            <h1 className="text-3xl text-secondary dark:text-dark-secondary">
              Loading...
            </h1>
            <div className="w-8 h-8 border-t-2 border-b-2 border-accent-primary rounded-full animate-spin" />
          </div>
        </div>
      }
    >
      <Main agentsPromise={agentsPromise} />
    </Suspense>
  );
}

function Main({ agentsPromise }: { agentsPromise: Promise<Agent[]> }) {
  const [selectedInstance, setSelectedInstance] = useState<{
    agent: string;
    instance: string;
  } | null>(null);

  return (
    <main className="overflow-hidden h-screen max-h-screen flex flex-col items-center justify-center bg-bg-primary dark:bg-dark-bg-primary">
      {selectedInstance ? (
        <AgentPanel
          name={selectedInstance.agent}
          instance={selectedInstance.instance}
          setSelectedInstance={setSelectedInstance}
        />
      ) : (
        <section className="bg-bg-primary dark:bg-dark-bg-primary flex flex-col items-center justify-center text-primary dark:text-dark-primary">
          <AgentSelector
            agentsPromise={agentsPromise}
            setSelectedInstance={setSelectedInstance}
          />
        </section>
      )}
    </main>
  );
}

function AgentSelector({
  agentsPromise,
  setSelectedInstance,
}: {
  agentsPromise: Promise<Agent[]>;
  setSelectedInstance: (_: { agent: string; instance: string }) => void;
}) {
  const agents = use(agentsPromise);
  const [search, setSearch] = useState("");
  const [agent, setAgent] = useState(agents[0].name);

  const submit: FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    setSelectedInstance({ agent, instance: search });
  };

  const searchedInstances = agents
    .flatMap((agent) =>
      agent.instances
        .filter(
          (instance) =>
            instance.toLowerCase().startsWith(search) && search.length > 0
        )
        .map((instance) => (
          <li
            className="w-64 rounded-md p-2 text-primary dark:text-dark-primary dark:hover:bg-dark-bg-tertiary cursor-pointer"
            onClick={() => setSelectedInstance({ agent: agent.name, instance })}
            key={`${agent.name}-${instance}`}
          >
            <span className="text-sm text-secondary dark:text-dark-secondary mr-3">
              {agent.name}
            </span>
            {instance}
          </li>
        ))
    )
    .slice(0, 5);

  return (
    <div className="flex flex-col items-center gap-5">
      <h2 className="text-xl font-bold">Select an Agent to get started</h2>
      <form className="flex flex-row gap-2" onSubmit={submit}>
        {agents.length > 1 && (
          <select
            value={agent}
            onChange={(e) => setAgent(e.target.value)}
            className="bg-bg-secondary dark:bg-dark-bg-secondary border border-border-primary dark:border-dark-border-primary rounded-md p-2 focus:ring-0 focus:outline-none after:hidden"
          >
            {agents.map((agent) => (
              <option key={agent.name}>{agent.name}</option>
            ))}
          </select>
        )}
        <input
          placeholder="Instance"
          className="bg-bg-secondary dark:bg-dark-bg-secondary border flex-1 border-border-primary dark:border-dark-border-primary rounded-md p-2 focus:ring-0 focus:outline-none focus:border-accent-primary"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </form>
      <div className="flex flex-col gap-2 h-52 max-h-52 overflow-y-hidden">
        {searchedInstances.length > 0 && (
          <ul className="rounded-md border bg-bg-secondary dark:bg-dark-bg-secondary border-border-primary dark:border-dark-border-primary">
            {searchedInstances}
          </ul>
        )}
      </div>
    </div>
  );
}

function AgentPanel({
  name,
  instance,
  setSelectedInstance,
}: {
  name: string;
  instance: string;
  setSelectedInstance: (_: null) => void;
}) {
  const {
    events,
    state,
    messages,
    schedules,
    sqlResults,
    send,
    clearSqlResults,
  } = useLiveAgentData(name, instance);
  const [leftTab, setLeftTab] = useState<"state" | "messages" | "events">(
    "state"
  );

  const [rightTab, setRightTab] = useState<"events" | "sql" | "schedules">(
    "events"
  );

  const leftContainerRef = useRef<HTMLDivElement>(null);
  const rightContainerRef = useRef<HTMLDivElement>(null);

  return (
    <section className="w-full h-screen max-h-screen overflow-hidden dark:border-dark-border-primary text-primary dark:text-dark-primary grid grid-cols-[3fr_2fr] grid-rows-[4rem_2.5rem_1fr]">
      <div className="pl-8 col-span-2">
        <header className="flex mt-6 flex-row items-center gap-4 ">
          <button
            type="button"
            onClick={() => setSelectedInstance(null)}
            className="text-secondary dark:text-dark-secondary aspect-square hover:bg-bg-secondary dark:hover:bg-dark-bg-secondary rounded-md p-2"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-4 h-4"
            >
              <title>Back</title>
              <path d="M19 12H5" />
              <path d="M12 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="text-xl">
            <span className="font-bold mr-2">{name}</span>
            <span className="text-tertiary dark:text-dark-tertiary mr-2">
              /
            </span>
            <span className="text-secondary dark:text-dark-secondary">
              {instance}
            </span>
          </h2>
        </header>
      </div>
      <nav className="px-4 flex flex-row border-b border-border-primary dark:border-dark-border-primary items-center">
        <TabButton
          onClick={() => setLeftTab("state")}
          selected={leftTab === "state"}
        >
          State
        </TabButton>
        <TabButton
          onClick={() => setLeftTab("messages")}
          selected={leftTab === "messages"}
        >
          Messages
        </TabButton>
      </nav>
      <nav className="px-4 flex flex-row items-center border-b border-border-primary dark:border-dark-border-primary">
        <TabButton
          onClick={() => setRightTab("events")}
          selected={rightTab === "events"}
        >
          Events
        </TabButton>
        <TabButton
          onClick={() => setRightTab("sql")}
          selected={rightTab === "sql"}
        >
          SQL
        </TabButton>
        <TabButton
          onClick={() => setRightTab("schedules")}
          selected={rightTab === "schedules"}
        >
          Schedules
        </TabButton>
      </nav>
      <div
        ref={leftContainerRef}
        className="p-4 border-r border-border-primary dark:border-dark-border-primary overflow-y-scroll thin-scrollbar dark:thin-dark-scrollbar"
      >
        {leftTab === "messages" && (
          <Messages containerRef={leftContainerRef} messages={messages} />
        )}
        {leftTab === "state" && <State state={state} events={events} />}
      </div>
      <div
        ref={rightContainerRef}
        className="overflow-y-scroll thin-scrollbar dark:thin-dark-scrollbar"
      >
        {rightTab === "events" && <Events events={events} />}
        {rightTab === "sql" && (
          <Sql
            clearSqlResults={clearSqlResults}
            containerRef={rightContainerRef}
            results={sqlResults}
            send={send}
          />
        )}
        {rightTab === "schedules" && <Schedules schedules={schedules} />}
      </div>
    </section>
  );
}

function TabButton({
  children,
  onClick,
  selected,
}: {
  children: React.ReactNode;
  onClick: () => void;
  selected: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-full px-4 text-sm border-b-2 ${selected ? " border-orange-500" : "border-transparent"}`}
    >
      {children}
    </button>
  );
}
