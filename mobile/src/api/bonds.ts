import { request } from './client';
import { BondDetailOut, BondOut } from './types';

export function listBonds(token: string): Promise<BondOut[]> {
  return request<BondOut[]>('/api/bonds', { token });
}

export function getBond(token: string, bondId: number): Promise<BondDetailOut> {
  return request<BondDetailOut>(`/api/bonds/${bondId}`, { token });
}
