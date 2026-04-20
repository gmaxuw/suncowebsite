// ─────────────────────────────────────────────
// hooks/useDelinquency.ts
//
// Pure logic hook — no Supabase, no UI.
// Contains the two calculations:
//   1. totalDelinquent  → shown in the Delinquent column
//   2. consecutiveStreak → drives the status badge
//
// Rules:
//   0–1 consecutive unpaid → active
//   2 consecutive unpaid   → non-active
//   3+ consecutive unpaid  → dropped
// ─────────────────────────────────────────────
import type { Member, Payment, DelinquencyResult } from "@/types/reports.types";

const currentYear = new Date().getFullYear();

export function useDelinquency() {
  const getDelinquency = (
    member: Member,
    payments: Payment[]
  ): DelinquencyResult => {
    const memberPayments = payments.filter((p) => p.member_id === member.id);

    // ── Determine earliest year member could owe dues ──
    const paymentYears = memberPayments.map((p) => p.year).filter(Boolean);
    const earliestPaymentYear =
      paymentYears.length > 0 ? Math.min(...paymentYears) : null;
    const dateJoinedYear = member.date_joined
      ? new Date(member.date_joined).getFullYear()
      : null;

    const joinYear = Math.min(
      ...([dateJoinedYear, earliestPaymentYear, currentYear].filter(
        Boolean
      ) as number[])
    );

    // ── CALCULATION 1: Total unpaid years (Delinquent column) ──
    // Counts every year with missing payment regardless of gaps
    let totalDelinquent = 0;
    const delinquentYears: number[] = [];

    for (let year = joinYear; year <= currentYear; year++) {
      const hasMas = memberPayments.some(
        (p) => p.year === year && p.type === "mas"
      );
      const hasAof = memberPayments.some(
        (p) => p.year === year && p.type === "aof"
      );
      if (!hasMas || !hasAof) {
        totalDelinquent++;
        delinquentYears.push(year);
      }
    }

    // ── CALCULATION 2: Consecutive trailing streak (Status only) ──
    // Walks BACKWARDS from currentYear, stops at first fully-paid year.
    let consecutiveStreak = 0;

    for (let year = currentYear; year >= joinYear; year--) {
      const hasMas = memberPayments.some(
        (p) => p.year === year && p.type === "mas"
      );
      const hasAof = memberPayments.some(
        (p) => p.year === year && p.type === "aof"
      );
      if (!hasMas || !hasAof) {
        consecutiveStreak++;
      } else {
        break;
      }
    }

    // ── Derive status from streak (never overrides deceased) ──
    let derivedStatus: string = member.status;
    if (member.status !== "deceased") {
      if (consecutiveStreak >= 3) {
        derivedStatus = "dropped";
      } else if (consecutiveStreak >= 2) {
        derivedStatus = "non-active";
      } else {
        derivedStatus = "active";
      }
    }

    return {
      count: totalDelinquent,
      streak: consecutiveStreak,
      years: delinquentYears,
      joinYear,
      derivedStatus,
    };
  };

  return { getDelinquency, currentYear };
}
