import React, { useMemo } from "react";

import type { Schedule as AgentSchedule } from "agents";
import type { RecursiveDateToISOString } from "../types";

export type Schedule<T> = RecursiveDateToISOString<AgentSchedule>;

function Schedule({ schedule }: { schedule: Schedule<unknown> }) {
  return (
    <div className="flex flex-col gap-2 rounded-md p-4 bg-bg-secondary dark:bg-dark-bg-secondary border border-border-primary dark:border-dark-border-primary hover:bg-bg-tertiary dark:hover:bg-dark-bg-tertiary transition-colors">
      <div className="flex flex-row gap-2 text-sm text-secondary dark:text-dark-secondary">
        <p className="mr-auto">{schedule.id}</p>
        <p>
          {schedule.type === "cron" && (
            <p className="text-sm">{schedule.cron}</p>
          )}
          {schedule.type === "delayed" && (
            <p className="text-sm">in {schedule.delayInSeconds} seconds</p>
          )}
          {schedule.type === "scheduled" && (
            <p className="text-sm">
              {new Date(schedule.time * 1000).toLocaleString()}
            </p>
          )}
        </p>
      </div>
      <p className="text-sm">{schedule.callback}</p>
    </div>
  );
}

export default function Schedules({
  schedules,
}: {
  schedules: Schedule<unknown>[];
}) {
  const sortedSchedules = useMemo(
    () => schedules.sort((a, b) => b.time - a.time),
    [schedules]
  );

  if (sortedSchedules.length === 0) {
    return (
      <div className="flex flex-col gap-2 min-h-full justify-center items-center">
        <p className="text-xl text-secondary dark:text-dark-secondary">
          No schedules
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-4">
      {sortedSchedules.map((schedule) => (
        <Schedule key={schedule.id} schedule={schedule} />
      ))}
    </div>
  );
}
