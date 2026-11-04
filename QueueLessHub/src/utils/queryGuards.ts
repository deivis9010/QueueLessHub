/**
 * Returns a shallow copy without keys that start with `$`.
 * Request-derived update payloads must not carry MongoDB operators such as `$set` or `$where`.
 */
export const stripOperatorKeys = <T extends object>(data: T): T =>
  Object.fromEntries(Object.entries(data).filter(([key]) => !key.startsWith('$'))) as T;
