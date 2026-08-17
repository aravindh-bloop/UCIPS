import { request } from './client';
import { BudgetRunOut } from './types';

export function optimize(token: string, budget: number): Promise<BudgetRunOut> {
  return request<BudgetRunOut>('/api/budget/optimize', { method: 'POST', body: { budget }, token });
}

export function approve(token: string, runId: number): Promise<BudgetRunOut> {
  return request<BudgetRunOut>(`/api/budget/runs/${runId}/approve`, { method: 'POST', token });
}
