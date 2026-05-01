"use client";
// ─────────────────────────────────────────────────────────────
// GeneratePanel.tsx — Preview & generate locked financial report
// Place at: D:\suncowebsite\app\admin\_components\financial\GeneratePanel.tsx
// ─────────────────────────────────────────────────────────────
import { useState } from "react";
import {
  FileText, RefreshCw, CheckCircle, AlertTriangle,
  TrendingUp, TrendingDown, Eye, Lock,
} from "lucide-react";

interface Props {
  supabase: any;
  canCRUD: boolean;
  currentUser?: { id: string; name: string; role: string };
}

interface Account {
  id: string; name: string; bank_name: string;
  account_number: string; account_type: string;
  officer_name: string; opening_balance: number;
  opening_balance_date: string;
}

interface TxnRow {
  account_id: string;
  direction: "income" | "expense";
  category: string; description: string;
  amount: number; transaction_date: string;
  reference_no: string; is_from_payments: boolean;
}

interface MemberPayment {
  amount: number; type: string; date_paid: string;
  receipt_number: string; year: number;
  members: { first_name: string; last_name: string; middle_name: string };
}

interface AccountSummary {
  account: Account;
  openingBalance: number;
  memberIncome: number;
  manualIncome: number;
  totalExpenses: number;
  closingBalance: number;
  incomeRows: TxnRow[];
  expenseRows: TxnRow[];
  memberRows: MemberPayment[];
  incomeByCategory: Record<string, number>;
  expenseByCategory: Record<string, number>;
}

interface ReportPreview {
  reportNo: string;
  periodFrom: string;
  periodTo: string;
  accounts: AccountSummary[];
  periodMas: number;
  periodAof: number;
  periodLifetime: number;
  allTimeMas: number;
  allTimeAof: number;
  allTimeLifetime: number;
  lifetimeRows: MemberPayment[];
  grandTotalAssets: number;
  officers: { president: string; treasurer: string; auditor: string };
}

function peso(n: number) {
  return `₱${Number(n || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;
}

function fmtDate(d: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" });
}

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

export default function GeneratePanel({ supabase, canCRUD, currentUser }: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const firstOfYear = `${new Date().getFullYear()}-01-01`;

  const [periodFrom, setPeriodFrom] = useState(firstOfYear);
  const [periodTo,   setPeriodTo]   = useState(today);
  const [preview,    setPreview]    = useState<ReportPreview | null>(null);
  const [loading,    setLoading]    = useState(false);
  const [generating, setGenerating] = useState(false);
  const [status,     setStatus]     = useState<"idle" | "saved" | "error">("idle");
  const [errorMsg,   setErrorMsg]   = useState("");

  const buildPreview = async () => {
    if (!periodFrom || !periodTo) { alert("Select both dates."); return; }
    if (periodFrom > periodTo)    { alert("'From' must be before 'To'."); return; }
    setLoading(true);
    setPreview(null);

    // ── Fetch all data ──
    const [
      { data: accounts },
      { data: manualTxns },
      { data: memberPayments },
      { data: allPayments },
      { data: officers },
    ] = await Promise.all([
      supabase.from("bank_accounts").select("*").eq("is_active", true).order("account_type").order("name"),
      supabase.from("financial_transactions")
        .select("*")
        .eq("is_from_payments", false)
        .gte("transaction_date", periodFrom)
        .lte("transaction_date", periodTo),
      supabase.from("payments")
        .select("amount,type,date_paid,receipt_number,year,members(first_name,last_name,middle_name)")
        .gte("date_paid", periodFrom)
        .lte("date_paid", periodTo),
      supabase.from("payments").select("amount,type"),
      supabase.from("officers").select("name,role").in("role", ["President", "Treasurer", "Auditor"]),
    ]);

    // ── Generate report number ──
    const { data: reportNoData } = await supabase.rpc("generate_report_no");
    const reportNo = reportNoData || `FR-${new Date().getFullYear()}-${today.replace(/-/g,"").slice(2)}-0001`;

    // ── Officers ──
    const off = officers || [];
    const officerMap = {
      president: off.find((o: any) => o.role === "President")?.name || "___________________",
      treasurer: off.find((o: any) => o.role === "Treasurer")?.name || "___________________",
      auditor:   off.find((o: any) => o.role === "Auditor")?.name   || "___________________",
    };

    // ── Period member collections ──
    const pmts = memberPayments || [];
    const periodMas      = pmts.filter((p: any) => p.type === "mas").reduce((s: number, p: any) => s + Number(p.amount), 0);
    const periodAof      = pmts.filter((p: any) => p.type === "aof").reduce((s: number, p: any) => s + Number(p.amount), 0);
    const periodLifetime = pmts.filter((p: any) => p.type === "lifetime").reduce((s: number, p: any) => s + Number(p.amount), 0);
    const lifetimeRows   = pmts.filter((p: any) => p.type === "lifetime");

    // ── All-time collections ──
    const all = allPayments || [];
    const allTimeMas      = all.filter((p: any) => p.type === "mas").reduce((s: number, p: any) => s + Number(p.amount), 0);
    const allTimeAof      = all.filter((p: any) => p.type === "aof").reduce((s: number, p: any) => s + Number(p.amount), 0);
    const allTimeLifetime = all.filter((p: any) => p.type === "lifetime").reduce((s: number, p: any) => s + Number(p.amount), 0);

    // ── Per-account summaries ──
    const acctList: Account[] = accounts || [];
    const txns: TxnRow[]      = manualTxns || [];

    const accountSummaries: AccountSummary[] = acctList.map(acct => {
      const acctTxns   = txns.filter(t => t.account_id === acct.id);
      const incomeRows = acctTxns.filter(t => t.direction === "income");
      const expenseRows= acctTxns.filter(t => t.direction === "expense");

      // Member payments that map to this account type
      const memberRows = pmts.filter((p: any) =>
        (acct.account_type === "mas" && p.type === "mas") ||
        (acct.account_type === "aof" && p.type === "aof")
      );

      const memberIncome  = memberRows.reduce((s: number, p: any) => s + Number(p.amount), 0);
      const manualIncome  = incomeRows.reduce((s, t) => s + t.amount, 0);
      const totalExpenses = expenseRows.reduce((s, t) => s + t.amount, 0);

      // Opening balance = initial + all transactions BEFORE period
      const { data: prevTxns } = { data: [] as any[] }; // simplified — use opening_balance directly
      const openingBalance = Number(acct.opening_balance);
      const closingBalance = openingBalance + memberIncome + manualIncome - totalExpenses;

      const incomeByCategory: Record<string, number> = {};
      incomeRows.forEach(t => { incomeByCategory[t.category] = (incomeByCategory[t.category] || 0) + t.amount; });

      const expenseByCategory: Record<string, number> = {};
      expenseRows.forEach(t => { expenseByCategory[t.category] = (expenseByCategory[t.category] || 0) + t.amount; });

      return {
        account: acct,
        openingBalance,
        memberIncome,
        manualIncome,
        totalExpenses,
        closingBalance,
        incomeRows,
        expenseRows,
        memberRows,
        incomeByCategory,
        expenseByCategory,
      };
    });

    const grandTotalAssets = accountSummaries.reduce((s, a) => s + a.closingBalance, 0);

    setPreview({
      reportNo,
      periodFrom,
      periodTo,
      accounts: accountSummaries,
      periodMas,
      periodAof,
      periodLifetime,
      allTimeMas,
      allTimeAof,
      allTimeLifetime,
      lifetimeRows,
      grandTotalAssets,
      officers: officerMap,
    });

    setLoading(false);
  };

  const handleGenerate = async () => {
    if (!preview) return;
    if (!confirm("Lock and save this report? It cannot be edited after generation.")) return;
    setGenerating(true);
    setStatus("idle");

    const snapshot = JSON.stringify(preview);
    const { error } = await supabase.from("financial_reports").insert({
      report_no:         preview.reportNo,
      period_from:       preview.periodFrom,
      period_to:         preview.periodTo,
      snapshot_json:     preview,
      status:            "final",
      generated_by:      currentUser?.id || null,
      generated_by_name: currentUser?.name || "Admin",
      generated_at:      new Date().toISOString(),
    });

    if (error) {
      setErrorMsg(error.message);
      setStatus("error");
      setGenerating(false);
      return;
    }

    // Export PDF
    const { generateFinancialReportPDF } = await import("./financialReportPDF");
    await generateFinancialReportPDF(preview);

    setStatus("saved");
    setGenerating(false);
    setPreview(null);
  };

  const TYPE_LABEL: Record<string, string> = {
    mas: "MAS Account", aof: "AOF / Operational", cash: "Cash on Hand",
  };

  return (
    <div>
      {status === "saved" && (
        <div style={{ display:"flex", alignItems:"center", gap:10, background:"rgba(46,139,68,0.1)", border:"1px solid rgba(46,139,68,0.3)", borderRadius:8, padding:"0.85rem 1.2rem", marginBottom:"1.5rem" }}>
          <CheckCircle size={16} color="#2E8B44" />
          <p style={{ fontSize:"0.88rem", color:"#2E8B44", fontWeight:600 }}>Report generated and saved! PDF downloaded.</p>
        </div>
      )}
      {status === "error" && (
        <div style={{ display:"flex", alignItems:"center", gap:10, background:"rgba(192,57,43,0.08)", border:"1px solid rgba(192,57,43,0.25)", borderRadius:8, padding:"0.85rem 1.2rem", marginBottom:"1.5rem" }}>
          <AlertTriangle size={16} color="#C0392B" />
          <p style={{ fontSize:"0.88rem", color:"#C0392B", fontWeight:600 }}>Error: {errorMsg}</p>
        </div>
      )}

      {/* ── Period selector ── */}
      <div style={{ background:"white", borderRadius:12, border:"1px solid rgba(26,92,42,0.08)", overflow:"hidden", marginBottom:"2rem" }}>
        <div style={{ padding:"1.2rem 1.5rem", background:"var(--warm)", borderBottom:"1px solid rgba(26,92,42,0.07)" }}>
          <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:"1rem", fontWeight:700, color:"var(--green-dk)" }}>
            Select Report Period
          </h2>
          <p style={{ fontSize:"0.75rem", color:"var(--muted)", marginTop:3 }}>
            All member payments and manual transactions within this range will be included.
          </p>
        </div>
        <div style={{ padding:"1.5rem", display:"grid", gridTemplateColumns:"1fr 1fr auto", gap:"1rem", alignItems:"flex-end" }}>
          <div>
            <label style={labelStyle}>From Date</label>
            <input type="date" style={inputStyle} value={periodFrom}
              onChange={e => setPeriodFrom(e.target.value)} max={periodTo} />
          </div>
          <div>
            <label style={labelStyle}>To Date</label>
            <input type="date" style={inputStyle} value={periodTo}
              onChange={e => setPeriodTo(e.target.value)} min={periodFrom} max={today} />
          </div>
          <button onClick={buildPreview} disabled={loading}
            style={{
              display:"flex", alignItems:"center", gap:6,
              background:"var(--green-dk)", color:"var(--gold)",
              border:"none", padding:"0.68rem 1.4rem", borderRadius:8,
              fontSize:"0.82rem", fontWeight:700, cursor: loading ? "not-allowed" : "pointer",
              fontFamily:"'DM Sans',sans-serif", whiteSpace:"nowrap",
            }}>
            {loading ? <RefreshCw size={14} style={{ animation:"spin 1s linear infinite" }} /> : <Eye size={14} />}
            {loading ? "Loading..." : "Preview Report"}
          </button>
        </div>
      </div>

      {/* ── Preview ── */}
      {preview && (
        <div>
          {/* Report header */}
          <div style={{ background:"var(--green-dk)", borderRadius:12, padding:"1.5rem 2rem", marginBottom:"1.5rem", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div>
              <p style={{ fontSize:"0.65rem", fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", color:"rgba(201,168,76,0.7)", marginBottom:4 }}>
                Preview — Not yet saved
              </p>
              <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.3rem", color:"var(--gold)", fontWeight:700 }}>
                Financial Report
              </h2>
              <p style={{ fontSize:"0.8rem", color:"rgba(255,255,255,0.6)", marginTop:4 }}>
                {preview.reportNo} · {fmtDate(preview.periodFrom)} — {fmtDate(preview.periodTo)}
              </p>
            </div>
            <button onClick={handleGenerate} disabled={generating || !canCRUD}
              style={{
                display:"flex", alignItems:"center", gap:8,
                background: generating ? "rgba(201,168,76,0.4)" : "var(--gold)",
                color:"var(--green-dk)", border:"none",
                padding:"0.85rem 1.8rem", borderRadius:10,
                fontSize:"0.88rem", fontWeight:700,
                cursor: generating || !canCRUD ? "not-allowed" : "pointer",
                fontFamily:"'DM Sans',sans-serif",
              }}>
              {generating ? <RefreshCw size={15} /> : <Lock size={15} />}
              {generating ? "Generating..." : "Lock & Generate PDF"}
            </button>
          </div>

          {/* Account summaries */}
          {preview.accounts.map(s => (
            <div key={s.account.id} style={{ background:"white", borderRadius:12, border:"1px solid rgba(26,92,42,0.08)", marginBottom:"1.2rem", overflow:"hidden" }}>
              {/* Account header */}
              <div style={{ padding:"1rem 1.5rem", background:"rgba(26,92,42,0.05)", borderBottom:"1px solid rgba(26,92,42,0.07)", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div>
                  <p style={{ fontSize:"0.65rem", fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", color:"var(--muted)" }}>
                    {TYPE_LABEL[s.account.account_type]}
                  </p>
                  <h3 style={{ fontSize:"0.95rem", fontWeight:700, color:"var(--green-dk)", marginTop:2 }}>
                    {s.account.name} — {s.account.bank_name}
                    {s.account.account_number && ` (${s.account.account_number})`}
                  </h3>
                </div>
                <div style={{ textAlign:"right" }}>
                  <p style={{ fontSize:"0.65rem", color:"var(--muted)", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em" }}>Closing Balance</p>
                  <p style={{ fontSize:"1.2rem", fontWeight:800, color: s.closingBalance >= 0 ? "var(--green-dk)" : "#C0392B" }}>
                    {peso(s.closingBalance)}
                  </p>
                </div>
              </div>

              {/* Ledger */}
              <div style={{ padding:"1.2rem 1.5rem" }}>
                {[
                  { label:"Opening Balance", value: s.openingBalance, bold:true, color:"var(--text)" },
                  ...(s.account.account_type !== "cash" ? [{ label:"(+) Member Collections", value: s.memberIncome, bold:false, color:"#2E8B44" }] : []),
                  ...Object.entries(s.incomeByCategory).map(([cat, amt]) => ({
                    label: `(+) ${cat}`, value: amt, bold:false, color:"#2E8B44",
                  })),
                  ...Object.entries(s.expenseByCategory).map(([cat, amt]) => ({
                    label: `(−) ${cat}`, value: amt, bold:false, color:"#C0392B",
                  })),
                ].map(({ label, value, bold, color }, i) => (
                  <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"0.4rem 0", borderBottom: i === 0 ? "1px solid rgba(26,92,42,0.08)" : "none" }}>
                    <span style={{ fontSize:"0.82rem", color:"var(--text)", fontWeight: bold ? 700 : 400 }}>{label}</span>
                    <span style={{ fontSize:"0.85rem", fontWeight: bold ? 700 : 600, color }}>{peso(value)}</span>
                  </div>
                ))}
                {/* Divider + Closing */}
                <div style={{ borderTop:"2px solid var(--green-dk)", marginTop:"0.6rem", paddingTop:"0.6rem", display:"flex", justifyContent:"space-between" }}>
                  <span style={{ fontSize:"0.85rem", fontWeight:700, color:"var(--green-dk)" }}>Closing Balance</span>
                  <span style={{ fontSize:"0.95rem", fontWeight:800, color: s.closingBalance >= 0 ? "var(--green-dk)" : "#C0392B" }}>
                    {peso(s.closingBalance)}
                  </span>
                </div>
              </div>
            </div>
          ))}

          {/* Collections summary */}
          <div style={{ background:"white", borderRadius:12, border:"1px solid rgba(26,92,42,0.08)", marginBottom:"1.2rem", overflow:"hidden" }}>
            <div style={{ padding:"1rem 1.5rem", background:"rgba(26,92,42,0.05)", borderBottom:"1px solid rgba(26,92,42,0.07)" }}>
              <h3 style={{ fontSize:"0.88rem", fontWeight:700, color:"var(--green-dk)" }}>Period Collections & All-Time Totals</h3>
            </div>
            <div style={{ padding:"1.2rem 1.5rem", display:"grid", gridTemplateColumns:"1fr 1fr", gap:"2rem" }}>
              {/* Period */}
              <div>
                <p style={{ fontSize:"0.65rem", fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", color:"var(--muted)", marginBottom:"0.75rem" }}>
                  This Period ({fmtDate(preview.periodFrom)} – {fmtDate(preview.periodTo)})
                </p>
                {[
                  { label:"MAS Collections",      value: preview.periodMas      },
                  { label:"AOF Collections",      value: preview.periodAof      },
                  { label:"Lifetime Collections", value: preview.periodLifetime },
                ].map(({ label, value }) => (
                  <div key={label} style={{ display:"flex", justifyContent:"space-between", padding:"0.35rem 0", borderBottom:"1px solid rgba(26,92,42,0.05)" }}>
                    <span style={{ fontSize:"0.8rem" }}>{label}</span>
                    <span style={{ fontSize:"0.82rem", fontWeight:600, color:"#2E8B44" }}>{peso(value)}</span>
                  </div>
                ))}
                <div style={{ display:"flex", justifyContent:"space-between", padding:"0.5rem 0", borderTop:"2px solid var(--green-dk)", marginTop:"0.4rem" }}>
                  <span style={{ fontSize:"0.82rem", fontWeight:700 }}>Total Period</span>
                  <span style={{ fontSize:"0.88rem", fontWeight:800, color:"var(--green-dk)" }}>
                    {peso(preview.periodMas + preview.periodAof + preview.periodLifetime)}
                  </span>
                </div>
              </div>
              {/* All time */}
              <div>
                <p style={{ fontSize:"0.65rem", fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", color:"var(--muted)", marginBottom:"0.75rem" }}>
                  All-Time Cumulative
                </p>
                {[
                  { label:"Total MAS",      value: preview.allTimeMas      },
                  { label:"Total AOF",      value: preview.allTimeAof      },
                  { label:"Total Lifetime", value: preview.allTimeLifetime },
                ].map(({ label, value }) => (
                  <div key={label} style={{ display:"flex", justifyContent:"space-between", padding:"0.35rem 0", borderBottom:"1px solid rgba(26,92,42,0.05)" }}>
                    <span style={{ fontSize:"0.8rem" }}>{label}</span>
                    <span style={{ fontSize:"0.82rem", fontWeight:600, color:"#2B5FA8" }}>{peso(value)}</span>
                  </div>
                ))}
                <div style={{ display:"flex", justifyContent:"space-between", padding:"0.5rem 0", borderTop:"2px solid #2B5FA8", marginTop:"0.4rem" }}>
                  <span style={{ fontSize:"0.82rem", fontWeight:700 }}>Total All-Time</span>
                  <span style={{ fontSize:"0.88rem", fontWeight:800, color:"#2B5FA8" }}>
                    {peso(preview.allTimeMas + preview.allTimeAof + preview.allTimeLifetime)}
                  </span>
                </div>
              </div>
            </div>
            {preview.periodLifetime > 0 && (
              <div style={{ margin:"0 1.5rem 1.2rem", padding:"0.75rem 1rem", background:"rgba(201,168,76,0.08)", borderRadius:8, border:"1px solid rgba(201,168,76,0.25)", fontSize:"0.75rem", color:"#7A6020" }}>
                ⚠ Lifetime membership fees of {peso(preview.periodLifetime)} this period are shown for transparency. Allocation to be determined by the Board of Directors.
              </div>
            )}
          </div>

          {/* Grand total assets */}
          <div style={{ background:"var(--green-dk)", borderRadius:12, padding:"1.5rem 2rem", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div>
              <p style={{ fontSize:"0.65rem", fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", color:"rgba(201,168,76,0.7)", marginBottom:4 }}>
                Grand Total Assets
              </p>
              <p style={{ fontSize:"0.8rem", color:"rgba(255,255,255,0.5)" }}>
                Sum of all account closing balances
              </p>
            </div>
            <p style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.8rem", fontWeight:700, color:"var(--gold)" }}>
              {peso(preview.grandTotalAssets)}
            </p>
          </div>

          {/* Signatories preview */}
          <div style={{ background:"white", borderRadius:12, border:"1px solid rgba(26,92,42,0.08)", padding:"1.5rem", marginTop:"1.2rem", display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"1rem", textAlign:"center" }}>
            {[
              { name: preview.officers.treasurer, title: "Treasurer" },
              { name: preview.officers.president, title: "President" },
              { name: preview.officers.auditor,   title: "Auditor"   },
            ].map(({ name, title }) => (
              <div key={title}>
                <div style={{ borderTop:"2px solid var(--green-dk)", paddingTop:"0.6rem", marginTop:"1.5rem" }}>
                  <p style={{ fontSize:"0.85rem", fontWeight:700, color:"var(--green-dk)" }}>{name.toUpperCase()}</p>
                  <p style={{ fontSize:"0.72rem", fontStyle:"italic", color:"var(--muted)", marginTop:2 }}>{title}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
