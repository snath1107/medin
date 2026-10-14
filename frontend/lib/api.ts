/**
 * Every request to the backend goes through `api()`.
 *
 * Requests go to `/api/...` on this same site. next.config.js forwards them to
 * the FastAPI server, so the browser only ever talks to one origin. That keeps
 * the login cookie a normal first-party cookie, and no CORS setup is needed.
 */

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

type FastApiValidationError = { loc: (string | number)[]; msg: string };

function readErrorMessage(body: unknown, status: number): string {
  const detail = (body as { detail?: unknown } | null)?.detail;

  if (typeof detail === "string") return detail;

  // 422 responses from FastAPI list every invalid field.
  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0] as FastApiValidationError;
    const field = String(first.loc[first.loc.length - 1]).replaceAll("_", " ");
    return `${field}: ${first.msg.replace(/^Value error, /, "")}`;
  }

  return status >= 500 ? "Something went wrong. Please try again." : "Request failed";
}

export async function api<T = void>(path: string, options: RequestInit = {}): Promise<T> {
  const isFormData = options.body instanceof FormData;

  const response = await fetch(`/api${path}`, {
    ...options,
    credentials: "same-origin",
    headers: {
      ...(options.body && !isFormData ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });

  if (response.status === 401 && !path.startsWith("/auth/")) {
    // The login expired or is invalid: clear the cookie and go to the sign-in page.
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/signin";
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(response.status, readErrorMessage(body, response.status));
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

/** Shorthand for sending a JSON body. */
export function jsonBody(method: "POST" | "PATCH" | "PUT", data: unknown): RequestInit {
  return { method, body: JSON.stringify(data) };
}

export async function uploadImage(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const { url } = await api<{ url: string }>("/uploads/image", { method: "POST", body: form });
  return url;
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}
