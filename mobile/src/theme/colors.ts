/**
 * Dark luxury palette.
 * Deep charcoal-navy backgrounds, gold/amber accents, light text.
 * Per-category hues are brightened for dark-bg contrast and applied
 * consistently to chips, card accents and icons everywhere a category is shown.
 */

export const palette = {
  bg: '#0C0F1A',
  bgElevated: '#141829',
  surface: '#1A1F35',
  surfaceAlt: '#222842',
  surfaceSunken: '#12162A',

  border: '#2A3050',
  borderStrong: '#3A4268',

  text: '#F1F5F9',
  textMuted: '#94A3B8',
  textFaint: '#64748B',
  textInverse: '#0C0F1A',

  primary: '#D4A843',
  primaryDark: '#B8922A',
  primaryLight: '#E8C76A',
  primarySoft: 'rgba(212,168,67,0.12)',

  accent: '#C084FC',

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
  primary: ['#D4A843', '#B8922A'] as const,
  primarySoft: ['#E8C76A', '#D4A843'] as const,
  success: ['#34D399', '#10B981'] as const,
  danger: ['#F87171', '#EF4444'] as const,
  sunrise: ['#FBBF24', '#F59E0B'] as const,
  ocean: ['#38BDF8', '#6366F1'] as const,
  brand: ['#D4A843', '#C084FC', '#818CF8'] as const,
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
