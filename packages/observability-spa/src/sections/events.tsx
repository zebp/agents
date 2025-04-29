import React, { useState } from "react";
import type { PersistedEvent } from "../agents";

function Event({ event }: { event: PersistedEvent }) {
  const [opened, setOpened] = useState(false);

  const displayLog: Record<string, unknown> = { ...event };
  displayLog.log = undefined;
  displayLog.timestamp = undefined;
  displayLog.type = undefined;

  return (
    <div
      onClick={() => setOpened(!opened)}
      className={
        "flex flex-col gap-4 rounded-md p-4 bg-bg-secondary dark:bg-dark-bg-secondary border border-border-primary dark:border-dark-border-primary hover:bg-bg-tertiary dark:hover:bg-dark-bg-tertiary transition-colors"
      }
    >
      <div className="flex flex-row gap-2">
        <p className="text-sm text-secondary dark:text-dark-secondary">
          {new Date(event.timestamp).toLocaleString().substring(11)}
        </p>
        <p className="text-sm">{messageForEvent(event)}</p>
      </div>
      {opened && (
        <div
          className="flex flex-col gap-2"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <pre className="text-sm bg-bg-secondary dark:bg-dark-bg-secondary border border-border-primary dark:border-dark-border-primary p-2 rounded-md text-wrap">
            {JSON.stringify(displayLog, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

export default function Events({ events }: { events: PersistedEvent[] }) {
  const sortedEvents = events.sort((a, b) => b.timestamp - a.timestamp);

  if (sortedEvents.length === 0) {
    return (
      <div className="flex flex-col gap-2 min-h-full justify-center items-center">
        <p className="text-xl text-secondary dark:text-dark-secondary">
          No events
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-4">
      {sortedEvents.map((event) => (
        <Event key={event.eventId} event={event} />
      ))}
    </div>
  );
}

function messageForEvent(event: PersistedEvent): string {
  switch (event.type) {
    case "message":
      return `${event.message.role}: ${event.message.content}`;
    case "schedule":
      return `Created schedule for ${event.schedule.callback}`;
    case "schedule-ran":
      return `Schedule for ${event.schedule.callback} ran`;
    case "state-update":
      return "Updated state";
    case "rpc":
      return `RPC call to ${event.method}`;
    default:
      return "Unknown event";
  }
}
