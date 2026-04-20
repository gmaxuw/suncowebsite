// ─────────────────────────────────────────────
// reports/ExportPanel.tsx
//
// Export buttons for Excel, CSV, PDF.
// Receives pre-built records and a filename from parent.
// ─────────────────────────────────────────────
import type { Member, Payment } from "@/types/reports.types";

interface ExportRecord {
  no: number;
  name: string;
  status: string;
  member_id_code: string;
  date_joined: string;
  payments: {
    year: number;
    date: string;
    amount: number;
    receipt: string;
    type: string;
  }[];
  years_delinquent: number;
  total_amount: number;
}

interface Props {
  records: ExportRecord[];
  filename: string;
  memberCount: number;
  paymentCount: number;
}

export default function ExportPanel({
  records,
  filename,
  memberCount,
  paymentCount,
}: Props) {
  const [exporting, setExporting] = useState("");

  const handleExport = async (type: string) => {
    setExporting(type);
    const { exportToCSV, exportToExcel, exportToPDF } = await import(
      "@/utils/export"
    );
    if (type === "csv") exportToCSV(records, filename);
    if (type === "excel") exportToExcel(records, filename);
    if (type === "pdf") exportToPDF(records, filename);
    setExporting("");
  };

  const buttons = [
    { type: "excel", label: "Export to Excel (.xlsx)", icon: "📊", color: "#1A5C2A" },
    { type: "csv",   label: "Export to CSV (.csv)",   icon: "📋", color: "#1A3C6E" },
    { type: "pdf",   label: "Export to PDF (.pdf)",   icon: "📄", color: "#9A2020" },
  ];

  return (
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
        <p style={{ fontSize: "0.78rem", color: "var(--muted)", marginTop: "0.2rem" }}>
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
        {buttons.map(({ type, label, icon, color }) => (
          <button
            key={type}
            onClick={() => handleExport(type)}
            disabled={!!exporting}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "0.9rem 1.2rem",
              background: exporting === type ? "var(--warm)" : "white",
              border: `1.5px solid ${color}22`,
              borderRadius: 8,
              cursor: exporting ? "not-allowed" : "pointer",
              fontFamily: "'DM Sans', sans-serif",
              textAlign: "left",
            }}
          >
            <span style={{ fontSize: "1.2rem" }}>{icon}</span>
            <div>
              <div style={{ fontSize: "0.85rem", fontWeight: 500, color }}>
                {exporting === type ? "Exporting..." : label}
              </div>
              <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: 2 }}>
                {memberCount} members · {paymentCount} payments
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── useState needs importing ──
import { useState } from "react";
