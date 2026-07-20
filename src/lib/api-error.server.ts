import { randomUUID } from "crypto";

/**
 * Sanitise an unexpected server error for public API responses.
 *
 * Logs the real error (with a stable request id) and returns a generic
 * message so database details / stack traces are not leaked.
 */
export function sanitizeApiError(err: unknown, context: string): Response {
  const requestId = randomUUID();
  console.error(`[${context}] error`, requestId, err);
  return Response.json(
    { error: "Server error", request_id: requestId },
    { status: 500 },
  );
}
