"use client";
// ─────────────────────────────────────────────
// PaymentsTab.tsx
// Handles: record payments with multi-select types,
//          manual OR number, member search,
//          payment breakdown, full history
// Accessible by: admin, president, treasurer, secretary
// ─────────────────────────────────────────────
import { useEffect, useState } from "react";
import { CreditCard, PlusCircle, Search, X, Check } from "lucide-react";

interface Props {
  canCRUD: boolean;
  supabase: any;
}

type PaymentType = "lifetime" | "aof" | "mas";

const PAYMENT_TYPES: { type: PaymentType; label: string; desc: string; amount: number }[] = [
  { type: "lifetime", label: "Lifetime Membership", desc: "One-time only. Cannot be paid again once recorded.", amount: 200 },
  { type: "aof", label: "Annual Operating Fund", desc: "Paid annually. Covers organizational operations.", amount: 100 },
  { type: "mas", label: "Mortuary Assistance (MAS)", desc: "Annual mutual aid contribution for member families.", amount: 740 },
];

export default function PaymentsTab({ canCRUD, supabase }: Props) {
  const [payments, setPayments] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchHistory, setSearchHistory] = useState("");

  // Form state
  const [memberQuery, setMemberQuery] = useState("");
  const [memberResults, setMemberResults] = useState<any[]>([]);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [selectedTypes, setSelectedTypes] = useState<PaymentType[]>([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [datePaid, setDatePaid] = useState(new Date().toISOString().split("T")[0]);
  const [orNumber, setOrNumber] = useState("");
  const [memberExistingPayments, setMemberExistingPayments] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const { data: p } = await supabase
      .from("payments")
      .select(`
        *,
        members (
          first_name, last_name, member_id_code
        )
      `)
      .order("created_at", { ascending: false });

    const { data: m } = await supabase
      .from("members")
      .select("id, first_name, last_name, member_id_code, status, approval_status")
      .eq("approval_status", "approved")
      .order("last_name");

    setPayments(p || []);
    setMembers(m || []);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  // ── Live member search as user types ──
  const handleMemberSearch = (q: string) => {
    setMemberQuery(q);
    setSelectedMember(null);
    setSelectedTypes([]);
    setMemberExistingPayments([]);

    if (q.length < 1) {
      setMemberResults([]);
      setShowDropdown(false);
      return;
    }

    const lower = q.toLowerCase();
    const results = members.filter(m =>
      m.first_name?.toLowerCase().startsWith(lower) ||
      m.last_name?.toLowerCase().startsWith(lower) ||
      `${m.first_name} ${m.last_name}`.toLowerCase().includes(lower) ||
      `${m.last_name}, ${m.first_name}`.toLowerCase().includes(lower)
    ).slice(0, 8);

    setMemberResults(results);
    setShowDropdown(results.length > 0);
  };

  // ── When member is selected, load their existing payments ──
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

    setMemberExistingPayments(existing || []);
  };

  // ── Check if a payment type is already paid ──
  const isAlreadyPaid = (type: PaymentType) => {
    if (type === "lifetime") {
      return memberExistingPayments.some(p => p.type === "lifetime");
    }
    return memberExistingPayments.some(p => p.type === type && p.year === year);
  };

  // ── Toggle payment type selection ──
  const toggleType = (type: PaymentType) => {
  if (!selectedMember || isAlreadyPaid(type)) return; // Can't select if no member or already paid

    setSelectedTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  // ── Calculate total ──
  const totalAmount = selectedTypes.reduce((sum, type) => {
    const found = PAYMENT_TYPES.find(p => p.type === type);
    return sum + (found?.amount || 0);
  }, 0);

  // ── Save payment(s) ──
  const handleSave = async () => {
    if (!selectedMember) { alert("Please select a member."); return; }
    if (selectedTypes.length === 0) { alert("Please select at least one payment type."); return; }
    if (!orNumber.trim()) { alert("Please enter the Official Receipt (OR) number."); return; }

    setSaving(true);

    // Check for duplicate OR number
const { data: existingOR } = await supabase
  .from("payments")
  .select("id")
  .eq("receipt_number", orNumber.trim())
  .maybeSingle();

    if (existingOR) {
      alert(`OR number ${orNumber} is already recorded in the system. Please check.`);
      setSaving(false);
      return;
    }

// Insert one record per payment type — all share the SAME OR number
const inserts = selectedTypes.map((type) => ({
  member_id: selectedMember.id,
  year: year,
  type,
  amount: PAYMENT_TYPES.find(p => p.type === type)?.amount || 0,
  date_paid: datePaid,
  receipt_number: selectedTypes.length > 1 
  ? `${orNumber.trim()}-${type.toUpperCase()}` 
  : orNumber.trim(), // Same OR for all — breakdown is in separate rows
}));

    const { error } = await supabase.from("payments").insert(inserts);

    if (error) {
      alert("Error saving: " + error.message);
      setSaving(false);
      return;
    }

    // Reset form
    setSelectedMember(null);
    setMemberQuery("");
    setSelectedTypes([]);
    setOrNumber("");
    setDatePaid(new Date().toISOString().split("T")[0]);
    setYear(new Date().getFullYear());
    setMemberExistingPayments([]);
    setShowForm(false);
    await loadData();
    setSaving(false);
  };

  // ── Filter payment history ──
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

  const totalCollected = payments.reduce((s, p) => s + Number(p.amount), 0);
  const thisYear = new Date().getFullYear();

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "0.75rem 1rem",
    border: "1.5px solid rgba(26,92,42,0.15)",
    borderRadius: 6, fontSize: "0.88rem",
    fontFamily: "'DM Sans', sans-serif",
    color: "var(--text)", background: "white", outline: "none",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "0.72rem", fontWeight: 500,
    letterSpacing: "0.08em", textTransform: "uppercase",
    color: "var(--muted)", marginBottom: "0.4rem",
  };

  return (
    <div>

      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div>
          <p style={{ fontSize: "0.72rem", color: "var(--muted)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.3rem" }}>Admin Panel</p>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.8rem", fontWeight: 700, color: "var(--green-dk)" }}>Payment Management</h1>
        </div>
        {canCRUD && (
          <button onClick={() => setShowForm(true)}
            style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--gold)", color: "var(--green-dk)", border: "none", padding: "0.7rem 1.4rem", borderRadius: 6, fontSize: "0.82rem", fontWeight: 500, cursor: "pointer", letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: "'DM Sans', sans-serif" }}>
            <PlusCircle size={15} /> Record Payment
          </button>
        )}
      </div>

      {/* ── Summary Cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "1rem", marginBottom: "2rem" }}>
        {[
          { label: "Total Collected", value: `₱${totalCollected.toLocaleString()}`, color: "var(--gold)" },
          { label: "AOF Payments", value: payments.filter(p => p.type === "aof").length, color: "var(--blue-lt)" },
          { label: "MAS Payments", value: payments.filter(p => p.type === "mas").length, color: "var(--green-lt)" },
          { label: `Payments ${thisYear}`, value: payments.filter(p => p.year === thisYear).length, color: "#2B5FA8" },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: "white", borderRadius: 10, padding: "1.2rem 1.5rem", border: "1px solid rgba(26,92,42,0.08)", borderTop: `4px solid ${color}` }}>
            <p style={{ fontSize: "0.68rem", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)", marginBottom: "0.4rem" }}>{label}</p>
            <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.6rem", fontWeight: 700, color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* ── Search history ── */}
      <div style={{ marginBottom: "1.2rem", display: "flex", alignItems: "center", gap: 8, background: "white", border: "1.5px solid rgba(26,92,42,0.15)", borderRadius: 6, padding: "0 1rem", maxWidth: 400 }}>
        <Search size={15} color="var(--muted)" />
        <input type="text" placeholder="Search by member name or OR number..." value={searchHistory}
          onChange={e => setSearchHistory(e.target.value)}
          style={{ border: "none", outline: "none", fontFamily: "'DM Sans',sans-serif", fontSize: "0.85rem", color: "var(--text)", padding: "0.7rem 0", width: "100%", background: "transparent" }} />
        {searchHistory && (
          <button onClick={() => setSearchHistory("")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 0, display: "flex" }}>
            <X size={14} />
          </button>
        )}
      </div>

      {/* ── Payment History Table ── */}
      <div style={{ background: "white", borderRadius: 10, border: "1px solid rgba(26,92,42,0.08)", overflow: "hidden" }}>
        <div style={{ padding: "1.2rem 1.5rem", borderBottom: "1px solid rgba(26,92,42,0.08)", background: "var(--warm)" }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1rem", fontWeight: 700, color: "var(--green-dk)" }}>
            Payment Records — {filteredPayments.length} entries
          </h2>
        </div>
        {loading ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "var(--muted)", fontSize: "0.85rem" }}>Loading payments...</div>
        ) : filteredPayments.length === 0 ? (
          <div style={{ padding: "3rem", textAlign: "center" }}>
            <CreditCard size={36} color="rgba(26,92,42,0.15)" style={{ marginBottom: "0.8rem" }} />
            <p style={{ color: "var(--muted)", fontSize: "0.88rem" }}>No payment records found.</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 800 }}>
              <thead>
                <tr style={{ background: "var(--warm)" }}>
                  {["OR Number", "Member", "Member ID", "Year", "Type", "Amount", "Date Paid", "Recorded"].map(h => (
                    <th key={h} style={{ padding: "0.8rem 1rem", textAlign: "left", fontSize: "0.68rem", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredPayments.map((p, i) => (
                  <tr key={p.id} style={{ borderBottom: "1px solid rgba(26,92,42,0.06)", background: i % 2 === 0 ? "white" : "var(--cream)" }}>
                    <td style={{ padding: "0.9rem 1rem", fontSize: "0.78rem", fontFamily: "monospace", color: "var(--green-dk)", fontWeight: 500 }}>
                      {p.receipt_number || "—"}
                    </td>
                    <td style={{ padding: "0.9rem 1rem", fontSize: "0.88rem", fontWeight: 500, color: "var(--green-dk)", whiteSpace: "nowrap" }}>
                      {p.members ? `${p.members.first_name} ${p.members.last_name}` : "—"}
                    </td>
                    <td style={{ padding: "0.9rem 1rem", fontSize: "0.72rem", fontFamily: "monospace", color: "var(--muted)" }}>
                      {p.members?.member_id_code || "—"}
                    </td>
                    <td style={{ padding: "0.9rem 1rem", fontSize: "0.85rem", color: "var(--text)", fontWeight: 500 }}>
                      {p.year}
                    </td>
                    <td style={{ padding: "0.9rem 1rem" }}>
                      <span style={{
                        background: p.type === "mas" ? "rgba(26,92,42,0.1)" : p.type === "aof" ? "rgba(212,160,23,0.12)" : "rgba(43,95,168,0.1)",
                        color: p.type === "mas" ? "var(--green)" : p.type === "aof" ? "var(--gold-dk)" : "#2B5FA8",
                        fontSize: "0.7rem", fontWeight: 500, padding: "3px 10px", borderRadius: 20, textTransform: "uppercase", whiteSpace: "nowrap"
                      }}>
                        {p.type === "aof" ? "Operating Fund" : p.type === "mas" ? "MAS" : "Lifetime"}
                      </span>
                    </td>
                    <td style={{ padding: "0.9rem 1rem", fontSize: "0.88rem", fontWeight: 600, color: "var(--green-dk)" }}>
                      ₱{Number(p.amount).toLocaleString()}
                    </td>
                    <td style={{ padding: "0.9rem 1rem", fontSize: "0.82rem", color: "var(--muted)", whiteSpace: "nowrap" }}>
                      {p.date_paid ? new Date(p.date_paid).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" }) : "—"}
                    </td>
                    <td style={{ padding: "0.9rem 1rem", fontSize: "0.72rem", color: "var(--muted)", whiteSpace: "nowrap" }}>
                      {p.created_at ? new Date(p.created_at).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" }) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── RECORD PAYMENT MODAL ── */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}>
          <div style={{ background: "var(--cream)", borderRadius: 14, maxWidth: 560, width: "100%", maxHeight: "95vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>

            {/* Modal Header */}
            <div style={{ padding: "1.5rem 2rem", borderBottom: "1px solid rgba(26,92,42,0.1)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--green-dk)", borderRadius: "14px 14px 0 0" }}>
              <div>
                <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.2rem", fontWeight: 700, color: "white" }}>Record Payment</h2>
                <p style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.5)", marginTop: 2 }}>Fill in all fields before saving</p>
              </div>
              <button onClick={() => { setShowForm(false); setSelectedMember(null); setMemberQuery(""); setSelectedTypes([]); setOrNumber(""); }}
                style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "white", width: 32, height: 32, borderRadius: "50%", cursor: "pointer", fontSize: "1rem", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: "1.5rem 2rem" }}>

              {/* ── STEP 1: Member Search ── */}
              <div style={{ marginBottom: "1.5rem" }}>
                <label style={labelStyle}>
                  <span style={{ background: "var(--gold)", color: "var(--green-dk)", borderRadius: "50%", width: 18, height: 18, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "0.65rem", fontWeight: 700, marginRight: 6 }}>1</span>
                  Select Member *
                </label>
                <div style={{ position: "relative" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, background: "white", border: `1.5px solid ${selectedMember ? "var(--green-lt)" : "rgba(26,92,42,0.15)"}`, borderRadius: 6, padding: "0 1rem" }}>
                    <Search size={15} color="var(--muted)" style={{ flexShrink: 0 }} />
                    <input
                      type="text"
                      placeholder="Type first name, last name, or full name..."
                      value={memberQuery}
                      onChange={e => handleMemberSearch(e.target.value)}
                      onFocus={() => memberQuery && setShowDropdown(memberResults.length > 0)}
                      style={{ border: "none", outline: "none", fontFamily: "'DM Sans',sans-serif", fontSize: "0.88rem", color: "var(--text)", padding: "0.75rem 0", width: "100%", background: "transparent" }}
                      autoComplete="off"
                    />
                    {selectedMember && <Check size={16} color="var(--green-lt)" style={{ flexShrink: 0 }} />}
                    {memberQuery && !selectedMember && (
                      <button onClick={() => { setMemberQuery(""); setMemberResults([]); setSelectedMember(null); setSelectedTypes([]); setMemberExistingPayments([]); }}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 0, display: "flex", flexShrink: 0 }}>
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  {/* Dropdown results */}
                  {showDropdown && memberResults.length > 0 && (
                    <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "white", border: "1.5px solid rgba(26,92,42,0.15)", borderRadius: 8, zIndex: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", overflow: "hidden" }}>
                      {memberResults.map((m, i) => (
                        <button key={m.id} onClick={() => selectMember(m)}
                          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "0.75rem 1rem", textAlign: "left", background: "none", border: "none", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", borderBottom: i < memberResults.length - 1 ? "1px solid rgba(26,92,42,0.06)" : "none" }}
                          onMouseEnter={e => (e.currentTarget.style.background = "var(--warm)")}
                          onMouseLeave={e => (e.currentTarget.style.background = "none")}>
                          <div>
                            <div style={{ fontSize: "0.88rem", fontWeight: 500, color: "var(--green-dk)" }}>{m.first_name} {m.last_name}</div>
                            <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: 1 }}>{m.member_id_code || "No ID yet"}</div>
                          </div>
                          <span style={{ fontSize: "0.7rem", background: m.status === "active" ? "rgba(46,139,68,0.1)" : "rgba(212,160,23,0.1)", color: m.status === "active" ? "#2E8B44" : "#D4A017", padding: "2px 8px", borderRadius: 20, textTransform: "capitalize", flexShrink: 0 }}>
                            {m.status}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Selected member info */}
                {selectedMember && (
                  <div style={{ marginTop: "0.6rem", background: "rgba(46,139,68,0.08)", border: "1px solid rgba(46,139,68,0.2)", borderRadius: 6, padding: "0.7rem 1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <span style={{ fontSize: "0.85rem", fontWeight: 500, color: "var(--green-dk)" }}>{selectedMember.first_name} {selectedMember.last_name}</span>
                      <span style={{ fontSize: "0.72rem", color: "var(--muted)", marginLeft: 8 }}>{selectedMember.member_id_code}</span>
                    </div>
                    <span style={{ fontSize: "0.72rem", color: "#2E8B44", fontWeight: 500 }}>✓ Selected</span>
                  </div>
                )}
              </div>

{/* ── STEP 2: Payment Year ── */}
{(() => {
  const currentYear = new Date().getFullYear();
  const startYear = currentYear - 20;
  const endYear = currentYear + 10;

  const years = Array.from(
    { length: endYear - startYear + 1 },
    (_, i) => startYear + i
  );

  return (
    <div style={{ marginBottom: "1.5rem" }}>
      <label style={labelStyle}>
        <span style={{
          background: "var(--gold)",
          color: "var(--green-dk)",
          borderRadius: "50%",
          width: 18,
          height: 18,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "0.65rem",
          fontWeight: 700,
          marginRight: 6
        }}>
          2
        </span>
        Payment Year *
      </label>

      <select
        value={year || ""}
        onChange={(e) => setYear(Number(e.target.value))}
        style={{
          width: "100%",
          padding: "0.6rem",
          borderRadius: 6,
          border: "1.5px solid rgba(26,92,42,0.15)",
          fontFamily: "'DM Sans', sans-serif",
          fontSize: "0.9rem",
          color: "var(--green-dk)"
        }}
      >
        <option value="" disabled>Select Year</option>

        {years.map(y => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
    </div>
  );
})()}

              {/* ── STEP 3: Payment Types ── */}
              <div style={{ marginBottom: "1.5rem" }}>
                <label style={labelStyle}>
                  <span style={{ background: "var(--gold)", color: "var(--green-dk)", borderRadius: "50%", width: 18, height: 18, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "0.65rem", fontWeight: 700, marginRight: 6 }}>3</span>
                  Payment Type * <span style={{ fontSize: "0.68rem", color: "var(--muted)", textTransform: "none", letterSpacing: 0, fontWeight: 400 }}>(select one or more)</span>
                </label>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                  {PAYMENT_TYPES.map(({ type, label, desc, amount }) => {
                    const alreadyPaid = selectedMember ? isAlreadyPaid(type) : false;
                    const isSelected = selectedTypes.includes(type);

                    return (
                      <button key={type} onClick={() => toggleType(type)} disabled={!selectedMember || alreadyPaid}
                        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.9rem 1.1rem", borderRadius: 8, border: `1.5px solid ${isSelected ? "var(--green-lt)" : alreadyPaid ? "rgba(26,92,42,0.08)" : "rgba(26,92,42,0.15)"}`, background: isSelected ? "rgba(46,139,68,0.08)" : alreadyPaid ? "rgba(26,92,42,0.03)" : "white", cursor: !selectedMember || alreadyPaid ? "not-allowed" : "pointer", opacity: !selectedMember || alreadyPaid ? 0.5 : 1, textAlign: "left", width: "100%", fontFamily: "'DM Sans',sans-serif" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ width: 20, height: 20, borderRadius: 4, border: `2px solid ${isSelected ? "var(--green-lt)" : "rgba(26,92,42,0.2)"}`, background: isSelected ? "var(--green-lt)" : "white", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            {isSelected && <Check size={12} color="white" />}
                          </div>
                          <div>
                            <div style={{ fontSize: "0.88rem", fontWeight: 500, color: alreadyPaid ? "var(--muted)" : "var(--green-dk)" }}>{label}</div>
                            <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: 1 }}>
                              {alreadyPaid
                                ? type === "lifetime" ? "✓ Already paid (lifetime)" : `✓ Already paid for ${year}`
                                : desc}
                            </div>
                          </div>
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.1rem", fontWeight: 700, color: isSelected ? "var(--green-dk)" : alreadyPaid ? "var(--muted)" : "var(--green-dk)" }}>₱{amount.toLocaleString()}</div>
                          {alreadyPaid && <div style={{ fontSize: "0.65rem", color: "var(--muted)" }}>PAID</div>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ── STEP 4: OR Number and Date ── */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
                <div>
                  <label style={labelStyle}>
                    <span style={{ background: "var(--gold)", color: "var(--green-dk)", borderRadius: "50%", width: 18, height: 18, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "0.65rem", fontWeight: 700, marginRight: 6 }}>4</span>
                    Official Receipt (OR) No. *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 0012345"
                    value={orNumber}
                    onChange={e => setOrNumber(e.target.value)}
                    style={inputStyle}
                  />
                  <p style={{ fontSize: "0.68rem", color: "var(--muted)", marginTop: 4 }}>Enter the OR number from your BIR receipt.</p>
                </div>
                <div>
                  <label style={labelStyle}>
                    <span style={{ background: "var(--gold)", color: "var(--green-dk)", borderRadius: "50%", width: 18, height: 18, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "0.65rem", fontWeight: 700, marginRight: 6 }}>5</span>
                    Date Paid *
                  </label>
                  <input
                    type="date"
                    value={datePaid}
                    onChange={e => setDatePaid(e.target.value)}
                    style={inputStyle}
                  />
                </div>
              </div>

              {/* ── PAYMENT BREAKDOWN ── */}
              {selectedTypes.length > 0 && (
                <div style={{ background: "var(--green-dk)", borderRadius: 10, padding: "1.4rem", marginBottom: "1.5rem", border: "1px solid rgba(212,160,23,0.2)" }}>
                  <p style={{ fontSize: "0.68rem", fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.5)", marginBottom: "0.8rem" }}>Payment Breakdown</p>

                  {/* Member */}
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", marginBottom: "0.5rem" }}>
                    <span style={{ color: "rgba(255,255,255,0.5)" }}>Member</span>
                    <span style={{ color: "white", fontWeight: 500 }}>{selectedMember ? `${selectedMember.first_name} ${selectedMember.last_name}` : "—"}</span>
                  </div>

                  {/* Year */}
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", marginBottom: "0.8rem" }}>
                    <span style={{ color: "rgba(255,255,255,0.5)" }}>Payment Year</span>
                    <span style={{ color: "white", fontWeight: 500 }}>{year}</span>
                  </div>

                  <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "0.8rem", marginBottom: "0.8rem" }}>
                    {selectedTypes.map(type => {
                      const pt = PAYMENT_TYPES.find(p => p.type === type)!;
                      return (
                        <div key={type} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "0.4rem" }}>
                          <span style={{ color: "rgba(255,255,255,0.7)" }}>{pt.label}</span>
                          <span style={{ color: "var(--gold-lt)", fontWeight: 500 }}>₱{pt.amount.toLocaleString()}</span>
                        </div>
                      );
                    })}
                  </div>

                  <div style={{ borderTop: "1px solid rgba(212,160,23,0.3)", paddingTop: "0.8rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <span style={{ fontSize: "0.88rem", fontWeight: 500, color: "white" }}>Total Amount</span>
                      {orNumber && (
                        <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.4)", marginTop: 2 }}>
                        OR No.: {orNumber}
                        </div>
                      )}
                    </div>
                    <span style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.8rem", fontWeight: 700, color: "var(--gold-lt)" }}>
                      ₱{totalAmount.toLocaleString()}
                    </span>
                  </div>

                  {/* Date */}
                  {datePaid && (
                    <div style={{ marginTop: "0.6rem", fontSize: "0.78rem", color: "rgba(255,255,255,0.4)", textAlign: "right" }}>
                      Date paid: {new Date(datePaid).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}
                    </div>
                  )}
                </div>
              )}

              {/* Validation checklist */}
              <div style={{ background: "var(--warm)", borderRadius: 8, padding: "0.8rem 1rem", marginBottom: "1.2rem" }}>
                <p style={{ fontSize: "0.68rem", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)", marginBottom: "0.5rem" }}>Before saving, make sure:</p>
                {[
                  { ok: !!selectedMember, label: "Member selected" },
                  { ok: selectedTypes.length > 0, label: "At least one payment type selected" },
                  { ok: !!orNumber.trim(), label: "OR number entered" },
                  { ok: !!datePaid, label: "Date paid set" },
                ].map(({ ok, label }) => (
                  <div key={label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.8rem", color: ok ? "#2E8B44" : "var(--muted)", marginBottom: "0.2rem" }}>
                    <span style={{ fontSize: "0.75rem" }}>{ok ? "✓" : "○"}</span> {label}
                  </div>
                ))}
              </div>

              {/* Buttons */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.8rem" }}>
                <button onClick={() => { setShowForm(false); setSelectedMember(null); setMemberQuery(""); setSelectedTypes([]); setOrNumber(""); }}
                  style={{ padding: "0.85rem", background: "white", border: "1.5px solid rgba(26,92,42,0.15)", color: "var(--muted)", borderRadius: 6, fontSize: "0.85rem", cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                  Cancel
                </button>
                <button onClick={handleSave} disabled={saving || !selectedMember || selectedTypes.length === 0 || !orNumber.trim()}
                  style={{ padding: "0.85rem", background: saving || !selectedMember || selectedTypes.length === 0 || !orNumber.trim() ? "var(--gold-dk)" : "var(--gold)", border: "none", color: "var(--green-dk)", borderRadius: 6, fontSize: "0.85rem", fontWeight: 500, cursor: saving || !selectedMember || selectedTypes.length === 0 || !orNumber.trim() ? "not-allowed" : "pointer", letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: "'DM Sans',sans-serif" }}>
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