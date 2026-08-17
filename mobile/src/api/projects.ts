import { request } from './client';
import { ProjectOut } from './types';

export function list(sort: 'priority' | 'cost' | 'recent' = 'priority'): Promise<ProjectOut[]> {
  return request<ProjectOut[]>(`/api/projects?sort=${sort}`);
}
