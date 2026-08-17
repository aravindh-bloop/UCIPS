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

  let result: { status: number; body: string };
  try {
    const file = new File(fileUri);
    result = await file.upload(`${API_BASE_URL}${path}`, {
      uploadType: UploadType.MULTIPART,
      fieldName,
      parameters,
      headers,
      ...(mimeType ? { mimeType } : {}),
    });
  } catch (err) {
    console.error(`[api] xx UPLOAD ${path} — upload error (is the backend reachable at ${API_BASE_URL}?)`, err);
    throw err;
  }

  const data = result.body ? JSON.parse(result.body) : null;

  if (result.status < 200 || result.status >= 300) {
    console.error(`[api] <- UPLOAD ${path} ${result.status}`, data);
    throw new ApiError(result.status, data);
  }

  console.log(`[api] <- UPLOAD ${path} ${result.status}`);
  return data as T;
}
