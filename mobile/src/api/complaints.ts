import { request, uploadFile } from './client';
import { ComplaintOut, ComplaintProgressOut, FeedbackOut } from './types';

export interface SubmitTextComplaint {
  text: string;
  lat: number;
  lng: number;
  language?: string;
}

export function submitText(token: string, payload: SubmitTextComplaint): Promise<ComplaintOut> {
  return request<ComplaintOut>('/api/complaints', { method: 'POST', body: payload, token });
}

export function listMine(token: string): Promise<ComplaintOut[]> {
  return request<ComplaintOut[]>('/api/complaints', { token });
}

export function listAll(token: string): Promise<ComplaintOut[]> {
  return request<ComplaintOut[]>('/api/complaints', { token });
}

export function getOne(token: string, id: number): Promise<ComplaintOut> {
  return request<ComplaintOut>(`/api/complaints/${id}`, { token });
}

export function submitFeedback(token: string, complaintId: number, rating: number, comment?: string): Promise<FeedbackOut> {
  return request<FeedbackOut>(`/api/complaints/${complaintId}/feedback`, { method: 'POST', body: { rating, comment }, token });
}

export function getFeedback(token: string, complaintId: number): Promise<FeedbackOut> {
  // 404 here just means "no feedback submitted yet" -- a normal, expected state for most
  // complaints, not a real error, so it shouldn't be logged like one.
  return request<FeedbackOut>(`/api/complaints/${complaintId}/feedback`, { token, expectedStatuses: [404] });
}

export function getProgress(token: string, complaintId: number): Promise<ComplaintProgressOut> {
  return request<ComplaintProgressOut>(`/api/complaints/${complaintId}/progress`, { token });
}

export function answerFollowUp(token: string, complaintId: number, question: string, answer: string): Promise<ComplaintOut> {
  return request<ComplaintOut>(`/api/complaints/${complaintId}/followup`, { method: 'POST', body: { question, answer }, token });
}

export interface SubmitVoiceComplaint {
  uri: string;
  lat: number;
  lng: number;
  languageCode?: string;
}

export function submitVoice(token: string, payload: SubmitVoiceComplaint): Promise<ComplaintOut> {
  return uploadFile<ComplaintOut>('/api/complaints/voice', payload.uri, 'file', {
    lat: String(payload.lat),
    lng: String(payload.lng),
    language_code: payload.languageCode ?? 'unknown',
  }, token);
}

export interface SubmitImageComplaint {
  uri: string;
  mimeType?: string;
  lat: number;
  lng: number;
  caption?: string;
  language?: string;
}

export function submitImage(token: string, payload: SubmitImageComplaint): Promise<ComplaintOut> {
  const parameters: Record<string, string> = {
    lat: String(payload.lat),
    lng: String(payload.lng),
    language: payload.language ?? 'en',
  };
  if (payload.caption) parameters.caption = payload.caption;
  return uploadFile<ComplaintOut>('/api/complaints/image', payload.uri, 'file', parameters, token, payload.mimeType);
}
