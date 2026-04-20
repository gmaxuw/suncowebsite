export {};

// ─────────────────────────────────────────────
// types/reports.types.ts
// All shared interfaces for the Reports feature
// ─────────────────────────────────────────────

export interface Member {
  id: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  date_joined?: string;
  member_id_code?: string;
  status: string;
  approval_status: string;
}

export interface Payment {
  id: string;
  member_id: string;
  year: number;
  type: "mas" | "aof" | "lifetime";
  amount: number | string;
  date_paid?: string;
  receipt_number?: string;
  created_at?: string;
}

export interface DelinquencyResult {
  /** Total unpaid years (shown in Delinquent column) */
  count: number;
  /** Consecutive trailing streak (drives status derivation) */
  streak: number;
  /** List of every unpaid year */
  years: number[];
  /** Earliest year the member could owe dues */
  joinYear: number;
  /** Status derived from streak rules */
  derivedStatus: string;
}

export interface ReceiptModalData {
  member: Member;
  payments: Payment[];
  year?: number;
  type: string;
  total: number;
}

export interface SummaryCardItem {
  label: string;
  value: string;
  color: string;
}

export type PaymentFilter = "all" | "mas" | "aof" | "lifetime";
