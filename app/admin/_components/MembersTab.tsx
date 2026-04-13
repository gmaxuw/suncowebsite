"use client";
// ─────────────────────────────────────────────
// MembersTab.tsx
// Handles: member list, filters, approve/reject,
//          status updates, member detail modal
// Accessible by: admin, president, treasurer, secretary
// ─────────────────────────────────────────────
import { useEffect, useState } from "react";
import { Users } from "lucide-react";

interface Props {
  canCRUD: boolean;
  supabase: any;
}

export default function MembersTab({ canCRUD, supabase }: Props) {
  const [members, setMembers] = useState<any[]>([]);
  const [filter, setFilter] = useState("pending");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [saving, setSaving] = useState(false);

  const loadMembers = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("members")
      .select("*")
      .order("created_at", { ascending: false });
    setMembers(data || []);
    setLoading(false);
  };

  useEffect(() => { loadMembers(); }, []);

  const filtered = members.filter(m => {
    const matchFilter =
      filter === "all" ? true :
      filter === "pending" ? m.approval_status === "pending" :
      filter === "approved" ? m.approval_status === "approved" :
      filter === "rejected" ? m.approval_status === "rejected" :
      m.status === filter;
    const matchSearch = search === "" ? true :
      `${m.first_name} ${m.last_name} ${m.email}`
        .toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const handleApprove = async (member: any) => {
    setSaving(true);
    await supabase.from("members").update({
      approval_status: "approved",
      status: "active",
    }).eq("id", member.id);
    await loadMembers();
    setSelected(null);
    setSaving(false);
  };

  const handleReject = async (member: any) => {
    if (!rejectReason) { alert("Please enter a rejection reason."); return; }
    setSaving(true);
    await supabase.from("members").update({
      approval_status: "rejected",
      status: "dropped",
      rejection_reason: rejectReason,
    }).eq("id", member.id);
    await loadMembers();
    setSelected(null);
    setRejectReason("");
    setSaving(false);
  };

  const handleStatusChange = async (member: any, newStatus: string) => {
    setSaving(true);
    await supabase.from("members")
      .update({ status: newStatus })
      .eq("id", member.id);
    await loadMembers();
    setSaving(false);
  };

  const statusColor: any = {
    active: "#2E8B44", "non-active": "#D4A017",
    dropped: "#C0392B", deceased: "#95A5A6", pending: "#2B5FA8",
  };

  const pendingCount = members.filter(m => m.approval_status === "pending").length;

  return (
    <div>
      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div>
          <p style={{ fontSize: "0.72rem", color: "var(--muted)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.3rem" }}>Admin Panel</p>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.8rem", fontWeight: 700, color: "var(--green-dk)" }}>
            Member Management
            {pendingCount > 0 && (
              <span style={{ marginLeft: 10, background: "#2B5FA8", color: "white", fontSize: "0.75rem", fontWeight: 600, padding: "3px 10px", borderRadius: 20, verticalAlign: "middle" }}>
                {pendingCount} pending
              </span>
            )}
          </h1>
        </div>
      </div>

      {/* ── Filter Tabs ── */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        {[
          { id: "pending", label: `Pending (${members.filter(m => m.approval_status === "pending").length})` },
          { id: "approved", label: `Approved (${members.filter(m => m.approval_status === "approved").length})` },
          { id: "active", label: `Active (${members.filter(m => m.status === "active" && m.approval_status === "approved").length})` },
          { id: "non-active", label: `Non-active (${members.filter(m => m.status === "non-active").length})` },
          { id: "dropped", label: `Dropped (${members.filter(m => m.status === "dropped").length})` },
          { id: "rejected", label: `Rejected (${members.filter(m => m.approval_status === "rejected").length})` },
          { id: "all", label: `All (${members.length})` },
        ].map(({ id, label }) => (
          <button key={id} onClick={() => setFilter(id)} style={{
            padding: "0.45rem 1rem", borderRadius: 20, border: "1.5px solid",
            borderColor: filter === id ? "var(--gold)" : "rgba(26,92,42,0.15)",
            background: filter === id ? "var(--gold)" : "white",
            color: filter === id ? "var(--green-dk)" : "var(--muted)",
            fontSize: "0.75rem", fontWeight: 500, cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif"
          }}>{label}</button>
        ))}
      </div>

      {/* ── Search ── */}
      <div style={{ marginBottom: "1.2rem" }}>
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: "100%", maxWidth: 360, padding: "0.7rem 1rem", border: "1.5px solid rgba(26,92,42,0.15)", borderRadius: 6, fontSize: "0.88rem", fontFamily: "'DM Sans', sans-serif", outline: "none", color: "var(--text)", background: "white" }}
        />
      </div>

      {/* ── Table ── */}
      <div style={{ background: "white", borderRadius: 10, border: "1px solid rgba(26,92,42,0.08)", overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "var(--muted)", fontSize: "0.85rem" }}>Loading members...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "3rem", textAlign: "center" }}>
            <Users size={36} color="rgba(26,92,42,0.15)" style={{ marginBottom: "0.8rem" }} />
            <p style={{ color: "var(--muted)", fontSize: "0.88rem" }}>No members found.</p>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--warm)" }}>
                {["#", "Name", "Email", "Mobile", "Date Applied", "Approval", "Status", "Actions"].map(h => (
                  <th key={h} style={{ padding: "0.8rem 1rem", textAlign: "left", fontSize: "0.68rem", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((m, i) => (
                <tr key={m.id} style={{ borderBottom: "1px solid rgba(26,92,42,0.06)", background: i % 2 === 0 ? "white" : "var(--cream)" }}>
                  <td style={{ padding: "0.9rem 1rem", fontSize: "0.8rem", color: "var(--muted)" }}>#{m.membership_number || "—"}</td>
                  <td style={{ padding: "0.9rem 1rem", fontSize: "0.88rem", fontWeight: 500, color: "var(--green-dk)", whiteSpace: "nowrap" }}>{m.first_name} {m.last_name}</td>
                  <td style={{ padding: "0.9rem 1rem", fontSize: "0.8rem", color: "var(--muted)" }}>{m.email}</td>
                  <td style={{ padding: "0.9rem 1rem", fontSize: "0.8rem", color: "var(--muted)" }}>{m.mobile || "—"}</td>
                  <td style={{ padding: "0.9rem 1rem", fontSize: "0.8rem", color: "var(--muted)", whiteSpace: "nowrap" }}>
                    {m.created_at ? new Date(m.created_at).toLocaleDateString("en-PH") : "—"}
                  </td>
                  <td style={{ padding: "0.9rem 1rem" }}>
                    <span style={{
                      background: m.approval_status === "approved" ? "rgba(46,139,68,0.1)" : m.approval_status === "rejected" ? "rgba(192,57,43,0.1)" : "rgba(43,95,168,0.1)",
                      color: m.approval_status === "approved" ? "#2E8B44" : m.approval_status === "rejected" ? "#C0392B" : "#2B5FA8",
                      fontSize: "0.7rem", fontWeight: 500, padding: "3px 10px", borderRadius: 20, textTransform: "capitalize"
                    }}>{m.approval_status}</span>
                  </td>
                  <td style={{ padding: "0.9rem 1rem" }}>
                    {canCRUD && m.approval_status === "approved" ? (
                      <select
                        value={m.status}
                        onChange={e => handleStatusChange(m, e.target.value)}
                        style={{ fontSize: "0.75rem", padding: "3px 8px", border: `1.5px solid ${statusColor[m.status]}`, borderRadius: 4, color: statusColor[m.status], fontFamily: "'DM Sans', sans-serif", cursor: "pointer", background: "white" }}
                      >
                        {["active", "non-active", "dropped", "deceased"].map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    ) : (
                      <span style={{ fontSize: "0.75rem", color: "var(--muted)", textTransform: "capitalize" }}>{m.status}</span>
                    )}
                  </td>
                  <td style={{ padding: "0.9rem 1rem" }}>
                    {canCRUD && (
                      <button
                        onClick={() => { setSelected(m); setRejectReason(""); }}
                        style={{ background: "none", border: "1px solid rgba(26,92,42,0.2)", color: "var(--green-dk)", padding: "0.3rem 0.8rem", borderRadius: 4, fontSize: "0.75rem", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}
                      >View</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Member Detail Modal ── */}
      {selected && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
          <div style={{ background: "white", borderRadius: 12, padding: "2rem", maxWidth: 520, width: "100%", maxHeight: "90vh", overflowY: "auto" }}>

            {/* Modal Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "1.5rem" }}>
              <div>
                <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.2rem", fontWeight: 700, color: "var(--green-dk)" }}>
                  {selected.first_name} {selected.middle_name} {selected.last_name}
                </h2>
                <p style={{ fontSize: "0.78rem", color: "var(--muted)", marginTop: "0.2rem" }}>{selected.email}</p>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", fontSize: "1.5rem", cursor: "pointer", color: "var(--muted)" }}>✕</button>
            </div>

            {/* Member Details */}
            <div style={{ background: "var(--cream)", borderRadius: 8, padding: "1.2rem", marginBottom: "1.2rem" }}>
              {[
                ["Mobile", selected.mobile || "—"],
                ["Address", selected.address || "—"],
                ["Date of Birth", selected.birthdate ? new Date(selected.birthdate).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" }) : "—"],
                ["Beneficiary", selected.beneficiary_name ? `${selected.beneficiary_name} (${selected.beneficiary_relation})` : "—"],
                ["Member ID", selected.member_id_code || "—"],
                ["Date Applied", selected.created_at ? new Date(selected.created_at).toLocaleDateString("en-PH") : "—"],
                ["Approval", selected.approval_status],
                ["Status", selected.status],
              ].map(([label, value]) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem 0", borderBottom: "1px solid rgba(26,92,42,0.06)", fontSize: "0.83rem" }}>
                  <span style={{ color: "var(--muted)" }}>{label}</span>
                  <span style={{ color: "var(--green-dk)", fontWeight: 500, textTransform: "capitalize", maxWidth: "60%", textAlign: "right" }}>{value}</span>
                </div>
              ))}
            </div>

            {/* Approve / Reject — pending only */}
            {canCRUD && selected.approval_status === "pending" && (
              <div>
                <div style={{ marginBottom: "1rem" }}>
                  <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)", marginBottom: "0.4rem" }}>
                    Rejection Reason (required if rejecting)
                  </label>
                  <textarea
                    value={rejectReason}
                    onChange={e => setRejectReason(e.target.value)}
                    placeholder="Enter reason for rejection..."
                    rows={3}
                    style={{ width: "100%", padding: "0.7rem 0.9rem", border: "1.5px solid rgba(26,92,42,0.15)", borderRadius: 6, fontSize: "0.85rem", fontFamily: "'DM Sans', sans-serif", outline: "none", resize: "vertical", color: "var(--text)" }}
                  />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.8rem" }}>
                  <button onClick={() => handleReject(selected)} disabled={saving}
                    style={{ padding: "0.8rem", background: "rgba(192,57,43,0.1)", border: "1.5px solid rgba(192,57,43,0.3)", color: "#C0392B", borderRadius: 6, fontSize: "0.85rem", fontWeight: 500, cursor: saving ? "not-allowed" : "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                    {saving ? "..." : "✕ Reject"}
                  </button>
                  <button onClick={() => handleApprove(selected)} disabled={saving}
                    style={{ padding: "0.8rem", background: "var(--gold)", border: "none", color: "var(--green-dk)", borderRadius: 6, fontSize: "0.85rem", fontWeight: 500, cursor: saving ? "not-allowed" : "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                    {saving ? "..." : "✓ Approve"}
                  </button>
                </div>
              </div>
            )}

            {/* Status Change — approved only */}
            {canCRUD && selected.approval_status === "approved" && (
              <div>
                <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)", marginBottom: "0.5rem" }}>
                  Update Member Status
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem" }}>
                  {["active", "non-active", "dropped", "deceased"].map(s => (
                    <button key={s}
                      onClick={() => { handleStatusChange(selected, s); setSelected({ ...selected, status: s }); }}
                      style={{ padding: "0.7rem", borderRadius: 6, border: `1.5px solid ${statusColor[s]}`, background: selected.status === s ? statusColor[s] : "transparent", color: selected.status === s ? "white" : statusColor[s], fontSize: "0.8rem", fontWeight: 500, cursor: "pointer", textTransform: "capitalize", fontFamily: "'DM Sans', sans-serif" }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Rejection Reason Display */}
            {selected.approval_status === "rejected" && selected.rejection_reason && (
              <div style={{ background: "rgba(192,57,43,0.08)", border: "1px solid rgba(192,57,43,0.2)", borderRadius: 8, padding: "1rem", marginTop: "1rem" }}>
                <p style={{ fontSize: "0.78rem", color: "#C0392B" }}>
                  <strong>Rejection reason:</strong> {selected.rejection_reason}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}