import { File, UploadType } from 'expo-file-system';
import { API_BASE_URL } from '../config';

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, body: unknown) {
    const detail = typeof body === 'object' && body !== null && 'detail' in body ? String((body as { detail: unknown }).detail) : String(body);
    super(detail || `Request failed with status ${status}`);
    this.status = status;
    this.body = body;
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  token?: string | null;
}

/**
 * Called when an authenticated request is rejected with 401, i.e. the stored token is no
 * longer valid (expired, or the account it points at no longer exists). AuthContext registers
 * itself here so a token that dies *mid-session* forces a logout, rather than leaving the app
 * stuck in an authenticated-but-broken state where every screen just errors. Registered via a
 * setter rather than importing AuthContext directly, which would be a circular import.
 */
let onUnauthorized: (() => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  onUnauthorized = handler;
}

/** Only fires for requests that actually carried a token -- a 401 from the login endpoint
 * means "wrong password", not "your session died", and must not trigger a logout. */
function handleUnauthorized(status: number, token?: string | null): void {
  if (status === 401 && token) onUnauthorized?.();
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, token } = options;
  const isFormData = body instanceof FormData;

  const headers: Record<string, string> = {};
  if (!isFormData && body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  console.log(`[api] -> ${method} ${path}`, isFormData ? '(form-data)' : body ?? '');

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : isFormData ? (body as FormData) : JSON.stringify(body),
    });
  } catch (err) {
    console.error(`[api] xx ${method} ${path} — network error (is the backend reachable at ${API_BASE_URL}?)`, err);
    throw err;
  }

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    console.error(`[api] <- ${method} ${path} ${res.status}`, data);
    handleUnauthorized(res.status, token);
    throw new ApiError(res.status, data);
  }

  console.log(`[api] <- ${method} ${path} ${res.status}`);
  return data as T;
}

// Uses expo-file-system's native multipart upload instead of fetch+FormData: React Native's
// new-architecture FormData bridging throws "Unsupported FormDataPart implementation" for
// {uri,name,type} file parts on Android, so file uploads route through this instead.
export async function uploadFile<T>(
  path: string,
  fileUri: string,
  fieldName: string,
  parameters: Record<string, string>,
  token?: string | null,
  mimeType?: string,
): Promise<T> {
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  console.log(`[api] -> UPLOAD ${path}`, parameters);

  async function attempt(): Promise<{ status: number; body: string }> {
    const file = new File(fileUri);
    return file.upload(`${API_BASE_URL}${path}`, {
      uploadType: UploadType.MULTIPART,
      fieldName,
      parameters,
      headers,
      ...(mimeType ? { mimeType } : {}),
    });
  }

  let result: { status: number; body: string };
  try {
    result = await attempt();
  } catch (err) {
    // expo-file-system's upload task has no configurable read-timeout, and a slow backend
    // response (e.g. a rate-limited AI call with retry/backoff) can trip the native default.
    // One silent retry covers that transient case instead of surfacing it to the user.
    console.warn(`[api] .. UPLOAD ${path} — first attempt failed, retrying once`, err);
    try {
      result = await attempt();
    } catch (err2) {
      console.error(`[api] xx UPLOAD ${path} — upload error (is the backend reachable at ${API_BASE_URL}?)`, err2);
      throw err2;
    }
  }

  const data = result.body ? JSON.parse(result.body) : null;

  if (result.status < 200 || result.status >= 300) {
    console.error(`[api] <- UPLOAD ${path} ${result.status}`, data);
    handleUnauthorized(result.status, token);
    throw new ApiError(result.status, data);
  }

  console.log(`[api] <- UPLOAD ${path} ${result.status}`);
  return data as T;
}
