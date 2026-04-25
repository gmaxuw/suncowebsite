"use client";
// ─────────────────────────────────────────────
// MemberDelinquencyTable.tsx
//
// Self-contained component — pass in member + payments,
// renders a personal payment grid exactly like the admin
// Reports table but filtered to just this one member.
//
// Usage in dashboard/page.tsx:
//   import MemberDelinquencyTable from "@/app/components/MemberDelinquencyTable";
//   ...
//   <MemberDelinquencyTable member={member} payments={payments} />
// ─────────────────────────────────────────────

import { useState } from "react";
import { Receipt, X } from "lucide-react";

interface Payment {
  id: string;
  year: number;
  type: "aof" | "mas" | "lifetime";
  amount: number;
  date_paid: string;
  receipt_number?: string;
}

interface Member {
  id: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  date_joined?: string;
  status?: string;
}

interface Props {
  member: Member;
  payments: Payment[];
}

const AOF_AMOUNT = 100;
const MAS_AMOUNT = 740;

export default function MemberDelinquencyTable({ member, payments }: Props) {
  const [receiptModal, setReceiptModal] = useState<Payment | null>(null);

  const currentYear = new Date().getFullYear();

  // ── Build year range: join year → current year ──
  const joinYear = member.date_joined
    ? new Date(member.date_joined).getFullYear()
    : currentYear;

  const years: number[] = [];
  for (let y = joinYear; y <= currentYear; y++) years.push(y);

  // ── Per-year payment lookup ──
  const getPayment = (year: number, type: "aof" | "mas") =>
    payments.find(p => p.year === year && p.type === type) || null;

  // ── Delinquency counts ──
  let totalDelinquent = 0;
  let consecutiveStreak = 0;

  for (let y = joinYear; y <= currentYear; y++) {
    const hasMas = !!getPayment(y, "mas");
    const hasAof = !!getPayment(y, "aof");
    if (!hasMas || !hasAof) totalDelinquent++;
  }

  for (let y = currentYear; y >= joinYear; y--) {
    const hasMas = !!getPayment(y, "mas");
    const hasAof = !!getPayment(y, "aof");
    if (!hasMas || !hasAof) consecutiveStreak++;
    else break;
  }

  const totalPaid = payments
    .filter(p => p.type === "aof" || p.type === "mas")
    .reduce((s, p) => s + Number(p.amount), 0);

  const totalOwed = totalDelinquent * (AOF_AMOUNT + MAS_AMOUNT);

const memberName = [member.first_name, member.middle_name?.trim() ? member.middle_name.trim()[0] + "." : null, member.last_name].filter(Boolean).join(" ");

  // ── Derived status color ──
  const statusStyle: Record<string, { bg: string; color: string }> = {
    active:       { bg: "#E6F9ED", color: "#1A6B35" },
    "non-active": { bg: "#FFF8E1", color: "#A66C00" },
    dropped:      { bg: "#FDECEA", color: "#A8200D" },
    deceased:     { bg: "#F2F2F2", color: "#666"    },
  };
  const ss = statusStyle[member.status || "active"] || statusStyle.active;

  // ── Cell renderer ──
  const PayCell = ({ year, type }: { year: number; type: "aof" | "mas" }) => {
    const p = getPayment(year, type);
    const amount = type === "aof" ? AOF_AMOUNT : MAS_AMOUNT;

    if (p) {
      return (
        <td style={{ padding: "0.7rem 0.5rem", textAlign: "center", verticalAlign: "middle" }}>
          <button
            onClick={() => setReceiptModal(p)}
            title={`View receipt — ${p.receipt_number || "no receipt"}`}
            style={{
              background: "none", border: "none", cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "0.82rem", fontWeight: 700,
              color: "#1A6B35",
              padding: "3px 6px", borderRadius: 4,
              transition: "background 0.1s",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(26,107,53,0.08)")}
            onMouseLeave={e => (e.currentTarget.style.background = "none")}
          >
            ₱{amount}
          </button>
        </td>
      );
    }

    // Unpaid
    return (
      <td style={{
        padding: "0.7rem 0.5rem", textAlign: "center",
        background: "rgba(255,235,153,0.35)",
        verticalAlign: "middle",
      }}>
        <span style={{ color: "#BBB", fontSize: "0.88rem" }}>—</span>
      </td>
    );
  };

  return (
    <div style={{
      background: "white",
      borderRadius: 12,
      border: "1px solid rgba(0,0,0,0.07)",
      overflow: "hidden",
      boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
      fontFamily: "'DM Sans', sans-serif",
    }}>

      {/* ── Header ── */}
      <div style={{
        padding: "1.2rem 1.5rem",
        borderBottom: "1px solid rgba(0,0,0,0.06)",
        background: "#F9F8F5",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        flexWrap: "wrap", gap: "0.5rem",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Receipt size={18} color="#1A5C2A" />
          <div>
            <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1.1rem", color: "#0D3320", fontWeight: 400, margin: 0 }}>
              My Payment Record
            </h2>
            <p style={{ fontSize: "0.72rem", color: "#AAA", marginTop: 2 }}>
              Personal dues history — {joinYear} to {currentYear}
            </p>
          </div>
        </div>

        {/* Summary chips */}
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <span style={{ background: "#E6F9ED", color: "#1A6B35", fontSize: "0.75rem", fontWeight: 700, padding: "4px 12px", borderRadius: 20 }}>
            ₱{totalPaid.toLocaleString()} paid
          </span>
          {totalDelinquent > 0 && (
            <span style={{ background: "#FDECEA", color: "#A8200D", fontSize: "0.75rem", fontWeight: 700, padding: "4px 12px", borderRadius: 20 }}>
              {totalDelinquent} yr{totalDelinquent > 1 ? "s" : ""} delinquent · owed ₱{totalOwed.toLocaleString()}
            </span>
          )}
        </div>
      </div>

      {/* ── Legend ── */}
      <div style={{
        padding: "0.6rem 1.5rem",
        background: "#FAFAF8",
        borderBottom: "1px solid rgba(0,0,0,0.05)",
        display: "flex", alignItems: "center", gap: "1.5rem", flexWrap: "wrap",
      }}>
        <span style={{ fontSize: "0.68rem", color: "#888", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Legend:</span>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 14, height: 14, borderRadius: 3, background: "rgba(255,235,153,0.6)", border: "1px solid #E8D878" }} />
          <span style={{ fontSize: "0.72rem", color: "#888" }}>Delinquent / Not paid</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#1A6B35" }}>₱740</span>
          <span style={{ fontSize: "0.72rem", color: "#888" }}>Paid — click to view receipt</span>
        </div>
      </div>

      {/* ── Scrollable table ── */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 500 }}>

          {/* Column headers — years */}
          <thead>
            <tr style={{ background: "#0D3320" }}>
              <th style={{ padding: "0.8rem 1rem", textAlign: "left", fontSize: "0.65rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.5)", width: 160, minWidth: 140 }}>Name</th>
              <th style={{ padding: "0.8rem 0.6rem", textAlign: "center", fontSize: "0.65rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.5)", width: 80 }}>Status</th>
              {years.map(y => (
                <th key={y} colSpan={2} style={{
                  padding: "0.7rem 0.4rem",
                  textAlign: "center",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  color: y === currentYear ? "#C9A84C" : "rgba(255,255,255,0.75)",
                  borderLeft: "1px solid rgba(255,255,255,0.08)",
                  whiteSpace: "nowrap",
                }}>
                  {y}{y === currentYear ? " ★" : ""}
                </th>
              ))}
              <th style={{ padding: "0.8rem 0.8rem", textAlign: "center", fontSize: "0.65rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#E8A87C", borderLeft: "1px solid rgba(255,255,255,0.1)", whiteSpace: "nowrap" }}>Delinquent</th>
              <th style={{ padding: "0.8rem 1rem", textAlign: "right", fontSize: "0.65rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.5)", borderLeft: "1px solid rgba(255,255,255,0.08)", whiteSpace: "nowrap" }}>Total</th>
            </tr>

            {/* MAS / AOF sub-headers */}
            <tr style={{ background: "#0D3320", borderBottom: "2px solid rgba(201,168,76,0.3)" }}>
              <th colSpan={2} style={{ padding: "0 0 0.6rem" }} />
              {years.map(y => (
                <>
                  <th key={`${y}-mas`} style={{ padding: "0 0 0.6rem", textAlign: "center", fontSize: "0.6rem", fontWeight: 600, letterSpacing: "0.08em", color: "#5DBD7A", borderLeft: "1px solid rgba(255,255,255,0.08)" }}>MAS</th>
                  <th key={`${y}-aof`} style={{ padding: "0 0 0.6rem", textAlign: "center", fontSize: "0.6rem", fontWeight: 600, letterSpacing: "0.08em", color: "#7BB8E8" }}>AOF</th>
                </>
              ))}
              <th colSpan={2} />
            </tr>
          </thead>

          <tbody>
            <tr style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
              {/* Name */}
              <td style={{ padding: "1rem 1rem", verticalAlign: "middle" }}>
                <p style={{ fontSize: "0.92rem", fontWeight: 700, color: "#0D3320", whiteSpace: "nowrap" }}>{memberName}</p>
              </td>

              {/* Status */}
              <td style={{ padding: "1rem 0.6rem", textAlign: "center", verticalAlign: "middle" }}>
                <span style={{ background: ss.bg, color: ss.color, fontSize: "0.68rem", fontWeight: 700, padding: "3px 10px", borderRadius: 20, textTransform: "capitalize", whiteSpace: "nowrap" }}>
                  {member.status || "Active"}
                </span>
              </td>

              {/* Year cells */}
              {years.map(y => (
                <>
                  <PayCell key={`${y}-mas`} year={y} type="mas" />
                  <PayCell key={`${y}-aof`} year={y} type="aof" />
                </>
              ))}

              {/* Delinquent count */}
              <td style={{ padding: "1rem 0.8rem", textAlign: "center", verticalAlign: "middle", borderLeft: "1px solid rgba(0,0,0,0.06)" }}>
                {totalDelinquent > 0 ? (
                  <span style={{ background: "#FDECEA", color: "#A8200D", fontSize: "0.78rem", fontWeight: 700, padding: "3px 10px", borderRadius: 20 }}>
                    {totalDelinquent} yr{totalDelinquent > 1 ? "s" : ""}
                  </span>
                ) : (
                  <span style={{ color: "#1A6B35", fontSize: "0.78rem", fontWeight: 700 }}>✓</span>
                )}
              </td>

              {/* Total */}
              <td style={{ padding: "1rem 1rem", textAlign: "right", verticalAlign: "middle", borderLeft: "1px solid rgba(0,0,0,0.06)" }}>
                <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1rem", fontWeight: 700, color: "#0D3320", whiteSpace: "nowrap" }}>
                  ₱{totalPaid.toLocaleString()}
                </p>
                {totalDelinquent > 0 && (
                  <p style={{ fontSize: "0.72rem", color: "#A8200D", fontWeight: 600, whiteSpace: "nowrap" }}>
                    owed ₱{totalOwed.toLocaleString()}
                  </p>
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ── Streak notice ── */}
      {consecutiveStreak > 0 && (
        <div style={{
          padding: "0.8rem 1.5rem",
          background: consecutiveStreak >= 3 ? "#FDECEA" : consecutiveStreak >= 2 ? "#FFF8E1" : "#F9F8F5",
          borderTop: "1px solid rgba(0,0,0,0.05)",
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <span style={{ fontSize: "1rem" }}>{consecutiveStreak >= 3 ? "⛔" : consecutiveStreak >= 2 ? "⚠️" : "ℹ️"}</span>
          <p style={{ fontSize: "0.82rem", color: consecutiveStreak >= 3 ? "#A8200D" : consecutiveStreak >= 2 ? "#A66C00" : "#555", fontWeight: 600 }}>
            {consecutiveStreak} consecutive unpaid year{consecutiveStreak > 1 ? "s" : ""} —
            {consecutiveStreak >= 3 ? " membership is Dropped. Contact officers to reinstate." :
             consecutiveStreak >= 2 ? " account is Non-Active. Settle dues to restore benefits." :
             " settle this year's dues to stay Active."}
          </p>
        </div>
      )}

      {/* ── Receipt Modal ── */}
      {receiptModal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
          zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center",
          padding: "2rem",
        }}>
          <div style={{
            background: "white", borderRadius: 14, maxWidth: 400, width: "100%",
            overflow: "hidden", boxShadow: "0 24px 60px rgba(0,0,0,0.3)",
          }}>
            <div style={{ background: "#0D3320", padding: "1.2rem 1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <p style={{ fontSize: "0.58rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 2 }}>Payment Record</p>
                <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1rem", color: "#C9A84C" }}>Receipt Details</h3>
              </div>
              <button onClick={() => setReceiptModal(null)} style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "white", width: 28, height: 28, borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <X size={13} />
              </button>
            </div>
            <div style={{ padding: "1.5rem" }}>
              {[
                ["Year",        receiptModal.year],
                ["Type",        receiptModal.type.toUpperCase()],
                ["Amount",      `₱${Number(receiptModal.amount).toLocaleString()}`],
                ["Date Paid",   receiptModal.date_paid ? new Date(receiptModal.date_paid).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "—"],
                ["Receipt No.", receiptModal.receipt_number || "—"],
              ].map(([label, value]) => (
                <div key={label as string} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.7rem 0", borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
                  <span style={{ fontSize: "0.75rem", color: "#AAA", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span>
                  <span style={{ fontSize: "0.92rem", fontWeight: 700, color: "#0D3320", fontFamily: label === "Receipt No." ? "monospace" : "'DM Sans', sans-serif" }}>{value as string}</span>
                </div>
              ))}
              <button onClick={() => setReceiptModal(null)} style={{ width: "100%", marginTop: "1.2rem", padding: "0.75rem", background: "#0D3320", border: "none", borderRadius: 8, color: "white", fontSize: "0.88rem", fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
