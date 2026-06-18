// Browser-side fetch wrapper for UNISSACO API routes.
// Always uses relative paths (Caddy gateway friendly).

export type ApiUser = {
  id: string;
  email: string;
  fullName: string | null;
  role: string;
  status: string;
  studentId: string | null;
  phone?: string | null;
  program?: string | null;
  yearOfStudy?: string | null;
  avatarUrl?: string | null;
  joinedAt?: string;
};

export class ApiError extends Error {
  status: number;
  details?: unknown;
  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

async function request<T>(
  url: string,
  options?: RequestInit & { json?: unknown }
): Promise<T> {
  const { json, ...init } = options ?? {};
  const headers = new Headers(init.headers);
  let body = init.body;
  if (json !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(json);
  }
  const res = await fetch(url, {
    ...init,
    headers,
    body,
    credentials: "same-origin",
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const message =
      (data && typeof data === "object" && "error" in data && String((data as { error: unknown }).error)) ||
      `Request failed (${res.status})`;
    throw new ApiError(message, res.status, (data as { details?: unknown })?.details);
  }
  return data as T;
}

export const api = {
  get: <T>(url: string, init?: RequestInit) => request<T>(url, { ...init, method: "GET" }),
  post: <T>(url: string, json?: unknown, init?: RequestInit) =>
    request<T>(url, { ...init, method: "POST", json }),
  put: <T>(url: string, json?: unknown, init?: RequestInit) =>
    request<T>(url, { ...init, method: "PUT", json }),
  patch: <T>(url: string, json?: unknown, init?: RequestInit) =>
    request<T>(url, { ...init, method: "PATCH", json }),
  delete: <T>(url: string, init?: RequestInit) => request<T>(url, { ...init, method: "DELETE" }),
};
