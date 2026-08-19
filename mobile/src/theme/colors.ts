/**
 * Dark luxury palette.
 * Deep charcoal-navy backgrounds, gold/amber accents, light text.
 * Per-category hues are brightened for dark-bg contrast and applied
 * consistently to chips, card accents and icons everywhere a category is shown.
 */

export const palette = {
  bg: '#FAFAFC',
  bgElevated: '#F3F4F6',
  surface: '#FFFFFF',
  surfaceAlt: '#F9FAFB',
  surfaceSunken: '#F3F4F6',

  border: '#E5E7EB',
  borderStrong: '#D1D5DB',

  text: '#111827',
  textMuted: '#6B7280',
  textFaint: '#9CA3AF',
  textInverse: '#FFFFFF',

  primary: '#4F46E5', // Indigo
  primaryDark: '#4338CA',
  primaryLight: '#818CF8',
  primarySoft: 'rgba(79,70,229,0.12)',

  accent: '#7C3AED', // Purple

  success: '#10B981',
  successSoft: 'rgba(16,185,129,0.12)',
  warning: '#F59E0B',
  warningSoft: 'rgba(245,158,11,0.12)',
  danger: '#EF4444',
  dangerSoft: 'rgba(239,68,68,0.12)',
  info: '#3B82F6',
  infoSoft: 'rgba(59,130,246,0.12)',

  white: '#FFFFFF',
  black: '#000000',
} as const;

export const darkPalette = {
  bg: '#0F172A',
  bgElevated: '#1E293B',
  surface: '#1E293B',
  surfaceAlt: '#334155',
  surfaceSunken: '#0F172A',
  border: '#334155',
  borderStrong: '#475569',
  text: '#F8FAFC',
  textMuted: '#94A3B8',
  textFaint: '#64748B',
  textInverse: '#0F172A',
  primary: '#6366F1',
  primaryDark: '#4F46E5',
  primaryLight: '#818CF8',
  primarySoft: 'rgba(99,102,241,0.12)',
  accent: '#8B5CF6',
  success: '#34D399',
  successSoft: 'rgba(52,211,153,0.12)',
  warning: '#FBBF24',
  warningSoft: 'rgba(251,191,36,0.12)',
  danger: '#F87171',
  dangerSoft: 'rgba(248,113,113,0.12)',
  info: '#38BDF8',
  infoSoft: 'rgba(56,189,248,0.12)',
  white: '#FFFFFF',
  black: '#000000',
} as const;

export const gradients = {
  primary: ['#4F46E5', '#7C3AED'] as const,
  primarySoft: ['#818CF8', '#A78BFA'] as const,
  success: ['#34D399', '#10B981'] as const,
  danger: ['#F87171', '#EF4444'] as const,
  sunrise: ['#FBBF24', '#F59E0B'] as const,
  ocean: ['#3B82F6', '#4F46E5'] as const,
  brand: ['#3B82F6', '#4F46E5', '#7C3AED'] as const,
};

export interface CategoryStyle {
  color: string;
  soft: string;
  icon: string;
  label: string;
}

/** Every infrastructure category the backend can return (see API_CONTRACT.md). */
export const categoryStyles: Record<string, CategoryStyle> = {
  drainage: { color: '#22D3EE', soft: 'rgba(34,211,238,0.12)', icon: '🌊', label: 'Drainage' },
  road: { color: '#FBBF24', soft: 'rgba(251,191,36,0.12)', icon: '🛣️', label: 'Road' },
  streetlight: { color: '#FACC15', soft: 'rgba(250,204,21,0.12)', icon: '💡', label: 'Streetlight' },
  waste_management: { color: '#4ADE80', soft: 'rgba(74,222,128,0.12)', icon: '🗑️', label: 'Waste' },
  water_supply: { color: '#60A5FA', soft: 'rgba(96,165,250,0.12)', icon: '💧', label: 'Water Supply' },
  sanitation: { color: '#C084FC', soft: 'rgba(192,132,252,0.12)', icon: '🚻', label: 'Sanitation' },
  electricity: { color: '#FB7185', soft: 'rgba(251,113,133,0.12)', icon: '⚡', label: 'Electricity' },
  other: { color: '#94A3B8', soft: 'rgba(148,163,184,0.12)', icon: '📋', label: 'Other' },
};

export function categoryStyle(category: string | null | undefined): CategoryStyle {
  if (!category) return categoryStyles.other;
  return categoryStyles[category] ?? categoryStyles.other;
}

/** Severity 1-5 as returned by the AI extraction. */
export const severityStyles: Record<number, { color: string; soft: string; label: string }> = {
  1: { color: '#4ADE80', soft: 'rgba(74,222,128,0.12)', label: 'Minor' },
  2: { color: '#A3E635', soft: 'rgba(163,230,53,0.12)', label: 'Low' },
  3: { color: '#FBBF24', soft: 'rgba(251,191,36,0.12)', label: 'Moderate' },
  4: { color: '#FB923C', soft: 'rgba(251,146,60,0.12)', label: 'High' },
  5: { color: '#F87171', soft: 'rgba(248,113,113,0.12)', label: 'Critical' },
};

export function severityStyle(severity: number | null | undefined) {
  if (!severity) return { color: palette.textMuted, soft: palette.surfaceAlt, label: 'Unknown' };
  return severityStyles[Math.max(1, Math.min(5, severity))];
}

/** Complaint + project + budget-run statuses. */
export const statusStyles: Record<string, { color: string; soft: string; label: string }> = {
  received: { color: '#94A3B8', soft: 'rgba(148,163,184,0.12)', label: 'Received' },
  processed: { color: '#38BDF8', soft: 'rgba(56,189,248,0.12)', label: 'Processed' },
  clustered: { color: '#C084FC', soft: 'rgba(192,132,252,0.12)', label: 'Clustered' },
  in_progress: { color: '#FBBF24', soft: 'rgba(251,191,36,0.12)', label: 'In Progress' },
  resolved: { color: '#34D399', soft: 'rgba(52,211,153,0.12)', label: 'Resolved' },
  open: { color: '#38BDF8', soft: 'rgba(56,189,248,0.12)', label: 'Open' },
  validated: { color: '#C084FC', soft: 'rgba(192,132,252,0.12)', label: 'Validated' },
  actioned: { color: '#34D399', soft: 'rgba(52,211,153,0.12)', label: 'Actioned' },
  candidate: { color: '#94A3B8', soft: 'rgba(148,163,184,0.12)', label: 'Candidate' },
  selected: { color: '#D4A843', soft: 'rgba(212,168,67,0.12)', label: 'Selected' },
  approved: { color: '#34D399', soft: 'rgba(52,211,153,0.12)', label: 'Approved' },
  rejected: { color: '#F87171', soft: 'rgba(248,113,113,0.12)', label: 'Rejected' },
  draft: { color: '#94A3B8', soft: 'rgba(148,163,184,0.12)', label: 'Draft' },
};

export function statusStyle(status: string | null | undefined) {
  if (!status) return { color: palette.textMuted, soft: palette.surfaceAlt, label: '—' };
  return statusStyles[status] ?? { color: palette.textMuted, soft: palette.surfaceAlt, label: status };
}
