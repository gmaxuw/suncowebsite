"use client";
// ─────────────────────────────────────────────
// ReportsTab.tsx
// Dynamic year columns (5 years back from today)
// Smart delinquency — current TRAILING streak only
// Auto-derives status: active / non-active / dropped
// Payment type sorter (MAS, AOF, Lifetime)
// Clickable amounts show receipt modal
// Export: Excel, CSV, PDF
// ─────────────────────────────────────────────
import { useEffect, useState } from "react";
import { X } from "lucide-react";

interface Props {
  canCRUD: boolean;
  supabase: any;
}

export default function ReportsTab({ canCRUD, supabase }: Props) {
  const [members, setMembers] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState("");
  const [importing, setImporting] = useState(false);
  const [importLog, setImportLog] = useState<string[]>([]);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [activeFilter, setActiveFilter] = useState<"all" | "mas" | "aof" | "lifetime">("all");
  const [receiptModal, setReceiptModal] = useState<any>(null);

  // ── Dynamic years: 5 years back from current year ──
  const currentYear = new Date().getFullYear();
  const displayYears = Array.from({ length: 5 }, (_, i) => currentYear - 4 + i);

  // ── Load data ──
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

  // ── Auto-sync derived status back to Supabase when data loads ──
  // Skips deceased and manually-dropped members
  useEffect(() => {
    if (!members.length || !payments.length) return;

    members.forEach(async (m) => {
      // Never overwrite deceased or dropped — those are manual/permanent
      if (m.status === "deceased" || m.status === "dropped") return;

      const { derivedStatus } = getDelinquency(m);
      if (derivedStatus !== m.status) {
        await supabase
          .from("members")
          .update({ status: derivedStatus })
          .eq("id", m.id);

        // Update local state too so UI reflects immediately
        setMembers((prev) =>
          prev.map((mem) =>
            mem.id === m.id ? { ...mem, status: derivedStatus } : mem
          )
        );
      }
    });
  }, [members.length, payments.length]);

  // ── Get payments for a member, year, and type ──
  const getMemberPayment = (memberId: string, year: number, type: string) =>
    payments.filter(
      (p) => p.member_id === memberId && p.year === year && p.type === type
    );

  // ── Calculate delinquency using CURRENT TRAILING STREAK ──
  // Walks backwards from currentYear — stops at the first fully-paid year.
  // This is what drives the status rules:
  //   0–1 yrs trailing → active
  //   2 yrs trailing   → non-active
  //   3+ yrs trailing  → dropped
                                            const getDelinquency = (member: any) => {
                                              const memberPayments = payments.filter((p) => p.member_id === member.id);

                                              // Determine the earliest year the member could owe dues
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

                                              // ── CALCULATION 1: TOTAL unpaid years (for the Delinquent column) ──
                                              // Counts every year with missing payment, regardless of gaps
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

                                              // ── CALCULATION 2: CONSECUTIVE trailing streak (for Status only) ──
                                              // Walks BACKWARDS from currentYear, stops at the first fully-paid year.
                                              // This matches the membership rules:
                                              //   0–1 consecutive → active
                                              //   2 consecutive   → non-active
                                              //   3+ consecutive  → dropped
                                              let consecutiveStreak = 0;

                                              for (let year = currentYear; year >= joinYear; year--) {
                                                const hasMas = memberPayments.some(
                                                  (p) => p.year === year && p.type === "mas"
                                                );
                                                const hasAof = memberPayments.some(
                                                  (p) => p.year === year && p.type === "aof"
                                                );
                                                const fullyPaid = hasMas && hasAof;

                                                if (!fullyPaid) {
                                                  consecutiveStreak++;
                                                } else {
                                                  break; // streak broken — stop counting
                                                }
                                              }

                                              // ── Derive status from CONSECUTIVE streak (never override deceased/dropped-manual) ──
                                              let derivedStatus: string = member.status;
                                              if (member.status !== "deceased" && member.status !== "dropped") {
                                                if (consecutiveStreak >= 3) {
                                                  derivedStatus = "dropped";
                                                } else if (consecutiveStreak >= 2) {
                                                  derivedStatus = "non-active";
                                                } else {
                                                  derivedStatus = "active";
                                                }
                                              }

                                              return {
                                                count: totalDelinquent,       // shown in the Delinquent column
                                                streak: consecutiveStreak,    // used for status derivation
                                                years: delinquentYears,
                                                joinYear,
                                                derivedStatus,
                                              };
                                            };
  // ── Build records for export ──
  const buildRecords = () => {
    return members.map((m, i) => {
      const memberPayments = payments.filter((p) => p.member_id === m.id);
      const delinquency = getDelinquency(m);
      return {
        no: i + 1,
        name: `${m.last_name}, ${m.first_name}${
          m.middle_name ? " " + m.middle_name[0] + "." : ""
        }`,
        status: delinquency.derivedStatus,
        member_id_code: m.member_id_code || "—",
        date_joined: m.date_joined || "—",
        payments: memberPayments.map((p) => ({
          year: p.year,
          date: p.date_paid
            ? new Date(p.date_paid).toLocaleDateString("en-PH")
            : "—",
          amount: Number(p.amount),
          receipt: p.receipt_number || "—",
          type: p.type,
        })),
        years_delinquent: delinquency.count,
        total_amount: memberPayments.reduce((s, p) => s + Number(p.amount), 0),
      };
    });
  };

  const handleExport = async (type: string) => {
    setExporting(type);
    const { exportToCSV, exportToExcel, exportToPDF } = await import(
      "@/utils/export"
    );
    const records = buildRecords();
    const filename = `SUNCO-Records-${
      new Date().toISOString().split("T")[0]
    }`;
    if (type === "csv") exportToCSV(records, filename);
    if (type === "excel") exportToExcel(records, filename);
    if (type === "pdf") exportToPDF(records, filename);
    setExporting("");
  };

  const handleImport = async () => {
    if (!importFile) return;
    setImporting(true);
    setImportLog(["Starting import..."]);
    const XLSX = await import("xlsx");
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
        let imported = 0,
          skipped = 0;
        const logs: string[] = ["Reading file..."];
        let startRow = 0;
        for (let i = 0; i < rows.length; i++) {
          if (
            rows[i] &&
            rows[i][1] &&
            String(rows[i][1]).toLowerCase().includes("name")
          ) {
            startRow = i + 1;
            break;
          }
        }
        logs.push(`Found data starting at row ${startRow + 1}`);
        setImportLog([...logs]);
        for (let i = startRow; i < rows.length; i++) {
          const row = rows[i];
          if (!row || !row[1]) continue;
          const fullName = String(row[1]).trim();
          if (!fullName || fullName === "NAME") continue;
          let firstName = "",
            lastName = "";
          if (fullName.includes(",")) {
            const parts = fullName.split(",");
            lastName = parts[0].trim();
            firstName = parts[1]?.trim() || "";
          } else {
            const parts = fullName.split(" ");
            firstName = parts[0] || "";
            lastName = parts.slice(1).join(" ") || "";
          }
          const status = String(row[2] || "")
            .trim()
            .toLowerCase();
          const { data: existing } = await supabase
            .from("members")
            .select("id")
            .ilike("last_name", lastName)
            .ilike("first_name", firstName)
            .single();
          let memberId = existing?.id;
          if (!existing) {
            const { data: newMember, error } = await supabase
              .from("members")
              .insert({
                first_name: firstName,
                last_name: lastName,
                status: status === "deceased" ? "deceased" : "active",
                approval_status: "approved",
                date_joined: "2022-01-01",
                email: `${firstName
                  .toLowerCase()
                  .replace(/\s/g, "")}.${lastName
                  .toLowerCase()
                  .replace(/\s/g, "")}@sunco.member`,
              })
              .select("id")
              .single();
            if (error) {
              logs.push(`⚠ Skipped ${fullName}: ${error.message}`);
              skipped++;
              continue;
            }
            memberId = newMember.id;
            logs.push(`✓ Imported: ${fullName}`);
            imported++;
          } else {
            logs.push(`→ Exists: ${fullName}`);
          }
          const yearCols = [
            { year: 2022, amountCol: 4 },
            { year: 2023, amountCol: 6 },
            { year: 2024, amountCol: 8 },
            { year: 2025, amountCol: 10 },
          ];
          for (const { year, amountCol } of yearCols) {
            const amount = row[amountCol];
            if (amount && Number(amount) > 0) {
              const { data: ep } = await supabase
                .from("payments")
                .select("id")
                .eq("member_id", memberId)
                .eq("year", year)
                .eq("type", "mas")
                .single();
              if (!ep)
                await supabase.from("payments").insert({
                  member_id: memberId,
                  year,
                  type: "mas",
                  amount: Number(amount),
                  date_paid: `${year}-01-01`,
                });
            }
          }
          setImportLog([...logs]);
        }
        logs.push(`━━━━━━━━━━━━━━━━━━━━━━━━`);
        logs.push(
          `✅ Done! Imported: ${imported} · Skipped: ${skipped}`
        );
        setImportLog([...logs]);
      } catch (err: any) {
        setImportLog((prev) => [...prev, `❌ Error: ${err.message}`]);
      }
      setImporting(false);
    };
    reader.readAsArrayBuffer(importFile);
  };

  const statusColor: any = {
    active: "#2E8B44",
    "non-active": "#D4A017",
    dropped: "#C0392B",
    deceased: "#95A5A6",
  };

  const totalCollected = payments.reduce((s, p) => s + Number(p.amount), 0);
  const totalMas = payments
    .filter((p) => p.type === "mas")
    .reduce((s, p) => s + Number(p.amount), 0);
  const totalAof = payments
    .filter((p) => p.type === "aof")
    .reduce((s, p) => s + Number(p.amount), 0);
  const totalLifetime = payments
    .filter((p) => p.type === "lifetime")
    .reduce((s, p) => s + Number(p.amount), 0);

  // ── Payment cell component ──
  const PaymentCell = ({
    memberId,
    year,
    type,
  }: {
    memberId: string;
    year: number;
    type: string;
  }) => {
    const memberData = members.find((m) => m.id === memberId);
    const memberPayments = payments.filter((p) => p.member_id === memberId);

    // Determine join year same way as getDelinquency
    const paymentYears = memberPayments.map((p) => p.year).filter(Boolean);
    const earliestPaymentYear =
      paymentYears.length > 0 ? Math.min(...paymentYears) : null;
    const dateJoinedYear = memberData?.date_joined
      ? new Date(memberData.date_joined).getFullYear()
      : null;
    const joinYear = Math.min(
      ...([dateJoinedYear, earliestPaymentYear, currentYear].filter(
        Boolean
      ) as number[])
    );

    // Not a member yet this year
    if (year < joinYear) {
      return (
        <td
          style={{
            padding: "0.7rem 0.8rem",
            fontSize: "0.75rem",
            textAlign: "center",
            color: "rgba(150,150,150,0.4)",
            background: "rgba(240,240,240,0.3)",
          }}
        >
          N/A
        </td>
      );
    }

    const cellPayments = getMemberPayment(memberId, year, type);
    const paid = cellPayments.length > 0;
    const amount = cellPayments.reduce((s, p) => s + Number(p.amount), 0);

    return (
      <td
        style={{
          padding: "0.7rem 0.8rem",
          fontSize: "0.8rem",
          textAlign: "center",
          background: paid ? "transparent" : "rgba(255,220,0,0.2)",
          cursor: paid ? "pointer" : "default",
        }}
        onClick={() => {
          if (paid && cellPayments.length > 0) {
            setReceiptModal({
              member: memberData,
              payments: cellPayments,
              year,
              type,
              total: amount,
            });
          }
        }}
      >
        {paid ? (
          <span
            style={{
              color: "#2E8B44",
              fontWeight: 600,
              textDecoration: "underline",
              textDecorationStyle: "dotted",
              cursor: "pointer",
            }}
          >
            ₱{amount.toLocaleString()}
          </span>
        ) : (
          <span
            style={{ color: "#C0392B", fontSize: "0.72rem", fontWeight: 500 }}
          >
            —
          </span>
        )}
      </td>
    );
  };

  if (loading)
    return (
      <div
        style={{ padding: "3rem", textAlign: "center", color: "var(--muted)" }}
      >
        Loading records...
      </div>
    );

  // ── Filter visible members based on activeFilter ──
  const filteredMembers =
    activeFilter === "all"
      ? members
      : members.filter((m) => {
          if (activeFilter === "lifetime") {
            return payments.some(
              (p) => p.member_id === m.id && p.type === "lifetime"
            );
          }
          return true;
        });

  return (
    <div>
      {/* ── Header ── */}
      <div style={{ marginBottom: "2rem" }}>
        <p
          style={{
            fontSize: "0.72rem",
            color: "var(--muted)",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            marginBottom: "0.3rem",
          }}
        >
          Admin Panel
        </p>
        <h1
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "1.8rem",
            fontWeight: 700,
            color: "var(--green-dk)",
          }}
        >
          Reports & Records
          <span
            style={{
              marginLeft: 10,
              fontSize: "0.9rem",
              color: "var(--muted)",
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 400,
            }}
          >
            as of{" "}
            {new Date().toLocaleDateString("en-PH", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        </h1>
      </div>

      {/* ── Summary Cards ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4,1fr)",
          gap: "1rem",
          marginBottom: "2rem",
        }}
      >
        {[
          {
            label: "Total Collected",
            value: `₱${totalCollected.toLocaleString()}`,
            color: "var(--gold)",
          },
          {
            label: "MAS Collected",
            value: `₱${totalMas.toLocaleString()}`,
            color: "#2E8B44",
          },
          {
            label: "AOF Collected",
            value: `₱${totalAof.toLocaleString()}`,
            color: "#2B5FA8",
          },
          {
            label: "Lifetime Fees",
            value: `₱${totalLifetime.toLocaleString()}`,
            color: "#6B3FA0",
          },
        ].map(({ label, value, color }) => (
          <div
            key={label}
            style={{
              background: "white",
              borderRadius: 10,
              padding: "1.2rem 1.5rem",
              border: "1px solid rgba(26,92,42,0.08)",
              borderLeft: `4px solid ${color}`,
            }}
          >
            <p
              style={{
                fontSize: "0.68rem",
                fontWeight: 500,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--muted)",
                marginBottom: "0.4rem",
              }}
            >
              {label}
            </p>
            <p
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "1.6rem",
                fontWeight: 700,
                color,
              }}
            >
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* ── Export & Import ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "1.5rem",
          marginBottom: "2rem",
        }}
      >
        <div
          style={{
            background: "white",
            borderRadius: 10,
            border: "1px solid rgba(26,92,42,0.08)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "1.2rem 1.5rem",
              borderBottom: "1px solid rgba(26,92,42,0.08)",
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
              Export Records
            </h2>
            <p
              style={{
                fontSize: "0.78rem",
                color: "var(--muted)",
                marginTop: "0.2rem",
              }}
            >
              Download all member and payment data
            </p>
          </div>
          <div
            style={{
              padding: "1.5rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.8rem",
            }}
          >
            {[
              {
                type: "excel",
                label: "Export to Excel (.xlsx)",
                icon: "📊",
                color: "#1A5C2A",
              },
              {
                type: "csv",
                label: "Export to CSV (.csv)",
                icon: "📋",
                color: "#1A3C6E",
              },
              {
                type: "pdf",
                label: "Export to PDF (.pdf)",
                icon: "📄",
                color: "#9A2020",
              },
            ].map(({ type, label, icon, color }) => (
              <button
                key={type}
                onClick={() => handleExport(type)}
                disabled={!!exporting}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "0.9rem 1.2rem",
                  background:
                    exporting === type ? "var(--warm)" : "white",
                  border: `1.5px solid ${color}22`,
                  borderRadius: 8,
                  cursor: exporting ? "not-allowed" : "pointer",
                  fontFamily: "'DM Sans', sans-serif",
                  textAlign: "left",
                }}
              >
                <span style={{ fontSize: "1.2rem" }}>{icon}</span>
                <div>
                  <div
                    style={{ fontSize: "0.85rem", fontWeight: 500, color }}
                  >
                    {exporting === type ? "Exporting..." : label}
                  </div>
                  <div
                    style={{
                      fontSize: "0.72rem",
                      color: "var(--muted)",
                      marginTop: 2,
                    }}
                  >
                    {members.length} members · {payments.length} payments
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {canCRUD && (
          <div
            style={{
              background: "white",
              borderRadius: 10,
              border: "1px solid rgba(26,92,42,0.08)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "1.2rem 1.5rem",
                borderBottom: "1px solid rgba(26,92,42,0.08)",
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
                Import from Excel
              </h2>
              <p
                style={{
                  fontSize: "0.78rem",
                  color: "var(--muted)",
                  marginTop: "0.2rem",
                }}
              >
                Upload your existing SUNCO spreadsheet
              </p>
            </div>
            <div style={{ padding: "1.5rem" }}>
              <div
                style={{
                  border: "2px dashed rgba(26,92,42,0.2)",
                  borderRadius: 8,
                  padding: "1.5rem",
                  textAlign: "center",
                  marginBottom: "1rem",
                }}
              >
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={(e) =>
                    setImportFile(e.target.files?.[0] || null)
                  }
                  style={{ display: "none" }}
                  id="import-file"
                />
                <label htmlFor="import-file" style={{ cursor: "pointer" }}>
                  <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>
                    📁
                  </div>
                  <div
                    style={{
                      fontSize: "0.85rem",
                      fontWeight: 500,
                      color: "var(--green-dk)",
                      marginBottom: "0.3rem",
                    }}
                  >
                    {importFile ? importFile.name : "Click to select file"}
                  </div>
                  <div
                    style={{ fontSize: "0.75rem", color: "var(--muted)" }}
                  >
                    Supports .xlsx, .xls, .csv
                  </div>
                </label>
              </div>
              {importFile && (
                <button
                  onClick={handleImport}
                  disabled={importing}
                  style={{
                    width: "100%",
                    background: importing
                      ? "var(--gold-dk)"
                      : "var(--gold)",
                    color: "var(--green-dk)",
                    border: "none",
                    padding: "0.85rem",
                    borderRadius: 6,
                    fontSize: "0.85rem",
                    fontWeight: 500,
                    cursor: importing ? "not-allowed" : "pointer",
                    fontFamily: "'DM Sans', sans-serif",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    marginBottom: "1rem",
                  }}
                >
                  {importing ? "Importing..." : "Start Import"}
                </button>
              )}
              {importLog.length > 0 && (
                <div
                  style={{
                    background: "#0d1117",
                    borderRadius: 6,
                    padding: "1rem",
                    maxHeight: 200,
                    overflowY: "auto",
                  }}
                >
                  {importLog.map((log, i) => (
                    <div
                      key={i}
                      style={{
                        fontSize: "0.75rem",
                        fontFamily: "monospace",
                        color: log.startsWith("✅")
                          ? "#2E8B44"
                          : log.startsWith("✓")
                          ? "#6bc46a"
                          : log.startsWith("⚠")
                          ? "#D4A017"
                          : log.startsWith("❌")
                          ? "#ff6b6b"
                          : "#8b949e",
                        marginBottom: 2,
                        lineHeight: 1.5,
                      }}
                    >
                      {log}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── All Records Table ── */}
      <div
        style={{
          background: "white",
          borderRadius: 10,
          border: "1px solid rgba(26,92,42,0.08)",
          overflow: "hidden",
        }}
      >
        {/* Table Header with filters + export */}
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

          {/* ── Payment type filter ── */}
          <div style={{ display: "flex", gap: "0.4rem" }}>
            {[
              { id: "all", label: "All Payments", color: "var(--green-dk)" },
              { id: "mas", label: "MAS Only", color: "#2E8B44" },
              { id: "aof", label: "Operating Fund", color: "#2B5FA8" },
              { id: "lifetime", label: "Lifetime", color: "#6B3FA0" },
            ].map(({ id, label, color }) => (
              <button
                key={id}
                onClick={() => setActiveFilter(id as any)}
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

          {/* Export buttons */}
          <div style={{ display: "flex", gap: "0.4rem" }}>
            {["excel", "csv", "pdf"].map((type) => (
              <button
                key={type}
                onClick={() => handleExport(type)}
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
            <span
              style={{ fontSize: "0.72rem", color: "rgba(150,150,150,0.7)" }}
            >
              N/A
            </span>
            <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>
              Not yet a member this year
            </span>
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              minWidth: 1000,
            }}
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

                {/* Dynamic year columns */}
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
                        color:
                          year === currentYear
                            ? "var(--gold-lt)"
                            : "rgba(255,255,255,0.8)",
                        whiteSpace: "nowrap",
                        borderLeft: "1px solid rgba(255,255,255,0.1)",
                      }}
                    >
                      {year}
                      {year === currentYear && " ★"}
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
                        color:
                          year === currentYear
                            ? "var(--gold-lt)"
                            : "rgba(255,255,255,0.8)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {year}
                      {year === currentYear && " ★"}
                    </th>
                  )
                )}

                <th
                  style={{
                    padding: "0.8rem 1rem",
                    textAlign: "center",
                    fontSize: "0.65rem",
                    fontWeight: 500,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "rgba(255,255,255,0.8)",
                    whiteSpace: "nowrap",
                  }}
                >
                  Delinquent
                </th>
                <th
                  style={{
                    padding: "0.8rem 1rem",
                    textAlign: "right",
                    fontSize: "0.65rem",
                    fontWeight: 500,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "rgba(255,255,255,0.8)",
                    whiteSpace: "nowrap",
                  }}
                >
                  Total
                </th>
              </tr>

              {/* Sub-header for MAS/AOF when showing all */}
              {activeFilter === "all" && (
                <tr style={{ background: "rgba(13,51,24,0.9)" }}>
                  <th colSpan={4} />
                  {displayYears.map((year) => (
                    <>
                      <th
                        key={`${year}-mas`}
                        style={{
                          padding: "0.4rem 0.5rem",
                          textAlign: "center",
                          fontSize: "0.6rem",
                          color: "rgba(212,160,23,0.7)",
                          fontWeight: 500,
                          letterSpacing: "0.06em",
                          borderLeft: "1px solid rgba(255,255,255,0.1)",
                        }}
                      >
                        MAS
                      </th>
                      <th
                        key={`${year}-aof`}
                        style={{
                          padding: "0.4rem 0.5rem",
                          textAlign: "center",
                          fontSize: "0.6rem",
                          color: "rgba(100,150,255,0.7)",
                          fontWeight: 500,
                          letterSpacing: "0.06em",
                        }}
                      >
                        AOF
                      </th>
                    </>
                  ))}
                  <th colSpan={2} />
                </tr>
              )}
            </thead>

            <tbody>
              {filteredMembers.map((m, i) => {
                const memberPayments = payments.filter(
                  (p) => p.member_id === m.id
                );
                const delinquency = getDelinquency(m);
                const total = memberPayments.reduce(
                  (s, p) => s + Number(p.amount),
                  0
                );

                // Use derivedStatus for the badge — reflects real-time rules
                const displayStatus = delinquency.derivedStatus;

                return (
                  <tr
                    key={m.id}
                    style={{
                      borderBottom: "1px solid rgba(26,92,42,0.06)",
                      background: i % 2 === 0 ? "white" : "var(--cream)",
                    }}
                  >
                    <td
                      style={{
                        padding: "0.7rem 1rem",
                        fontSize: "0.8rem",
                        color: "var(--muted)",
                      }}
                    >
                      {i + 1}
                    </td>
                    <td
                      style={{
                        padding: "0.7rem 1rem",
                        fontSize: "0.85rem",
                        fontWeight: 500,
                        color: "var(--green-dk)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {m.last_name}, {m.first_name}
                      {m.middle_name ? ` ${m.middle_name[0]}.` : ""}
                    </td>

                    {/* Status badge — uses derivedStatus */}
                    <td style={{ padding: "0.7rem 1rem" }}>
                      <span
                        style={{
                          background: `${
                            statusColor[displayStatus] || "#95A5A6"
                          }22`,
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
                    <td
                      style={{
                        padding: "0.7rem 1rem",
                        fontSize: "0.75rem",
                        color: "var(--muted)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {(() => {
                        const mp = payments.filter(
                          (p) => p.member_id === m.id
                        );
                        const py = mp.map((p) => p.year).filter(Boolean);
                        const epy =
                          py.length > 0 ? Math.min(...py) : null;
                        const djy = m.date_joined
                          ? new Date(m.date_joined).getFullYear()
                          : null;
                        return (
                          Math.min(
                            ...([djy, epy, currentYear].filter(
                              Boolean
                            ) as number[])
                          ) || "—"
                        );
                      })()}
                    </td>

                    {/* Dynamic year payment cells */}
                    {displayYears.map((year) =>
                      activeFilter === "all" ? (
                        <>
                          <PaymentCell
                            key={`${m.id}-${year}-mas`}
                            memberId={m.id}
                            year={year}
                            type="mas"
                          />
                          <PaymentCell
                            key={`${m.id}-${year}-aof`}
                            memberId={m.id}
                            year={year}
                            type="aof"
                          />
                        </>
                      ) : activeFilter === "lifetime" ? (
                        year === displayYears[0] ? (
                          <td
                            key={`${m.id}-lifetime`}
                            colSpan={displayYears.length}
                            style={{
                              padding: "0.7rem 1rem",
                              textAlign: "center",
                            }}
                          >
                            {memberPayments.some(
                              (p) => p.type === "lifetime"
                            ) ? (
                              <span
                                style={{
                                  color: "#2E8B44",
                                  fontWeight: 600,
                                  textDecoration: "underline",
                                  textDecorationStyle: "dotted",
                                  cursor: "pointer",
                                }}
                                onClick={() => {
                                  const lp = memberPayments.filter(
                                    (p) => p.type === "lifetime"
                                  );
                                  setReceiptModal({
                                    member: m,
                                    payments: lp,
                                    year: lp[0]?.year,
                                    type: "lifetime",
                                    total: lp.reduce(
                                      (s, p) => s + Number(p.amount),
                                      0
                                    ),
                                  });
                                }}
                              >
                                ₱
                                {memberPayments
                                  .filter((p) => p.type === "lifetime")
                                  .reduce((s, p) => s + Number(p.amount), 0)
                                  .toLocaleString()}{" "}
                                ✓
                              </span>
                            ) : (
                              <span
                                style={{
                                  color: "#C0392B",
                                  fontSize: "0.75rem",
                                }}
                              >
                                Not paid
                              </span>
                            )}
                          </td>
                        ) : null
                      ) : (
                        <PaymentCell
                          key={`${m.id}-${year}-${activeFilter}`}
                          memberId={m.id}
                          year={year}
                          type={activeFilter}
                        />
                      )
                    )}

                    {/* Delinquent — shows current trailing streak */}
{/* Delinquent — hidden for lifetime tab */}
                                                                  <td
                                                                    style={{ padding: "0.7rem 1rem", textAlign: "center" }}
                                                                  >
                                                                    {activeFilter === "lifetime" ? (
                                                                      <span style={{ color: "var(--muted)", fontSize: "0.72rem" }}>—</span>
                                                                    ) : delinquency.count > 0 ? (
                                                                      <span
                                                                        style={{
                                                                          background:
                                                                            delinquency.count >= 3
                                                                              ? "rgba(192,57,43,0.15)"
                                                                              : delinquency.count >= 2
                                                                              ? "rgba(212,160,23,0.15)"
                                                                              : "rgba(192,57,43,0.08)",
                                                                          color:
                                                                            delinquency.count >= 3
                                                                              ? "#C0392B"
                                                                              : delinquency.count >= 2
                                                                              ? "#B8860B"
                                                                              : "#C0392B",
                                                                          fontSize: "0.72rem",
                                                                          fontWeight: 600,
                                                                          padding: "3px 8px",
                                                                          borderRadius: 20,
                                                                        }}
                                                                      >
                                                                        {delinquency.count} yr
                                                                        {delinquency.count > 1 ? "s" : ""}
                                                                      </span>
                                                                    ) : (
                                                                      <span
                                                                        style={{
                                                                          color: "#2E8B44",
                                                                          fontSize: "0.72rem",
                                                                          fontWeight: 500,
                                                                        }}
                                                                      >
                                                                        ✓ Current
                                                                      </span>
                                                                    )}
                                                                  </td>

                    {/* Total */}
                    <td
                      style={{
                        padding: "0.7rem 1rem",
                        textAlign: "right",
                        fontSize: "0.88rem",
                        fontWeight: 600,
                        color: "var(--green-dk)",
                      }}
                    >
                      ₱{total.toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── RECEIPT MODAL ── */}
      {receiptModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            zIndex: 300,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "2rem",
          }}
        >
          <div
            style={{
              background: "white",
              borderRadius: 12,
              padding: 0,
              maxWidth: 460,
              width: "100%",
              overflow: "hidden",
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
            }}
          >
            {/* Receipt header */}
            <div
              style={{
                background: "var(--green-dk)",
                padding: "1.5rem 2rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <p
                  style={{
                    fontSize: "0.65rem",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "rgba(255,255,255,0.5)",
                    marginBottom: "0.2rem",
                  }}
                >
                  Official Receipt
                </p>
                <h2
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    fontSize: "1.1rem",
                    fontWeight: 700,
                    color: "var(--gold-lt)",
                  }}
                >
                  Payment Details
                </h2>
              </div>
              <button
                onClick={() => setReceiptModal(null)}
                style={{
                  background: "rgba(255,255,255,0.1)",
                  border: "none",
                  color: "white",
                  width: 30,
                  height: 30,
                  borderRadius: "50%",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <X size={15} />
              </button>
            </div>

            <div style={{ padding: "1.5rem 2rem" }}>
              {/* Member info */}
              <div
                style={{
                  background: "var(--warm)",
                  borderRadius: 8,
                  padding: "1rem",
                  marginBottom: "1.2rem",
                }}
              >
                <p
                  style={{
                    fontSize: "0.7rem",
                    color: "var(--muted)",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    marginBottom: "0.3rem",
                  }}
                >
                  Member
                </p>
                <p
                  style={{
                    fontSize: "1rem",
                    fontWeight: 600,
                    color: "var(--green-dk)",
                  }}
                >
                  {receiptModal.member?.first_name}{" "}
                  {receiptModal.member?.last_name}
                </p>
                <p
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--muted)",
                    marginTop: 2,
                  }}
                >
                  {receiptModal.member?.member_id_code || "No ID"} · Joined{" "}
                  {receiptModal.member?.date_joined
                    ? new Date(
                        receiptModal.member.date_joined
                      ).getFullYear()
                    : "—"}
                </p>
              </div>

              {/* Payment records */}
              {receiptModal.payments.map((p: any, i: number) => (
                <div
                  key={p.id || i}
                  style={{
                    borderBottom: "1px solid rgba(26,92,42,0.08)",
                    paddingBottom: "0.8rem",
                    marginBottom: "0.8rem",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "start",
                    }}
                  >
                    <div>
                      <p
                        style={{
                          fontSize: "0.75rem",
                          fontWeight: 500,
                          color: "var(--green-dk)",
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                        }}
                      >
                        {p.type === "mas"
                          ? "Mortuary Assistance (MAS)"
                          : p.type === "aof"
                          ? "Annual Operating Fund"
                          : "Lifetime Membership"}
                      </p>
                      <p
                        style={{
                          fontSize: "0.72rem",
                          color: "var(--muted)",
                          marginTop: 2,
                        }}
                      >
                        Year: {p.year}
                      </p>
                      {p.receipt_number && (
                        <p
                          style={{
                            fontSize: "0.72rem",
                            color: "var(--muted)",
                            marginTop: 1,
                          }}
                        >
                          OR No.:{" "}
                          <strong
                            style={{
                              color: "var(--green-dk)",
                              fontFamily: "monospace",
                            }}
                          >
                            {p.receipt_number}
                          </strong>
                        </p>
                      )}
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <p
                        style={{
                          fontFamily: "'Playfair Display', serif",
                          fontSize: "1.1rem",
                          fontWeight: 700,
                          color: "var(--green-dk)",
                        }}
                      >
                        ₱{Number(p.amount).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Timestamps */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "0.5rem",
                      marginTop: "0.6rem",
                    }}
                  >
                    <div
                      style={{
                        background: "var(--cream)",
                        borderRadius: 4,
                        padding: "0.4rem 0.6rem",
                      }}
                    >
                      <p
                        style={{
                          fontSize: "0.62rem",
                          color: "var(--muted)",
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                          marginBottom: "0.1rem",
                        }}
                      >
                        Date Paid
                      </p>
                      <p
                        style={{
                          fontSize: "0.78rem",
                          fontWeight: 500,
                          color: "var(--text)",
                        }}
                      >
                        {p.date_paid
                          ? new Date(p.date_paid).toLocaleDateString(
                              "en-PH",
                              {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              }
                            )
                          : "—"}
                      </p>
                    </div>
                    <div
                      style={{
                        background: "var(--cream)",
                        borderRadius: 4,
                        padding: "0.4rem 0.6rem",
                      }}
                    >
                      <p
                        style={{
                          fontSize: "0.62rem",
                          color: "var(--muted)",
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                          marginBottom: "0.1rem",
                        }}
                      >
                        Recorded
                      </p>
                      <p
                        style={{
                          fontSize: "0.78rem",
                          fontWeight: 500,
                          color: "var(--text)",
                        }}
                      >
                        {p.created_at
                          ? new Date(p.created_at).toLocaleDateString(
                              "en-PH",
                              {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              }
                            ) +
                            " " +
                            new Date(p.created_at).toLocaleTimeString(
                              "en-PH",
                              { hour: "2-digit", minute: "2-digit" }
                            )
                          : "—"}
                      </p>
                    </div>
                  </div>
                </div>
              ))}

              {/* Total */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "0.8rem 0",
                  borderTop: "2px solid var(--gold)",
                }}
              >
                <span
                  style={{
                    fontSize: "0.9rem",
                    fontWeight: 600,
                    color: "var(--green-dk)",
                  }}
                >
                  Total
                </span>
                <span
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    fontSize: "1.4rem",
                    fontWeight: 700,
                    color: "var(--green-dk)",
                  }}
                >
                  ₱{Number(receiptModal.total).toLocaleString()}
                </span>
              </div>

              <button
                onClick={() => setReceiptModal(null)}
                style={{
                  width: "100%",
                  background: "var(--gold)",
                  color: "var(--green-dk)",
                  border: "none",
                  padding: "0.8rem",
                  borderRadius: 6,
                  fontSize: "0.85rem",
                  fontWeight: 500,
                  cursor: "pointer",
                  fontFamily: "'DM Sans', sans-serif",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  marginTop: "0.5rem",
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
