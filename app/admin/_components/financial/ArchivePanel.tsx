"use client";
// ─────────────────────────────────────────────────────────────
// ArchivePanel.tsx — Past generated reports, reprint PDF
// Place at: D:\suncowebsite\app\admin\_components\financial\ArchivePanel.tsx
// ─────────────────────────────────────────────────────────────
import { useEffect, useState } from "react";
import { RefreshCw, FileText, Download, Lock } from "lucide-react";

interface Props { supabase: any; canCRUD: boolean; }

interface Report {
  id: string;
  report_no: string;
  period_from: string;
  period_to: string;
  generated_by_name: string;
  generated_at: string;
  status: string;
  snapshot_json: any;
}

function fmtDate(d: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-PH", { year:"numeric", month:"long", day:"numeric" });
}

function fmtDateTime(d: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-PH", {
    year:"numeric", month:"long", day:"numeric",
    hour:"2-digit", minute:"2-digit",
  });
}

function peso(n: number) {
  return `₱${Number(n||0).toLocaleString("en-PH", { minimumFractionDigits:2 })}`;
}

export default function ArchivePanel({ supabase, canCRUD }: Props) {
  const [reports,  setReports]  = useState<Report[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [printing, setPrinting] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("financial_reports")
      .select("*")
      .order("generated_at", { ascending: false });
    setReports(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleReprint = async (report: Report) => {
    setPrinting(report.id);
    const { generateFinancialReportPDF } = await import("./financialReportPDF");
    await generateFinancialReportPDF(report.snapshot_json);
    setPrinting(null);
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1.5rem" }}>
        <div>
          <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.1rem", fontWeight:700, color:"var(--green-dk)" }}>
            Generated Reports Archive
          </h2>
          <p style={{ fontSize:"0.75rem", color:"var(--muted)", marginTop:3 }}>
            {reports.length} report{reports.length !== 1 ? "s" : ""} on file · All reports are locked and cannot be edited.
          </p>
        </div>
        <button onClick={load} style={{
          display:"flex", alignItems:"center", gap:6,
          background:"none", border:"1px solid rgba(26,92,42,0.2)",
          color:"var(--green-dk)", padding:"0.5rem 1rem", borderRadius:8,
          fontSize:"0.78rem", cursor:"pointer", fontFamily:"'DM Sans',sans-serif",
        }}>
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {loading ? (
        <div style={{ padding:"3rem", textAlign:"center", color:"var(--muted)" }}>
          <RefreshCw size={20} style={{ marginBottom:8, opacity:0.4 }} />
          <p>Loading reports...</p>
        </div>
      ) : reports.length === 0 ? (
        <div style={{ padding:"4rem", textAlign:"center", color:"var(--muted)", background:"rgba(26,92,42,0.03)", borderRadius:12, border:"1.5px dashed rgba(26,92,42,0.12)" }}>
          <FileText size={36} style={{ opacity:0.2, marginBottom:12 }} />
          <p style={{ fontSize:"0.95rem", fontWeight:600 }}>No reports generated yet.</p>
          <p style={{ fontSize:"0.78rem", marginTop:6 }}>
            Go to the "Generate Report" tab to create your first financial report.
          </p>
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:"0.75rem" }}>
          {reports.map(r => {
            const snap = r.snapshot_json;
            const grandTotal = snap?.grandTotalAssets || 0;
            const isPrinting = printing === r.id;

            return (
              <div key={r.id} style={{
                background:"white", borderRadius:12,
                border:"1px solid rgba(26,92,42,0.08)",
                overflow:"hidden",
              }}>
                <div style={{ display:"grid", gridTemplateColumns:"1fr auto", alignItems:"stretch" }}>
                  {/* Left info */}
                  <div style={{ padding:"1.2rem 1.5rem", display:"grid", gridTemplateColumns:"auto 1fr 1fr 1fr", gap:"1.5rem", alignItems:"center" }}>
                    {/* Report no badge */}
                    <div style={{
                      background:"var(--green-dk)", color:"var(--gold)",
                      padding:"0.5rem 0.9rem", borderRadius:8,
                      fontFamily:"'DM Sans',sans-serif", fontSize:"0.72rem",
                      fontWeight:700, letterSpacing:"0.04em", whiteSpace:"nowrap",
                    }}>
                      {r.report_no}
                    </div>

                    {/* Period */}
                    <div>
                      <p style={{ fontSize:"0.62rem", fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", color:"var(--muted)", marginBottom:3 }}>Period</p>
                      <p style={{ fontSize:"0.82rem", fontWeight:600, color:"var(--green-dk)" }}>
                        {fmtDate(r.period_from)}
                      </p>
                      <p style={{ fontSize:"0.72rem", color:"var(--muted)" }}>to {fmtDate(r.period_to)}</p>
                    </div>

                    {/* Generated */}
                    <div>
                      <p style={{ fontSize:"0.62rem", fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", color:"var(--muted)", marginBottom:3 }}>Generated</p>
                      <p style={{ fontSize:"0.8rem", color:"var(--text)" }}>{fmtDateTime(r.generated_at)}</p>
                      <p style={{ fontSize:"0.72rem", color:"var(--muted)" }}>by {r.generated_by_name || "Admin"}</p>
                    </div>

                    {/* Grand total */}
                    <div>
                      <p style={{ fontSize:"0.62rem", fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", color:"var(--muted)", marginBottom:3 }}>Grand Total Assets</p>
                      <p style={{ fontSize:"1rem", fontWeight:800, color:"var(--green-dk)" }}>{peso(grandTotal)}</p>
                      <div style={{ display:"flex", alignItems:"center", gap:4, marginTop:3 }}>
                        <Lock size={9} color="var(--muted)" />
                        <span style={{ fontSize:"0.62rem", color:"var(--muted)", textTransform:"uppercase", letterSpacing:"0.06em" }}>
                          {r.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Reprint button */}
                  <div style={{
                    padding:"1.2rem",
                    borderLeft:"1px solid rgba(26,92,42,0.07)",
                    display:"flex", alignItems:"center", justifyContent:"center",
                    background:"rgba(26,92,42,0.02)",
                  }}>
                    <button
                      onClick={() => handleReprint(r)}
                      disabled={isPrinting}
                      style={{
                        display:"flex", flexDirection:"column", alignItems:"center", gap:6,
                        background: isPrinting ? "rgba(201,168,76,0.3)" : "var(--gold)",
                        color:"var(--green-dk)", border:"none",
                        padding:"0.8rem 1.2rem", borderRadius:10,
                        fontSize:"0.72rem", fontWeight:700,
                        cursor: isPrinting ? "not-allowed" : "pointer",
                        fontFamily:"'DM Sans',sans-serif",
                        minWidth:90,
                      }}>
                      {isPrinting
                        ? <RefreshCw size={16} />
                        : <Download size={16} />
                      }
                      {isPrinting ? "Generating..." : "Reprint PDF"}
                    </button>
                  </div>
                </div>

                {/* Account breakdown strip */}
                {snap?.accounts && snap.accounts.length > 0 && (
                  <div style={{
                    borderTop:"1px solid rgba(26,92,42,0.06)",
                    background:"rgba(26,92,42,0.02)",
                    padding:"0.65rem 1.5rem",
                    display:"flex", gap:"1.5rem", flexWrap:"wrap",
                  }}>
                    {snap.accounts.map((a: any) => (
                      <div key={a.account.id} style={{ display:"flex", alignItems:"center", gap:8 }}>
                        <div style={{
                          width:7, height:7, borderRadius:"50%",
                          background: a.account.account_type==="mas" ? "#2E8B44"
                            : a.account.account_type==="aof" ? "#2B5FA8" : "#C9A84C",
                        }} />
                        <span style={{ fontSize:"0.7rem", color:"var(--muted)" }}>
                          {a.account.name}:
                        </span>
                        <span style={{ fontSize:"0.72rem", fontWeight:700, color:"var(--green-dk)" }}>
                          {peso(a.closingBalance)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
