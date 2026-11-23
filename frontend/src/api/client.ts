import { config } from '../config';

/** An API failure with the server's machine-readable code (see backend lib/http.ts). */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
  /** No response at all: offline, DNS, timeout. */
  get offline(): boolean {
    return this.status === 0;
  }
}

type TokenSource = () => Promise<string | null>;
let tokenSource: TokenSource = async () => null;

/** The auth layer registers how to get a fresh ID token. */
export function setTokenSource(source: TokenSource): void {
  tokenSource = source;
}

export async function api<T>(method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE', path: string, body?: unknown, timeoutMs = 15000): Promise<T> {
  const token = await tokenSource();
  let res: Response;
  // AbortController + timer rather than AbortSignal.timeout, which Hermes may lack.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    res = await fetch(`${config.apiUrl}${path}`, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch {
    throw new ApiError(0, 'offline', "You're offline, or PassEscort can't be reached right now.");
  } finally {
    clearTimeout(timer);
  }
  const text = await res.text();
  const json = text ? (JSON.parse(text) as unknown) : undefined;
  if (!res.ok) {
    const e = (json ?? {}) as { error?: string; code?: string };
    throw new ApiError(res.status, e.code ?? 'http_error', e.error ?? `Request failed (${res.status})`);
  }
  return json as T;
}
