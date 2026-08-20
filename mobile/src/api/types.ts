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
  aadhaar_last4: string | null;
  phone_verified: boolean;
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

export type ProgressState = 'done' | 'current' | 'pending';

export interface ProgressStage {
  key: string;
  label: string;
  state: ProgressState;
  detail: string | null;
  at: string | null;
}

export interface ComplaintProgressOut {
  complaint_id: number;
  reference_code: string;
  stages: ProgressStage[];
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

// ---- My Finance ----

export interface SchemeItem {
  name: string;
  provider: string;
  eligibility: string;
  benefit: string;
  how_to_apply: string;
}

export interface SchemeSource {
  title: string;
  uri: string;
}

export interface SchemeDiscoverResponse {
  query_id: number;
  schemes: SchemeItem[];
  sources: SchemeSource[];
  cached: boolean;
  grounded: boolean;
}

export type SchemeGrievanceStatus = 'received' | 'diagnosed' | 'clustered' | 'escalated' | 'resolved';

export interface SchemeGrievanceOut {
  id: number;
  scheme_name: string;
  raw_text: string;
  failure_description: string | null;
  follow_up_question: string | null;
  status: SchemeGrievanceStatus;
  created_at: string;
}

export interface SchemeGrievanceClusterOut {
  id: number;
  scheme_name: string;
  failure_signature: string;
  member_count: number;
  escalation_summary: string | null;
  created_at: string;
}

// ---- Infrastructure Bonds + Equity Monitor (static demo data) ----

export type IncomeBracket = 'low' | 'middle' | 'high';
export type BondInvestmentStage =
  | 'invested'
  | 'identity_verified'
  | 'funds_confirmed'
  | 'allocated'
  | 'project_underway'
  | 'matured';

export interface BondInvestmentOut {
  id: number;
  investor_name: string;
  income_bracket: IncomeBracket;
  amount: number;
  aadhaar_verified: boolean;
  verification_status: 'pending' | 'verified' | 'flagged';
  stage: BondInvestmentStage;
  invested_at: string;
  tracker: ProgressStage[];
}

export interface EquityBreakdownOut {
  low_amount: number;
  middle_amount: number;
  high_amount: number;
  low_count: number;
  middle_count: number;
  high_count: number;
  equity_gap_flagged: boolean;
  equity_gap_reason: string | null;
}

export interface BondOut {
  id: number;
  project_id: number | null;
  project_title: string | null;
  title: string;
  description: string;
  target_amount: number;
  raised_amount: number;
  interest_rate: number;
  tenure_years: number;
  status: string;
  investor_count: number;
  created_at: string;
}

export interface BondDetailOut extends BondOut {
  investments: BondInvestmentOut[];
  equity: EquityBreakdownOut;
}
