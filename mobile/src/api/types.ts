export type Role = 'citizen' | 'authority';

export type Category =
  | 'road'
  | 'drainage'
  | 'streetlight'
  | 'water_supply'
  | 'waste_management'
  | 'sanitation'
  | 'electricity'
  | 'other';

export type ComplaintStatus = 'received' | 'processed' | 'clustered' | 'in_progress' | 'resolved';
export type ProjectStatus = 'candidate' | 'selected' | 'approved' | 'rejected';
export type BudgetRunStatus = 'draft' | 'approved';

export interface User {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  role: Role;
  preferred_language: string;
  created_at: string;
}

export interface Token {
  access_token: string;
  token_type: string;
  user: User;
}

export interface ComplaintOut {
  id: number;
  reference_code: string;
  channel: 'text' | 'voice' | 'image' | 'phone';
  language: string;
  raw_text: string | null;
  transcript: string | null;
  image_url: string | null;
  audio_url: string | null;
  category: Category | null;
  description: string | null;
  severity: number | null;
  lat: number;
  lng: number;
  status: ComplaintStatus;
  created_at: string;
  follow_up_question: string | null;
}

export interface FeedbackOut {
  id: number;
  complaint_id: number;
  rating: number;
  comment: string | null;
  created_at: string;
}

export interface ClusterOut {
  id: number;
  centroid_lat: number;
  centroid_lng: number;
  category: string;
  ward_name: string;
  complaint_count: number;
  demand_score: number;
  status: string;
  created_at: string;
}

export interface ProjectOut {
  id: number;
  cluster_id: number;
  evidence_id: number | null;
  title: string;
  category: string;
  description: string;
  estimated_cost: number;
  estimated_beneficiaries: number;
  demand_score: number;
  impact_score: number;
  urgency_score: number;
  feasibility_score: number;
  priority_score: number;
  explanation: string | null;
  status: ProjectStatus;
  created_at: string;
}

export interface BudgetRunOut {
  id: number;
  total_budget: number;
  total_cost: number;
  total_expected_impact: number;
  status: BudgetRunStatus;
  created_at: string;
  selected: ProjectOut[];
  excluded: ProjectOut[];
}
