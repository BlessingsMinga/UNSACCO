// API helper: consistent JSON responses + error handling for route handlers.
import { NextResponse } from "next/server";

export type ApiError = {
  error: string;
  field?: string;
  details?: unknown;
};

export function ok<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function fail(message: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json<ApiError>({ error: message, ...extra }, { status });
}

export function unauthorized() {
  return fail("You must be logged in to perform this action.", 401);
}

export function forbidden() {
  return fail("You do not have permission to perform this action.", 403);
}

export function notFound(message = "Resource not found.") {
  return fail(message, 404);
}

export function handleApiError(error: unknown) {
  if (error instanceof Error) {
    if (error.message === "UNAUTHORIZED") return unauthorized();
    if (error.message === "FORBIDDEN") return forbidden();
    if (error.message === "NOT_FOUND") return notFound();
    // Zod-style error?
    const zodErr = (error as { errors?: unknown }).errors;
    if (zodErr) {
      return fail("Validation failed", 422, { details: zodErr });
    }
    return fail(error.message || "Something went wrong", 400);
  }
  return fail("Internal server error", 500);
}

// Generate a human-readable reference e.g. SAV-240311-AB12
export function generateReference(prefix: string): string {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${yy}${mm}${dd}-${rand}`;
}

// Parse & validate body with zod, throwing a typed error on failure.
export async function parseBody<T>(
  req: Request,
  schema: { parse: (v: unknown) => T }
): Promise<T> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    throw new Error("Invalid JSON body");
  }
  try {
    return schema.parse(json);
  } catch (err) {
    const e = err as { errors?: unknown; message?: string };
    const wrapped = new Error(e.message || "Validation failed");
    (wrapped as { errors?: unknown }).errors = e.errors;
    throw wrapped;
  }
}
