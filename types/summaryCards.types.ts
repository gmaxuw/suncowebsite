// ─────────────────────────────────────────────
// types/summaryCards.types.ts
// ─────────────────────────────────────────────

export interface SummaryCardItem {
  /** Label shown above the value, e.g. "Total Collected" */
  label: string;
  /** Formatted value string, e.g. "₱12,500" */
  value: string;
  /** Accent color for the left border and value text */
  color: string;
}
