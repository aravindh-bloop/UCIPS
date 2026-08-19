import { request } from './client';
import { Role, Token, User } from './types';

export interface RegisterStartPayload {
  name: string;
  phone: string;
  email?: string;
  password: string;
  role: Role;
  preferred_language?: string;
  aadhaar_number: string;
}

export interface RegisterStartResult {
  message: string;
  expires_in_seconds: number;
  dev_otp?: string | null;
}

export function registerStart(payload: RegisterStartPayload): Promise<RegisterStartResult> {
  return request<RegisterStartResult>('/api/auth/register/start', { method: 'POST', body: payload });
}

export function registerVerify(phone: string, otp: string): Promise<Token> {
  return request<Token>('/api/auth/register/verify', { method: 'POST', body: { phone, otp } });
}

export function login(identifier: string, password: string): Promise<Token> {
  return request<Token>('/api/auth/login', { method: 'POST', body: { identifier, password } });
}

export function me(token: string): Promise<User> {
  return request<User>('/api/auth/me', { token });
}
