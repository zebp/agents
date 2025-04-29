import React from "react";
import type { SendFn } from "../agents";

export type SQLResult = { id: string; results: Record<string, unknown>[] };

function Result({ result }: { result: SQLResult }) {
  if (result.results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-32 w-full max-w-full overflow-x-scroll border rounded-md border-border-primary dark:border-dark-border-primary bg-bg-secondary dark:bg-dark-bg-secondary no-scrollbar">
        <p className="text-xl text-primary dark:text-dark-primary">No rows</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full overflow-x-scroll border rounded-md border-border-primary dark:border-dark-border-primary bg-bg-secondary dark:bg-dark-bg-secondary no-scrollbar">
      <table className="max-w-full w-full border-collapse rounded-md border-hidden">
        <thead>
          <tr>
            {Object.keys(result.results[0] || {}).map((key) => (
              <th
                key={key}
                className="borderborder-border-primary dark:border-dark-border-primary p-2 text-left"
              >
                {key}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {result.results.map((row) => (
            <tr>
              {Object.values(row).map((value) => (
                <td
                  key={`cell-${value}`}
                  className="border border-border-primary dark:border-dark-border-primary p-2"
                >
                  {String(value)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Sql({
  results,
  send,
  clearSqlResults,
  containerRef,
}: {
  results: SQLResult[];
  send: SendFn;
  clearSqlResults: () => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
}) {
  const [activeQuery, setActiveQuery] = React.useState(0);
  const [queries, setQueries] = React.useState<string[]>([""]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  React.useLayoutEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior: "instant",
      });
    }
  }, [results, containerRef]);

  const runQuery = (query: string) => {
    if (query === "/clear") {
      clearSqlResults();
    } else {
      send({ type: "sql", query });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      runQuery(queries[activeQuery]);
      setQueries([...queries, ""]);
      setActiveQuery(activeQuery + 1);
    } else if (e.key === "ArrowUp") {
      setActiveQuery(Math.max(activeQuery - 1, 0));
    } else if (e.key === "ArrowDown") {
      setActiveQuery(Math.min(activeQuery + 1, queries.length - 1));
    }
  };

  const content =
    results.length === 0 ? (
      <div className="flex flex-col gap-2 h-full flex-1 justify-center items-center">
        <h2 className="text-xl text-secondary dark:text-dark-secondary">
          No SQL results
        </h2>
        <p className="text-sm text-secondary dark:text-dark-secondary">
          Run a query to see results here.
        </p>
        <p className="text-sm text-secondary dark:text-dark-secondary">
          <code>/clear</code> to clear results
        </p>
      </div>
    ) : (
      <div className="flex flex-col gap-4 pt-4 px-4 overflow-scroll thin-scrollbar dark:thin-dark-scrollbar">
        {results.map((result) => (
          <Result key={result.id} result={result} />
        ))}
      </div>
    );

  return (
    <div className="flex flex-col gap-2 min-h-full">
      {content}
      <div className="flex flex-row gap-2 sticky bottom-0 mt-auto px-4 p-4 bg-bg-primary dark:bg-dark-bg-primary border-t border-border-primary dark:border-dark-border-primary">
        <input
          type="text"
          placeholder="SQL Query"
          value={queries[activeQuery]}
          onChange={(e) =>
            setQueries((queries) => {
              const newQueries = [...queries];
              newQueries[activeQuery] = e.target.value;
              return newQueries;
            })
          }
          onKeyDown={handleKeyDown}
          className="bg-bg-secondary dark:bg-dark-bg-secondary flex-1 border border-border-primary dark:border-dark-border-primary rounded-md p-2 focus:ring-0 focus:outline-none focus:border-accent-primary"
        />
      </div>
    </div>
  );
}
