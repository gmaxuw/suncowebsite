// ─────────────────────────────────────────────
// hooks/useReportsData.ts
// Fetches approved members + all payments.
// Also auto-syncs derived status back to Supabase
// when delinquency rules change.
// ─────────────────────────────────────────────
import { useEffect, useState } from "react";
import type { Member, Payment } from "@/types/reports.types";

interface UseReportsDataResult {
  members: Member[];
  payments: Payment[];
  loading: boolean;
  setMembers: React.Dispatch<React.SetStateAction<Member[]>>;
}

export function useReportsData(
  supabase: any,
  getDelinquency: (member: Member, payments: Payment[]) => { derivedStatus: string }
): UseReportsDataResult {
  const [members, setMembers] = useState<Member[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Initial load ──
  useEffect(() => {
    const load = async () => {
      const { data: m } = await supabase
        .from("members")
        .select("*")
        .eq("approval_status", "approved")
        .order("last_name");

      const { data: p } = await supabase
        .from("payments")
        .select("*")
        .order("date_paid", { ascending: false });

      setMembers(m || []);
      setPayments(p || []);
      setLoading(false);
    };
    load();
  }, []);

  // ── Auto-sync derived status back to Supabase ──
  // Skips deceased — those are permanent/manual.
  useEffect(() => {
    if (!members.length || !payments.length) return;

    members.forEach(async (m) => {
      if (m.status === "deceased") return;

      const { derivedStatus } = getDelinquency(m, payments);
      if (derivedStatus !== m.status) {
        await supabase
          .from("members")
          .update({ status: derivedStatus })
          .eq("id", m.id);

        setMembers((prev) =>
          prev.map((mem) =>
            mem.id === m.id ? { ...mem, status: derivedStatus } : mem
          )
        );
      }
    });
  }, [members.length, payments.length]);

  return { members, payments, loading, setMembers };
}
