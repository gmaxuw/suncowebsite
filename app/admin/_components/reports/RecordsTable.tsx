// ─────────────────────────────────────────────
// reports/RecordsTable.tsx
//
// The main member payment grid.
// Handles: filter tabs, column headers, row rendering,
//          delinquency badges, totals column.
// PaymentCell and ReceiptModal are used from here.
// ─────────────────────────────────────────────
"use client";
import { useState } from "react";
import PaymentCell  from "./PaymentCell";
import ReceiptModal from "./ReceiptModal";
import type {
  Member,
  Payment,
  PaymentFilter,
  ReceiptModalData,
  DelinquencyResult,
} from "@/types/reports.types";

interface Props {
  members: Member[];
  payments: Payment[];
  currentYear: number;
  displayYears: number[];
  getDelinquency: (member: Member, payments: Payment[]) => DelinquencyResult;
  onExport: (type: string) => void;
}

const statusColor: Record<string, string> = {
  active:       "#2E8B44",
  "non-active": "#D4A017",
  dropped:      "#C0392B",
  deceased:     "#95A5A6",
};

export default function RecordsTable({
  members,
  payments,
  currentYear,
  displayYears,
  getDelinquency,
  onExport,
}: Props) {
  const [activeFilter, setActiveFilter] = useState<PaymentFilter>("all");
  const [receiptModal, setReceiptModal] = useState<ReceiptModalData | null>(null);

  // ── Filter members by payment type ──
  const filteredMembers =
    activeFilter === "all"
      ? members
      : activeFilter === "lifetime"
      ? members.filter((m) =>
          payments.some((p) => p.member_id === m.id && p.type === "lifetime")
        )
      : members;

  const filterButtons: { id: PaymentFilter; label: string; color: string }[] = [
    { id: "all",      label: "All Payments",   color: "var(--green-dk)" },
    { id: "mas",      label: "MAS Only",        color: "#2E8B44"         },
    { id: "aof",      label: "Operating Fund",  color: "#2B5FA8"         },
    { id: "lifetime", label: "Lifetime",         color: "#6B3FA0"         },
  ];

  return (
    <>
      <div
        style={{
          background: "white",
          borderRadius: 10,
          border: "1px solid rgba(26,92,42,0.08)",
          overflow: "hidden",
        }}
      >
        {/* ── Table toolbar ── */}
        <div
          style={{
            padding: "1rem 1.5rem",
            borderBottom: "1px solid rgba(26,92,42,0.08)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "0.8rem",
            background: "var(--warm)",
          }}
        >
          <h2
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "1rem",
              fontWeight: 700,
              color: "var(--green-dk)",
            }}
          >
            All Records — {filteredMembers.length} Members
          </h2>

          {/* Filter pills */}
          <div style={{ display: "flex", gap: "0.4rem" }}>
            {filterButtons.map(({ id, label, color }) => (
              <button
                key={id}
                onClick={() => setActiveFilter(id)}
                style={{
                  padding: "0.35rem 0.9rem",
                  borderRadius: 20,
                  border: `1.5px solid ${
                    activeFilter === id ? color : "rgba(26,92,42,0.15)"
                  }`,
                  background: activeFilter === id ? color : "white",
                  color: activeFilter === id ? "white" : "var(--muted)",
                  fontSize: "0.72rem",
                  fontWeight: 500,
                  cursor: "pointer",
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Quick export buttons */}
          <div style={{ display: "flex", gap: "0.4rem" }}>
            {["excel", "csv", "pdf"].map((type) => (
              <button
                key={type}
                onClick={() => onExport(type)}
                style={{
                  background: "none",
                  border: "1px solid rgba(26,92,42,0.2)",
                  color: "var(--green-dk)",
                  padding: "0.3rem 0.8rem",
                  borderRadius: 4,
                  fontSize: "0.72rem",
                  cursor: "pointer",
                  fontFamily: "'DM Sans', sans-serif",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                {type.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* ── Legend ── */}
        <div
          style={{
            padding: "0.6rem 1.5rem",
            background: "rgba(255,255,255,0.8)",
            borderBottom: "1px solid rgba(26,92,42,0.06)",
            display: "flex",
            gap: "1.5rem",
            alignItems: "center",
          }}
        >
          <span
            style={{
              fontSize: "0.68rem",
              color: "var(--muted)",
              fontWeight: 500,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            Legend:
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: 2,
                background: "rgba(255,220,0,0.35)",
                border: "1px solid rgba(200,180,0,0.4)",
              }}
            />
            <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>
              Delinquent / Not paid
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span
              style={{
                fontSize: "0.72rem",
                color: "#2E8B44",
                fontWeight: 600,
                textDecoration: "underline",
                textDecorationStyle: "dotted",
              }}
            >
              ₱740
            </span>
            <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>
              Paid — click to view receipt
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ fontSize: "0.72rem", color: "rgba(150,150,150,0.7)" }}>N/A</span>
            <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>
              Not yet a member this year
            </span>
          </div>
        </div>

        {/* ── Table ── */}
        <div style={{ overflowX: "auto" }}>
          <table
            style={{ width: "100%", borderCollapse: "collapse", minWidth: 1000 }}
          >
            <thead>
              <tr style={{ background: "var(--green-dk)" }}>
                {["No.", "Name", "Status", "Joined"].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "0.8rem 1rem",
                      textAlign: "left",
                      fontSize: "0.65rem",
                      fontWeight: 500,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "rgba(255,255,255,0.8)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {h}
                  </th>
                ))}

                {displayYears.map((year) =>
                  activeFilter === "all" ? (
                    <th
                      key={year}
                      colSpan={2}
                      style={{
                        padding: "0.8rem 0.5rem",
                        textAlign: "center",
                        fontSize: "0.65rem",
                        fontWeight: 500,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: year === currentYear ? "var(--gold-lt)" : "rgba(255,255,255,0.8)",
                        whiteSpace: "nowrap",
                        borderLeft: "1px solid rgba(255,255,255,0.1)",
                      }}
                    >
                      {year}{year === currentYear && " ★"}
                    </th>
                  ) : (
                    <th
                      key={year}
                      style={{
                        padding: "0.8rem 0.8rem",
                        textAlign: "center",
                        fontSize: "0.65rem",
                        fontWeight: 500,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: year === currentYear ? "var(--gold-lt)" : "rgba(255,255,255,0.8)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {year}{year === currentYear && " ★"}
                    </th>
                  )
                )}

                <th style={{ padding: "0.8rem 1rem", textAlign: "center", fontSize: "0.65rem", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.8)", whiteSpace: "nowrap" }}>
                  Delinquent
                </th>
                <th style={{ padding: "0.8rem 1rem", textAlign: "right", fontSize: "0.65rem", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.8)", whiteSpace: "nowrap" }}>
                  Total
                </th>
              </tr>

              {/* MAS / AOF sub-header */}
              {activeFilter === "all" && (
                <tr style={{ background: "rgba(13,51,24,0.9)" }}>
                  <th colSpan={4} />
                  {displayYears.map((year) => (
                    <>
                      <th key={`${year}-mas`} style={{ padding: "0.4rem 0.5rem", textAlign: "center", fontSize: "0.6rem", color: "rgba(212,160,23,0.7)", fontWeight: 500, letterSpacing: "0.06em", borderLeft: "1px solid rgba(255,255,255,0.1)" }}>
                        MAS
                      </th>
                      <th key={`${year}-aof`} style={{ padding: "0.4rem 0.5rem", textAlign: "center", fontSize: "0.6rem", color: "rgba(100,150,255,0.7)", fontWeight: 500, letterSpacing: "0.06em" }}>
                        AOF
                      </th>
                    </>
                  ))}
                  <th colSpan={2} style={{ padding: "0.8rem 1rem", textAlign: "right", fontSize: "0.65rem", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.8)", whiteSpace: "nowrap" }}>
                    Paid / Owed
                  </th>
                </tr>
              )}
            </thead>

            <tbody>
              {filteredMembers.map((m, i) => {
                const memberPayments = payments.filter((p) => p.member_id === m.id);
                const delinquency    = getDelinquency(m, payments);
                const total          = memberPayments.reduce((s, p) => s + Number(p.amount), 0);
                const displayStatus  = delinquency.derivedStatus;

                // Derive join year for the Joined column
                const py   = memberPayments.map((p) => p.year).filter(Boolean);
                const epy  = py.length > 0 ? Math.min(...py) : null;
                const djy  = m.date_joined ? new Date(m.date_joined).getFullYear() : null;
                const joinYear = Math.min(
                  ...([djy, epy, currentYear].filter(Boolean) as number[])
                ) || 0;

                return (
                  <tr
                    key={m.id}
                    style={{
                      borderBottom: "1px solid rgba(26,92,42,0.06)",
                      background: i % 2 === 0 ? "white" : "var(--cream)",
                    }}
                  >
                    <td style={{ padding: "0.7rem 1rem", fontSize: "0.8rem", color: "var(--muted)" }}>
                      {i + 1}
                    </td>
                    <td style={{ padding: "0.7rem 1rem", fontSize: "0.85rem", fontWeight: 500, color: "var(--green-dk)", whiteSpace: "nowrap" }}>
                      {m.last_name}, {m.first_name}
                      {m.middle_name ? ` ${m.middle_name[0]}.` : ""}
                    </td>

                    {/* Status badge */}
                    <td style={{ padding: "0.7rem 1rem" }}>
                      <span
                        style={{
                          background: `${statusColor[displayStatus] || "#95A5A6"}22`,
                          color: statusColor[displayStatus] || "#95A5A6",
                          fontSize: "0.68rem",
                          fontWeight: 500,
                          padding: "2px 8px",
                          borderRadius: 20,
                          textTransform: "capitalize",
                        }}
                      >
                        {displayStatus}
                      </span>
                    </td>

                    {/* Joined year */}
                    <td style={{ padding: "0.7rem 1rem", fontSize: "0.75rem", color: "var(--muted)", whiteSpace: "nowrap" }}>
                      {joinYear || "—"}
                    </td>

                    {/* Payment cells */}
                    {displayYears.map((year) =>
                      activeFilter === "all" ? (
                        <>
                          <PaymentCell key={`${m.id}-${year}-mas`} memberId={m.id} year={year} type="mas" members={members} payments={payments} currentYear={currentYear} onReceiptClick={setReceiptModal} />
                          <PaymentCell key={`${m.id}-${year}-aof`} memberId={m.id} year={year} type="aof" members={members} payments={payments} currentYear={currentYear} onReceiptClick={setReceiptModal} />
                        </>
                      ) : activeFilter === "lifetime" ? (
                        year === displayYears[0] ? (
                          <td key={`${m.id}-lifetime`} colSpan={displayYears.length} style={{ padding: "0.7rem 1rem", textAlign: "center" }}>
                            {memberPayments.some((p) => p.type === "lifetime") ? (
                              <span
                                style={{ color: "#2E8B44", fontWeight: 600, textDecoration: "underline", textDecorationStyle: "dotted", cursor: "pointer" }}
                                onClick={() => {
                                  const lp = memberPayments.filter((p) => p.type === "lifetime");
                                  setReceiptModal({ member: m, payments: lp, year: lp[0]?.year, type: "lifetime", total: lp.reduce((s, p) => s + Number(p.amount), 0) });
                                }}
                              >
                                ₱{memberPayments.filter((p) => p.type === "lifetime").reduce((s, p) => s + Number(p.amount), 0).toLocaleString()} ✓
                              </span>
                            ) : (
                              <span style={{ color: "#C0392B", fontSize: "0.75rem" }}>Not paid</span>
                            )}
                          </td>
                        ) : null
                      ) : (
                        <PaymentCell key={`${m.id}-${year}-${activeFilter}`} memberId={m.id} year={year} type={activeFilter} members={members} payments={payments} currentYear={currentYear} onReceiptClick={setReceiptModal} />
                      )
                    )}

                    {/* Delinquent badge */}
                    <td style={{ padding: "0.7rem 1rem", textAlign: "center" }}>
                      {activeFilter === "lifetime" ? (
                        <span style={{ color: "var(--muted)", fontSize: "0.72rem" }}>—</span>
                      ) : delinquency.count > 0 ? (
                        <span
                          style={{
                            background: delinquency.count >= 3 ? "rgba(192,57,43,0.15)" : delinquency.count >= 2 ? "rgba(212,160,23,0.15)" : "rgba(192,57,43,0.08)",
                            color:      delinquency.count >= 3 ? "#C0392B"               : delinquency.count >= 2 ? "#B8860B"               : "#C0392B",
                            fontSize: "0.72rem",
                            fontWeight: 600,
                            padding: "3px 8px",
                            borderRadius: 20,
                          }}
                        >
                          {delinquency.count} yr{delinquency.count > 1 ? "s" : ""}
                        </span>
                      ) : (
                        <span style={{ color: "#2E8B44", fontSize: "0.72rem", fontWeight: 500 }}>
                          ✓ Current
                        </span>
                      )}
                    </td>

                    {/* Total + owed */}
                    <td style={{ padding: "0.7rem 1rem", textAlign: "right" }}>
                      <div style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--green-dk)" }}>
                        ₱{total.toLocaleString()}
                      </div>
                      {delinquency.count > 0 && activeFilter !== "lifetime" && (
                        <div style={{ fontSize: "0.7rem", color: "#C0392B", fontWeight: 500, marginTop: 2 }}>
                          owed ₱{(delinquency.count * 840).toLocaleString()}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Receipt modal (rendered here, state owned here) ── */}
      {receiptModal && (
        <ReceiptModal data={receiptModal} onClose={() => setReceiptModal(null)} />
      )}
    </>
  );
}
