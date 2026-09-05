import { env } from "@/lib/env";

/** Mirrors docs/api.md's error shape: `{ error, issues? }`. */
export class ApiClientError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly issues?: unknown,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

type FetchOptions = {
  method?: "GET" | "POST" | "DELETE" | "PATCH";
  body?: unknown;
  accessToken: string | null;
};

/** The one way to call the Next.js API — attaches the bearer token, throws ApiClientError on a non-2xx. */
export async function apiFetch<T>(path: string, opts: FetchOptions): Promise<T> {
  const response = await fetch(`${env.apiUrl}${path}`, {
    method: opts.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(opts.accessToken ? { Authorization: `Bearer ${opts.accessToken}` } : {}),
    },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });

  const json = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiClientError(response.status, json.error ?? "Something went wrong.", json.issues);
  }

  return json as T;
}

/** A readable message for a failed query — network failure, ApiClientError, or otherwise. */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiClientError) return error.message;
  if (error instanceof Error) return error.message;
  return "Something went wrong.";
}
