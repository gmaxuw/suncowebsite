"use client";
// ─────────────────────────────────────────────
// LogsTab.tsx
// Shows all activity logs: payments, members, cms
// Filterable by module, date range, and user
// Accessible by: admin, president, auditor
// ─────────────────────────────────────────────
import { useEffect, useState } from "react";
import { Search, X, FileText } from "lucide-react";

interface Props {
  supabase: any;
}

const MODULE_COLORS: any = {
  payments: { bg: "rgba(43,95,168,0.1)", color: "#2B5FA8", label: "Payments" },
  members:  { bg: "rgba(46,139,68,0.1)",  color: "#2E8B44", label: "Members"  },
  cms:      { bg: "rgba(212,160,23,0.12)", color: "#A66C00", label: "CMS"      },
  reports:  { bg: "rgba(107,63,160,0.1)", color: "#6B3FA0", label: "Reports"  },
  roles:    { bg: "rgba(192,57,43,0.1)",  color: "#C0392B", label: "Roles"    },
};

const ACTION_LABELS: any = {
  PAYMENT_RECORDED:  "💰 Payment Recorded",
  MEMBER_APPROVED:   "✅ Member Approved",
  MEMBER_REJECTED:   "❌ Member Rejected",
  MEMBER_STATUS:     "🔄 Status Changed",
  ROLE_CHANGED:      "🛡️ Role Changed",
  CMS_PUBLISHED:     "📰 Article Published",
  CMS_DELETED:       "🗑️ Article Deleted",
};

export default function LogsTab({ supabase }: Props) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [selected, setSelected] = useState<any>(null);

  const loadLogs = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("activity_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    setLogs(data || []);
    setLoading(false);
  };

  useEffect(() => { loadLogs(); }, []);

  const filtered = logs.filter(log => {
    const matchModule = moduleFilter === "all" || log.module === moduleFilter;
    const matchSearch = search === "" || 
      log.member_name?.toLowerCase().includes(search.toLowerCase()) ||
      log.action?.toLowerCase().includes(search.toLowerCase()) ||
      JSON.stringify(log.details || {}).toLowerCase().includes(search.toLowerCase());
    return matchModule && matchSearch;
  });

  const formatDate = (ts: string) => {
    const d = new Date(ts);
    return d.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" }) +
      " · " + d.toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <p style={{ fontSize: "0.72rem", color: "var(--muted)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.3rem" }}>Admin Panel</p>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.8rem", fontWeight: 700, color: "var(--green-dk)" }}>Activity Logs</h1>
        <p style={{ fontSize: "0.82rem", color: "var(--muted)", marginTop: "0.3rem" }}>Full audit trail — who did what, when</p>
      </div>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "1rem", marginBottom: "2rem" }}>
        {[
          { label: "Total Actions", value: logs.length, color: "var(--gold)" },
          { label: "Payment Logs", value: logs.filter(l => l.module === "payments").length, color: "#2B5FA8" },
          { label: "Member Logs", value: logs.filter(l => l.module === "members").length, color: "#2E8B44" },
          { label: "Today", value: logs.filter(l => new Date(l.created_at).toDateString() === new Date().toDateString()).length, color: "#6B3FA0" },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: "white", borderRadius: 10, padding: "1.2rem 1.5rem", border: "1px solid rgba(26,92,42,0.08)", borderTop: `4px solid ${color}` }}>
            <p style={{ fontSize: "0.68rem", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)", marginBottom: "0.4rem" }}>{label}</p>
            <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.6rem", fontWeight: 700, color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: "0.8rem", marginBottom: "1.2rem", flexWrap: "wrap", alignItems: "center" }}>
        {/* Module filter */}
        <div style={{ display: "flex", gap: "0.4rem" }}>
          {["all", "payments", "members", "cms", "roles"].map(m => (
            <button key={m} onClick={() => setModuleFilter(m)}
              style={{ padding: "0.4rem 0.9rem", borderRadius: 20, border: "1.5px solid", borderColor: moduleFilter === m ? "var(--gold)" : "rgba(26,92,42,0.15)", background: moduleFilter === m ? "var(--gold)" : "white", color: moduleFilter === m ? "var(--green-dk)" : "var(--muted)", fontSize: "0.75rem", fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", textTransform: "capitalize" }}>
              {m === "all" ? "All Modules" : m}
            </button>
          ))}
        </div>

        {/* Search */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "white", border: "1.5px solid rgba(26,92,42,0.15)", borderRadius: 6, padding: "0 1rem", flex: 1, maxWidth: 340 }}>
          <Search size={14} color="var(--muted)" />
          <input type="text" placeholder="Search by name, action, or details..." value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ border: "none", outline: "none", fontFamily: "'DM Sans',sans-serif", fontSize: "0.82rem", color: "var(--text)", padding: "0.6rem 0", width: "100%", background: "transparent" }} />
          {search && <button onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 0 }}><X size={13} /></button>}
        </div>

        <button onClick={loadLogs} style={{ padding: "0.5rem 1rem", background: "var(--green-dk)", color: "white", border: "none", borderRadius: 6, fontSize: "0.78rem", cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
          ↻ Refresh
        </button>
      </div>

      {/* Logs Table */}
      <div style={{ background: "white", borderRadius: 10, border: "1px solid rgba(26,92,42,0.08)", overflow: "hidden" }}>
        <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid rgba(26,92,42,0.08)", background: "var(--warm)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1rem", fontWeight: 700, color: "var(--green-dk)" }}>
            {filtered.length} log {filtered.length === 1 ? "entry" : "entries"}
          </h2>
          <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>Click any row to see full details</span>
        </div>

        {loading ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "var(--muted)", fontSize: "0.85rem" }}>Loading logs...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "3rem", textAlign: "center" }}>
            <FileText size={36} color="rgba(26,92,42,0.15)" style={{ marginBottom: "0.8rem" }} />
            <p style={{ color: "var(--muted)", fontSize: "0.88rem" }}>No logs found.</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
              <thead>
                <tr style={{ background: "var(--warm)" }}>
                  {["Timestamp", "Done By", "Role", "Module", "Action", "Details"].map(h => (
                    <th key={h} style={{ padding: "0.8rem 1rem", textAlign: "left", fontSize: "0.68rem", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((log, i) => {
                  const mc = MODULE_COLORS[log.module] || MODULE_COLORS.members;
                  const details = log.details || {};
                  // Build a short summary of details
                  let summary = "";
                  if (log.module === "payments") {
                    summary = `${details.for_member || ""} · ${(details.types || []).join(", ").toUpperCase()} · ₱${details.total_amount?.toLocaleString() || ""} · OR: ${details.or_number || ""}`;
                  } else if (log.module === "members") {
                    summary = `${details.for_member || ""} ${details.new_status ? `→ ${details.new_status}` : ""}`;
                  } else {
                    summary = JSON.stringify(details).slice(0, 80);
                  }

                  return (
                    <tr key={log.id} onClick={() => setSelected(log)}
                      style={{ borderBottom: "1px solid rgba(26,92,42,0.06)", background: i % 2 === 0 ? "white" : "var(--cream)", cursor: "pointer" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "rgba(212,160,23,0.05)")}
                      onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? "white" : "var(--cream)")}>
                      <td style={{ padding: "0.9rem 1rem", fontSize: "0.75rem", color: "var(--muted)", whiteSpace: "nowrap" }}>
                        {formatDate(log.created_at)}
                      </td>
                      <td style={{ padding: "0.9rem 1rem", fontSize: "0.85rem", fontWeight: 600, color: "var(--green-dk)", whiteSpace: "nowrap" }}>
                        {log.member_name || "—"}
                      </td>
                      <td style={{ padding: "0.9rem 1rem" }}>
                        <span style={{ fontSize: "0.7rem", color: "var(--muted)", background: "var(--warm)", padding: "2px 8px", borderRadius: 20, textTransform: "capitalize", whiteSpace: "nowrap" }}>
                          {log.role?.replace("_", " ") || "—"}
                        </span>
                      </td>
                      <td style={{ padding: "0.9rem 1rem" }}>
                        <span style={{ background: mc.bg, color: mc.color, fontSize: "0.7rem", fontWeight: 500, padding: "3px 10px", borderRadius: 20, textTransform: "capitalize", whiteSpace: "nowrap" }}>
                          {mc.label}
                        </span>
                      </td>
                      <td style={{ padding: "0.9rem 1rem", fontSize: "0.82rem", color: "var(--text)", whiteSpace: "nowrap" }}>
                        {ACTION_LABELS[log.action] || log.action}
                      </td>
                      <td style={{ padding: "0.9rem 1rem", fontSize: "0.75rem", color: "var(--muted)", maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {summary}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selected && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
          <div style={{ background: "white", borderRadius: 14, maxWidth: 520, width: "100%", boxShadow: "0 24px 64px rgba(0,0,0,0.25)", overflow: "hidden" }}>

            {/* Modal header */}
            <div style={{ background: "var(--green-dk)", padding: "1.4rem 1.6rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <p style={{ fontSize: "0.6rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 3 }}>Log Detail</p>
                <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.1rem", fontWeight: 700, color: "#C9A84C" }}>
                  {ACTION_LABELS[selected.action] || selected.action}
                </h2>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "white", width: 30, height: 30, borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <X size={14} />
              </button>
            </div>

            <div style={{ padding: "1.5rem 1.6rem" }}>
              {/* Meta info */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem", marginBottom: "1.2rem" }}>
                {[
                  { label: "Done By", value: selected.member_name || "—" },
                  { label: "Role", value: selected.role?.replace("_", " ") || "—" },
                  { label: "Module", value: selected.module || "—" },
                  { label: "Timestamp", value: formatDate(selected.created_at) },
                ].map(({ label, value }) => (
                  <div key={label} style={{ background: "var(--warm)", borderRadius: 8, padding: "0.7rem 1rem" }}>
                    <p style={{ fontSize: "0.62rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "#AAA", marginBottom: 3 }}>{label}</p>
                    <p style={{ fontSize: "0.85rem", fontWeight: 500, color: "var(--green-dk)", textTransform: "capitalize" }}>{value}</p>
                  </div>
                ))}
              </div>

              {/* Details breakdown */}
              <div style={{ background: "var(--cream)", borderRadius: 10, padding: "1.2rem", border: "1px solid rgba(26,92,42,0.08)" }}>
                <p style={{ fontSize: "0.68rem", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)", marginBottom: "0.8rem" }}>Full Details</p>
                {selected.details && Object.entries(selected.details).map(([key, val]: any) => (
                  <div key={key} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "0.5rem 0", borderBottom: "1px solid rgba(26,92,42,0.06)", gap: "1rem" }}>
                    <span style={{ fontSize: "0.75rem", color: "var(--muted)", textTransform: "capitalize", whiteSpace: "nowrap" }}>
                      {key.replace(/_/g, " ")}
                    </span>
                    <span style={{ fontSize: "0.82rem", fontWeight: 500, color: "var(--green-dk)", textAlign: "right" }}>
                      {Array.isArray(val) ? val.join(", ").toUpperCase() : String(val)}
                    </span>
                  </div>
                ))}
              </div>

              <button onClick={() => setSelected(null)} style={{ width: "100%", marginTop: "1.2rem", padding: "0.75rem", background: "#F5F5F5", border: "none", borderRadius: 8, fontSize: "0.82rem", color: "#666", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
