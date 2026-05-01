"use client";
// ─────────────────────────────────────────────────────────────
// AccountsPanel.tsx — Mobile-responsive CRUD for accounts
// Place at: D:\suncowebsite\app\admin\_components\financial\AccountsPanel.tsx
// ─────────────────────────────────────────────────────────────
import { useEffect, useState } from "react";
import { Plus, Edit3, Archive, CheckCircle, AlertTriangle, RefreshCw, X } from "lucide-react";
import { useWindowWidth } from "@/app/admin/hooks/useWindowWidth";

interface Props { supabase: any; canCRUD: boolean; }
type AccountType = "mas" | "aof" | "cash";

interface Account {
  id: string; name: string; bank_name: string;
  account_number: string; account_type: AccountType;
  officer_name: string; opening_balance: number;
  opening_balance_date: string; opening_reference: string;
  is_active: boolean; current_balance: number;
  total_income: number; total_expenses: number;
  transaction_count: number;
}

const TYPE_LABELS: Record<AccountType, string> = {
  mas: "MAS Account", aof: "AOF / Operational", cash: "Cash on Hand",
};
const TYPE_COLORS: Record<AccountType, string> = {
  mas: "#2E8B44", aof: "#2B5FA8", cash: "#C9A84C",
};

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "0.68rem 0.9rem",
  border: "1.5px solid rgba(26,92,42,0.15)", borderRadius: 8,
  fontSize: "0.88rem", fontFamily: "'DM Sans', sans-serif",
  color: "var(--text)", outline: "none", background: "white",
  boxSizing: "border-box",
};
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "0.68rem", fontWeight: 700,
  letterSpacing: "0.09em", textTransform: "uppercase",
  color: "#0D3320", marginBottom: "0.35rem",
};

function peso(n: number) {
  return `₱${Number(n||0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;
}

const EMPTY_FORM = {
  name: "", bank_name: "", account_number: "",
  account_type: "mas" as AccountType, officer_name: "",
  opening_balance: "", opening_balance_date: new Date().toISOString().slice(0,10),
  opening_reference: "",
};

export default function AccountsPanel({ supabase, canCRUD }: Props) {
  const { isMobile } = useWindowWidth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing,  setEditing]  = useState<Account | null>(null);
  const [saving,   setSaving]   = useState(false);
  const [status,   setStatus]   = useState<"idle"|"saved"|"error">("idle");
  const [form,     setForm]     = useState({ ...EMPTY_FORM });

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("account_balances").select("*").order("account_type").order("name");
    setAccounts(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm({ ...EMPTY_FORM }); setShowForm(true); };
  const openEdit = (a: Account) => {
    setEditing(a);
    setForm({
      name: a.name, bank_name: a.bank_name, account_number: a.account_number || "",
      account_type: a.account_type, officer_name: a.officer_name || "",
      opening_balance: String(a.opening_balance),
      opening_balance_date: a.opening_balance_date,
      opening_reference: a.opening_reference || "",
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.bank_name) { alert("Account name and bank name are required."); return; }
    setSaving(true); setStatus("idle");
    const payload = {
      name: form.name, bank_name: form.bank_name,
      account_number: form.account_number || null,
      account_type: form.account_type,
      officer_name: form.officer_name || null,
      opening_balance: parseFloat(form.opening_balance) || 0,
      opening_balance_date: form.opening_balance_date,
      opening_reference: form.opening_reference || null,
    };
    const { error } = editing
      ? await supabase.from("bank_accounts").update(payload).eq("id", editing.id)
      : await supabase.from("bank_accounts").insert({ ...payload, is_active: true });
    if (error) { setStatus("error"); setSaving(false); return; }
    setStatus("saved"); setTimeout(() => setStatus("idle"), 3000);
    setShowForm(false); setSaving(false); await load();
  };

  const handleArchive = async (a: Account) => {
    if (!confirm(`${a.is_active ? "Archive" : "Restore"} "${a.name}"?`)) return;
    await supabase.from("bank_accounts").update({ is_active: !a.is_active }).eq("id", a.id);
    await load();
  };

  const grouped = {
    mas:  accounts.filter(a => a.account_type === "mas"),
    aof:  accounts.filter(a => a.account_type === "aof"),
    cash: accounts.filter(a => a.account_type === "cash"),
  };

  return (
    <div>
      {status === "saved" && (
        <div style={{ display:"flex", alignItems:"center", gap:10, background:"rgba(46,139,68,0.1)", border:"1px solid rgba(46,139,68,0.3)", borderRadius:8, padding:"0.85rem 1.2rem", marginBottom:"1.5rem" }}>
          <CheckCircle size={16} color="#2E8B44" />
          <p style={{ fontSize:"0.88rem", color:"#2E8B44", fontWeight:600 }}>Account saved successfully.</p>
        </div>
      )}
      {status === "error" && (
        <div style={{ display:"flex", alignItems:"center", gap:10, background:"rgba(192,57,43,0.08)", border:"1px solid rgba(192,57,43,0.25)", borderRadius:8, padding:"0.85rem 1.2rem", marginBottom:"1.5rem" }}>
          <AlertTriangle size={16} color="#C0392B" />
          <p style={{ fontSize:"0.88rem", color:"#C0392B", fontWeight:600 }}>Save failed. Please try again.</p>
        </div>
      )}

      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1.5rem" }}>
        <div>
          <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize: isMobile ? "1rem" : "1.1rem", fontWeight:700, color:"var(--green-dk)" }}>
            Bank Accounts & Cash on Hand
          </h2>
          <p style={{ fontSize:"0.72rem", color:"var(--muted)", marginTop:3 }}>
            {accounts.filter(a=>a.is_active).length} active accounts
          </p>
        </div>
        {canCRUD && (
          <button onClick={openNew} style={{
            display:"flex", alignItems:"center", gap:6,
            background:"var(--gold)", color:"var(--green-dk)",
            border:"none", padding: isMobile ? "0.6rem 0.9rem" : "0.7rem 1.4rem",
            borderRadius:8, fontSize: isMobile ? "0.75rem" : "0.82rem",
            fontWeight:700, cursor:"pointer", fontFamily:"'DM Sans',sans-serif",
            whiteSpace:"nowrap",
          }}>
            <Plus size={14} /> {isMobile ? "Add" : "Add Account"}
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ padding:"3rem", textAlign:"center", color:"var(--muted)" }}>
          <RefreshCw size={20} style={{ marginBottom:8, opacity:0.4 }} /><p>Loading...</p>
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:"2rem" }}>
          {(["mas","aof","cash"] as AccountType[]).map(type => (
            <div key={type}>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:"1rem", paddingBottom:"0.5rem", borderBottom:`2px solid ${TYPE_COLORS[type]}22` }}>
                <div style={{ width:10, height:10, borderRadius:"50%", background:TYPE_COLORS[type] }} />
                <h3 style={{ fontSize:"0.72rem", fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", color:TYPE_COLORS[type] }}>
                  {TYPE_LABELS[type]}
                </h3>
                <span style={{ fontSize:"0.68rem", color:"var(--muted)" }}>({grouped[type].length})</span>
              </div>

              {grouped[type].length === 0 ? (
                <div style={{ padding:"1.5rem", textAlign:"center", background:"rgba(26,92,42,0.03)", borderRadius:10, border:"1.5px dashed rgba(26,92,42,0.12)", color:"var(--muted)", fontSize:"0.82rem" }}>
                  No {TYPE_LABELS[type]} accounts yet.
                </div>
              ) : (
                <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(280px,1fr))", gap:"1rem" }}>
                  {grouped[type].map(a => (
                    <div key={a.id} style={{
                      background:"white", borderRadius:12,
                      border:`1px solid rgba(26,92,42,0.08)`,
                      borderTop:`3px solid ${a.is_active ? TYPE_COLORS[a.account_type] : "#ccc"}`,
                      opacity: a.is_active ? 1 : 0.55,
                    }}>
                      <div style={{ padding:"1rem 1.2rem", borderBottom:"1px solid rgba(26,92,42,0.06)", background:"var(--warm)" }}>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                          <div>
                            <p style={{ fontSize:"0.85rem", fontWeight:700, color:"var(--green-dk)" }}>{a.name}</p>
                            <p style={{ fontSize:"0.72rem", color:"var(--muted)", marginTop:2 }}>
                              {a.bank_name}{a.account_number && ` · ${a.account_number}`}{a.officer_name && ` · ${a.officer_name}`}
                            </p>
                          </div>
                          {!a.is_active && (
                            <span style={{ fontSize:"0.6rem", fontWeight:700, background:"rgba(192,57,43,0.1)", color:"#C0392B", padding:"2px 7px", borderRadius:4, flexShrink:0 }}>ARCHIVED</span>
                          )}
                        </div>
                      </div>

                      {/* Balance strip — stacks on mobile */}
                      <div style={{ padding:"1rem 1.2rem", display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"0.5rem" }}>
                        {[
                          { label:"Opening", value: a.opening_balance, color:"var(--text)" },
                          { label:"Movement", value: a.total_income - a.total_expenses, color: a.total_income >= a.total_expenses ? "#2E8B44" : "#C0392B" },
                          { label:"Balance", value: a.current_balance, color:"var(--green-dk)" },
                        ].map(({ label, value, color }, i) => (
                          <div key={label} style={{ textAlign:"center", borderLeft: i > 0 ? "1px solid rgba(26,92,42,0.08)" : "none" }}>
                            <p style={{ fontSize:"0.58rem", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.07em", color:"var(--muted)", marginBottom:4 }}>{label}</p>
                            <p style={{ fontSize: i === 2 ? "0.92rem" : "0.78rem", fontWeight: i === 2 ? 800 : 600, color }}>{peso(value)}</p>
                          </div>
                        ))}
                      </div>

                      {a.opening_reference && (
                        <div style={{ padding:"0 1.2rem 0.75rem", fontSize:"0.68rem", color:"var(--muted)" }}>
                          📋 {a.opening_reference}
                        </div>
                      )}

                      {canCRUD && (
                        <div style={{ padding:"0.75rem 1.2rem", borderTop:"1px solid rgba(26,92,42,0.06)", display:"flex", gap:"0.5rem" }}>
                          <button onClick={() => openEdit(a)} style={{ display:"flex", alignItems:"center", gap:4, background:"none", border:"1px solid rgba(26,92,42,0.2)", color:"var(--green-dk)", padding:"0.4rem 0.9rem", borderRadius:6, fontSize:"0.75rem", cursor:"pointer", fontFamily:"'DM Sans',sans-serif", flex:1, justifyContent:"center" }}>
                            <Edit3 size={11} /> Edit
                          </button>
                          <button onClick={() => handleArchive(a)} style={{ display:"flex", alignItems:"center", gap:4, background:"none", border:`1px solid ${a.is_active ? "rgba(192,57,43,0.3)" : "rgba(46,139,68,0.3)"}`, color: a.is_active ? "#C0392B" : "#2E8B44", padding:"0.4rem 0.9rem", borderRadius:6, fontSize:"0.75rem", cursor:"pointer", fontFamily:"'DM Sans',sans-serif", flex:1, justifyContent:"center" }}>
                            <Archive size={11} /> {a.is_active ? "Archive" : "Restore"}
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Form Modal ── */}
      {showForm && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", zIndex:200, display:"flex", alignItems: isMobile ? "flex-end" : "center", justifyContent:"center", padding: isMobile ? 0 : "2rem" }}>
          <div style={{ background:"white", borderRadius: isMobile ? "16px 16px 0 0" : 14, maxWidth:540, width:"100%", maxHeight: isMobile ? "92vh" : "90vh", overflowY:"auto" }}>
            <div style={{ padding:"1.4rem 1.6rem", borderBottom:"1px solid rgba(26,92,42,0.08)", display:"flex", justifyContent:"space-between", alignItems:"center", background:"var(--green-dk)", borderRadius: isMobile ? "16px 16px 0 0" : "14px 14px 0 0" }}>
              <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.1rem", color:"var(--gold)", fontWeight:700 }}>
                {editing ? "Edit Account" : "Add Account"}
              </h2>
              <button onClick={() => setShowForm(false)} style={{ background:"none", border:"none", color:"rgba(255,255,255,0.6)", cursor:"pointer" }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ padding:"1.4rem", display:"flex", flexDirection:"column", gap:"1.1rem" }}>
              <div>
                <label style={labelStyle}>Account Type *</label>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"0.5rem" }}>
                  {(["mas","aof","cash"] as AccountType[]).map(t => (
                    <button key={t} onClick={() => setForm(p => ({ ...p, account_type: t }))}
                      style={{ padding:"0.6rem", borderRadius:8, cursor:"pointer", border:`2px solid ${form.account_type===t ? TYPE_COLORS[t] : "rgba(26,92,42,0.12)"}`, background: form.account_type===t ? `${TYPE_COLORS[t]}11` : "white", color: form.account_type===t ? TYPE_COLORS[t] : "var(--muted)", fontSize:"0.72rem", fontWeight:700, fontFamily:"'DM Sans',sans-serif" }}>
                      {TYPE_LABELS[t]}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={labelStyle}>Account Name *</label>
                <input style={inputStyle} value={form.name} placeholder={form.account_type==="cash" ? "Petty Cash Fund" : "e.g. BDO MAS Savings"} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div>
                <label style={labelStyle}>{form.account_type==="cash" ? "Location / Description *" : "Bank Name *"}</label>
                <input style={inputStyle} value={form.bank_name} placeholder={form.account_type==="cash" ? "e.g. Office Safe" : "e.g. BDO, Metrobank"} onChange={e => setForm(p => ({ ...p, bank_name: e.target.value }))} />
              </div>
              {form.account_type !== "cash" && (
                <div>
                  <label style={labelStyle}>Account Number</label>
                  <input style={inputStyle} value={form.account_number} placeholder="e.g. 1234-5678-90" onChange={e => setForm(p => ({ ...p, account_number: e.target.value }))} />
                </div>
              )}
              {form.account_type === "cash" && (
                <div>
                  <label style={labelStyle}>Custodian / Officer Name</label>
                  <input style={inputStyle} value={form.officer_name} placeholder="e.g. Anrora Puertos" onChange={e => setForm(p => ({ ...p, officer_name: e.target.value }))} />
                </div>
              )}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1rem" }}>
                <div>
                  <label style={labelStyle}>Opening Balance (₱) *</label>
                  <input style={inputStyle} type="number" min={0} value={form.opening_balance} placeholder="0.00" onChange={e => setForm(p => ({ ...p, opening_balance: e.target.value }))} />
                </div>
                <div>
                  <label style={labelStyle}>As of Date *</label>
                  <input style={inputStyle} type="date" value={form.opening_balance_date} onChange={e => setForm(p => ({ ...p, opening_balance_date: e.target.value }))} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Approval Reference</label>
                <input style={inputStyle} value={form.opening_reference} placeholder="e.g. General Assembly Resolution No. 2024-001" onChange={e => setForm(p => ({ ...p, opening_reference: e.target.value }))} />
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0.8rem" }}>
                <button onClick={() => setShowForm(false)} style={{ padding:"0.85rem", background:"white", border:"1.5px solid rgba(26,92,42,0.15)", color:"var(--muted)", borderRadius:8, fontSize:"0.85rem", cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>Cancel</button>
                <button onClick={handleSave} disabled={saving} style={{ padding:"0.85rem", background: saving ? "rgba(201,168,76,0.5)" : "var(--gold)", border:"none", color:"var(--green-dk)", borderRadius:8, fontSize:"0.85rem", fontWeight:700, cursor: saving ? "not-allowed" : "pointer", fontFamily:"'DM Sans',sans-serif" }}>
                  {saving ? "Saving..." : editing ? "Update Account" : "Add Account"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
