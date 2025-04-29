import { useEffect, useRef, useState } from "react";

import type { Message } from "./sections/messages";
import type { Schedule } from "./sections/schedules";
import type { SQLResult } from "./sections/sql";

export type Agent = {
  name: string;
  instances: string[];
};

// @ts-ignore
const baseUrl = import.meta.env.DEV ? "http://localhost:5173" : "";

/**
 * Fetches the list of Agents from the API.
 */
export async function getAgents() {
  const response = await fetch(`${baseUrl}/@obs/agents`);
  const data: Agent[] = await response.json();
  return data;
}

export type ObservabilityEvent =
  | {
      type: "state-update";
      timestamp: number;
      eventId: number;
      log: true;
      state: unknown;
    }
  | {
      type: "message";
      timestamp: number;
      eventId: number;
      log: true;
      message: Message;
    }
  | {
      type: "schedule";
      timestamp: number;
      eventId: number;
      log: true;
      schedule: Schedule<unknown>;
    }
  | {
      type: "schedule-ran";
      timestamp: number;
      eventId: number;
      log: true;
      schedule: Schedule<unknown>;
    }
  | {
      type: "schedule-cancel";
      timestamp: number;
      eventId: number;
      log: true;
      scheduleId: string;
    }
  | {
      type: "rpc";
      timestamp: number;
      eventId: number;
      log: true;
      id: string;
      method: string;
      args: unknown[];
      streaming?: boolean;
    }
  | { type: "messages"; timestamp: number; messages: Message[] }
  | { type: "sql"; id: string; results: Record<string, unknown>[] }
  | {
      type: "initial";
      timestamp: number;
      state: unknown;
      schedules: Schedule<unknown>[];
      messages: Message[] | null;
      events: PersistedEvent[];
    };

type LoggedOrNever<Y> = Y extends { log: true } ? Y : never;
export type PersistedEvent = LoggedOrNever<ObservabilityEvent> & {
  eventId: number;
};

/**
 * Initiates a WebSocket to the Agent, typically this'll have a big initial payload
 * containing the current state of the Agent and then a stream of updates.
 */
export function useLiveAgentData(name: string, instance: string) {
  const [events, setEvents] = useState<PersistedEvent[]>([]);
  const [state, setState] = useState<unknown>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [schedules, setSchedules] = useState<Schedule<unknown>[]>([]);
  const [sqlResults, setSqlResults] = useState<SQLResult[]>([]);

  const socket = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (socket.current) {
      socket.current.close();
    }

    const ws = new WebSocket(`${baseUrl}/@obs/agents/${name}/${instance}`);
    socket.current = ws;

    ws.onmessage = (event) => {
      const message: ObservabilityEvent = JSON.parse(event.data);

      const t = ["schedule", "schedule-ran"];

      if (t.includes(message.type)) {
        console.log(message);
      }

      if (message.type === "state-update") {
        setState(message.state);
      } else if (message.type === "schedule") {
        setSchedules((prev) => [...prev, message.schedule]);
      } else if (
        message.type === "schedule-ran" &&
        message.schedule.type !== "cron"
      ) {
        setSchedules((prev) =>
          prev.filter((schedule) => schedule.id !== message.schedule.id)
        );
      } else if (message.type === "schedule-cancel") {
        setSchedules((prev) =>
          prev.filter((schedule) => schedule.id !== message.scheduleId)
        );
      } else if (message.type === "messages") {
        setMessages(message.messages);
      } else if (message.type === "initial") {
        setSchedules(message.schedules);
        setState(message.state);
        setMessages(message.messages ?? []);
        setEvents(message.events);
      } else if (message.type === "sql") {
        setSqlResults((prev) => [
          ...prev,
          {
            id: message.id,
            results: message.results,
          },
        ]);
      }

      if ("log" in message && message.log) {
        setEvents((prev) => [...prev, message]);
      }
    };

    return () => {
      ws.close();
      setEvents([]);
    };
  }, [name, instance]);

  const send: SendFn = (message) => {
    if (!socket.current) {
      throw new Error("Socket is not connected");
    }

    socket.current.send(JSON.stringify(message));
  };

  const clearSqlResults = () => {
    setSqlResults([]);
  };

  return {
    events,
    state,
    messages,
    schedules,
    sqlResults,
    clearSqlResults,
    send,
  };
}

export type SendFn = <T extends { type: string }>(message: T) => void;
