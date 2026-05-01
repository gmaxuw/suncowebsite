"use client";
// ─────────────────────────────────────────────────────────────
// TransactionsPanel.tsx — Manual income & expenditure entries
// Place at: D:\suncowebsite\app\admin\_components\financial\TransactionsPanel.tsx
// ─────────────────────────────────────────────────────────────
import { useEffect, useState, useRef } from "react";
import {
  Plus, Trash2, Edit3, Upload, X, CheckCircle,
  AlertTriangle, RefreshCw, TrendingUp, TrendingDown, Filter,
} from "lucide-react";

interface Props { supabase: any; canCRUD: boolean; }

interface Account {
  id: string; name: string; bank_name: string;
  account_type: "mas" | "aof" | "cash"; is_active: boolean;
}

interface Transaction {
  id: string;
  account_id: string;
  direction: "income" | "expense";
  category: string;
  description: string;
  amount: number;
  transaction_date: string;
  reference_no: string;
  receipt_url: string | null;
  receipt_uploaded_at: string | null;
  is_from_payments: boolean;
  created_at: string;
  bank_accounts: { name: string; bank_name: string; account_type: string };
}

const CATEGORIES: Record<string, { income: string[]; expense: string[] }> = {
  mas: {
    income:  ["Other MAS Income"],
    expense: ["Burial Claim", "Death Reimbursement", "Other MAS Expense"],
  },
  aof: {
    income:  ["Facility/Equipment Rental Income", "Donation", "Other AOF Income"],
    expense: ["Office Supplies", "Rental Expense", "Utilities", "Events / Activities", "Salaries / Allowances", "Repairs & Maintenance", "Other Operational Expense"],
  },
  cash: {
    income:  ["Replenishment from Bank", "Other Cash Income"],
    expense: ["Transportation", "Office Supplies", "Miscellaneous", "Other Petty Cash Expense"],
  },
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

function fmtDate(d: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-PH", { year:"numeric", month:"short", day:"numeric" });
}

const EMPTY_FORM = {
  account_id: "", direction: "expense" as "income"|"expense",
  category: "", description: "", amount: "",
  transaction_date: new Date().toISOString().slice(0,10),
  reference_no: "",
};

export default function TransactionsPanel({ supabase, canCRUD }: Props) {
  const [accounts,     setAccounts]     = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [showForm,     setShowForm]     = useState(false);
  const [editing,      setEditing]      = useState<Transaction | null>(null);
  const [saving,       setSaving]       = useState(false);
  const [uploading,    setUploading]    = useState(false);
  const [status,       setStatus]       = useState<"idle"|"saved"|"error">("idle");
  const [form,         setForm]         = useState({ ...EMPTY_FORM });
  const [receiptFile,  setReceiptFile]  = useState<string | null>(null);
  const [filterAcct,   setFilterAcct]   = useState("all");
  const [filterDir,    setFilterDir]    = useState("all");
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    const [{ data: accts }, { data: txns }] = await Promise.all([
      supabase.from("bank_accounts").select("id,name,bank_name,account_type,is_active").eq("is_active", true).order("name"),
      supabase.from("financial_transactions")
        .select("*, bank_accounts(name,bank_name,account_type)")
        .eq("is_from_payments", false)
        .order("transaction_date", { ascending: false })
        .order("created_at",       { ascending: false }),
    ]);
    setAccounts(accts || []);
    setTransactions(txns || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const selectedAccount = accounts.find(a => a.id === form.account_id);
  const cats = selectedAccount
    ? (CATEGORIES[selectedAccount.account_type]?.[form.direction] || [])
    : [];

  const openNew = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM, account_id: accounts[0]?.id || "" });
    setReceiptFile(null);
    setShowForm(true);
  };

  const openEdit = (t: Transaction) => {
    setEditing(t);
    setForm({
      account_id:       t.account_id,
      direction:        t.direction,
      category:         t.category,
      description:      t.description || "",
      amount:           String(t.amount),
      transaction_date: t.transaction_date,
      reference_no:     t.reference_no || "",
    });
    setReceiptFile(t.receipt_url);
    setShowForm(true);
  };

  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const imageCompression = (await import("browser-image-compression")).default;
      const isImage = file.type.startsWith("image/");
      let uploadFile = file;
      if (isImage) {
        uploadFile = await imageCompression(file, {
          maxSizeMB: 0.5, maxWidthOrHeight: 1600,
          fileType: "image/webp", useWebWorker: true,
        });
      }
      const ext = isImage ? "webp" : "pdf";
      const fname = `receipt-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("receipts").upload(`financial/${fname}`, uploadFile, { upsert: true });
      if (!error) {
        const { data: urlData } = supabase.storage.from("receipts").getPublicUrl(`financial/${fname}`);
        setReceiptFile(urlData.publicUrl);
      } else {
        alert("Upload failed: " + error.message);
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    }
    setUploading(false);
  };

  const handleSave = async () => {
    if (!form.account_id || !form.category || !form.amount) {
      alert("Account, category, and amount are required.");
      return;
    }
    setSaving(true);
    setStatus("idle");
    const payload = {
      account_id:        form.account_id,
      direction:         form.direction,
      category:          form.category,
      description:       form.description || null,
      amount:            parseFloat(form.amount),
      transaction_date:  form.transaction_date,
      reference_no:      form.reference_no || null,
      receipt_url:       receiptFile || null,
      receipt_uploaded_at: receiptFile ? new Date().toISOString() : null,
      is_from_payments:  false,
    };
    if (editing) {
      const { error } = await supabase.from("financial_transactions").update(payload).eq("id", editing.id);
      if (error) { setStatus("error"); setSaving(false); return; }
    } else {
      const { error } = await supabase.from("financial_transactions").insert(payload);
      if (error) { setStatus("error"); setSaving(false); return; }
    }
    setStatus("saved");
    setTimeout(() => setStatus("idle"), 3000);
    setShowForm(false);
    setSaving(false);
    await load();
  };

  const handleDelete = async (t: Transaction) => {
    if (!confirm("Delete this transaction? This cannot be undone.")) return;
    await supabase.from("financial_transactions").delete().eq("id", t.id);
    await load();
  };

  const filtered = transactions.filter(t => {
    if (filterAcct !== "all" && t.account_id !== filterAcct) return false;
    if (filterDir  !== "all" && t.direction  !== filterDir)  return false;
    return true;
  });

  const totalIncome  = filtered.filter(t=>t.direction==="income").reduce((s,t)=>s+t.amount,0);
  const totalExpense = filtered.filter(t=>t.direction==="expense").reduce((s,t)=>s+t.amount,0);

  return (
    <div>
      {status === "saved" && (
        <div style={{ display:"flex", alignItems:"center", gap:10, background:"rgba(46,139,68,0.1)", border:"1px solid rgba(46,139,68,0.3)", borderRadius:8, padding:"0.85rem 1.2rem", marginBottom:"1.5rem" }}>
          <CheckCircle size={16} color="#2E8B44" />
          <p style={{ fontSize:"0.88rem", color:"#2E8B44", fontWeight:600 }}>Transaction saved.</p>
        </div>
      )}
      {status === "error" && (
        <div style={{ display:"flex", alignItems:"center", gap:10, background:"rgba(192,57,43,0.08)", border:"1px solid rgba(192,57,43,0.25)", borderRadius:8, padding:"0.85rem 1.2rem", marginBottom:"1.5rem" }}>
          <AlertTriangle size={16} color="#C0392B" />
          <p style={{ fontSize:"0.88rem", color:"#C0392B", fontWeight:600 }}>Save failed. Please try again.</p>
        </div>
      )}

      {/* Header + Add */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1.5rem" }}>
        <div>
          <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.1rem", fontWeight:700, color:"var(--green-dk)" }}>
            Manual Transactions
          </h2>
          <p style={{ fontSize:"0.75rem", color:"var(--muted)", marginTop:3 }}>
            Member payment collections are auto-fed from the payments system.
          </p>
        </div>
        {canCRUD && (
          <button onClick={openNew} style={{
            display:"flex", alignItems:"center", gap:6,
            background:"var(--gold)", color:"var(--green-dk)",
            border:"none", padding:"0.7rem 1.4rem", borderRadius:8,
            fontSize:"0.82rem", fontWeight:700, cursor:"pointer",
            fontFamily:"'DM Sans',sans-serif",
          }}>
            <Plus size={15} /> Add Transaction
          </button>
        )}
      </div>

      {/* Summary cards */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"1rem", marginBottom:"1.5rem" }}>
        {[
          { label:"Total Income (manual)", value: totalIncome,  color:"#2E8B44", icon: TrendingUp },
          { label:"Total Expenses",        value: totalExpense, color:"#C0392B", icon: TrendingDown },
          { label:"Net",                   value: totalIncome - totalExpense, color: totalIncome >= totalExpense ? "#2E8B44" : "#C0392B", icon: TrendingUp },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} style={{ background:"white", borderRadius:10, border:"1px solid rgba(26,92,42,0.08)", padding:"1rem 1.2rem" }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
              <Icon size={14} color={color} />
              <p style={{ fontSize:"0.65rem", fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", color:"var(--muted)" }}>{label}</p>
            </div>
            <p style={{ fontSize:"1.1rem", fontWeight:800, color }}>{peso(value)}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display:"flex", gap:"0.75rem", marginBottom:"1.2rem", alignItems:"center" }}>
        <Filter size={14} color="var(--muted)" />
        <select value={filterAcct} onChange={e=>setFilterAcct(e.target.value)}
          style={{ ...inputStyle, width:"auto", padding:"0.45rem 0.8rem", fontSize:"0.78rem" }}>
          <option value="all">All Accounts</option>
          {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <select value={filterDir} onChange={e=>setFilterDir(e.target.value)}
          style={{ ...inputStyle, width:"auto", padding:"0.45rem 0.8rem", fontSize:"0.78rem" }}>
          <option value="all">All Types</option>
          <option value="income">Income Only</option>
          <option value="expense">Expense Only</option>
        </select>
        <span style={{ fontSize:"0.72rem", color:"var(--muted)" }}>{filtered.length} transactions</span>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ padding:"3rem", textAlign:"center", color:"var(--muted)" }}>
          <RefreshCw size={20} style={{ marginBottom:8, opacity:0.4 }} />
          <p>Loading transactions...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ padding:"3rem", textAlign:"center", color:"var(--muted)", background:"rgba(26,92,42,0.03)", borderRadius:10, border:"1.5px dashed rgba(26,92,42,0.12)" }}>
          <p style={{ fontSize:"0.9rem", fontWeight:600 }}>No transactions found.</p>
          <p style={{ fontSize:"0.78rem", marginTop:4 }}>Add income or expense entries using the button above.</p>
        </div>
      ) : (
        <div style={{ background:"white", borderRadius:12, border:"1px solid rgba(26,92,42,0.08)", overflow:"hidden" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"0.82rem" }}>
            <thead>
              <tr style={{ background:"var(--green-dk)", color:"white" }}>
                {["Date","Account","Type","Category","Description","Reference","Amount","Receipt",""].map(h => (
                  <th key={h} style={{ padding:"0.75rem 1rem", textAlign:"left", fontSize:"0.65rem", fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", whiteSpace:"nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((t, i) => (
                <tr key={t.id} style={{ background: i%2===1 ? "var(--warm)" : "white", borderBottom:"1px solid rgba(26,92,42,0.05)" }}>
                  <td style={{ padding:"0.75rem 1rem", whiteSpace:"nowrap" }}>{fmtDate(t.transaction_date)}</td>
                  <td style={{ padding:"0.75rem 1rem" }}>
                    <div style={{ fontSize:"0.78rem", fontWeight:600, color:"var(--green-dk)" }}>{t.bank_accounts?.name}</div>
                    <div style={{ fontSize:"0.68rem", color:"var(--muted)" }}>{t.bank_accounts?.bank_name}</div>
                  </td>
                  <td style={{ padding:"0.75rem 1rem" }}>
                    <span style={{
                      display:"inline-flex", alignItems:"center", gap:4,
                      fontSize:"0.68rem", fontWeight:700, padding:"2px 8px", borderRadius:4,
                      background: t.direction==="income" ? "rgba(46,139,68,0.1)" : "rgba(192,57,43,0.1)",
                      color:      t.direction==="income" ? "#2E8B44" : "#C0392B",
                    }}>
                      {t.direction==="income" ? "+" : "−"} {t.direction.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding:"0.75rem 1rem" }}>{t.category}</td>
                  <td style={{ padding:"0.75rem 1rem", color:"var(--muted)", fontSize:"0.78rem" }}>{t.description || "—"}</td>
                  <td style={{ padding:"0.75rem 1rem", color:"var(--muted)", fontSize:"0.78rem" }}>{t.reference_no || "—"}</td>
                  <td style={{ padding:"0.75rem 1rem", fontWeight:700, whiteSpace:"nowrap",
                    color: t.direction==="income" ? "#2E8B44" : "#C0392B" }}>
                    {t.direction==="income" ? "+" : "−"}{peso(t.amount)}
                  </td>
                  <td style={{ padding:"0.75rem 1rem" }}>
                    {t.receipt_url
                      ? <a href={t.receipt_url} target="_blank" rel="noreferrer" style={{ fontSize:"0.72rem", color:"var(--green-dk)", textDecoration:"underline" }}>View</a>
                      : <span style={{ fontSize:"0.72rem", color:"var(--muted)" }}>—</span>
                    }
                  </td>
                  <td style={{ padding:"0.75rem 1rem" }}>
                    {canCRUD && !t.is_from_payments && (
                      <div style={{ display:"flex", gap:"0.4rem" }}>
                        <button onClick={() => openEdit(t)} style={{ background:"none", border:"1px solid rgba(26,92,42,0.2)", color:"var(--green-dk)", padding:"0.25rem 0.5rem", borderRadius:4, fontSize:"0.68rem", cursor:"pointer" }}>
                          <Edit3 size={10} />
                        </button>
                        <button onClick={() => handleDelete(t)} style={{ background:"none", border:"1px solid rgba(192,57,43,0.3)", color:"#C0392B", padding:"0.25rem 0.5rem", borderRadius:4, fontSize:"0.68rem", cursor:"pointer" }}>
                          <Trash2 size={10} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Form Modal ── */}
      {showForm && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:"2rem" }}>
          <div style={{ background:"white", borderRadius:14, maxWidth:560, width:"100%", maxHeight:"92vh", overflowY:"auto" }}>

            <div style={{ padding:"1.4rem 1.6rem", borderBottom:"1px solid rgba(26,92,42,0.08)", display:"flex", justifyContent:"space-between", alignItems:"center", background:"var(--green-dk)" }}>
              <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.1rem", color:"var(--gold)", fontWeight:700 }}>
                {editing ? "Edit Transaction" : "Add Transaction"}
              </h2>
              <button onClick={() => setShowForm(false)} style={{ background:"none", border:"none", color:"rgba(255,255,255,0.6)", cursor:"pointer" }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ padding:"1.6rem", display:"flex", flexDirection:"column", gap:"1.1rem" }}>

              {/* Direction */}
              <div>
                <label style={labelStyle}>Type *</label>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0.5rem" }}>
                  {(["income","expense"] as const).map(d => (
                    <button key={d} onClick={() => setForm(p => ({ ...p, direction: d, category: "" }))}
                      style={{
                        padding:"0.7rem", borderRadius:8, cursor:"pointer",
                        border:`2px solid ${form.direction===d ? (d==="income"?"#2E8B44":"#C0392B") : "rgba(26,92,42,0.12)"}`,
                        background: form.direction===d ? (d==="income"?"rgba(46,139,68,0.08)":"rgba(192,57,43,0.08)") : "white",
                        color: form.direction===d ? (d==="income"?"#2E8B44":"#C0392B") : "var(--muted)",
                        fontSize:"0.82rem", fontWeight:700, fontFamily:"'DM Sans',sans-serif",
                        display:"flex", alignItems:"center", justifyContent:"center", gap:6,
                      }}>
                      {d==="income" ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                      {d==="income" ? "Income (+)" : "Expense (−)"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Account */}
              <div>
                <label style={labelStyle}>Account *</label>
                <select style={inputStyle} value={form.account_id}
                  onChange={e => setForm(p => ({ ...p, account_id: e.target.value, category: "" }))}>
                  <option value="">Select account...</option>
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>{a.name} — {a.bank_name}</option>
                  ))}
                </select>
              </div>

              {/* Category */}
              <div>
                <label style={labelStyle}>Category *</label>
                <select style={inputStyle} value={form.category}
                  onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                  disabled={!form.account_id}>
                  <option value="">Select category...</option>
                  {cats.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* Description + Reference */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1rem" }}>
                <div>
                  <label style={labelStyle}>Description / Payee</label>
                  <input style={inputStyle} value={form.description}
                    placeholder="e.g. Juan dela Cruz"
                    onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
                </div>
                <div>
                  <label style={labelStyle}>Reference No.</label>
                  <input style={inputStyle} value={form.reference_no}
                    placeholder="e.g. OR-001, BC-001"
                    onChange={e => setForm(p => ({ ...p, reference_no: e.target.value }))} />
                </div>
              </div>

              {/* Amount + Date */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1rem" }}>
                <div>
                  <label style={labelStyle}>Amount (₱) *</label>
                  <input style={inputStyle} type="number" min={0} value={form.amount}
                    placeholder="0.00"
                    onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} />
                </div>
                <div>
                  <label style={labelStyle}>Date *</label>
                  <input style={inputStyle} type="date" value={form.transaction_date}
                    onChange={e => setForm(p => ({ ...p, transaction_date: e.target.value }))} />
                </div>
              </div>

              {/* Receipt upload */}
              <div>
                <label style={labelStyle}>Receipt / Supporting Document</label>
                <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,application/pdf"
                  onChange={handleReceiptUpload} style={{ display:"none" }} />
                <div style={{ display:"flex", alignItems:"center", gap:"0.75rem" }}>
                  <button onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    style={{
                      display:"flex", alignItems:"center", gap:6,
                      background:"var(--warm)", border:"1.5px solid rgba(26,92,42,0.2)",
                      color:"var(--green-dk)", padding:"0.5rem 1rem", borderRadius:6,
                      fontSize:"0.78rem", fontWeight:500, cursor: uploading ? "not-allowed" : "pointer",
                      fontFamily:"'DM Sans',sans-serif",
                    }}>
                    <Upload size={13} /> {uploading ? "Uploading..." : "Upload Receipt"}
                  </button>
                  {receiptFile && (
                    <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                      <a href={receiptFile} target="_blank" rel="noreferrer"
                        style={{ fontSize:"0.75rem", color:"var(--green-dk)", textDecoration:"underline" }}>
                        View uploaded
                      </a>
                      <button onClick={() => setReceiptFile(null)}
                        style={{ background:"none", border:"none", color:"#C0392B", cursor:"pointer" }}>
                        <X size={12} />
                      </button>
                    </div>
                  )}
                </div>
                <p style={{ fontSize:"0.68rem", color:"var(--muted)", marginTop:4 }}>
                  Images auto-compressed. Receipts auto-deleted after 1 year.
                </p>
              </div>

              {/* Buttons */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0.8rem", marginTop:"0.5rem" }}>
                <button onClick={() => setShowForm(false)} style={{
                  padding:"0.85rem", background:"white",
                  border:"1.5px solid rgba(26,92,42,0.15)",
                  color:"var(--muted)", borderRadius:8, fontSize:"0.85rem",
                  cursor:"pointer", fontFamily:"'DM Sans',sans-serif",
                }}>Cancel</button>
                <button onClick={handleSave} disabled={saving} style={{
                  padding:"0.85rem",
                  background: saving ? "rgba(201,168,76,0.5)" : "var(--gold)",
                  border:"none", color:"var(--green-dk)", borderRadius:8,
                  fontSize:"0.85rem", fontWeight:700,
                  cursor: saving ? "not-allowed" : "pointer",
                  fontFamily:"'DM Sans',sans-serif",
                }}>
                  {saving ? "Saving..." : editing ? "Update" : "Save Transaction"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
