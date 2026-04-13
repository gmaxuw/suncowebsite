"use client";
// ─────────────────────────────────────────────
// PaymentsTab.tsx
// Handles: record payments (AOF, MAS, Lifetime),
//          payment history, receipt numbers
// Accessible by: admin, president, treasurer, secretary
// ─────────────────────────────────────────────
import { useEffect, useState } from "react";
import { CreditCard, PlusCircle, Search } from "lucide-react";

interface Props {
  canCRUD: boolean;
  supabase: any;
}

export default function PaymentsTab({ canCRUD, supabase }: Props) {
  const [payments, setPayments] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [memberResults, setMemberResults] = useState<any[]>([]);
  const [form, setForm] = useState({
    member_id: "",
    member_name: "",
    year: new Date().getFullYear(),
    type: "aof",
    amount: 100,
    date_paid: new Date().toISOString().split("T")[0],
  });

  const typeAmounts: any = { lifetime: 200, aof: 100, mas: 740 };

  const loadData = async () => {
    setLoading(true);
    const { data: p } = await supabase
      .from("payments")
      .select("*, members(first_name, last_name, member_id_code)")
      .order("created_at", { ascending: false });
    const { data: m } = await supabase
      .from("members")
      .select("id, first_name, last_name, member_id_code, status")
      .eq("approval_status", "approved")
      .order("last_name");
    setPayments(p || []);
    setMembers(m || []);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const searchMembers = (q: string) => {
    setMemberSearch(q);
    if (q.length < 2) { setMemberResults([]); return; }
    const results = members.filter(m =>
      `${m.first_name} ${m.last_name}`.toLowerCase().includes(q.toLowerCase())
    );
    setMemberResults(results.slice(0, 5));
  };

  const selectMember = (m: any) => {
    setForm(prev => ({ ...prev, member_id: m.id, member_name: `${m.first_name} ${m.last_name}` }));
    setMemberSearch(`${m.first_name} ${m.last_name}`);
    setMemberResults([]);
  };

  const handleTypeChange = (type: string) => {
    setForm(prev => ({ ...prev, type, amount: typeAmounts[type] || 0 }));
  };

  const handleSave = async () => {
    if (!form.member_id) { alert("Please select a member."); return; }
    setSaving(true);
    const { error } = await supabase.from("payments").insert({
      member_id: form.member_id,
      year: form.year,
      type: form.type,
      amount: form.amount,
      date_paid: form.date_paid,
    });
    if (error) { alert(error.message); setSaving(false); return; }
    await loadData();
    setShowForm(false);
    setForm({ member_id: "", member_name: "", year: new Date().getFullYear(), type: "aof", amount: 100, date_paid: new Date().toISOString().split("T")[0] });
    setMemberSearch("");
    setSaving(false);
  };

  const filtered = payments.filter(p => {
    const name = p.members ? `${p.members.first_name} ${p.members.last_name}` : "";
    return search === "" || name.toLowerCase().includes(search.toLowerCase());
  });

  const totalCollected = payments.reduce((s, p) => s + Number(p.amount), 0);

  const inputStyle = {
    width: "100%", padding: "0.7rem 1rem",
    border: "1.5px solid rgba(26,92,42,0.15)",
    borderRadius: 6, fontSize: "0.88rem",
    fontFamily: "'DM Sans', sans-serif",
    color: "var(--text)", background: "white", outline: "none",
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
          { label: "This Year", value: payments.filter(p => p.year === new Date().getFullYear()).length, color: "#2B5FA8" },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: "white", borderRadius: 10, padding: "1.2rem", border: "1px solid rgba(26,92,42,0.08)", borderTop: `4px solid ${color}` }}>
            <p style={{ fontSize: "0.68rem", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)", marginBottom: "0.4rem" }}>{label}</p>
            <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.6rem", fontWeight: 700, color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* ── Search ── */}
      <div style={{ marginBottom: "1.2rem", display: "flex", alignItems: "center", gap: 8 }}>
        <Search size={16} color="var(--muted)" />
        <input type="text" placeholder="Search by member name..." value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ ...inputStyle, maxWidth: 360 }} />
      </div>

      {/* ── Payments Table ── */}
      <div style={{ background: "white", borderRadius: 10, border: "1px solid rgba(26,92,42,0.08)", overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "var(--muted)" }}>Loading payments...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "3rem", textAlign: "center" }}>
            <CreditCard size={36} color="rgba(26,92,42,0.15)" style={{ marginBottom: "0.8rem" }} />
            <p style={{ color: "var(--muted)", fontSize: "0.88rem" }}>No payments found.</p>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--warm)" }}>
                {["Receipt No.", "Member", "Member ID", "Year", "Type", "Amount", "Date Paid"].map(h => (
                  <th key={h} style={{ padding: "0.8rem 1rem", textAlign: "left", fontSize: "0.68rem", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, i) => (
                <tr key={p.id} style={{ borderBottom: "1px solid rgba(26,92,42,0.06)", background: i % 2 === 0 ? "white" : "var(--cream)" }}>
                  <td style={{ padding: "0.9rem 1rem", fontSize: "0.75rem", fontFamily: "monospace", color: "var(--muted)" }}>{p.receipt_number || "—"}</td>
                  <td style={{ padding: "0.9rem 1rem", fontSize: "0.88rem", fontWeight: 500, color: "var(--green-dk)" }}>
                    {p.members ? `${p.members.first_name} ${p.members.last_name}` : "—"}
                  </td>
                  <td style={{ padding: "0.9rem 1rem", fontSize: "0.75rem", fontFamily: "monospace", color: "var(--muted)" }}>
                    {p.members?.member_id_code || "—"}
                  </td>
                  <td style={{ padding: "0.9rem 1rem", fontSize: "0.88rem", color: "var(--text)" }}>{p.year}</td>
                  <td style={{ padding: "0.9rem 1rem" }}>
                    <span style={{ background: p.type === "mas" ? "rgba(26,92,42,0.1)" : p.type === "aof" ? "rgba(212,160,23,0.1)" : "rgba(43,95,168,0.1)", color: p.type === "mas" ? "var(--green)" : p.type === "aof" ? "var(--gold-dk)" : "#2B5FA8", fontSize: "0.7rem", fontWeight: 500, padding: "3px 10px", borderRadius: 20, textTransform: "uppercase" }}>
                      {p.type}
                    </span>
                  </td>
                  <td style={{ padding: "0.9rem 1rem", fontSize: "0.88rem", fontWeight: 500, color: "var(--green-dk)" }}>₱{Number(p.amount).toLocaleString()}</td>
                  <td style={{ padding: "0.9rem 1rem", fontSize: "0.82rem", color: "var(--muted)" }}>
                    {p.date_paid ? new Date(p.date_paid).toLocaleDateString("en-PH") : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Record Payment Modal ── */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
          <div style={{ background: "white", borderRadius: 12, padding: "2rem", maxWidth: 480, width: "100%" }}>

            {/* Modal Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.2rem", fontWeight: 700, color: "var(--green-dk)" }}>Record Payment</h2>
              <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", fontSize: "1.5rem", cursor: "pointer", color: "var(--muted)" }}>✕</button>
            </div>

            {/* Member Search */}
            <div style={{ marginBottom: "1rem", position: "relative" }}>
              <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)", marginBottom: "0.4rem" }}>Member *</label>
              <input type="text" placeholder="Type member name to search..." value={memberSearch}
                onChange={e => searchMembers(e.target.value)}
                style={inputStyle} />
              {memberResults.length > 0 && (
                <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "white", border: "1.5px solid rgba(26,92,42,0.15)", borderRadius: 6, zIndex: 10, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
                  {memberResults.map(m => (
                    <button key={m.id} onClick={() => selectMember(m)}
                      style={{ display: "block", width: "100%", padding: "0.7rem 1rem", textAlign: "left", background: "none", border: "none", cursor: "pointer", fontSize: "0.85rem", color: "var(--green-dk)", fontFamily: "'DM Sans', sans-serif", borderBottom: "1px solid rgba(26,92,42,0.06)" }}>
                      {m.first_name} {m.last_name}
                      <span style={{ fontSize: "0.72rem", color: "var(--muted)", marginLeft: 8 }}>{m.member_id_code}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Payment Type */}
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)", marginBottom: "0.4rem" }}>Payment Type *</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem" }}>
                {[
                  { type: "lifetime", label: "Lifetime", amount: "₱200" },
                  { type: "aof", label: "AOF", amount: "₱100" },
                  { type: "mas", label: "MAS", amount: "₱740" },
                ].map(({ type, label, amount }) => (
                  <button key={type} onClick={() => handleTypeChange(type)}
                    style={{ padding: "0.7rem", borderRadius: 6, border: `1.5px solid ${form.type === type ? "var(--gold)" : "rgba(26,92,42,0.15)"}`, background: form.type === type ? "var(--gold)" : "white", color: form.type === type ? "var(--green-dk)" : "var(--muted)", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontSize: "0.8rem" }}>
                    <div style={{ fontWeight: 500 }}>{label}</div>
                    <div style={{ fontSize: "0.72rem", marginTop: 2 }}>{amount}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Year and Date */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)", marginBottom: "0.4rem" }}>Year *</label>
                <select value={form.year} onChange={e => setForm(prev => ({ ...prev, year: Number(e.target.value) }))} style={inputStyle}>
                  {[2020,2021,2022,2023,2024,2025,2026].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)", marginBottom: "0.4rem" }}>Date Paid *</label>
                <input type="date" value={form.date_paid}
                  onChange={e => setForm(prev => ({ ...prev, date_paid: e.target.value }))}
                  style={inputStyle} />
              </div>
            </div>

            {/* Amount */}
            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)", marginBottom: "0.4rem" }}>Amount (₱) *</label>
              <input type="number" value={form.amount}
                onChange={e => setForm(prev => ({ ...prev, amount: Number(e.target.value) }))}
                style={inputStyle} />
            </div>

            {/* Summary */}
            <div style={{ background: "var(--green-dk)", borderRadius: 6, padding: "1rem", marginBottom: "1.2rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <p style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.5)", marginBottom: "0.2rem" }}>Recording payment for</p>
                <p style={{ fontSize: "0.9rem", fontWeight: 500, color: "white" }}>{form.member_name || "No member selected"}</p>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.5)", marginBottom: "0.2rem" }}>{form.type.toUpperCase()} · {form.year}</p>
                <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.4rem", fontWeight: 700, color: "var(--gold-lt)" }}>₱{form.amount.toLocaleString()}</p>
              </div>
            </div>

            <button onClick={handleSave} disabled={saving}
              style={{ width: "100%", background: saving ? "var(--gold-dk)" : "var(--gold)", color: "var(--green-dk)", border: "none", padding: "0.9rem", borderRadius: 6, fontSize: "0.85rem", fontWeight: 500, cursor: saving ? "not-allowed" : "pointer", letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: "'DM Sans', sans-serif" }}>
              {saving ? "Saving..." : "Save Payment"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}