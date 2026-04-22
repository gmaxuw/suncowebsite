"use client";
// ─────────────────────────────────────────────
// MembersTab.tsx  —  Revolutionary Edition
//
// Member list with full-profile modal containing:
//   Tab 1: Profile     — view + edit all fields (canCRUD)
//   Tab 2: Payments    — history + record payment inline
//   Tab 3: Submissions — GCash submission history
//   Tab 4: Actions     — approve/reject/status (pending)
//
// Roles: admin, president, treasurer, secretary can edit
// ─────────────────────────────────────────────
import { useEffect, useState, useRef } from "react";
import {
  Users, X, Phone, MapPin, Calendar, Heart, CreditCard,
  Shield, Search, PlusCircle, Edit3, Check, ChevronDown,
  FileText, Clock, CheckCircle, XCircle, Upload, Camera,
  AlertTriangle, Inbox,
} from "lucide-react";

interface Props {
  canCRUD:           boolean;
  supabase:          any;
  currentUser?:      any;
  currentRole?:      string;
  currentMemberName?: string;
}

type ModalTab = "profile" | "payments" | "submissions" | "actions";

const PAYMENT_TYPES = [
  { type: "lifetime", label: "Lifetime Membership", amount: 200 },
  { type: "aof",      label: "Annual Operating Fund (AOF)", amount: 100 },
  { type: "mas",      label: "Mortuary Assistance (MAS)",   amount: 740 },
];

const STATUS_STYLES: Record<string, { text: string; bg: string; border: string }> = {
  active:       { text: "#1A6B35", bg: "#E6F9ED", border: "#A8E6BC" },
  "non-active": { text: "#A66C00", bg: "#FFF8E1", border: "#FFD97A" },
  dropped:      { text: "#A8200D", bg: "#FDECEA", border: "#F5A49A" },
  deceased:     { text: "#555",    bg: "#F2F2F2", border: "#CCC"    },
};

const APPROVAL_STYLES: Record<string, { text: string; bg: string }> = {
  approved: { text: "#2E8B44", bg: "rgba(46,139,68,0.1)" },
  rejected: { text: "#C0392B", bg: "rgba(192,57,43,0.1)" },
  pending:  { text: "#2B5FA8", bg: "rgba(43,95,168,0.1)" },
};

function InfoCard({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "0.8rem 1rem", background: "#F9F8F5", borderRadius: 10, border: "1px solid rgba(0,0,0,0.05)" }}>
      <div style={{ width: 28, height: 28, borderRadius: 7, background: "rgba(26,92,42,0.08)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon size={13} color="#1A5C2A" />
      </div>
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: "0.6rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "#AAA", marginBottom: 3, fontWeight: 600 }}>{label}</p>
        <p style={{ fontSize: "0.85rem", fontWeight: 600, color: "#0D3320", wordBreak: "break-word" }}>{value || "—"}</p>
      </div>
    </div>
  );
}

export default function MembersTab({ canCRUD, supabase, currentUser, currentRole, currentMemberName }: Props) {
  const [members,        setMembers]        = useState<any[]>([]);
  const [filter,         setFilter]         = useState("all");
  const [loading,        setLoading]        = useState(true);
  const [search,         setSearch]         = useState("");
  const [selected,       setSelected]       = useState<any>(null);
  const [modalTab,       setModalTab]       = useState<ModalTab>("profile");

  // Profile edit
  const [editMode,       setEditMode]       = useState(false);
  const [editForm,       setEditForm]       = useState<any>({});
  const [editSaving,     setEditSaving]     = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);

  // Actions (approve/reject)
  const [rejectReason,   setRejectReason]   = useState("");
  const [actionSaving,   setActionSaving]   = useState(false);

  // Payments
  const [memberPayments,    setMemberPayments]    = useState<any[]>([]);
  const [memberSubmissions, setMemberSubmissions] = useState<any[]>([]);
  const [paymentsLoading,   setPaymentsLoading]   = useState(false);
  const [showPayForm,       setShowPayForm]       = useState(false);
  const [payYear,           setPayYear]           = useState(new Date().getFullYear());
  const [payTypes,          setPayTypes]          = useState<string[]>([]);
  const [payOR,             setPayOR]             = useState("");
  const [payDate,           setPayDate]           = useState(new Date().toISOString().split("T")[0]);
  const [paySaving,         setPaySaving]         = useState(false);

  // Add member form
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm,     setAddForm]     = useState({
    first_name: "", middle_name: "", last_name: "",
    birthdate: "", mobile: "", address: "", email: "",
    beneficiary_name: "", beneficiary_relation: "",
    gender: "male", citizenship: "Filipino",
    date_joined: new Date().toISOString().split("T")[0],
    status: "active",
  });
  const [addSaving, setAddSaving] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);

  // ── Load ──
  const loadMembers = async () => {
    setLoading(true);
    const { data } = await supabase.from("members").select("*").order("created_at", { ascending: false });
    setMembers(data || []);
    setLoading(false);
  };

  useEffect(() => { loadMembers(); }, []);

  const logActivity = async (action: string, details: object) => {
    if (!currentUser) return;
    await supabase.from("activity_logs").insert({
      user_id:     currentUser.id,
      member_name: currentMemberName || currentUser.email,
      role:        currentRole || "unknown",
      action, module: "members", details,
    });
  };

  // ── Load member payments + submissions ──
  const loadMemberData = async (memberId: string) => {
    setPaymentsLoading(true);
    const [{ data: pays }, { data: subs }] = await Promise.all([
      supabase.from("payments").select("*").eq("member_id", memberId).order("year", { ascending: false }),
      supabase.from("payment_submissions").select("*").eq("member_id", memberId).order("created_at", { ascending: false }),
    ]);
    setMemberPayments(pays || []);
    setMemberSubmissions(subs || []);
    setPaymentsLoading(false);
  };

  // ── Open member modal ──
  const openMember = (m: any) => {
    setSelected(m);
    setModalTab(m.approval_status === "pending" ? "actions" : "profile");
    setEditMode(false);
    setEditForm({
      first_name:           m.first_name || "",
      middle_name:          m.middle_name || "",
      last_name:            m.last_name || "",
      birthdate:            m.birthdate || "",
      mobile:               m.mobile || "",
      address:              m.address || "",
      email:                m.email || "",
      beneficiary_name:     m.beneficiary_name || "",
      beneficiary_relation: m.beneficiary_relation || "",
      date_joined:          m.date_joined || "",
      status:               m.status || "active",
    });
    setRejectReason("");
    setShowPayForm(false);
    setPayTypes([]);
    setPayOR("");
    loadMemberData(m.id);
  };

  // ── Photo upload for member ──
  const compressToWebP = (file: File): Promise<Blob> =>
    new Promise((resolve, reject) => {
      const img = document.createElement("img") as HTMLImageElement;
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const MAX = 300;
        let { width, height } = img;
        if (width > MAX || height > MAX) {
          if (width > height) { height = Math.round((height / width) * MAX); width = MAX; }
          else { width = Math.round((width / height) * MAX); height = MAX; }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width; canvas.height = height;
        canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
        canvas.toBlob(b => b ? resolve(b) : reject(new Error("Failed")), "image/webp", 0.85);
      };
      img.onerror = reject;
      img.src = url;
    });

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selected) return;
    setPhotoUploading(true);
    try {
      const blob = await compressToWebP(file);
      const filename = `member-${selected.id}-avatar.webp`;
      const { error } = await supabase.storage.from("avatars").upload(filename, blob, { contentType: "image/webp", upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filename);
      const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      await supabase.from("members").update({ avatar_url: avatarUrl }).eq("id", selected.id);
      setSelected((prev: any) => ({ ...prev, avatar_url: avatarUrl }));
      setMembers(prev => prev.map(m => m.id === selected.id ? { ...m, avatar_url: avatarUrl } : m));
    } catch (err: any) { alert("Upload failed: " + err.message); }
    setPhotoUploading(false);
  };

  // ── Save profile edit ──
  const handleSaveProfile = async () => {
    setEditSaving(true);
    const { error } = await supabase.from("members").update({
      first_name:           editForm.first_name.trim(),
      middle_name:          editForm.middle_name.trim() || null,
      last_name:            editForm.last_name.trim(),
      birthdate:            editForm.birthdate || null,
      mobile:               editForm.mobile || null,
      address:              editForm.address || null,
      beneficiary_name:     editForm.beneficiary_name || null,
      beneficiary_relation: editForm.beneficiary_relation || null,
      date_joined:          editForm.date_joined || null,
    }).eq("id", selected.id);

    if (!error) {
      const updated = { ...selected, ...editForm };
      setSelected(updated);
      setMembers(prev => prev.map(m => m.id === selected.id ? updated : m));
      setEditMode(false);
      await logActivity("MEMBER_PROFILE_EDITED", {
        for_member: `${editForm.first_name} ${editForm.last_name}`,
        member_id: selected.id,
      });
    } else {
      alert("Error saving: " + error.message);
    }
    setEditSaving(false);
  };

  // ── Approve / Reject ──
  const handleApprove = async () => {
    setActionSaving(true);
    await supabase.from("members").update({ approval_status: "approved", status: "active", date_joined: new Date().toISOString().split("T")[0] }).eq("id", selected.id);
    await logActivity("MEMBER_APPROVED", { for_member: `${selected.first_name} ${selected.last_name}`, member_id: selected.id, new_status: "active" });
    await loadMembers();
    setSelected(null);
    setActionSaving(false);
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) { alert("Please enter a rejection reason."); return; }
    setActionSaving(true);
    await supabase.from("members").update({ approval_status: "rejected", status: "dropped", rejection_reason: rejectReason }).eq("id", selected.id);
    await logActivity("MEMBER_REJECTED", { for_member: `${selected.first_name} ${selected.last_name}`, reason: rejectReason });
    await loadMembers();
    setSelected(null);
    setActionSaving(false);
  };

  const handleStatusChange = async (newStatus: string) => {
    await supabase.from("members").update({ status: newStatus }).eq("id", selected.id);
    await logActivity("MEMBER_STATUS", { for_member: `${selected.first_name} ${selected.last_name}`, new_status: newStatus, previous_status: selected.status });
    setSelected((prev: any) => ({ ...prev, status: newStatus }));
    setMembers(prev => prev.map(m => m.id === selected.id ? { ...m, status: newStatus } : m));
  };

  // ── Record payment inline ──
  const isAlreadyPaid = (type: string) => {
    if (type === "lifetime") return memberPayments.some(p => p.type === "lifetime");
    return memberPayments.some(p => p.type === type && p.year === payYear);
  };

  const handleRecordPayment = async () => {
    if (payTypes.length === 0) { alert("Select at least one payment type."); return; }
    if (!payOR.trim()) { alert("Enter the Official Receipt (OR) number."); return; }
    setPaySaving(true);

    const inserts = payTypes.map(type => ({
      member_id:      selected.id,
      year:           payYear,
      type,
      amount:         PAYMENT_TYPES.find(p => p.type === type)?.amount || 0,
      date_paid:      payDate,
      receipt_number: payTypes.length > 1 ? `${payOR.trim()}-${type.toUpperCase()}` : payOR.trim(),
      recorded_by:    currentMemberName || "Officer",
    }));

    const { error } = await supabase.from("payments").insert(inserts);
    if (!error) {
      await logActivity("PAYMENT_RECORDED", {
        for_member:   `${selected.first_name} ${selected.last_name}`,
        year:         payYear,
        types:        payTypes,
        total_amount: inserts.reduce((s, i) => s + i.amount, 0),
        or_number:    payOR.trim(),
      });
      await loadMemberData(selected.id);
      setShowPayForm(false);
      setPayTypes([]);
      setPayOR("");
    } else {
      alert("Error: " + error.message);
    }
    setPaySaving(false);
  };

  // ── Add member ──
  const handleAddMember = async () => {
    if (!addForm.first_name.trim() || !addForm.last_name.trim()) { alert("First and last name required."); return; }
    setAddSaving(true);
    try {
      const email = addForm.email.trim() || `${addForm.first_name.toLowerCase()}.${addForm.last_name.toLowerCase()}.${Date.now()}@sunco.local`;
      const { error } = await supabase.from("members").insert({
        ...addForm,
        email,
        first_name:  addForm.first_name.trim(),
        last_name:   addForm.last_name.trim(),
        middle_name: addForm.middle_name.trim() || null,
        approval_status: "approved",
        user_id: null,
      });
      if (error) throw error;
      await loadMembers();
      setShowAddForm(false);
    } catch (err: any) { alert("Error: " + err.message); }
    setAddSaving(false);
  };

  // ── Filtered members ──
  const filtered = members.filter(m => {
    const matchFilter =
      filter === "all"      ? true :
      filter === "pending"  ? m.approval_status === "pending" :
      filter === "approved" ? m.approval_status === "approved" :
      filter === "rejected" ? m.approval_status === "rejected" :
      m.status === filter;
    const matchSearch = !search || `${m.first_name} ${m.last_name} ${m.email}`.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const pendingCount = members.filter(m => m.approval_status === "pending").length;
  const totalPaidForMember = memberPayments.reduce((s, p) => s + Number(p.amount), 0);

  const inputCls: React.CSSProperties = {
    width: "100%", padding: "0.65rem 0.9rem",
    border: "1.5px solid rgba(26,92,42,0.18)", borderRadius: 8,
    fontSize: "0.88rem", fontFamily: "'DM Sans',sans-serif",
    color: "#0D3320", outline: "none", boxSizing: "border-box", background: "white",
  };

  // ────────────────────────────────────────
  return (
    <div style={{ fontFamily: "'DM Sans',sans-serif" }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "0.8rem" }}>
        <div>
          <p style={{ fontSize: "0.7rem", color: "var(--muted)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.25rem" }}>Admin Panel</p>
          <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.8rem", fontWeight: 700, color: "var(--green-dk)" }}>
            Member Management
            {pendingCount > 0 && (
              <span style={{ marginLeft: 10, background: "#2B5FA8", color: "white", fontSize: "0.72rem", fontWeight: 700, padding: "3px 10px", borderRadius: 20, verticalAlign: "middle" }}>
                {pendingCount} pending
              </span>
            )}
          </h1>
        </div>
        {canCRUD && (
          <button onClick={() => setShowAddForm(true)}
            style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--gold)", color: "var(--green-dk)", border: "none", padding: "0.7rem 1.4rem", borderRadius: 6, fontSize: "0.82rem", fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
            <PlusCircle size={15} /> Add Member
          </button>
        )}
      </div>

      {/* ── Stats ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: "0.8rem", marginBottom: "1.5rem" }}>
        {[
          { label: "Total",    value: members.length,                                              color: "var(--gold)" },
          { label: "Active",   value: members.filter(m => m.status === "active").length,           color: "#2E8B44" },
          { label: "Pending",  value: pendingCount,                                                color: "#2B5FA8" },
          { label: "Non-active",value: members.filter(m => m.status === "non-active").length,      color: "#D4A017" },
          { label: "Dropped",  value: members.filter(m => m.status === "dropped").length,          color: "#C0392B" },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: "white", borderRadius: 10, padding: "1rem 1.2rem", border: "1px solid rgba(26,92,42,0.08)", borderTop: `4px solid ${color}` }}>
            <p style={{ fontSize: "0.62rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)", marginBottom: "0.3rem" }}>{label}</p>
            <p style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.6rem", fontWeight: 700, color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* ── Filters + Search ── */}
      <div style={{ display: "flex", gap: "0.8rem", marginBottom: "1.2rem", flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "white", border: "1.5px solid rgba(26,92,42,0.15)", borderRadius: 6, padding: "0 1rem", flex: 1, minWidth: 200, maxWidth: 340 }}>
          <Search size={14} color="var(--muted)" />
          <input type="text" placeholder="Search by name or email..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ border: "none", outline: "none", fontFamily: "'DM Sans',sans-serif", fontSize: "0.85rem", color: "var(--text)", padding: "0.65rem 0", width: "100%", background: "transparent" }} />
          {search && <button onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}><X size={13} color="var(--muted)" /></button>}
        </div>
        <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
          {[
            { id: "all",        label: `All (${members.length})` },
            { id: "pending",    label: `Pending (${pendingCount})` },
            { id: "approved",   label: `Approved (${members.filter(m => m.approval_status === "approved").length})` },
            { id: "active",     label: `Active (${members.filter(m => m.status === "active" && m.approval_status === "approved").length})` },
            { id: "non-active", label: `Non-active (${members.filter(m => m.status === "non-active").length})` },
            { id: "dropped",    label: `Dropped (${members.filter(m => m.status === "dropped").length})` },
          ].map(({ id, label }) => (
            <button key={id} onClick={() => setFilter(id)}
              style={{ padding: "0.42rem 0.9rem", borderRadius: 20, border: "1.5px solid", borderColor: filter === id ? "var(--gold)" : "rgba(26,92,42,0.15)", background: filter === id ? "var(--gold)" : "white", color: filter === id ? "var(--green-dk)" : "var(--muted)", fontSize: "0.72rem", fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", whiteSpace: "nowrap" }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Table ── */}
      <div style={{ background: "white", borderRadius: 12, border: "1px solid rgba(26,92,42,0.08)", overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
        {loading ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "var(--muted)" }}>Loading members...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "3rem", textAlign: "center" }}>
            <Users size={36} color="rgba(26,92,42,0.12)" style={{ marginBottom: 8 }} />
            <p style={{ color: "var(--muted)", fontSize: "0.88rem" }}>No members found.</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 680 }}>
              <thead>
                <tr style={{ background: "var(--warm)" }}>
                  {["#", "Member", "Contact", "Date Joined", "Approval", "Status", ""].map(h => (
                    <th key={h} style={{ padding: "0.8rem 1rem", textAlign: "left", fontSize: "0.65rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((m, i) => {
                  const ss = STATUS_STYLES[m.status] || STATUS_STYLES.active;
                  const as = APPROVAL_STYLES[m.approval_status] || APPROVAL_STYLES.pending;
                  return (
                    <tr key={m.id} style={{ borderBottom: "1px solid rgba(26,92,42,0.06)", background: i % 2 === 0 ? "white" : "var(--cream)" }}>
                      <td style={{ padding: "0.9rem 1rem", fontSize: "0.75rem", color: "var(--muted)", fontFamily: "monospace" }}>
                        {m.membership_number ? `#${m.membership_number}` : "—"}
                      </td>
                      <td style={{ padding: "0.9rem 1rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          {/* Avatar */}
                          <div style={{ width: 34, height: 34, borderRadius: "50%", background: "var(--green-dk)", border: "2px solid rgba(201,168,76,0.3)", overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            {m.avatar_url ? (
                              <img src={m.avatar_url} alt={m.first_name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            ) : (
                              <span style={{ fontFamily: "'Playfair Display',serif", fontSize: "0.8rem", color: "#C9A84C", fontWeight: 700 }}>
                                {m.first_name?.[0]}{m.last_name?.[0]}
                              </span>
                            )}
                          </div>
                          <div>
                            <button onClick={() => openMember(m)} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left", fontFamily: "'DM Sans',sans-serif" }}>
                              <p style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--green-dk)", textDecoration: "underline", textDecorationStyle: "dotted", textUnderlineOffset: 3 }}>
                                {m.first_name} {m.last_name}
                              </p>
                            </button>
                            <p style={{ fontSize: "0.7rem", color: "var(--muted)" }}>{m.email}</p>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "0.9rem 1rem", fontSize: "0.8rem", color: "var(--muted)" }}>{m.mobile || "—"}</td>
                      <td style={{ padding: "0.9rem 1rem", fontSize: "0.78rem", color: "var(--muted)", whiteSpace: "nowrap" }}>
                        {m.date_joined ? new Date(m.date_joined).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                      </td>
                      <td style={{ padding: "0.9rem 1rem" }}>
                        <span style={{ background: as.bg, color: as.text, fontSize: "0.68rem", fontWeight: 600, padding: "3px 10px", borderRadius: 20, textTransform: "capitalize" }}>{m.approval_status}</span>
                      </td>
                      <td style={{ padding: "0.9rem 1rem" }}>
                        {canCRUD && m.approval_status === "approved" ? (
                          <select value={m.status} onChange={e => { handleStatusChange(e.target.value); setSelected(m); }}
                            style={{ fontSize: "0.75rem", padding: "3px 8px", border: `1.5px solid ${ss.border}`, borderRadius: 6, color: ss.text, fontFamily: "'DM Sans',sans-serif", cursor: "pointer", background: ss.bg }}>
                            {["active","non-active","dropped","deceased"].map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        ) : (
                          <span style={{ fontSize: "0.75rem", color: ss.text, fontWeight: 600, textTransform: "capitalize" }}>{m.status}</span>
                        )}
                      </td>
                      <td style={{ padding: "0.9rem 1rem" }}>
                        <button onClick={() => openMember(m)} style={{ background: "none", border: "1px solid rgba(26,92,42,0.2)", color: "var(--green-dk)", padding: "0.3rem 0.8rem", borderRadius: 6, fontSize: "0.73rem", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", whiteSpace: "nowrap" }}>
                          Open →
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════
          REVOLUTIONARY MEMBER PROFILE MODAL
      ════════════════════════════════════════ */}
      {selected && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", overflowY: "auto" }}>
          <div style={{ background: "white", borderRadius: 16, maxWidth: 620, width: "100%", maxHeight: "95vh", display: "flex", flexDirection: "column", boxShadow: "0 32px 80px rgba(0,0,0,0.35)", overflow: "hidden" }}>

            {/* ── Modal Header ── */}
            <div style={{ background: "linear-gradient(135deg,#0D3320,#1A5C2A)", padding: "1.4rem 1.6rem", flexShrink: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  {/* Avatar with upload */}
                  <div style={{ position: "relative", flexShrink: 0 }}>
                    <div style={{ width: 60, height: 60, borderRadius: "50%", border: "3px solid #C9A84C", overflow: "hidden", background: "rgba(201,168,76,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {selected.avatar_url ? (
                        <img src={selected.avatar_url} alt={selected.first_name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <span style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.4rem", color: "#C9A84C", fontWeight: 700 }}>
                          {selected.first_name?.[0]}{selected.last_name?.[0]}
                        </span>
                      )}
                    </div>
                    {canCRUD && (
                      <button onClick={() => fileRef.current?.click()} disabled={photoUploading}
                        style={{ position: "absolute", bottom: 0, right: 0, width: 22, height: 22, borderRadius: "50%", background: "#C9A84C", border: "2px solid #0D3320", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                        <Camera size={10} color="#0D3320" />
                      </button>
                    )}
                    <input ref={fileRef} type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: "none" }} />
                  </div>
                  <div>
                    <p style={{ fontSize: "0.58rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 3 }}>Member Profile</p>
                    <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.2rem", color: "#C9A84C", lineHeight: 1.2 }}>
                      {selected.first_name} {selected.middle_name || ""} {selected.last_name}
                    </h2>
                    <p style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.45)", marginTop: 2 }}>{selected.email}</p>
                  </div>
                </div>
                <button onClick={() => setSelected(null)} style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "white", width: 30, height: 30, borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <X size={14} />
                </button>
              </div>

              {/* Status badges */}
              <div style={{ display: "flex", gap: 6, marginTop: "1rem", flexWrap: "wrap" }}>
                {(() => { const ss = STATUS_STYLES[selected.status] || STATUS_STYLES.active; return (
                  <span style={{ background: ss.bg, color: ss.text, border: `1px solid ${ss.border}`, fontSize: "0.68rem", fontWeight: 700, padding: "3px 12px", borderRadius: 20, textTransform: "capitalize" }}>{selected.status}</span>
                ); })()}
                {(() => { const as = APPROVAL_STYLES[selected.approval_status] || APPROVAL_STYLES.pending; return (
                  <span style={{ background: as.bg, color: as.text, fontSize: "0.68rem", fontWeight: 700, padding: "3px 12px", borderRadius: 20, textTransform: "capitalize" }}>{selected.approval_status}</span>
                ); })()}
                {selected.membership_number && (
                  <span style={{ background: "rgba(201,168,76,0.2)", color: "#C9A84C", fontSize: "0.68rem", fontWeight: 700, padding: "3px 12px", borderRadius: 20 }}>#{selected.membership_number}</span>
                )}
                {totalPaidForMember > 0 && (
                  <span style={{ background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)", fontSize: "0.68rem", fontWeight: 600, padding: "3px 12px", borderRadius: 20 }}>₱{totalPaidForMember.toLocaleString()} paid</span>
                )}
              </div>
            </div>

            {/* ── Modal Tabs ── */}
            <div style={{ display: "flex", background: "#F9F8F5", borderBottom: "1px solid rgba(26,92,42,0.08)", flexShrink: 0 }}>
              {([
                { id: "profile",     label: "Profile",     icon: Users    },
                { id: "payments",    label: "Payments",    icon: CreditCard },
                { id: "submissions", label: "Submissions", icon: Inbox    },
                ...(selected.approval_status === "pending" ? [{ id: "actions", label: "Review", icon: Shield }] : []),
              ] as { id: ModalTab; label: string; icon: any }[]).map(({ id, label, icon: Icon }) => (
                <button key={id} onClick={() => setModalTab(id)}
                  style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "0.7rem 0.5rem", border: "none", borderBottom: `3px solid ${modalTab === id ? "var(--gold)" : "transparent"}`, background: "transparent", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", fontSize: "0.75rem", fontWeight: modalTab === id ? 700 : 500, color: modalTab === id ? "var(--green-dk)" : "var(--muted)", whiteSpace: "nowrap" }}>
                  <Icon size={13} /> {label}
                  {id === "actions" && selected.approval_status === "pending" && (
                    <span style={{ background: "#2B5FA8", color: "white", fontSize: "0.55rem", fontWeight: 700, width: 14, height: 14, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>!</span>
                  )}
                </button>
              ))}
            </div>

            {/* ── Tab Content ── */}
            <div style={{ overflowY: "auto", flex: 1, padding: "1.4rem 1.6rem" }}>

              {/* ═══ PROFILE TAB ═══ */}
              {modalTab === "profile" && (
                <div>
                  {canCRUD && (
                    <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "1rem" }}>
                      {editMode ? (
                        <div style={{ display: "flex", gap: 8 }}>
                          <button onClick={() => setEditMode(false)} style={{ padding: "0.4rem 1rem", background: "#F5F5F5", border: "none", borderRadius: 6, fontSize: "0.78rem", cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>Cancel</button>
                          <button onClick={handleSaveProfile} disabled={editSaving} style={{ display: "flex", alignItems: "center", gap: 5, padding: "0.4rem 1rem", background: "var(--gold)", border: "none", borderRadius: 6, fontSize: "0.78rem", fontWeight: 600, cursor: editSaving ? "not-allowed" : "pointer", fontFamily: "'DM Sans',sans-serif", color: "var(--green-dk)" }}>
                            <Check size={12} /> {editSaving ? "Saving..." : "Save Changes"}
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => setEditMode(true)} style={{ display: "flex", alignItems: "center", gap: 5, padding: "0.4rem 1rem", background: "rgba(26,92,42,0.07)", border: "1px solid rgba(26,92,42,0.15)", borderRadius: 6, fontSize: "0.78rem", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", color: "var(--green-dk)" }}>
                          <Edit3 size={12} /> Edit Profile
                        </button>
                      )}
                    </div>
                  )}

                  {editMode ? (
                    // ── Edit form ──
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.6rem" }}>
                        {[["First Name", "first_name"], ["Middle Name", "middle_name"], ["Last Name", "last_name"]].map(([label, key]) => (
                          <div key={key}>
                            <label style={{ display: "block", fontSize: "0.62rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#888", marginBottom: 4 }}>{label}</label>
                            <input value={editForm[key] || ""} onChange={e => setEditForm((p: any) => ({ ...p, [key]: e.target.value }))} style={inputCls} />
                          </div>
                        ))}
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem" }}>
                        {[
                          ["Mobile", "mobile", "tel"],
                          ["Date of Birth", "birthdate", "date"],
                          ["Date Joined", "date_joined", "date"],
                        ].map(([label, key, type]) => (
                          <div key={key}>
                            <label style={{ display: "block", fontSize: "0.62rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#888", marginBottom: 4 }}>{label}</label>
                            <input type={type} value={editForm[key] || ""} onChange={e => setEditForm((p: any) => ({ ...p, [key]: e.target.value }))} style={inputCls} />
                          </div>
                        ))}
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: "0.62rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#888", marginBottom: 4 }}>Address</label>
                        <input value={editForm.address || ""} onChange={e => setEditForm((p: any) => ({ ...p, address: e.target.value }))} style={inputCls} placeholder="Barangay, Municipality, Province" />
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem" }}>
                        {[["Beneficiary Name", "beneficiary_name"], ["Relationship", "beneficiary_relation"]].map(([label, key]) => (
                          <div key={key}>
                            <label style={{ display: "block", fontSize: "0.62rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#888", marginBottom: 4 }}>{label}</label>
                            <input value={editForm[key] || ""} onChange={e => setEditForm((p: any) => ({ ...p, [key]: e.target.value }))} style={inputCls} />
                          </div>
                        ))}
                      </div>

                      {/* Status update in edit mode */}
                      {selected.approval_status === "approved" && (
                        <div>
                          <label style={{ display: "block", fontSize: "0.62rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#888", marginBottom: 6 }}>Membership Status</label>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                            {["active","non-active","dropped","deceased"].map(s => {
                              const ss = STATUS_STYLES[s];
                              const isActive = selected.status === s;
                              return (
                                <button key={s} onClick={() => handleStatusChange(s)}
                                  style={{ padding: "0.6rem", borderRadius: 8, border: `2px solid ${ss.border}`, background: isActive ? ss.bg : "white", color: ss.text, fontSize: "0.8rem", fontWeight: isActive ? 700 : 500, cursor: "pointer", textTransform: "capitalize", fontFamily: "'DM Sans',sans-serif" }}>
                                  {s}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    // ── View mode ──
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.7rem" }}>
                      <InfoCard icon={CreditCard} label="Member ID" value={selected.member_id_code || `#${selected.membership_number || "—"}`} />
                      <InfoCard icon={Calendar}   label="Date Joined" value={selected.date_joined ? new Date(selected.date_joined).toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" }) : "—"} />
                      <InfoCard icon={Phone}      label="Mobile" value={selected.mobile || "—"} />
                      <InfoCard icon={Calendar}   label="Date of Birth" value={selected.birthdate ? new Date(selected.birthdate).toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" }) : "—"} />
                      <InfoCard icon={MapPin}     label="Address" value={selected.address || "—"} />
                      <InfoCard icon={Heart}      label="Beneficiary" value={selected.beneficiary_name ? `${selected.beneficiary_name} (${selected.beneficiary_relation || "—"})` : "—"} />
                      <InfoCard icon={Shield}     label="Member No." value={selected.membership_number ? `#${selected.membership_number}` : "—"} />
                      <InfoCard icon={Calendar}   label="Date Applied" value={selected.created_at ? new Date(selected.created_at).toLocaleDateString("en-PH") : "—"} />
                    </div>
                  )}
                </div>
              )}

              {/* ═══ PAYMENTS TAB ═══ */}
              {modalTab === "payments" && (
                <div>
                  {/* Summary */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "0.6rem", marginBottom: "1.2rem" }}>
                    {[
                      { label: "Total Paid",  value: `₱${totalPaidForMember.toLocaleString()}`, color: "var(--gold)" },
                      { label: "AOF Records", value: memberPayments.filter(p => p.type === "aof").length, color: "#2B5FA8" },
                      { label: "MAS Records", value: memberPayments.filter(p => p.type === "mas").length, color: "#2E8B44" },
                    ].map(({ label, value, color }) => (
                      <div key={label} style={{ background: "#F9F8F5", borderRadius: 10, padding: "0.9rem 1rem", borderTop: `3px solid ${color}` }}>
                        <p style={{ fontSize: "0.62rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 3 }}>{label}</p>
                        <p style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.3rem", fontWeight: 700, color }}>{value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Record Payment button */}
                  {canCRUD && (
                    <div style={{ marginBottom: "1.2rem" }}>
                      {!showPayForm ? (
                        <button onClick={() => setShowPayForm(true)}
                          style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--gold)", color: "var(--green-dk)", border: "none", padding: "0.6rem 1.2rem", borderRadius: 8, fontSize: "0.8rem", fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                          <PlusCircle size={14} /> Record Payment for {selected.first_name}
                        </button>
                      ) : (
                        <div style={{ background: "#F9F8F5", borderRadius: 12, padding: "1.2rem", border: "1.5px solid rgba(201,168,76,0.3)" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                            <p style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--green-dk)" }}>Record New Payment</p>
                            <button onClick={() => setShowPayForm(false)} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={14} color="var(--muted)" /></button>
                          </div>

                          {/* Year */}
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem", marginBottom: "0.8rem" }}>
                            <div>
                              <label style={{ display: "block", fontSize: "0.62rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#888", marginBottom: 4 }}>Payment Year</label>
                              <select value={payYear} onChange={e => setPayYear(Number(e.target.value))} style={inputCls}>
                                {Array.from({ length: 16 }, (_, i) => new Date().getFullYear() - i).map(y => <option key={y} value={y}>{y}</option>)}
                              </select>
                            </div>
                            <div>
                              <label style={{ display: "block", fontSize: "0.62rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#888", marginBottom: 4 }}>Date Paid</label>
                              <input type="date" value={payDate} onChange={e => setPayDate(e.target.value)} style={inputCls} />
                            </div>
                          </div>

                          {/* Payment types */}
                          <div style={{ marginBottom: "0.8rem" }}>
                            <label style={{ display: "block", fontSize: "0.62rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#888", marginBottom: 6 }}>Payment Type(s)</label>
                            {PAYMENT_TYPES.map(({ type, label, amount }) => {
                              const paid = isAlreadyPaid(type);
                              const sel  = payTypes.includes(type);
                              return (
                                <button key={type} disabled={paid}
                                  onClick={() => setPayTypes(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type])}
                                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "0.6rem 0.8rem", borderRadius: 8, border: `1.5px solid ${sel ? "var(--green-lt)" : "rgba(26,92,42,0.12)"}`, background: sel ? "rgba(46,139,68,0.07)" : paid ? "rgba(0,0,0,0.03)" : "white", cursor: paid ? "not-allowed" : "pointer", marginBottom: 6, fontFamily: "'DM Sans',sans-serif", opacity: paid ? 0.5 : 1 }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <div style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${sel ? "var(--green-lt)" : "rgba(26,92,42,0.2)"}`, background: sel ? "var(--green-lt)" : "white", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                      {sel && <Check size={10} color="white" />}
                                    </div>
                                    <span style={{ fontSize: "0.82rem", color: "var(--green-dk)", fontWeight: 500 }}>{label}</span>
                                  </div>
                                  <span style={{ fontSize: "0.82rem", fontWeight: 700, color: paid ? "var(--muted)" : "var(--green-dk)" }}>
                                    {paid ? "✓ Paid" : `₱${amount}`}
                                  </span>
                                </button>
                              );
                            })}
                          </div>

                          {/* OR Number */}
                          <div style={{ marginBottom: "0.8rem" }}>
                            <label style={{ display: "block", fontSize: "0.62rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#888", marginBottom: 4 }}>Official Receipt (OR) No. *</label>
                            <input type="text" value={payOR} onChange={e => setPayOR(e.target.value)} placeholder="e.g. 0012345" style={inputCls} />
                          </div>

                          {payTypes.length > 0 && (
                            <div style={{ background: "var(--green-dk)", borderRadius: 8, padding: "0.8rem 1rem", marginBottom: "0.8rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <span style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.6)" }}>Total to record</span>
                              <span style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.2rem", fontWeight: 700, color: "#C9A84C" }}>₱{payTypes.reduce((s, t) => s + (PAYMENT_TYPES.find(p => p.type === t)?.amount || 0), 0).toLocaleString()}</span>
                            </div>
                          )}

                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem" }}>
                            <button onClick={() => setShowPayForm(false)} style={{ padding: "0.65rem", background: "white", border: "1.5px solid rgba(26,92,42,0.15)", color: "var(--muted)", borderRadius: 6, fontSize: "0.82rem", cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>Cancel</button>
                            <button onClick={handleRecordPayment} disabled={paySaving || payTypes.length === 0 || !payOR.trim()}
                              style={{ padding: "0.65rem", background: paySaving || payTypes.length === 0 || !payOR.trim() ? "#CCC" : "var(--gold)", border: "none", color: "var(--green-dk)", borderRadius: 6, fontSize: "0.82rem", fontWeight: 700, cursor: paySaving || payTypes.length === 0 || !payOR.trim() ? "not-allowed" : "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                              {paySaving ? "Saving..." : "Save Payment"}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Payment history */}
                  {paymentsLoading ? (
                    <div style={{ padding: "2rem", textAlign: "center", color: "var(--muted)", fontSize: "0.85rem" }}>Loading payments...</div>
                  ) : memberPayments.length === 0 ? (
                    <div style={{ padding: "2rem", textAlign: "center", background: "#F9F8F5", borderRadius: 10 }}>
                      <CreditCard size={28} color="rgba(0,0,0,0.1)" style={{ marginBottom: 8 }} />
                      <p style={{ color: "var(--muted)", fontSize: "0.85rem" }}>No payment records yet.</p>
                    </div>
                  ) : (
                    <div style={{ border: "1px solid rgba(26,92,42,0.08)", borderRadius: 10, overflow: "hidden" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                          <tr style={{ background: "#F9F8F5" }}>
                            {["Year","Type","Amount","Date Paid","Receipt No."].map(h => (
                              <th key={h} style={{ padding: "0.65rem 0.9rem", textAlign: "left", fontSize: "0.62rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)", whiteSpace: "nowrap" }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {memberPayments.map((p, i) => (
                            <tr key={p.id} style={{ borderTop: "1px solid rgba(0,0,0,0.05)", background: i % 2 === 0 ? "white" : "#FAFAF8" }}>
                              <td style={{ padding: "0.7rem 0.9rem", fontSize: "0.88rem", fontWeight: 700, color: "var(--green-dk)" }}>{p.year}</td>
                              <td style={{ padding: "0.7rem 0.9rem" }}>
                                <span style={{ background: p.type === "mas" ? "rgba(46,139,68,0.1)" : p.type === "aof" ? "rgba(43,95,168,0.1)" : "rgba(107,63,160,0.1)", color: p.type === "mas" ? "#2E7D32" : p.type === "aof" ? "#1565C0" : "#6B3FA0", fontSize: "0.65rem", fontWeight: 700, padding: "2px 8px", borderRadius: 20, textTransform: "uppercase" }}>{p.type}</span>
                              </td>
                              <td style={{ padding: "0.7rem 0.9rem", fontSize: "0.9rem", fontWeight: 700, color: "#1A5C2A" }}>₱{Number(p.amount).toLocaleString()}</td>
                              <td style={{ padding: "0.7rem 0.9rem", fontSize: "0.78rem", color: "var(--muted)", whiteSpace: "nowrap" }}>
                                {p.date_paid ? new Date(p.date_paid).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                              </td>
                              <td style={{ padding: "0.7rem 0.9rem", fontSize: "0.72rem", color: "var(--muted)", fontFamily: "monospace" }}>{p.receipt_number || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr style={{ background: "#F9F8F5", borderTop: "2px solid rgba(201,168,76,0.4)" }}>
                            <td colSpan={2} style={{ padding: "0.7rem 0.9rem", fontSize: "0.65rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)", fontWeight: 600 }}>Total</td>
                            <td colSpan={3} style={{ padding: "0.7rem 0.9rem", fontFamily: "'Playfair Display',serif", fontSize: "1.1rem", fontWeight: 700, color: "var(--green-dk)" }}>₱{totalPaidForMember.toLocaleString()}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* ═══ SUBMISSIONS TAB ═══ */}
              {modalTab === "submissions" && (
                <div>
                  {paymentsLoading ? (
                    <div style={{ padding: "2rem", textAlign: "center", color: "var(--muted)" }}>Loading...</div>
                  ) : memberSubmissions.length === 0 ? (
                    <div style={{ padding: "2rem", textAlign: "center", background: "#F9F8F5", borderRadius: 10 }}>
                      <Inbox size={28} color="rgba(0,0,0,0.1)" style={{ marginBottom: 8 }} />
                      <p style={{ color: "var(--muted)", fontSize: "0.85rem" }}>No GCash submissions yet.</p>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.7rem" }}>
                      {memberSubmissions.map(sub => {
                        const statusConfig: Record<string, { bg: string; color: string; label: string }> = {
                          pending:  { bg: "rgba(43,95,168,0.08)",   color: "#2B5FA8", label: "⏳ Pending"  },
                          approved: { bg: "rgba(46,139,68,0.08)",   color: "#2E8B44", label: "✅ Approved" },
                          rejected: { bg: "rgba(192,57,43,0.08)",   color: "#C0392B", label: "❌ Rejected" },
                        };
                        const sc = statusConfig[sub.status] || statusConfig.pending;
                        return (
                          <div key={sub.id} style={{ background: sc.bg, border: `1px solid ${sc.color}30`, borderRadius: 10, padding: "1rem 1.2rem" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                              <span style={{ fontSize: "0.72rem", fontWeight: 700, color: sc.color }}>{sc.label}</span>
                              <span style={{ fontSize: "0.68rem", color: "var(--muted)" }}>{new Date(sub.created_at).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <div>
                                <p style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--green-dk)" }}>₱{Number(sub.total_amount).toLocaleString()}</p>
                                <p style={{ fontSize: "0.72rem", color: "var(--muted)" }}>Ref: {sub.gcash_reference}</p>
                              </div>
                              {sub.screenshot_url && (
                                <a href={sub.screenshot_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.72rem", color: "var(--green-dk)", textDecoration: "none", background: "rgba(26,92,42,0.08)", padding: "0.3rem 0.8rem", borderRadius: 6 }}>
                                  View Receipt
                                </a>
                              )}
                            </div>
                            {sub.status === "rejected" && sub.rejection_reason && (
                              <p style={{ fontSize: "0.75rem", color: "#C0392B", marginTop: "0.4rem" }}>Reason: {sub.rejection_reason}</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ═══ ACTIONS TAB (pending only) ═══ */}
              {modalTab === "actions" && selected.approval_status === "pending" && (
                <div>
                  <div style={{ background: "rgba(43,95,168,0.06)", border: "1px solid rgba(43,95,168,0.2)", borderRadius: 10, padding: "1rem 1.2rem", marginBottom: "1.2rem" }}>
                    <p style={{ fontSize: "0.82rem", fontWeight: 700, color: "#2B5FA8", marginBottom: 4 }}>📋 Application Review</p>
                    <p style={{ fontSize: "0.78rem", color: "#555", lineHeight: 1.6 }}>
                      Review the member's information in the Profile tab before taking action. Approving will set their status to Active and record their date joined.
                    </p>
                  </div>

                  <div style={{ marginBottom: "1.2rem" }}>
                    <label style={{ display: "block", fontSize: "0.68rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#888", marginBottom: 6 }}>
                      Rejection Reason <span style={{ color: "var(--muted)", fontWeight: 400 }}>(required if rejecting)</span>
                    </label>
                    <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="e.g. Incomplete information, unable to verify address..." rows={3}
                      style={{ ...inputCls, resize: "vertical", lineHeight: 1.6 }} />
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.8rem" }}>
                    <button onClick={handleReject} disabled={actionSaving}
                      style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "0.85rem", background: "rgba(192,57,43,0.08)", border: "1.5px solid rgba(192,57,43,0.3)", color: "#C0392B", borderRadius: 8, fontSize: "0.85rem", fontWeight: 600, cursor: actionSaving ? "not-allowed" : "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                      <XCircle size={15} /> {actionSaving ? "..." : "Reject Application"}
                    </button>
                    <button onClick={handleApprove} disabled={actionSaving}
                      style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "0.85rem", background: "var(--gold)", border: "none", color: "var(--green-dk)", borderRadius: 8, fontSize: "0.85rem", fontWeight: 700, cursor: actionSaving ? "not-allowed" : "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                      <CheckCircle size={15} /> {actionSaving ? "..." : "Approve Member"}
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════
          ADD MEMBER MODAL
      ════════════════════════════════════════ */}
      {showAddForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", overflowY: "auto" }}>
          <div style={{ background: "white", borderRadius: 14, maxWidth: 560, width: "100%", maxHeight: "95vh", display: "flex", flexDirection: "column", boxShadow: "0 24px 64px rgba(0,0,0,0.3)", overflow: "hidden" }}>
            <div style={{ background: "#0D3320", padding: "1.3rem 1.6rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
              <div>
                <p style={{ fontSize: "0.58rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 2 }}>Manual Registration</p>
                <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.1rem", color: "#C9A84C" }}>Add Member Manually</h2>
              </div>
              <button onClick={() => setShowAddForm(false)} style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "white", width: 28, height: 28, borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><X size={13} /></button>
            </div>
            <div style={{ overflowY: "auto", padding: "1.4rem 1.6rem" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>

                <div>
                  <p style={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)", marginBottom: "0.6rem" }}>Full Name</p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem" }}>
                    {[["First *","first_name"],["Middle","middle_name"],["Last *","last_name"]].map(([label,key]) => (
                      <div key={key}>
                        <label style={{ display: "block", fontSize: "0.6rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#AAA", marginBottom: 3 }}>{label}</label>
                        <input value={(addForm as any)[key] || ""} onChange={e => setAddForm((p: any) => ({ ...p, [key]: e.target.value }))} style={inputCls} />
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p style={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)", marginBottom: "0.6rem" }}>Basic Info</p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                    {[["Date of Birth","birthdate","date"],["Date Registered","date_joined","date"]].map(([label,key,type]) => (
                      <div key={key}>
                        <label style={{ display: "block", fontSize: "0.6rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#AAA", marginBottom: 3 }}>{label}</label>
                        <input type={type} value={(addForm as any)[key] || ""} onChange={e => setAddForm((p: any) => ({ ...p, [key]: e.target.value }))} style={inputCls} />
                      </div>
                    ))}
                    <div>
                      <label style={{ display: "block", fontSize: "0.6rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#AAA", marginBottom: 3 }}>Gender</label>
                      <select value={addForm.gender} onChange={e => setAddForm((p: any) => ({ ...p, gender: e.target.value }))} style={{ ...inputCls, background: "white" }}>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "0.6rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#AAA", marginBottom: 3 }}>Initial Status</label>
                      <select value={addForm.status} onChange={e => setAddForm((p: any) => ({ ...p, status: e.target.value }))} style={{ ...inputCls, background: "white" }}>
                        {["active","non-active","dropped","deceased"].map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <p style={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)", marginBottom: "0.6rem" }}>Contact</p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginBottom: "0.5rem" }}>
                    {[["Mobile","mobile","tel"],["Email (optional)","email","email"]].map(([label,key,type]) => (
                      <div key={key}>
                        <label style={{ display: "block", fontSize: "0.6rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#AAA", marginBottom: 3 }}>{label}</label>
                        <input type={type} value={(addForm as any)[key] || ""} onChange={e => setAddForm((p: any) => ({ ...p, [key]: e.target.value }))} style={inputCls} />
                      </div>
                    ))}
                  </div>
                  <label style={{ display: "block", fontSize: "0.6rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#AAA", marginBottom: 3 }}>Address</label>
                  <input value={addForm.address || ""} onChange={e => setAddForm((p: any) => ({ ...p, address: e.target.value }))} placeholder="Barangay, Municipality, Province" style={inputCls} />
                </div>

                <div>
                  <p style={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)", marginBottom: "0.6rem" }}>Beneficiary (MAS)</p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                    {[["Beneficiary Name","beneficiary_name"],["Relationship","beneficiary_relation"]].map(([label,key]) => (
                      <div key={key}>
                        <label style={{ display: "block", fontSize: "0.6rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#AAA", marginBottom: 3 }}>{label}</label>
                        <input value={(addForm as any)[key] || ""} onChange={e => setAddForm((p: any) => ({ ...p, [key]: e.target.value }))} style={inputCls} />
                      </div>
                    ))}
                  </div>
                </div>

                {!addForm.email.trim() && (
                  <div style={{ background: "rgba(43,95,168,0.07)", border: "1px solid rgba(43,95,168,0.2)", borderRadius: 8, padding: "0.75rem 1rem" }}>
                    <p style={{ fontSize: "0.78rem", color: "#2B5FA8" }}>ℹ️ No email — a placeholder will be auto-generated. You can link a real email later.</p>
                  </div>
                )}

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.7rem", paddingTop: "0.5rem" }}>
                  <button onClick={() => setShowAddForm(false)} style={{ padding: "0.8rem", background: "#F5F5F5", border: "none", borderRadius: 8, fontSize: "0.85rem", color: "#777", cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>Cancel</button>
                  <button onClick={handleAddMember} disabled={addSaving} style={{ padding: "0.8rem", background: "var(--gold)", border: "none", borderRadius: 8, fontSize: "0.85rem", fontWeight: 700, color: "var(--green-dk)", cursor: addSaving ? "not-allowed" : "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                    {addSaving ? "Saving..." : "Add Member"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
