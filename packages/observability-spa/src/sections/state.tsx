import React, { useMemo } from "react";
import type { PersistedEvent } from "../agents";

export function JSONView({ json }: { json: unknown }) {
  return (
    <pre className="text-sm bg-bg-secondary dark:bg-dark-bg-secondary border border-border-primary dark:border-dark-border-primary p-2 rounded-md">
      {JSON.stringify(json, null, 2) || "<state is empty>"}
    </pre>
  );
}

function TimelineItem({
  event,
  index,
  items,
}: {
  event: PersistedEvent;
  index: number;
  items: number;
}) {
  let type = "middle";

  if (index === 0) {
    type = "start";
  } else if (index === items - 1) {
    type = "end";
  }

  if (items === 1) {
    type = "singular";
  }

  const lineClass =
    type === "middle"
      ? "w-[2px] h-full bg-accent-primary"
      : "w-[2px] h-1/2 bg-accent-primary";

  return (
    <div className="flex flex-row gap-4 items-center">
      <div className="ml-4 flex flex-col relative h-12">
        {type !== "singular" && (
          <div
            className={`${lineClass} absolute ${type === "start" ? "top-1/2" : "top-0"}`}
          />
        )}
        <div className="w-3 h-3 rounded-full bg-accent-primary absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2" />
      </div>
      <div className="flex flex-row gap-2">
        <p className="text-sm text-secondary dark:text-dark-secondary">
          {new Date(event.timestamp).toLocaleString().substring(11)}
        </p>
        <p className="text-sm">Update state</p>
      </div>
    </div>
  );
}

export default function State({
  state,
  events,
}: {
  state: unknown;
  events: PersistedEvent[];
}) {
  const stateUpdateEvents = useMemo(() => {
    return events.filter((event) => event.type === "state-update").slice(0, 10);
  }, [events]);

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-3xl font-bold">State</h2>
      <JSONView json={state} />

      <h2 className="mt-4 text-3xl font-bold">Timeline</h2>
      <div className="flex flex-col">
        {stateUpdateEvents.map((event, index) => (
          <TimelineItem
            key={event.eventId}
            event={event}
            index={index}
            items={stateUpdateEvents.length}
          />
        ))}
      </div>
    </div>
  );
}
