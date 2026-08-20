import { request } from './client';
import { SchemeDiscoverResponse, SchemeGrievanceClusterOut, SchemeGrievanceOut } from './types';

export interface DiscoverSchemesPayload {
  profession: string;
  state: string;
  age?: number;
  notes?: string;
}

export function discoverSchemes(token: string, payload: DiscoverSchemesPayload): Promise<SchemeDiscoverResponse> {
  return request<SchemeDiscoverResponse>('/api/finance/schemes/discover', { method: 'POST', body: payload, token });
}

export function createGrievance(token: string, schemeName: string, text: string): Promise<SchemeGrievanceOut> {
  return request<SchemeGrievanceOut>('/api/finance/grievances', {
    method: 'POST',
    body: { scheme_name: schemeName, text },
    token,
  });
}

export function answerGrievanceFollowUp(
  token: string,
  grievanceId: number,
  question: string,
  answer: string,
): Promise<SchemeGrievanceOut> {
  return request<SchemeGrievanceOut>(`/api/finance/grievances/${grievanceId}/followup`, {
    method: 'POST',
    body: { question, answer },
    token,
  });
}

export function listMyGrievances(token: string): Promise<SchemeGrievanceOut[]> {
  return request<SchemeGrievanceOut[]>('/api/finance/grievances', { token });
}

export function listGrievanceClusters(token: string): Promise<SchemeGrievanceClusterOut[]> {
  return request<SchemeGrievanceClusterOut[]>('/api/finance/grievances/clusters', { token });
}
