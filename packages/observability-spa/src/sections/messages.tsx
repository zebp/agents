import React from "react";
import type { Message as ChatMessage } from "ai";
import type { RecursiveDateToISOString } from "../types";

export type BaseMessageProps = {
  contents: string;
  timestamp: Date;
};

export type UserMessageProps = BaseMessageProps & {
  sender: "user";
};

export type AgentMessageProps = BaseMessageProps & {
  sender: "agent";
  toolsCalled: boolean;
};

export type Message = RecursiveDateToISOString<ChatMessage>;

function Message(props: Message) {
  const tool = props.parts?.find((part) => part.type === "tool-invocation");

  return (
    <div className="flex flex-col gap-2 rounded-md p-4 bg-bg-secondary dark:bg-dark-bg-secondary border border-border-primary dark:border-dark-border-primary hover:bg-bg-tertiary dark:hover:bg-dark-bg-tertiary transition-colors">
      <div className="flex flex-row gap-2">
        <p className="text-sm text-secondary dark:text-dark-secondary mr-auto font-bold">
          {props.role}
        </p>
        {props.createdAt && <p className="text-sm text-secondary dark:text-dark-secondary">
          {new Date(props.createdAt).toLocaleTimeString()}
        </p>}
      </div>
      <p className="text-sm">{props.content}</p>

      {props.role === "assistant" && (
        <div className="flex flex-row gap-2 mt-2">
          {tool && (
            <p className="text-sm text-black bg-accent-primary dark:bg-dark-accent-primary rounded-md px-3 py-1">
              called {tool.toolInvocation.toolName}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function Messages({
  messages,
  containerRef,
}: {
  messages: Message[];
  containerRef: React.RefObject<HTMLDivElement | null>;
}) {
  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    container.scrollTo({
      top: container.scrollHeight,
      behavior: "instant",
    });
  }, [containerRef]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    container?.scrollTo({
      top: container.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, containerRef]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-col gap-2 min-h-full justify-center items-center">
        <p className="text-xl text-secondary dark:text-dark-secondary">No messages</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {messages.map((message) => (
        <Message key={message.id} {...message} />
      ))}
    </div>
  );
} 