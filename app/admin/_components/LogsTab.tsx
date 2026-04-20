"use client";
// ─────────────────────────────────────────────
// LogsTab.tsx
// Two separate sections:
//   1. Member Activity (approvals, rejections, status changes)
//   2. Payment Activity (recorded payments)
// Filterable by: This Week, This Month, Monthly (5 years back)
// ─────────────────────────────────────────────
import { useEffect, useState } from "react";
import { Search, X, FileText, ChevronDown } from "lucide-react";

interface Props {
  supabase: any;
}

// ── Build time period options (this week, this month, then Jan–Dec for past 5 years) ──
function buildPeriodOptions() {
  const options: { label: string; value: string }[] = [
    { label: "This Week", value: "week" },
    { label: "This Month", value: "month" },
  ];
  const now = new Date();
  for (let y = now.getFullYear(); y >= 2010; y--) {
    for (let m = 11; m >= 0; m--) {
      if (y === now.getFullYear() && m > now.getMonth()) continue;
      const date = new Date(y, m, 1);
      const label = date.toLocaleDateString("en-PH", { month: "long", year: "numeric" });
      options.push({ label, value: `${y}-${String(m + 1).padStart(2, "0")}` });
    }
  }
  return options;
}

function getPeriodRange(value: string): { from: Date; to: Date } {
  const now = new Date();
  if (value === "week") {
    const from = new Date(now);
    from.setDate(now.getDate() - now.getDay());
    from.setHours(0, 0, 0, 0);
    return { from, to: now };
  }
  if (value === "month") {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from, to: now };
  }
  // format: "2025-03"
  const [y, m] = value.split("-").map(Number);
  const from = new Date(y, m - 1, 1);
  const to = new Date(y, m, 0, 23, 59, 59);
  return { from, to };
}

const ACTION_LABELS: any = {
  PAYMENT_RECORDED: "💰 Payment Recorded",
  MEMBER_APPROVED:  "✅ Member Approved",
  MEMBER_REJECTED:  "❌ Member Rejected",
  MEMBER_STATUS:    "🔄 Status Changed",
  ROLE_CHANGED:     "🛡️ Role Changed",
};

const formatDate = (ts: string) => {
  const d = new Date(ts);
  return d.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" }) +
    " · " + d.toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" });
};

// ── Reusable detail modal ──
function LogDetailModal({ log, onClose }: { log: any; onClose: () => void }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
      <div style={{ background: "white", borderRadius: 14, maxWidth: 520, width: "100%", boxShadow: "0 24px 64px rgba(0,0,0,0.25)", overflow: "hidden" }}>
        <div style={{ background: "var(--green-dk)", padding: "1.4rem 1.6rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <p style={{ fontSize: "0.6rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 3 }}>Log Detail</p>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.1rem", fontWeight: 700, color: "#C9A84C" }}>
              {ACTION_LABELS[log.action] || log.action}
            </h2>
          </div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "white", width: 30, height: 30, borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <X size={14} />
          </button>
        </div>
        <div style={{ padding: "1.5rem 1.6rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem", marginBottom: "1.2rem" }}>
            {[
              { label: "Done By", value: log.member_name || "—" },
              { label: "Role", value: log.role?.replace(/_/g, " ") || "—" },
              { label: "Module", value: log.module || "—" },
              { label: "Timestamp", value: formatDate(log.created_at) },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: "var(--warm)", borderRadius: 8, padding: "0.7rem 1rem" }}>
                <p style={{ fontSize: "0.62rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "#AAA", marginBottom: 3 }}>{label}</p>
                <p style={{ fontSize: "0.85rem", fontWeight: 500, color: "var(--green-dk)", textTransform: "capitalize" }}>{value}</p>
              </div>
            ))}
          </div>
          <div style={{ background: "var(--cream)", borderRadius: 10, padding: "1.2rem", border: "1px solid rgba(26,92,42,0.08)" }}>
            <p style={{ fontSize: "0.68rem", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)", marginBottom: "0.8rem" }}>Full Details</p>
            {log.details && Object.entries(log.details).map(([key, val]: any) => (
              <div key={key} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "0.5rem 0", borderBottom: "1px solid rgba(26,92,42,0.06)", gap: "1rem" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--muted)", textTransform: "capitalize", whiteSpace: "nowrap" }}>{key.replace(/_/g, " ")}</span>
                <span style={{ fontSize: "0.82rem", fontWeight: 500, color: "var(--green-dk)", textAlign: "right" }}>
                  {Array.isArray(val) ? val.join(", ").toUpperCase() : String(val ?? "")}
                </span>
              </div>
            ))}
          </div>
          <button onClick={onClose} style={{ width: "100%", marginTop: "1.2rem", padding: "0.75rem", background: "#F5F5F5", border: "none", borderRadius: 8, fontSize: "0.82rem", color: "#666", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Reusable log table ──
function LogTable({ logs, onSelect, emptyLabel }: { logs: any[]; onSelect: (l: any) => void; emptyLabel: string }) {
  if (logs.length === 0) {
    return (
      <div style={{ padding: "2.5rem", textAlign: "center" }}>
        <FileText size={32} color="rgba(26,92,42,0.15)" style={{ marginBottom: "0.6rem" }} />
        <p style={{ color: "var(--muted)", fontSize: "0.85rem" }}>{emptyLabel}</p>
      </div>
    );
  }
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
        <thead>
          <tr style={{ background: "var(--warm)" }}>
            {["Timestamp", "Done By", "Role", "Action", "Details"].map(h => (
              <th key={h} style={{ padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.68rem", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)", whiteSpace: "nowrap" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {logs.map((log, i) => {
            const d = log.details || {};
            let summary = "";
            if (log.module === "payments") {
              const typesVal = d.types;
const typesStr = Array.isArray(typesVal) ? typesVal.join(", ").toUpperCase() : String(typesVal || "").toUpperCase();
summary = `${d.for_member || ""} · ${typesStr} · ₱${Number(d.total_amount || 0).toLocaleString()} · OR: ${d.or_number || ""}`;
            } else {
              summary = `${d.for_member || d.member || ""} ${d.new_status ? `→ ${d.new_status}` : ""} ${d.reason ? `· ${d.reason}` : ""}`.trim();
            }
            return (
              <tr key={log.id} onClick={() => onSelect(log)}
                style={{ borderBottom: "1px solid rgba(26,92,42,0.06)", background: i % 2 === 0 ? "white" : "var(--cream)", cursor: "pointer" }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(212,160,23,0.05)")}
                onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? "white" : "var(--cream)")}>
                <td style={{ padding: "0.85rem 1rem", fontSize: "0.75rem", color: "var(--muted)", whiteSpace: "nowrap" }}>{formatDate(log.created_at)}</td>
                <td style={{ padding: "0.85rem 1rem", fontSize: "0.85rem", fontWeight: 600, color: "var(--green-dk)", whiteSpace: "nowrap" }}>{log.member_name || "—"}</td>
                <td style={{ padding: "0.85rem 1rem" }}>
                  <span style={{ fontSize: "0.7rem", color: "var(--muted)", background: "var(--warm)", padding: "2px 8px", borderRadius: 20, textTransform: "capitalize", whiteSpace: "nowrap" }}>
                    {log.role?.replace(/_/g, " ") || "—"}
                  </span>
                </td>
                <td style={{ padding: "0.85rem 1rem", fontSize: "0.82rem", color: "var(--text)", whiteSpace: "nowrap" }}>
                  {ACTION_LABELS[log.action] || log.action}
                </td>
                <td style={{ padding: "0.85rem 1rem", fontSize: "0.75rem", color: "var(--muted)", maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {summary || "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Main LogsTab ──
export default function LogsTab({ supabase }: Props) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("month");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<any>(null);
  const [showPeriodDropdown, setShowPeriodDropdown] = useState(false);

  const periodOptions = buildPeriodOptions();
  const currentPeriodLabel = periodOptions.find(p => p.value === period)?.label || "This Month";

  const loadLogs = async () => {
    setLoading(true);
    const { from, to } = getPeriodRange(period);
    const { data } = await supabase
      .from("activity_logs")
      .select("*")
      .gte("created_at", from.toISOString())
      .lte("created_at", to.toISOString())
      .order("created_at", { ascending: false });
    setLogs(data || []);
    setLoading(false);
  };

  useEffect(() => { loadLogs(); }, [period]);

  const matchSearch = (log: any) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      log.member_name?.toLowerCase().includes(s) ||
      log.action?.toLowerCase().includes(s) ||
      JSON.stringify(log.details || {}).toLowerCase().includes(s)
    );
  };

  const memberLogs = logs.filter(l => l.module === "members" && matchSearch(l));
  const paymentLogs = logs.filter(l => l.module === "payments" && matchSearch(l));

  const totalPaymentsAmount = paymentLogs.reduce((sum, log) => sum + Number(log.details?.total_amount || 0), 0);

  return (
    <div>
      {/* ── Header ── */}
      <div style={{ marginBottom: "2rem" }}>
        <p style={{ fontSize: "0.72rem", color: "var(--muted)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.3rem" }}>Admin Panel</p>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.8rem", fontWeight: 700, color: "var(--green-dk)" }}>Activity Logs</h1>
        <p style={{ fontSize: "0.82rem", color: "var(--muted)", marginTop: "0.3rem" }}>Full audit trail — who did what, when</p>
      </div>

      {/* ── Controls ── */}
      <div style={{ display: "flex", gap: "0.8rem", marginBottom: "1.8rem", flexWrap: "wrap", alignItems: "center" }}>

        {/* Period picker */}
        <div style={{ position: "relative" }}>
          <button onClick={() => setShowPeriodDropdown(v => !v)}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "0.55rem 1.1rem", background: "var(--green-dk)", color: "white", border: "none", borderRadius: 6, fontSize: "0.82rem", fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
            📅 {currentPeriodLabel} <ChevronDown size={14} />
          </button>
          {showPeriodDropdown && (
            <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, background: "white", border: "1.5px solid rgba(26,92,42,0.15)", borderRadius: 8, zIndex: 50, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", minWidth: 200, maxHeight: 320, overflowY: "auto" }}>
              {periodOptions.map(opt => (
                <button key={opt.value} onClick={() => { setPeriod(opt.value); setShowPeriodDropdown(false); }}
                  style={{ display: "block", width: "100%", padding: "0.65rem 1rem", textAlign: "left", background: period === opt.value ? "var(--warm)" : "none", border: "none", cursor: "pointer", fontSize: "0.82rem", color: period === opt.value ? "var(--green-dk)" : "var(--text)", fontWeight: period === opt.value ? 600 : 400, fontFamily: "'DM Sans',sans-serif", borderBottom: "1px solid rgba(26,92,42,0.05)" }}>
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Search */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "white", border: "1.5px solid rgba(26,92,42,0.15)", borderRadius: 6, padding: "0 1rem", flex: 1, maxWidth: 340 }}>
          <Search size={14} color="var(--muted)" />
          <input type="text" placeholder="Search by name, action, or details..." value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ border: "none", outline: "none", fontFamily: "'DM Sans',sans-serif", fontSize: "0.82rem", color: "var(--text)", padding: "0.6rem 0", width: "100%", background: "transparent" }} />
          {search && <button onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 0 }}><X size={13} /></button>}
        </div>

        <button onClick={loadLogs}
          style={{ padding: "0.55rem 1rem", background: "white", color: "var(--green-dk)", border: "1.5px solid rgba(26,92,42,0.2)", borderRadius: 6, fontSize: "0.78rem", cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
          ↻ Refresh
        </button>
      </div>

      {/* ── Summary Cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "1rem", marginBottom: "2rem" }}>
        {[
          { label: "Total Actions", value: logs.filter(matchSearch).length, color: "var(--gold)" },
          { label: "Payment Logs", value: paymentLogs.length, color: "#2B5FA8" },
          { label: "Member Logs", value: memberLogs.length, color: "#2E8B44" },
          { label: "Total Collected", value: `₱${totalPaymentsAmount.toLocaleString()}`, color: "#6B3FA0" },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: "white", borderRadius: 10, padding: "1.2rem 1.5rem", border: "1px solid rgba(26,92,42,0.08)", borderTop: `4px solid ${color}` }}>
            <p style={{ fontSize: "0.68rem", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)", marginBottom: "0.4rem" }}>{label}</p>
            <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.5rem", fontWeight: 700, color }}>{value}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: "4rem", textAlign: "center", color: "var(--muted)", fontSize: "0.85rem" }}>Loading logs...</div>
      ) : (
        <>
          {/* ── SECTION 1: Payment Activity ── */}
          <div style={{ background: "white", borderRadius: 10, border: "1px solid rgba(26,92,42,0.08)", overflow: "hidden", marginBottom: "2rem" }}>
            <div style={{ padding: "1.2rem 1.5rem", borderBottom: "1px solid rgba(26,92,42,0.08)", background: "var(--warm)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1rem", fontWeight: 700, color: "var(--green-dk)" }}>
                  💰 Payment Activity
                </h2>
                <p style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: "0.2rem" }}>
                  Who recorded payments, for whom, how much — {paymentLogs.length} {paymentLogs.length === 1 ? "entry" : "entries"} in {currentPeriodLabel}
                </p>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.3rem", fontWeight: 700, color: "#2B5FA8" }}>₱{totalPaymentsAmount.toLocaleString()}</p>
                <p style={{ fontSize: "0.68rem", color: "var(--muted)" }}>total recorded</p>
              </div>
            </div>
            <LogTable logs={paymentLogs} onSelect={setSelected} emptyLabel={`No payment activity for ${currentPeriodLabel}.`} />
          </div>

          {/* ── SECTION 2: Member Activity ── */}
          <div style={{ background: "white", borderRadius: 10, border: "1px solid rgba(26,92,42,0.08)", overflow: "hidden" }}>
            <div style={{ padding: "1.2rem 1.5rem", borderBottom: "1px solid rgba(26,92,42,0.08)", background: "var(--warm)" }}>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1rem", fontWeight: 700, color: "var(--green-dk)" }}>
                👥 Member Activity
              </h2>
              <p style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: "0.2rem" }}>
                Approvals, rejections, and status changes — {memberLogs.length} {memberLogs.length === 1 ? "entry" : "entries"} in {currentPeriodLabel}
              </p>
            </div>
            <LogTable logs={memberLogs} onSelect={setSelected} emptyLabel={`No member activity for ${currentPeriodLabel}.`} />
          </div>
        </>
      )}

      {/* ── Detail Modal ── */}
      {selected && <LogDetailModal log={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
