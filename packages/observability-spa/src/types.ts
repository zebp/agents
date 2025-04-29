export type RecursiveDateToISOString<T> = T extends Date
  ? string
  : T extends object
    ? { [K in keyof T]: RecursiveDateToISOString<T[K]> }
    : T;
