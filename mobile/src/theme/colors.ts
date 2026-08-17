/**
 * Light, colorful, premium palette.
 * The per-category hues are what give the app its color identity -- they're applied
 * consistently to chips, card accents and icons everywhere a category is shown, so a
 * "drainage" hotspot reads the same on the citizen list, the authority list and a project card.
 */

export const palette = {
  bg: '#F6F8FD',
  bgElevated: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceAlt: '#F0F4FA',
  surfaceSunken: '#EAEFF7',

  border: '#E4E9F2',
  borderStrong: '#D3DBE8',

  text: '#0F172A',
  textMuted: '#64748B',
  textFaint: '#94A3B8',
  textInverse: '#FFFFFF',

  primary: '#4F46E5',
  primaryDark: '#4338CA',
  primaryLight: '#818CF8',
  primarySoft: '#EEF0FE',

  accent: '#7C3AED',

  success: '#16A34A',
  successSoft: '#E7F6ED',
  warning: '#F59E0B',
  warningSoft: '#FEF4E3',
  danger: '#EF4444',
  dangerSoft: '#FDECEC',
  info: '#0EA5E9',
  infoSoft: '#E4F5FD',

  white: '#FFFFFF',
  black: '#000000',
} as const;

export const gradients = {
  primary: ['#4F46E5', '#7C3AED'] as const,
  primarySoft: ['#6366F1', '#8B5CF6'] as const,
  success: ['#16A34A', '#22C55E'] as const,
  danger: ['#EF4444', '#F97316'] as const,
  sunrise: ['#F59E0B', '#EF4444'] as const,
  ocean: ['#0EA5E9', '#4F46E5'] as const,
  brand: ['#4F46E5', '#7C3AED', '#A855F7'] as const,
};

export interface CategoryStyle {
  color: string;
  soft: string;
  icon: string;
  label: string;
}

/** Every infrastructure category the backend can return (see API_CONTRACT.md). */
export const categoryStyles: Record<string, CategoryStyle> = {
  drainage: { color: '#0891B2', soft: '#E0F6FB', icon: '🌊', label: 'Drainage' },
  road: { color: '#D97706', soft: '#FEF3E2', icon: '🛣️', label: 'Road' },
  streetlight: { color: '#CA8A04', soft: '#FEF9E3', icon: '💡', label: 'Streetlight' },
  waste_management: { color: '#16A34A', soft: '#E7F6ED', icon: '🗑️', label: 'Waste' },
  water_supply: { color: '#2563EB', soft: '#E6EDFD', icon: '💧', label: 'Water Supply' },
  sanitation: { color: '#7C3AED', soft: '#F1E9FD', icon: '🚻', label: 'Sanitation' },
  electricity: { color: '#DC2626', soft: '#FDECEC', icon: '⚡', label: 'Electricity' },
  other: { color: '#64748B', soft: '#EEF2F7', icon: '📋', label: 'Other' },
};

export function categoryStyle(category: string | null | undefined): CategoryStyle {
  if (!category) return categoryStyles.other;
  return categoryStyles[category] ?? categoryStyles.other;
}

/** Severity 1-5 as returned by the AI extraction. */
export const severityStyles: Record<number, { color: string; soft: string; label: string }> = {
  1: { color: '#16A34A', soft: '#E7F6ED', label: 'Minor' },
  2: { color: '#65A30D', soft: '#EEF6E2', label: 'Low' },
  3: { color: '#F59E0B', soft: '#FEF4E3', label: 'Moderate' },
  4: { color: '#EA580C', soft: '#FDEEE4', label: 'High' },
  5: { color: '#DC2626', soft: '#FDECEC', label: 'Critical' },
};

export function severityStyle(severity: number | null | undefined) {
  if (!severity) return { color: palette.textMuted, soft: palette.surfaceAlt, label: 'Unknown' };
  return severityStyles[Math.max(1, Math.min(5, severity))];
}

/** Complaint + project + budget-run statuses. */
export const statusStyles: Record<string, { color: string; soft: string; label: string }> = {
  received: { color: '#64748B', soft: '#EEF2F7', label: 'Received' },
  processed: { color: '#0EA5E9', soft: '#E4F5FD', label: 'Processed' },
  clustered: { color: '#7C3AED', soft: '#F1E9FD', label: 'Clustered' },
  in_progress: { color: '#F59E0B', soft: '#FEF4E3', label: 'In Progress' },
  resolved: { color: '#16A34A', soft: '#E7F6ED', label: 'Resolved' },
  open: { color: '#0EA5E9', soft: '#E4F5FD', label: 'Open' },
  validated: { color: '#7C3AED', soft: '#F1E9FD', label: 'Validated' },
  actioned: { color: '#16A34A', soft: '#E7F6ED', label: 'Actioned' },
  candidate: { color: '#64748B', soft: '#EEF2F7', label: 'Candidate' },
  selected: { color: '#4F46E5', soft: '#EEF0FE', label: 'Selected' },
  approved: { color: '#16A34A', soft: '#E7F6ED', label: 'Approved' },
  rejected: { color: '#EF4444', soft: '#FDECEC', label: 'Rejected' },
  draft: { color: '#64748B', soft: '#EEF2F7', label: 'Draft' },
};

export function statusStyle(status: string | null | undefined) {
  if (!status) return { color: palette.textMuted, soft: palette.surfaceAlt, label: '—' };
  return statusStyles[status] ?? { color: palette.textMuted, soft: palette.surfaceAlt, label: status };
}
