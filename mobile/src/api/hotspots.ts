import { request } from './client';
import { ClusterOut, ComplaintOut } from './types';

export function list(): Promise<ClusterOut[]> {
  return request<ClusterOut[]>('/api/hotspots');
}

export function complaintsFor(id: number): Promise<ComplaintOut[]> {
  return request<ComplaintOut[]>(`/api/hotspots/${id}/complaints`);
}
