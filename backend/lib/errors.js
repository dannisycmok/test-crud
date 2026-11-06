/**
 * Error with an HTTP status for the API error handler.
 */
export class HttpError extends Error {
  /**
   * @param {number} status HTTP status code.
   * @param {string} message Client-safe error message.
   */
  constructor(status, message) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

/**
 * Wrap a route so thrown and rejected errors reach Express.
 * @param {(req: import("express").Request, res: import("express").Response) => unknown} handler
 * @returns {import("express").RequestHandler}
 */
export function handle(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res)).catch(next);
  };
}

/**
 * Translate Postgres constraint failures into HTTP errors.
 * @param {unknown} error
 * @returns {never}
 */
export function rethrowDbError(error) {
  const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
  const constraint =
    error && typeof error === "object" && "constraint" in error ? String(error.constraint) : "";

  if (code === "23503") {
    throw new HttpError(
      409,
      "This record is referenced by existing orders and cannot be changed or deleted"
    );
  }
  if (code === "23505" && constraint.includes("email")) {
    throw new HttpError(409, "A user with this email already exists");
  }
  if (code === "23514") {
    throw new HttpError(400, "A value failed a database constraint");
  }
  throw error;
}
