import type { NextFunction, Request, Response } from "express";
import type { z } from "zod";

/** An error with an HTTP status and a stable machine-readable code. */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export const badRequest = (code: string, message: string) => new HttpError(400, code, message);
export const notFound = (message = "Not found") => new HttpError(404, "not_found", message);
export const forbidden = (code: string, message: string) => new HttpError(403, code, message);
export const conflict = (code: string, message: string) => new HttpError(409, code, message);

/** Parse and validate a request body (or query) — throws a 400 listing every problem. */
export function parse<S extends z.ZodType>(schema: S, value: unknown): z.infer<S> {
  const r = schema.safeParse(value);
  if (!r.success) {
    const detail = r.error.issues.map((i) => `${i.path.join(".") || "body"}: ${i.message}`).join("; ");
    throw badRequest("invalid_request", detail);
  }
  return r.data;
}

/** Last middleware: HttpErrors become their status; anything else is a logged 500. */
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message, code: err.code });
    return;
  }
  if (err && typeof err === "object" && "type" in err && (err as { type: string }).type === "entity.parse.failed") {
    res.status(400).json({ error: "Malformed JSON body", code: "invalid_json" });
    return;
  }
  console.error(err);
  res.status(500).json({ error: "Something went wrong on our side", code: "internal" });
}
