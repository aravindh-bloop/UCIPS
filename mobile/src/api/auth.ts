import { request } from './client';
import { Role, Token, User } from './types';

export interface RegisterPayload {
  name: string;
  phone?: string;
  email?: string;
  password: string;
  role: Role;
  preferred_language?: string;
}

export function register(payload: RegisterPayload): Promise<Token> {
  return request<Token>('/api/auth/register', { method: 'POST', body: payload });
}

export function login(identifier: string, password: string): Promise<Token> {
  return request<Token>('/api/auth/login', { method: 'POST', body: { identifier, password } });
}

export function me(token: string): Promise<User> {
  return request<User>('/api/auth/me', { token });
}
