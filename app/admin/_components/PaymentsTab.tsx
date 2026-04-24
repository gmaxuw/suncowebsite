"use client";
// ─────────────────────────────────────────────
// PaymentsTab.tsx  —  Enhanced Edition
// Fee amounts now pulled from fee_schedules
// per selected year — no more hardcoded rates.
// ─────────────────────────────────────────────
import { useEffect, useState, useCallback } from "react";
import { CreditCard, PlusCircle, Search, X, Check, TrendingUp, Calendar, Hash, FileText } from "lucide-react";

interface Props {
  canCRUD:            boolean;
  supabase:           any;
  currentUser?:       any;
  currentRole?:       string;
  currentMemberName?: string;
}

type PaymentType = "lifetime" | "aof" | "mas";

// Static metadata (labels, colors, descriptions) — amounts come from fee_schedules
const PAYMENT_TYPE_META: Record<PaymentType, { label: string; desc: string; color: string }> = {
  lifetime: { label: "Lifetime Membership",       desc: "One-time only. Cannot be paid again once recorded.",          color: "#6B3FA0" },
  aof:      { label: "Annual Operating Fund (AOF)", desc: "Paid annually. Covers organizational operations.",           color: "#2B5FA8" },
  mas:      { label: "Mortuary Assistance (MAS)",  desc: "Annual mutual aid contribution for member families.",        color: "#2E8B44" },
};

const TYPE_META: Record<string, { label: string; bg: string; color: string }> = {
  aof:      { label: "Operating Fund",  bg: "rgba(43,95,168,0.1)",  color: "#1565C0" },
  mas:      { label: "MAS",             bg: "rgba(46,139,68,0.1)",  color: "#2E7D32" },
  lifetime: { label: "Lifetime",        bg: "rgba(107,63,160,0.1)", color: "#6B3FA0" },
};

type FeeSchedule = {
  id:            string;
  year:          number;
  fee_lifetime:  number;
  fee_aof:       number;
  fee_mas:       number;
  resolution_no: string | null;
  effective_date: string | null;
  approved_by:   string | null;
};

export default function PaymentsTab({ canCRUD, supabase, currentUser, currentRole, currentMemberName }: Props) {
  const [payments,      setPayments]      = useState<any[]>([]);
  const [members,       setMembers]       = useState<any[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [showForm,      setShowForm]      = useState(false);
  const [saving,        setSaving]        = useState(false);
  const [searchHistory, setSearchHistory] = useState("");

  // ── Fee schedule state ──
  const [feeSchedule,     setFeeSchedule]     = useState<FeeSchedule | null>(null);
  const [feeScheduleLoading, setFeeScheduleLoading] = useState(false);
  const [feeScheduleError,   setFeeScheduleError]   = useState(false);

  // ── Form state ──
  const [memberQuery,        setMemberQuery]        = useState("");
  const [memberResults,      setMemberResults]      = useState<any[]>([]);
  const [selectedMember,     setSelectedMember]     = useState<any>(null);
  const [selectedTypes,      setSelectedTypes]      = useState<PaymentType[]>([]);
  const [year,               setYear]               = useState(new Date().getFullYear());
  const [datePaid,           setDatePaid]           = useState(new Date().toISOString().split("T")[0]);
  const [orNumber,           setOrNumber]           = useState("");
  const [memberExistingPays, setMemberExistingPays] = useState<any[]>([]);
  const [showDropdown,       setShowDropdown]       = useState(false);

  // ── Load payments + members ──
  const loadData = async () => {
    setLoading(true);
    const { data: p } = await supabase
      .from("payments")
      .select("*, members(first_name, last_name, member_id_code, avatar_url)")
      .order("created_at", { ascending: false });
    const { data: m } = await supabase
      .from("members")
      .select("id, first_name, last_name, member_id_code, status, approval_status, avatar_url")
      .eq("approval_status", "approved")
      .order("last_name");
    setPayments(p || []);
    setMembers(m || []);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  // ── Fetch fee schedule when year changes ──
  const fetchFeeSchedule = useCallback(async (yr: number) => {
    setFeeScheduleLoading(true);
    setFeeScheduleError(false);
    setFeeSchedule(null);
    const { data, error } = await supabase
      .from("fee_schedules")
      .select("id, year, fee_lifetime, fee_aof, fee_mas, resolution_no, effective_date, approved_by")
      .eq("year", yr)
      .maybeSingle();
    if (error || !data) {
      setFeeScheduleError(true);
    } else {
      setFeeSchedule(data);
    }
    setFeeScheduleLoading(false);
    // Deselect types that might not be valid for new year
    setSelectedTypes([]);
  }, [supabase]);

  useEffect(() => {
    if (showForm) fetchFeeSchedule(year);
  }, [year, showForm, fetchFeeSchedule]);

  // ── Helper: get amount for a type from fee_schedules ──
  const getAmount = (type: PaymentType): number => {
    if (!feeSchedule) return 0;
    if (type === "lifetime") return Number(feeSchedule.fee_lifetime);
    if (type === "aof")      return Number(feeSchedule.fee_aof);
    if (type === "mas")      return Number(feeSchedule.fee_mas);
    return 0;
  };

  const logActivity = async (action: string, details: object) => {
    if (!currentUser) return;
    await supabase.from("activity_logs").insert({
      user_id:     currentUser.id,
      member_name: currentMemberName || currentUser.email,
      role:        currentRole || "unknown",
      action, module: "payments", details,
    });
  };

  // ── Member search ──
  const handleMemberSearch = (q: string) => {
    setMemberQuery(q);
    setSelectedMember(null);
    setSelectedTypes([]);
    setMemberExistingPays([]);
    if (q.length < 1) { setMemberResults([]); setShowDropdown(false); return; }
    const lower = q.toLowerCase();
    const results = members.filter(m =>
      m.first_name?.toLowerCase().startsWith(lower) ||
      m.last_name?.toLowerCase().startsWith(lower)  ||
      `${m.first_name} ${m.last_name}`.toLowerCase().includes(lower)
    ).slice(0, 8);
    setMemberResults(results);
    setShowDropdown(results.length > 0);
  };

  const selectMember = async (member: any) => {
    setSelectedMember(member);
    setMemberQuery(`${member.first_name} ${member.last_name}`);
    setMemberResults([]);
    setShowDropdown(false);
    setSelectedTypes([]);
    const { data: existing } = await supabase
      .from("payments")
      .select("type, year, amount, date_paid, receipt_number")
      .eq("member_id", member.id)
      .order("year", { ascending: false });
    setMemberExistingPays(existing || []);
  };

  const isAlreadyPaid = (type: PaymentType) => {
    if (type === "lifetime") return memberExistingPays.some(p => p.type === "lifetime");
    return memberExistingPays.some(p => p.type === type && p.year === year);
  };

  const toggleType = (type: PaymentType) => {
    if (!selectedMember || isAlreadyPaid(type) || !feeSchedule) return;
    setSelectedTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const totalAmount = selectedTypes.reduce((sum, type) => sum + getAmount(type), 0);

  // ── Reset form ──
  const resetForm = () => {
    setSelectedMember(null);
    setMemberQuery("");
    setSelectedTypes([]);
    setOrNumber("");
    setDatePaid(new Date().toISOString().split("T")[0]);
    setYear(new Date().getFullYear());
    setMemberExistingPays([]);
    setFeeSchedule(null);
    setFeeScheduleError(false);
  };

  // ── Save payment ──
  const handleSave = async () => {
    if (!selectedMember)            { alert("Please select a member.");                         return; }
    if (selectedTypes.length === 0) { alert("Please select at least one payment type.");        return; }
    if (!orNumber.trim())           { alert("Please enter the Official Receipt (OR) number."); return; }
    if (!feeSchedule)               { alert("No fee schedule found for this year. Please set it up in Fee Schedules first."); return; }

    setSaving(true);

    const { data: existingOR } = await supabase
      .from("payments")
      .select("id")
      .eq("receipt_number", orNumber.trim())
      .maybeSingle();

    if (existingOR) {
      alert(`OR number "${orNumber}" is already recorded. Please check.`);
      setSaving(false);
      return;
    }

    const inserts = selectedTypes.map(type => ({
      member_id:       selectedMember.id,
      year,
      type,
      amount:          getAmount(type),
      date_paid:       datePaid,
      receipt_number:  selectedTypes.length > 1
                         ? `${orNumber.trim()}-${type.toUpperCase()}`
                         : orNumber.trim(),
      recorded_by:     currentMemberName || "Officer",
      fee_schedule_id: feeSchedule.id,   // ← links to the authorizing resolution
    }));

    const { error } = await supabase.from("payments").insert(inserts);
    if (error) { alert("Error saving: " + error.message); setSaving(false); return; }

    await logActivity("PAYMENT_RECORDED", {
      for_member:     `${selectedMember.first_name} ${selectedMember.last_name}`,
      member_id_code: selectedMember.member_id_code,
      year,
      types:          selectedTypes,
      total_amount:   totalAmount,
      or_number:      orNumber.trim(),
      date_paid:      datePaid,
      resolution_no:  feeSchedule.resolution_no || "—",
      fee_schedule_id: feeSchedule.id,
    });

    resetForm();
    setShowForm(false);
    await loadData();
    setSaving(false);
  };

  // ── Filtered table ──
  const filteredPayments = payments.filter(p => {
    if (!searchHistory) return true;
    const name = p.members
      ? `${p.members.first_name} ${p.members.last_name}`.toLowerCase()
      : "";
    return (
      name.includes(searchHistory.toLowerCase()) ||
      p.receipt_number?.toLowerCase().includes(searchHistory.toLowerCase())
    );
  });

  const totalCollected  = payments.reduce((s, p) => s + Number(p.amount), 0);
  const thisYear        = new Date().getFullYear();
  const thisYearTotal   = payments
    .filter(p => p.year === thisYear)
    .reduce((s, p) => s + Number(p.amount), 0);

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "0.72rem 1rem",
    border: "1.5px solid rgba(26,92,42,0.15)", borderRadius: 8,
    fontSize: "0.88rem", fontFamily: "'DM Sans',sans-serif",
    color: "var(--text)", background: "white", outline: "none",
    boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: "0.68rem", fontWeight: 600,
    letterSpacing: "0.1em", textTransform: "uppercase",
    color: "#888", marginBottom: "0.45rem",
  };

  return (
    <div style={{ fontFamily: "'DM Sans',sans-serif" }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "0.8rem" }}>
        <div>
          <p style={{ fontSize: "0.7rem", color: "var(--muted)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.25rem" }}>Admin Panel</p>
          <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.8rem", fontWeight: 700, color: "var(--green-dk)" }}>Payment Management</h1>
        </div>
        {canCRUD && (
          <button onClick={() => { setShowForm(true); fetchFeeSchedule(year); }}
            style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--gold)", color: "var(--green-dk)", border: "none", padding: "0.7rem 1.4rem", borderRadius: 6, fontSize: "0.82rem", fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
            <PlusCircle size={15} /> Record Payment
          </button>
        )}
      </div>

      {/* ── Summary Cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: "1rem", marginBottom: "1.8rem" }}>
        {[
          { label: "Total Collected",       value: `₱${totalCollected.toLocaleString()}`,   icon: TrendingUp, color: "#C9A84C", sub: `${payments.length} records` },
          { label: `Collected ${thisYear}`, value: `₱${thisYearTotal.toLocaleString()}`,    icon: Calendar,   color: "#2B5FA8", sub: `${payments.filter(p => p.year === thisYear).length} payments` },
          { label: "AOF Records",           value: payments.filter(p => p.type === "aof").length, icon: CreditCard, color: "#1565C0", sub: `₱${payments.filter(p => p.type === "aof").reduce((s,p)=>s+Number(p.amount),0).toLocaleString()}` },
          { label: "MAS Records",           value: payments.filter(p => p.type === "mas").length, icon: CreditCard, color: "#2E7D32", sub: `₱${payments.filter(p => p.type === "mas").reduce((s,p)=>s+Number(p.amount),0).toLocaleString()}` },
        ].map(({ label, value, icon: Icon, color, sub }) => (
          <div key={label} style={{ background: "white", borderRadius: 12, padding: "1.2rem 1.4rem", border: "1px solid rgba(26,92,42,0.08)", borderLeft: `5px solid ${color}`, boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <p style={{ fontSize: "0.62rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 5 }}>{label}</p>
                <p style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.5rem", fontWeight: 700, color, lineHeight: 1 }}>{value}</p>
                <p style={{ fontSize: "0.7rem", color: "var(--muted)", marginTop: 4 }}>{sub}</p>
              </div>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon size={18} color={color} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Search ── */}
      <div style={{ marginBottom: "1.2rem", display: "flex", alignItems: "center", gap: 8, background: "white", border: "1.5px solid rgba(26,92,42,0.15)", borderRadius: 8, padding: "0 1rem", maxWidth: 420, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
        <Search size={15} color="var(--muted)" />
        <input type="text" placeholder="Search by member name or OR number..." value={searchHistory}
          onChange={e => setSearchHistory(e.target.value)}
          style={{ border: "none", outline: "none", fontFamily: "'DM Sans',sans-serif", fontSize: "0.85rem", color: "var(--text)", padding: "0.72rem 0", width: "100%", background: "transparent" }} />
        {searchHistory && (
          <button onClick={() => setSearchHistory("")} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex" }}>
            <X size={14} color="var(--muted)" />
          </button>
        )}
      </div>

      {/* ── Payment Records Table ── */}
      <div style={{ background: "white", borderRadius: 12, border: "1px solid rgba(26,92,42,0.08)", overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
        <div style={{ padding: "1.1rem 1.5rem", borderBottom: "1px solid rgba(26,92,42,0.07)", background: "#F9F8F5", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: "1rem", fontWeight: 700, color: "var(--green-dk)" }}>Payment Records</h2>
            <p style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: 2 }}>
              {filteredPayments.length} entries{searchHistory ? ` matching "${searchHistory}"` : ""}
            </p>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "var(--muted)", fontSize: "0.85rem" }}>Loading payments...</div>
        ) : filteredPayments.length === 0 ? (
          <div style={{ padding: "3rem", textAlign: "center" }}>
            <CreditCard size={36} color="rgba(26,92,42,0.12)" style={{ marginBottom: "0.8rem" }} />
            <p style={{ color: "var(--muted)", fontSize: "0.88rem" }}>No payment records found.</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 820 }}>
              <thead>
                <tr style={{ background: "#F9F8F5" }}>
                  {["Receipt / OR", "Member", "Year", "Type", "Amount", "Date Paid", "Recorded By"].map(h => (
                    <th key={h} style={{ padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.63rem", fontWeight: 600, letterSpacing: "0.09em", textTransform: "uppercase", color: "var(--muted)", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredPayments.map((p, i) => {
                  const tm = TYPE_META[p.type] || { label: p.type, bg: "#F5F5F5", color: "#666" };
                  return (
                    <tr key={p.id} style={{ borderBottom: "1px solid rgba(26,92,42,0.05)", background: i % 2 === 0 ? "white" : "#FAFAF8" }}>
                      <td style={{ padding: "0.85rem 1rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <div style={{ width: 28, height: 28, borderRadius: 6, background: "rgba(201,168,76,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <Hash size={12} color="#C9A84C" />
                          </div>
                          <span style={{ fontSize: "0.78rem", fontFamily: "monospace", color: "var(--green-dk)", fontWeight: 600 }}>{p.receipt_number || "—"}</span>
                        </div>
                      </td>
                      <td style={{ padding: "0.85rem 1rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#0D3320", border: "1.5px solid rgba(201,168,76,0.3)", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            {p.members?.avatar_url ? (
                              <img src={p.members.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            ) : (
                              <span style={{ fontFamily: "'Playfair Display',serif", fontSize: "0.65rem", color: "#C9A84C", fontWeight: 700 }}>
                                {p.members?.first_name?.[0]}{p.members?.last_name?.[0]}
                              </span>
                            )}
                          </div>
                          <div>
                            <p style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--green-dk)", whiteSpace: "nowrap" }}>
                              {p.members ? `${p.members.first_name} ${p.members.last_name}` : "—"}
                            </p>
                            <p style={{ fontSize: "0.68rem", color: "var(--muted)", fontFamily: "monospace" }}>{p.members?.member_id_code || "—"}</p>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "0.85rem 1rem", fontSize: "0.88rem", fontWeight: 700, color: "var(--green-dk)" }}>{p.year}</td>
                      <td style={{ padding: "0.85rem 1rem" }}>
                        <span style={{ background: tm.bg, color: tm.color, fontSize: "0.68rem", fontWeight: 700, padding: "3px 10px", borderRadius: 20, textTransform: "uppercase", whiteSpace: "nowrap" }}>{tm.label}</span>
                      </td>
                      <td style={{ padding: "0.85rem 1rem" }}>
                        <span style={{ fontFamily: "'Playfair Display',serif", fontSize: "1rem", fontWeight: 700, color: "#1A5C2A" }}>₱{Number(p.amount).toLocaleString()}</span>
                      </td>
                      <td style={{ padding: "0.85rem 1rem", fontSize: "0.8rem", color: "var(--muted)", whiteSpace: "nowrap" }}>
                        {p.date_paid
                          ? new Date(p.date_paid).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })
                          : "—"}
                      </td>
                      <td style={{ padding: "0.85rem 1rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#2E8B44", flexShrink: 0 }} />
                          <span style={{ fontSize: "0.78rem", color: "var(--green-dk)", fontWeight: 500, whiteSpace: "nowrap" }}>{p.recorded_by || "—"}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ background: "#F9F8F5", borderTop: "2px solid rgba(201,168,76,0.4)" }}>
                  <td colSpan={4} style={{ padding: "0.9rem 1rem", fontSize: "0.68rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)", fontWeight: 600 }}>Grand Total</td>
                  <td colSpan={3} style={{ padding: "0.9rem 1rem", fontFamily: "'Playfair Display',serif", fontSize: "1.3rem", fontWeight: 700, color: "var(--green-dk)" }}>₱{totalCollected.toLocaleString()}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════
          RECORD PAYMENT MODAL
      ════════════════════════════════════════ */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}>
          <div style={{ background: "var(--cream)", borderRadius: 16, maxWidth: 560, width: "100%", maxHeight: "95vh", overflowY: "auto", boxShadow: "0 32px 80px rgba(0,0,0,0.4)" }}>

            {/* Modal header */}
            <div style={{ padding: "1.4rem 1.8rem", background: "linear-gradient(135deg,#0D3320,#1A5C2A)", borderRadius: "16px 16px 0 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <p style={{ fontSize: "0.58rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 2 }}>Admin Panel</p>
                <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.2rem", color: "#C9A84C" }}>Record Payment</h2>
                <p style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.45)", marginTop: 2 }}>Fill in all fields before saving</p>
              </div>
              <button onClick={() => { setShowForm(false); resetForm(); }}
                style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "white", width: 32, height: 32, borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <X size={15} />
              </button>
            </div>

            <div style={{ padding: "1.6rem 1.8rem" }}>

              {/* Step 1: Member */}
              <div style={{ marginBottom: "1.5rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "0.5rem" }}>
                  <div style={{ width: 22, height: 22, borderRadius: "50%", background: "var(--gold)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--green-dk)" }}>1</span>
                  </div>
                  <label style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#0D3320" }}>Select Member *</label>
                </div>
                <div style={{ position: "relative" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, background: "white", border: `1.5px solid ${selectedMember ? "#2E8B44" : "rgba(26,92,42,0.15)"}`, borderRadius: 8, padding: "0 1rem" }}>
                    <Search size={15} color="var(--muted)" />
                    <input type="text" placeholder="Type name to search..." value={memberQuery}
                      onChange={e => handleMemberSearch(e.target.value)}
                      onFocus={() => memberQuery && setShowDropdown(memberResults.length > 0)}
                      style={{ border: "none", outline: "none", fontFamily: "'DM Sans',sans-serif", fontSize: "0.88rem", color: "var(--text)", padding: "0.75rem 0", width: "100%", background: "transparent" }}
                      autoComplete="off" />
                    {selectedMember && <Check size={16} color="#2E8B44" />}
                  </div>
                  {showDropdown && memberResults.length > 0 && (
                    <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "white", border: "1.5px solid rgba(26,92,42,0.15)", borderRadius: 10, zIndex: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", overflow: "hidden" }}>
                      {memberResults.map((m, i) => (
                        <button key={m.id} onClick={() => selectMember(m)}
                          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "0.7rem 1rem", textAlign: "left", background: "none", border: "none", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", borderBottom: i < memberResults.length - 1 ? "1px solid rgba(26,92,42,0.06)" : "none" }}
                          onMouseEnter={e => (e.currentTarget.style.background = "var(--warm)")}
                          onMouseLeave={e => (e.currentTarget.style.background = "none")}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#0D3320", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                              <span style={{ fontFamily: "'Playfair Display',serif", fontSize: "0.7rem", color: "#C9A84C", fontWeight: 700 }}>{m.first_name?.[0]}{m.last_name?.[0]}</span>
                            </div>
                            <div>
                              <p style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--green-dk)" }}>{m.first_name} {m.last_name}</p>
                              <p style={{ fontSize: "0.7rem", color: "var(--muted)" }}>{m.member_id_code || "No ID yet"}</p>
                            </div>
                          </div>
                          <span style={{ fontSize: "0.68rem", background: m.status === "active" ? "rgba(46,139,68,0.1)" : "rgba(212,160,23,0.1)", color: m.status === "active" ? "#2E8B44" : "#D4A017", padding: "2px 8px", borderRadius: 20, textTransform: "capitalize" }}>{m.status}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {selectedMember && (
                  <div style={{ marginTop: "0.6rem", background: "rgba(46,139,68,0.07)", border: "1px solid rgba(46,139,68,0.2)", borderRadius: 8, padding: "0.7rem 1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#0D3320", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ fontFamily: "'Playfair Display',serif", fontSize: "0.65rem", color: "#C9A84C", fontWeight: 700 }}>{selectedMember.first_name?.[0]}{selectedMember.last_name?.[0]}</span>
                      </div>
                      <div>
                        <p style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--green-dk)" }}>{selectedMember.first_name} {selectedMember.last_name}</p>
                        <p style={{ fontSize: "0.68rem", color: "var(--muted)" }}>{selectedMember.member_id_code}</p>
                      </div>
                    </div>
                    <span style={{ fontSize: "0.7rem", color: "#2E8B44", fontWeight: 700 }}>✓ Selected</span>
                  </div>
                )}
              </div>

              {/* Step 2: Year */}
              <div style={{ marginBottom: "1.5rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "0.5rem" }}>
                  <div style={{ width: 22, height: 22, borderRadius: "50%", background: "var(--gold)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--green-dk)" }}>2</span>
                  </div>
                  <label style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#0D3320" }}>Payment Year *</label>
                </div>
                <select value={year} onChange={e => setYear(Number(e.target.value))} style={inputStyle}>
                  {Array.from({ length: 31 }, (_, i) => new Date().getFullYear() - i).map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>

                {/* Fee schedule status for selected year */}
                <div style={{ marginTop: "0.5rem" }}>
                  {feeScheduleLoading && (
                    <p style={{ fontSize: "0.72rem", color: "var(--muted)" }}>⏳ Loading rates for {year}...</p>
                  )}
                  {!feeScheduleLoading && feeScheduleError && (
                    <div style={{ background: "rgba(192,57,43,0.08)", border: "1px solid rgba(192,57,43,0.25)", borderRadius: 7, padding: "0.6rem 0.9rem", fontSize: "0.75rem", color: "#C0392B", fontWeight: 600 }}>
                      ⚠ No fee schedule found for {year}. Go to CMS → Fee Schedules to add it first.
                    </div>
                  )}
                  {!feeScheduleLoading && feeSchedule && (
                    <div style={{ background: "rgba(46,139,68,0.07)", border: "1px solid rgba(46,139,68,0.2)", borderRadius: 7, padding: "0.6rem 0.9rem", display: "flex", alignItems: "center", gap: 8 }}>
                      <FileText size={13} color="#2E8B44" />
                      <div>
                        <p style={{ fontSize: "0.72rem", color: "#2E8B44", fontWeight: 700 }}>
                          {feeSchedule.resolution_no || `Fee schedule found for ${year}`}
                        </p>
                        <p style={{ fontSize: "0.68rem", color: "var(--muted)" }}>
                          MAS ₱{Number(feeSchedule.fee_mas).toLocaleString()} · AOF ₱{Number(feeSchedule.fee_aof).toLocaleString()} · Lifetime ₱{Number(feeSchedule.fee_lifetime).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Step 3: Payment Types — amounts from fee_schedules */}
              <div style={{ marginBottom: "1.5rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "0.5rem" }}>
                  <div style={{ width: 22, height: 22, borderRadius: "50%", background: "var(--gold)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--green-dk)" }}>3</span>
                  </div>
                  <label style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#0D3320" }}>Payment Type *</label>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                  {(["lifetime", "aof", "mas"] as PaymentType[]).map(type => {
                    const meta       = PAYMENT_TYPE_META[type];
                    const amount     = getAmount(type);
                    const alreadyPaid = selectedMember ? isAlreadyPaid(type) : false;
                    const isSelected  = selectedTypes.includes(type);
                    const disabled    = !selectedMember || alreadyPaid || !feeSchedule;

                    return (
                      <button key={type} onClick={() => toggleType(type)} disabled={disabled}
                        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.9rem 1.1rem", borderRadius: 10, border: `1.5px solid ${isSelected ? meta.color : alreadyPaid ? "rgba(0,0,0,0.07)" : "rgba(26,92,42,0.12)"}`, background: isSelected ? `${meta.color}10` : alreadyPaid ? "rgba(0,0,0,0.02)" : "white", cursor: disabled ? "not-allowed" : "pointer", opacity: !selectedMember || !feeSchedule ? 0.5 : alreadyPaid ? 0.6 : 1, textAlign: "left", width: "100%", fontFamily: "'DM Sans',sans-serif" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${isSelected ? meta.color : "rgba(26,92,42,0.2)"}`, background: isSelected ? meta.color : "white", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            {isSelected && <Check size={12} color="white" />}
                          </div>
                          <div>
                            <p style={{ fontSize: "0.85rem", fontWeight: 600, color: alreadyPaid ? "var(--muted)" : "var(--green-dk)" }}>{meta.label}</p>
                            <p style={{ fontSize: "0.7rem", color: "var(--muted)", marginTop: 1 }}>
                              {alreadyPaid
                                ? (type === "lifetime" ? "✓ Already paid (lifetime)" : `✓ Already paid for ${year}`)
                                : meta.desc}
                            </p>
                          </div>
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <p style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.15rem", fontWeight: 700, color: isSelected ? meta.color : alreadyPaid ? "var(--muted)" : "var(--green-dk)" }}>
                            {feeSchedule ? `₱${amount.toLocaleString()}` : "—"}
                          </p>
                          {alreadyPaid && <p style={{ fontSize: "0.6rem", color: "var(--muted)", fontWeight: 600 }}>PAID</p>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 4: OR + Date */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "0.5rem" }}>
                    <div style={{ width: 22, height: 22, borderRadius: "50%", background: "var(--gold)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--green-dk)" }}>4</span>
                    </div>
                    <label style={labelStyle}>Official Receipt (OR) No. *</label>
                  </div>
                  <input type="text" placeholder="e.g. 0012345" value={orNumber}
                    onChange={e => setOrNumber(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "0.5rem" }}>
                    <div style={{ width: 22, height: 22, borderRadius: "50%", background: "var(--gold)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--green-dk)" }}>5</span>
                    </div>
                    <label style={labelStyle}>Date Paid *</label>
                  </div>
                  <input type="date" value={datePaid}
                    onChange={e => setDatePaid(e.target.value)} style={inputStyle} />
                </div>
              </div>

              {/* Breakdown card */}
              {selectedTypes.length > 0 && feeSchedule && (
                <div style={{ background: "linear-gradient(135deg,#0D3320,#1A5C2A)", borderRadius: 12, padding: "1.4rem", marginBottom: "1.5rem" }}>
                  <p style={{ fontSize: "0.62rem", fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", marginBottom: "0.8rem" }}>Payment Breakdown</p>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginBottom: "0.4rem" }}>
                    <span style={{ color: "rgba(255,255,255,0.5)" }}>Member</span>
                    <span style={{ color: "white", fontWeight: 600 }}>{selectedMember ? `${selectedMember.first_name} ${selectedMember.last_name}` : "—"}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginBottom: "0.4rem" }}>
                    <span style={{ color: "rgba(255,255,255,0.5)" }}>Year</span>
                    <span style={{ color: "white", fontWeight: 600 }}>{year}</span>
                  </div>
                  {/* Resolution reference */}
                  {feeSchedule.resolution_no && (
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", marginBottom: "0.8rem" }}>
                      <span style={{ color: "rgba(255,255,255,0.5)" }}>Authority</span>
                      <span style={{ color: "#C9A84C", fontWeight: 600 }}>{feeSchedule.resolution_no}</span>
                    </div>
                  )}
                  <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "0.8rem", marginBottom: "0.8rem" }}>
                    {selectedTypes.map(type => (
                      <div key={type} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "0.4rem" }}>
                        <span style={{ color: "rgba(255,255,255,0.65)" }}>{PAYMENT_TYPE_META[type].label}</span>
                        <span style={{ color: "rgba(255,255,255,0.85)", fontWeight: 600 }}>₱{getAmount(type).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ borderTop: "1px solid rgba(201,168,76,0.3)", paddingTop: "0.8rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "0.88rem", color: "white", fontWeight: 600 }}>Total</span>
                    <span style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.8rem", fontWeight: 700, color: "#C9A84C" }}>₱{totalAmount.toLocaleString()}</span>
                  </div>
                  <div style={{ marginTop: "0.6rem", display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "rgba(255,255,255,0.35)" }}>
                    <span>Recorded by: <strong style={{ color: "rgba(255,255,255,0.55)" }}>{currentMemberName || "—"}</strong></span>
                    {datePaid && <span>{new Date(datePaid).toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" })}</span>}
                  </div>
                </div>
              )}

              {/* Checklist */}
              <div style={{ background: "#F9F8F5", borderRadius: 10, padding: "0.9rem 1.1rem", marginBottom: "1.3rem" }}>
                <p style={{ fontSize: "0.63rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)", marginBottom: "0.5rem" }}>Checklist</p>
                {[
                  { ok: !!selectedMember,          label: "Member selected" },
                  { ok: !!feeSchedule,             label: `Fee schedule found for ${year}` },
                  { ok: selectedTypes.length > 0,  label: "Payment type(s) selected" },
                  { ok: !!orNumber.trim(),          label: "OR number entered" },
                  { ok: !!datePaid,                label: "Date paid set" },
                ].map(({ ok, label }) => (
                  <div key={label} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: "0.8rem", color: ok ? "#2E8B44" : "var(--muted)", marginBottom: "0.2rem" }}>
                    <span style={{ fontSize: "0.9rem" }}>{ok ? "✓" : "○"}</span> {label}
                  </div>
                ))}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.8rem" }}>
                <button onClick={() => { setShowForm(false); resetForm(); }}
                  style={{ padding: "0.85rem", background: "white", border: "1.5px solid rgba(26,92,42,0.15)", color: "var(--muted)", borderRadius: 8, fontSize: "0.85rem", cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !selectedMember || selectedTypes.length === 0 || !orNumber.trim() || !feeSchedule}
                  style={{ padding: "0.85rem", background: saving || !selectedMember || selectedTypes.length === 0 || !orNumber.trim() || !feeSchedule ? "#CCC" : "var(--gold)", border: "none", color: "var(--green-dk)", borderRadius: 8, fontSize: "0.85rem", fontWeight: 700, cursor: saving || !selectedMember || selectedTypes.length === 0 || !orNumber.trim() || !feeSchedule ? "not-allowed" : "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                  {saving ? "Saving..." : `Save ₱${totalAmount.toLocaleString()}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
