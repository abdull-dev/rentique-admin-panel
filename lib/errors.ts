/**
 * Pulls a human-readable message out of an axios error, falling back to a
 * caller-supplied default. Surfacing the server's own `message` (e.g. a Nest
 * validation/domain error) is far more useful than a generic "failed" string.
 */
export function errorMessage(err: unknown, fallback: string): string {
  return (
    (err as { response?: { data?: { message?: string } } }).response?.data
      ?.message || fallback
  );
}
