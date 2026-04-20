"use client";
// ─────────────────────────────────────────────
// MembersTab.tsx
// Changes from original:
//   • Member names are now clickable → opens detail modal
//   • Detail modal shows full member info (read-only view)
//   • Admin actions (approve/reject/status) remain in same modal
// ─────────────────────────────────────────────
import { useEffect, useState } from "react";
import { Users, X, Phone, MapPin, Calendar, Heart, CreditCard, Shield } from "lucide-react";

interface Props {
  canCRUD: boolean;
  supabase: any;
  currentUser?: any;
  currentRole?: string;
  currentMemberName?: string;
}

export default function MembersTab({ canCRUD, supabase, currentUser, currentRole, currentMemberName }: Props) {
  const [members, setMembers] = useState<any[]>([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({
    first_name: "", middle_name: "", last_name: "",
    birthdate: "", mobile: "", address: "", email: "",
    beneficiary_name: "", beneficiary_relation: "",
    alternate_contact_name: "", alternate_contact_number: "", alternate_contact_relation: "",
    gender: "male", citizenship: "Filipino",
    date_joined: new Date().toISOString().split("T")[0],
    status: "active",
  });
  const [addSaving, setAddSaving] = useState(false);

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

  const logActivity = async (action: string, details: object) => {
    if (!currentUser) return;
    await supabase.from("activity_logs").insert({
      user_id: currentUser.id,
      member_name: currentMemberName || currentUser.email,
      role: currentRole || "unknown",
      action,
      module: "members",
      details,
    });
  };



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
      date_joined: new Date().toISOString().split("T")[0],
    }).eq("id", member.id);
    await logActivity("MEMBER_APPROVED", {
      for_member: `${member.first_name} ${member.last_name}`,
      member_id: member.id,
      new_status: "active",
    });
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
    await logActivity("MEMBER_REJECTED", {
      for_member: `${member.first_name} ${member.last_name}`,
      member_id: member.id,
      reason: rejectReason,
    });
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
    await logActivity("MEMBER_STATUS", {
      for_member: `${member.first_name} ${member.last_name}`,
      member_id: member.id,
      previous_status: member.status,
      new_status: newStatus,
    });
    await loadMembers();
    setSaving(false);
  };

  const statusColor: any = {
    active: { text: "#2E8B44", bg: "rgba(46,139,68,0.1)", border: "rgba(46,139,68,0.25)" },
    "non-active": { text: "#A66C00", bg: "rgba(212,160,23,0.1)", border: "rgba(212,160,23,0.25)" },
    dropped: { text: "#C0392B", bg: "rgba(192,57,43,0.1)", border: "rgba(192,57,43,0.25)" },
    deceased: { text: "#888", bg: "rgba(149,165,166,0.1)", border: "rgba(149,165,166,0.25)" },
    pending: { text: "#2B5FA8", bg: "rgba(43,95,168,0.1)", border: "rgba(43,95,168,0.25)" },
  };

  const pendingCount = members.filter(m => m.approval_status === "pending").length;

  const openMember = (m: any) => {
    setSelected(m);
    setRejectReason("");
  };

  const resetAddForm = () => setAddForm({
    first_name: "", middle_name: "", last_name: "",
    birthdate: "", mobile: "", address: "", email: "",
    beneficiary_name: "", beneficiary_relation: "",
    alternate_contact_name: "", alternate_contact_number: "", alternate_contact_relation: "",
    gender: "male", citizenship: "Filipino",
    date_joined: new Date().toISOString().split("T")[0],
    status: "active",
  });

  const handleAddMember = async () => {
    if (!addForm.first_name.trim() || !addForm.last_name.trim()) {
      alert("First name and last name are required.");
      return;
    }
    setAddSaving(true);
    try {
      const placeholderEmail = addForm.email.trim() ||
        `${addForm.first_name.toLowerCase().replace(/\s/g,"")}.${addForm.last_name.toLowerCase().replace(/\s/g,"")}.manual@sunco.local`;

      const { data: newMember, error } = await supabase.from("members").insert({
        first_name:                addForm.first_name.trim(),
        middle_name:               addForm.middle_name.trim() || null,
        last_name:                 addForm.last_name.trim(),
        birthdate:                 addForm.birthdate || null,
        mobile:                    addForm.mobile || null,
        contact_number:            addForm.mobile || null,
        address:                   addForm.address || null,
        email:                     placeholderEmail,
        beneficiary_name:          addForm.beneficiary_name || null,
        beneficiary_relation:      addForm.beneficiary_relation || null,
        alternate_contact_name:    addForm.alternate_contact_name || null,
        alternate_contact_number:  addForm.alternate_contact_number || null,
        alternate_contact_relation:addForm.alternate_contact_relation || null,
        gender:                    addForm.gender,
        citizenship:               addForm.citizenship || "Filipino",
        date_joined:               addForm.date_joined,
        status:                    addForm.status,
        approval_status:           "approved",
        user_id:                   null,
      }).select("id, first_name, last_name").single();

      if (error) throw error;

      await logActivity("MEMBER_APPROVED", {
        for_member: `${addForm.first_name} ${addForm.last_name}`,
        member_id: newMember.id,
        new_status: addForm.status,
        added_manually: true,
      });

      await loadMembers();
      setShowAddForm(false);
      resetAddForm();
    } catch (err: any) {
      alert("Error adding member: " + err.message);
    }
    setAddSaving(false);
  };

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
        {canCRUD && (
          <button onClick={() => { setShowAddForm(true); resetAddForm(); }}
            style={{ background: "var(--gold)", color: "var(--green-dk)", border: "none", padding: "0.65rem 1.4rem", borderRadius: 6, fontSize: "0.82rem", fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.06em", textTransform: "uppercase" }}>
            + Add Member
          </button>
        )}
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
              {filtered.map((m, i) => {
                const sc = statusColor[m.status] || statusColor["active"];
                return (
                  <tr key={m.id} style={{ borderBottom: "1px solid rgba(26,92,42,0.06)", background: i % 2 === 0 ? "white" : "var(--cream)" }}>
                    <td style={{ padding: "0.9rem 1rem", fontSize: "0.8rem", color: "var(--muted)" }}>#{m.membership_number || "—"}</td>

                    {/* ── CLICKABLE NAME ── */}
                    <td style={{ padding: "0.9rem 1rem", whiteSpace: "nowrap" }}>
                      <button
                        onClick={() => openMember(m)}
                        style={{
                          background: "none", border: "none", padding: 0, cursor: "pointer",
                          fontFamily: "'DM Sans', sans-serif", textAlign: "left",
                          fontSize: "0.88rem", fontWeight: 600, color: "var(--green-dk)",
                          textDecoration: "underline", textDecorationStyle: "dotted",
                          textUnderlineOffset: 3,
                        }}
                      >
                        {m.first_name} {m.last_name}
                      </button>
                    </td>

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
                          style={{ fontSize: "0.75rem", padding: "3px 8px", border: `1.5px solid ${sc.text}`, borderRadius: 4, color: sc.text, fontFamily: "'DM Sans', sans-serif", cursor: "pointer", background: "white" }}
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
                          onClick={() => openMember(m)}
                          style={{ background: "none", border: "1px solid rgba(26,92,42,0.2)", color: "var(--green-dk)", padding: "0.3rem 0.8rem", borderRadius: 4, fontSize: "0.75rem", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}
                        >View</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Member Detail Modal ── */}
      {selected && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
          <div style={{ background: "white", borderRadius: 14, maxWidth: 540, width: "100%", maxHeight: "90vh", overflowY: "auto", overflow: "hidden", boxShadow: "0 24px 64px rgba(0,0,0,0.25)" }}>

            {/* Modal Header */}
            <div style={{ background: "#0D3320", padding: "1.4rem 1.6rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <p style={{ fontSize: "0.6rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 3 }}>Member Profile</p>
                <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.15rem", fontWeight: 700, color: "#C9A84C" }}>
                  {selected.first_name} {selected.middle_name || ""} {selected.last_name}
                </h2>
                <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.45)", marginTop: 2 }}>{selected.email}</p>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "white", width: 30, height: 30, borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <X size={14} />
              </button>
            </div>

            <div style={{ padding: "1.5rem 1.6rem", overflowY: "auto", maxHeight: "calc(90vh - 90px)" }}>

              {/* Status badges */}
              <div style={{ display: "flex", gap: 8, marginBottom: "1.3rem" }}>
                {(() => {
                  const sc = statusColor[selected.status] || statusColor["active"];
                  return (
                    <span style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`, fontSize: "0.72rem", fontWeight: 600, padding: "4px 12px", borderRadius: 20, textTransform: "capitalize" }}>
                      {selected.status}
                    </span>
                  );
                })()}
                <span style={{
                  background: selected.approval_status === "approved" ? "rgba(46,139,68,0.1)" : selected.approval_status === "rejected" ? "rgba(192,57,43,0.1)" : "rgba(43,95,168,0.1)",
                  color: selected.approval_status === "approved" ? "#2E8B44" : selected.approval_status === "rejected" ? "#C0392B" : "#2B5FA8",
                  fontSize: "0.72rem", fontWeight: 600, padding: "4px 12px", borderRadius: 20, textTransform: "capitalize"
                }}>{selected.approval_status}</span>
              </div>

              {/* Info grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem", marginBottom: "1.3rem" }}>
                {[
                  { icon: CreditCard, label: "Member ID", value: selected.member_id_code || `#${selected.membership_number || "—"}` },
                  { icon: Calendar, label: "Date Joined", value: selected.date_joined ? new Date(selected.date_joined).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" }) : "—" },
                  { icon: Phone, label: "Mobile", value: selected.mobile || "—" },
                  { icon: Calendar, label: "Date of Birth", value: selected.birthdate ? new Date(selected.birthdate).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" }) : "—" },
                  { icon: MapPin, label: "Address", value: selected.address || "—" },
                  { icon: Heart, label: "Beneficiary", value: selected.beneficiary_name ? `${selected.beneficiary_name} (${selected.beneficiary_relation || "—"})` : "—" },
                  { icon: Calendar, label: "Date Applied", value: selected.created_at ? new Date(selected.created_at).toLocaleDateString("en-PH") : "—" },
                  { icon: Shield, label: "Member No.", value: selected.membership_number ? `#${selected.membership_number}` : "—" },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "0.75rem", background: "var(--warm, #F9F7F2)", borderRadius: 8 }}>
                    <Icon size={14} color="#888" style={{ marginTop: 2, flexShrink: 0 }} />
                    <div>
                      <p style={{ fontSize: "0.62rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "#AAA", marginBottom: 2 }}>{label}</p>
                      <p style={{ fontSize: "0.82rem", fontWeight: 500, color: "var(--green-dk, #0D3320)", textTransform: label === "Address" ? "none" : "capitalize" }}>{value}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Approve / Reject — pending only */}
              {canCRUD && selected.approval_status === "pending" && (
                <div style={{ borderTop: "1px solid rgba(0,0,0,0.07)", paddingTop: "1.2rem" }}>
                  <p style={{ fontSize: "0.72rem", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)", marginBottom: "0.6rem" }}>Actions</p>
                  <div style={{ marginBottom: "0.9rem" }}>
                    <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)", marginBottom: "0.4rem" }}>
                      Rejection Reason (required if rejecting)
                    </label>
                    <textarea
                      value={rejectReason}
                      onChange={e => setRejectReason(e.target.value)}
                      placeholder="Enter reason for rejection..."
                      rows={3}
                      style={{ width: "100%", padding: "0.7rem 0.9rem", border: "1.5px solid rgba(26,92,42,0.15)", borderRadius: 6, fontSize: "0.85rem", fontFamily: "'DM Sans', sans-serif", outline: "none", resize: "vertical", color: "var(--text)", boxSizing: "border-box" }}
                    />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.8rem" }}>
                    <button onClick={() => handleReject(selected)} disabled={saving}
                      style={{ padding: "0.8rem", background: "rgba(192,57,43,0.1)", border: "1.5px solid rgba(192,57,43,0.3)", color: "#C0392B", borderRadius: 6, fontSize: "0.85rem", fontWeight: 500, cursor: saving ? "not-allowed" : "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                      {saving ? "..." : "✕ Reject"}
                    </button>
                    <button onClick={() => handleApprove(selected)} disabled={saving}
                      style={{ padding: "0.8rem", background: "var(--gold, #C9A84C)", border: "none", color: "var(--green-dk, #0D3320)", borderRadius: 6, fontSize: "0.85rem", fontWeight: 500, cursor: saving ? "not-allowed" : "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                      {saving ? "..." : "✓ Approve"}
                    </button>
                  </div>
                </div>
              )}

              {/* Status change — approved only */}
              {canCRUD && selected.approval_status === "approved" && (
                <div style={{ borderTop: "1px solid rgba(0,0,0,0.07)", paddingTop: "1.2rem" }}>
                  <p style={{ fontSize: "0.72rem", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)", marginBottom: "0.6rem" }}>Update Status</p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem" }}>
                    {["active", "non-active", "dropped", "deceased"].map(s => {
                      const sc = statusColor[s];
                      const isActive = selected.status === s;
                      return (
                        <button key={s}
                          onClick={() => { handleStatusChange(selected, s); setSelected({ ...selected, status: s }); }}
                          style={{ padding: "0.7rem", borderRadius: 6, border: `1.5px solid ${sc.text}`, background: isActive ? sc.text : "transparent", color: isActive ? "white" : sc.text, fontSize: "0.8rem", fontWeight: 500, cursor: "pointer", textTransform: "capitalize", fontFamily: "'DM Sans', sans-serif" }}>
                          {s}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Rejection reason display */}
              {selected.approval_status === "rejected" && selected.rejection_reason && (
                <div style={{ background: "rgba(192,57,43,0.08)", border: "1px solid rgba(192,57,43,0.2)", borderRadius: 8, padding: "1rem", marginTop: "1rem" }}>
                  <p style={{ fontSize: "0.78rem", color: "#C0392B" }}>
                    <strong>Rejection reason:</strong> {selected.rejection_reason}
                  </p>
                </div>
              )}

              {/* Close button */}
              <button
                onClick={() => setSelected(null)}
                style={{ width: "100%", marginTop: "1.2rem", padding: "0.75rem", background: "#F5F5F5", border: "none", borderRadius: 8, fontSize: "0.82rem", color: "#666", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
                                                      {/* ── ADD MEMBER MANUALLY MODAL ── */}
                                                            {showAddForm && (
                                                              <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}>
                                                                <div style={{ background: "white", borderRadius: 14, maxWidth: 580, width: "100%", maxHeight: "92vh", display: "flex", flexDirection: "column", boxShadow: "0 24px 64px rgba(0,0,0,0.3)", overflow: "hidden" }}>

                                                                  <div style={{ background: "#0D3320", padding: "1.4rem 1.6rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
                                                                    <div>
                                                                      <p style={{ fontSize: "0.6rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 3 }}>Manual Entry</p>
                                                                      <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.1rem", fontWeight: 700, color: "#C9A84C" }}>Add Member Manually</h2>
                                                                    </div>
                                                                    <button onClick={() => setShowAddForm(false)} style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "white", width: 30, height: 30, borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                                                      <X size={14} />
                                                                    </button>
                                                                  </div>

                                                                  <div style={{ overflowY: "auto", padding: "1.5rem 1.6rem" }}>

                                                                    {/* Name */}
                                                                    <p style={{ fontSize: "0.68rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)", marginBottom: "0.8rem" }}>Full Name</p>
                                                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.6rem", marginBottom: "1.2rem" }}>
                                                                      {[["First Name *", "first_name"], ["Middle Name", "middle_name"], ["Last Name *", "last_name"]].map(([label, key]) => (
                                                                        <div key={key}>
                                                                          <label style={{ display: "block", fontSize: "0.62rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "#AAA", marginBottom: 4 }}>{label}</label>
                                                                          <input value={(addForm as any)[key]} onChange={e => setAddForm(p => ({ ...p, [key]: e.target.value }))}
                                                                            style={{ width: "100%", padding: "0.65rem 0.8rem", border: "1.5px solid rgba(26,92,42,0.15)", borderRadius: 6, fontSize: "0.85rem", fontFamily: "'DM Sans', sans-serif", outline: "none", color: "var(--green-dk)", boxSizing: "border-box" }} />
                                                                        </div>
                                                                      ))}
                                                                    </div>

                                                                    {/* Basic Info */}
                                                                    <p style={{ fontSize: "0.68rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)", marginBottom: "0.8rem" }}>Basic Information</p>
                                                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem", marginBottom: "1.2rem" }}>
                                                                      <div>
                                                                        <label style={{ display: "block", fontSize: "0.62rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "#AAA", marginBottom: 4 }}>Date of Birth</label>
                                                                        <input type="date" value={addForm.birthdate} onChange={e => setAddForm(p => ({ ...p, birthdate: e.target.value }))}
                                                                          style={{ width: "100%", padding: "0.65rem 0.8rem", border: "1.5px solid rgba(26,92,42,0.15)", borderRadius: 6, fontSize: "0.85rem", fontFamily: "'DM Sans', sans-serif", outline: "none", color: "var(--green-dk)", boxSizing: "border-box" }} />
                                                                      </div>
                                                                      <div>
                                                                        <label style={{ display: "block", fontSize: "0.62rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "#AAA", marginBottom: 4 }}>Date Registered</label>
                                                                        <input type="date" value={addForm.date_joined}
                                                                          min="2011-01-01" max={new Date().toISOString().split("T")[0]}
                                                                          onChange={e => setAddForm(p => ({ ...p, date_joined: e.target.value }))}
                                                                          style={{ width: "100%", padding: "0.65rem 0.8rem", border: "1.5px solid rgba(26,92,42,0.15)", borderRadius: 6, fontSize: "0.85rem", fontFamily: "'DM Sans', sans-serif", outline: "none", color: "var(--green-dk)", boxSizing: "border-box" }} />
                                                                      </div>
                                                                      <div>
                                                                        <label style={{ display: "block", fontSize: "0.62rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "#AAA", marginBottom: 4 }}>Gender</label>
                                                                        <select value={addForm.gender} onChange={e => setAddForm(p => ({ ...p, gender: e.target.value }))}
                                                                          style={{ width: "100%", padding: "0.65rem 0.8rem", border: "1.5px solid rgba(26,92,42,0.15)", borderRadius: 6, fontSize: "0.85rem", fontFamily: "'DM Sans', sans-serif", outline: "none", color: "var(--green-dk)", background: "white", boxSizing: "border-box" }}>
                                                                          <option value="male">Male</option>
                                                                          <option value="female">Female</option>
                                                                          <option value="other">Other</option>
                                                                        </select>
                                                                      </div>
                                                                      <div>
                                                                        <label style={{ display: "block", fontSize: "0.62rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "#AAA", marginBottom: 4 }}>Citizenship</label>
                                                                        <input value={addForm.citizenship} onChange={e => setAddForm(p => ({ ...p, citizenship: e.target.value }))}
                                                                          style={{ width: "100%", padding: "0.65rem 0.8rem", border: "1.5px solid rgba(26,92,42,0.15)", borderRadius: 6, fontSize: "0.85rem", fontFamily: "'DM Sans', sans-serif", outline: "none", color: "var(--green-dk)", boxSizing: "border-box" }} />
                                                                      </div>
                                                                      <div>
                                                                        <label style={{ display: "block", fontSize: "0.62rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "#AAA", marginBottom: 4 }}>Initial Status</label>
                                                                        <select value={addForm.status} onChange={e => setAddForm(p => ({ ...p, status: e.target.value }))}
                                                                          style={{ width: "100%", padding: "0.65rem 0.8rem", border: "1.5px solid rgba(26,92,42,0.15)", borderRadius: 6, fontSize: "0.85rem", fontFamily: "'DM Sans', sans-serif", outline: "none", color: "var(--green-dk)", background: "white", boxSizing: "border-box" }}>
                                                                          <option value="active">Active</option>
                                                                          <option value="non-active">Non-Active</option>
                                                                          <option value="dropped">Dropped</option>
                                                                          <option value="deceased">Deceased</option>
                                                                        </select>
                                                                      </div>
                                                                    </div>

                                                                    {/* Contact */}
                                                                    <p style={{ fontSize: "0.68rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)", marginBottom: "0.8rem" }}>Contact Details</p>
                                                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem", marginBottom: "0.6rem" }}>
                                                                      <div>
                                                                        <label style={{ display: "block", fontSize: "0.62rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "#AAA", marginBottom: 4 }}>Mobile Number</label>
                                                                        <input type="tel" value={addForm.mobile} onChange={e => setAddForm(p => ({ ...p, mobile: e.target.value }))} placeholder="09XX XXX XXXX"
                                                                          style={{ width: "100%", padding: "0.65rem 0.8rem", border: "1.5px solid rgba(26,92,42,0.15)", borderRadius: 6, fontSize: "0.85rem", fontFamily: "'DM Sans', sans-serif", outline: "none", color: "var(--green-dk)", boxSizing: "border-box" }} />
                                                                      </div>
                                                                      <div>
                                                                        <label style={{ display: "block", fontSize: "0.62rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "#AAA", marginBottom: 4 }}>Email (optional)</label>
                                                                        <input type="email" value={addForm.email} onChange={e => setAddForm(p => ({ ...p, email: e.target.value }))} placeholder="Leave blank if none yet"
                                                                          style={{ width: "100%", padding: "0.65rem 0.8rem", border: "1.5px solid rgba(26,92,42,0.15)", borderRadius: 6, fontSize: "0.85rem", fontFamily: "'DM Sans', sans-serif", outline: "none", color: "var(--green-dk)", boxSizing: "border-box" }} />
                                                                      </div>
                                                                    </div>
                                                                    <div style={{ marginBottom: "1.2rem" }}>
                                                                      <label style={{ display: "block", fontSize: "0.62rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "#AAA", marginBottom: 4 }}>Complete Address</label>
                                                                      <input value={addForm.address} onChange={e => setAddForm(p => ({ ...p, address: e.target.value }))} placeholder="Barangay, Municipality, Province"
                                                                        style={{ width: "100%", padding: "0.65rem 0.8rem", border: "1.5px solid rgba(26,92,42,0.15)", borderRadius: 6, fontSize: "0.85rem", fontFamily: "'DM Sans', sans-serif", outline: "none", color: "var(--green-dk)", boxSizing: "border-box" }} />
                                                                    </div>

                                                                    {/* Beneficiary */}
                                                                    <p style={{ fontSize: "0.68rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)", marginBottom: "0.8rem" }}>Beneficiary (for MAS)</p>
                                                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem", marginBottom: "1.2rem" }}>
                                                                      <div>
                                                                        <label style={{ display: "block", fontSize: "0.62rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "#AAA", marginBottom: 4 }}>Beneficiary Name</label>
                                                                        <input value={addForm.beneficiary_name} onChange={e => setAddForm(p => ({ ...p, beneficiary_name: e.target.value }))} placeholder="Full name"
                                                                          style={{ width: "100%", padding: "0.65rem 0.8rem", border: "1.5px solid rgba(26,92,42,0.15)", borderRadius: 6, fontSize: "0.85rem", fontFamily: "'DM Sans', sans-serif", outline: "none", color: "var(--green-dk)", boxSizing: "border-box" }} />
                                                                      </div>
                                                                      <div>
                                                                        <label style={{ display: "block", fontSize: "0.62rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "#AAA", marginBottom: 4 }}>Relationship</label>
                                                                        <input value={addForm.beneficiary_relation} onChange={e => setAddForm(p => ({ ...p, beneficiary_relation: e.target.value }))} placeholder="e.g. Spouse, Child"
                                                                          style={{ width: "100%", padding: "0.65rem 0.8rem", border: "1.5px solid rgba(26,92,42,0.15)", borderRadius: 6, fontSize: "0.85rem", fontFamily: "'DM Sans', sans-serif", outline: "none", color: "var(--green-dk)", boxSizing: "border-box" }} />
                                                                      </div>
                                                                    </div>

                                                                    {/* Alternate Contact */}
                                                                    <p style={{ fontSize: "0.68rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)", marginBottom: "0.8rem" }}>Alternate Contact</p>
                                                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem", marginBottom: "0.6rem" }}>
                                                                      <div>
                                                                        <label style={{ display: "block", fontSize: "0.62rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "#AAA", marginBottom: 4 }}>Full Name</label>
                                                                        <input value={addForm.alternate_contact_name} onChange={e => setAddForm(p => ({ ...p, alternate_contact_name: e.target.value }))} placeholder="e.g. Maria dela Cruz"
                                                                          style={{ width: "100%", padding: "0.65rem 0.8rem", border: "1.5px solid rgba(26,92,42,0.15)", borderRadius: 6, fontSize: "0.85rem", fontFamily: "'DM Sans', sans-serif", outline: "none", color: "var(--green-dk)", boxSizing: "border-box" }} />
                                                                      </div>
                                                                      <div>
                                                                        <label style={{ display: "block", fontSize: "0.62rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "#AAA", marginBottom: 4 }}>Relationship</label>
                                                                        <input value={addForm.alternate_contact_relation} onChange={e => setAddForm(p => ({ ...p, alternate_contact_relation: e.target.value }))} placeholder="e.g. Daughter"
                                                                          style={{ width: "100%", padding: "0.65rem 0.8rem", border: "1.5px solid rgba(26,92,42,0.15)", borderRadius: 6, fontSize: "0.85rem", fontFamily: "'DM Sans', sans-serif", outline: "none", color: "var(--green-dk)", boxSizing: "border-box" }} />
                                                                      </div>
                                                                    </div>
                                                                    <div style={{ marginBottom: "1.5rem" }}>
                                                                      <label style={{ display: "block", fontSize: "0.62rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "#AAA", marginBottom: 4 }}>Contact Number</label>
                                                                      <input type="tel" value={addForm.alternate_contact_number} onChange={e => setAddForm(p => ({ ...p, alternate_contact_number: e.target.value }))} placeholder="09XX XXX XXXX"
                                                                        style={{ width: "100%", padding: "0.65rem 0.8rem", border: "1.5px solid rgba(26,92,42,0.15)", borderRadius: 6, fontSize: "0.85rem", fontFamily: "'DM Sans', sans-serif", outline: "none", color: "var(--green-dk)", boxSizing: "border-box" }} />
                                                                    </div>

                                                                    {/* Note about email */}
                                                                    {!addForm.email.trim() && (
                                                                      <div style={{ background: "rgba(43,95,168,0.08)", border: "1px solid rgba(43,95,168,0.2)", borderRadius: 8, padding: "0.8rem 1rem", marginBottom: "1.2rem" }}>
                                                                        <p style={{ fontSize: "0.78rem", color: "#2B5FA8" }}>
                                                                          ℹ️ No email entered — a placeholder will be auto-generated. You can link a real email later by editing the member.
                                                                        </p>
                                                                      </div>
                                                                    )}

                                                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.8rem" }}>
                                                                      <button onClick={() => setShowAddForm(false)}
                                                                        style={{ padding: "0.8rem", background: "#F5F5F5", border: "none", borderRadius: 8, fontSize: "0.85rem", color: "#777", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                                                                        Cancel
                                                                      </button>
                                                                      <button onClick={handleAddMember} disabled={addSaving}
                                                                        style={{ padding: "0.8rem", background: "var(--gold)", border: "none", borderRadius: 8, fontSize: "0.85rem", fontWeight: 600, color: "var(--green-dk)", cursor: addSaving ? "not-allowed" : "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                                                                        {addSaving ? "Saving..." : "Add Member"}
                                                                      </button>
                                                                    </div>
                                                                  </div>
                                                                </div>
                                                              </div>
                                                            )}
                                                          </div>
                                                        );
                                                      }
