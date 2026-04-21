"use client";
// ─────────────────────────────────────────────────────────────
// reports/ImportPanel.tsx  —  SUNCO Import with Review Screen
//
// Flow:
//   1. Admin uploads Excel file
//   2. File is parsed → shows REVIEW TABLE (nothing saved yet)
//   3. Admin can edit each payment: amount, type, date, year
//   4. Admin can flag/skip any row
//   5. Admin clicks "Confirm & Import" → only then does it save
//
// Replace: D:\suncowebsite\app\admin\_components\reports\ImportPanel.tsx
// ─────────────────────────────────────────────────────────────
import { useState, useCallback } from "react";
import { AlertTriangle, CheckCircle, XCircle, ChevronDown, ChevronUp, Upload, Eye } from "lucide-react";

interface Props {
  supabase: any;
  onImportComplete: () => void;
}

// ── Types for the staging data ────────────────────────────────
interface StagedPayment {
  year: number;
  date: string;
  amount: number;
  type: "mas" | "aof" | "lifetime";
  flag: string; // "" | "unusual_amount" | "bad_date" | "zero"
  skip: boolean;
}

interface StagedMember {
  id: string; // temp id for UI
  rowNum: number;
  rawName: string;
  firstName: string;
  lastName: string;
  status: string;
  payments: StagedPayment[];
  existsInDb: boolean | null; // null = not checked yet
  dbId: string | null;
  action: "create" | "update" | "skip";
  expanded: boolean;
}

// ── Amount flag logic ─────────────────────────────────────────
function flagAmount(amount: number, year: number): string {
  if (!amount || amount === 0) return "zero";
  if (amount > 2000) return "unusual_amount";
  // 440/490 are old valid amounts, 740 is current standard
  if (amount < 300) return "unusual_amount";
  return "";
}

function flagDate(dateStr: string, year: number): string {
  if (!dateStr || dateStr === "-") return "";
  const parsed = new Date(dateStr);
  if (isNaN(parsed.getTime())) return "bad_date";
  const parsedYear = parsed.getFullYear();
  if (Math.abs(parsedYear - year) > 3) return "bad_date"; // typo like 2124
  return "";
}

// ── Parse the Excel file into staged members ──────────────────
async function parseExcelFile(file: File): Promise<StagedMember[]> {
  const XLSX = await import("xlsx");
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(new Uint8Array(buffer), { type: "array", cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, dateNF: "yyyy-mm-dd" });

  // Find the header row (has "NAME" in col 1)
  let dataStart = 0;
  for (let i = 0; i < Math.min(rows.length, 20); i++) {
    const cell = String(rows[i]?.[1] || "").toLowerCase();
    if (cell.includes("name")) { dataStart = i + 1; break; }
  }

  // Year columns: each year has DATE col then AMOUNT col
  // Based on SUNCO file: cols 3-4 = 2022, 5-6 = 2023, 7-8 = 2024, 9-10 = 2025
  const YEAR_COLS: { year: number; dateCol: number; amtCol: number }[] = [
    { year: 2022, dateCol: 3, amtCol: 4 },
    { year: 2023, dateCol: 5, amtCol: 6 },
    { year: 2024, dateCol: 7, amtCol: 8 },
    { year: 2025, dateCol: 9, amtCol: 10 },
  ];

  const staged: StagedMember[] = [];

  for (let i = dataStart; i < rows.length; i++) {
    const row = rows[i];
    if (!row || !row[1]) continue;

    const rawName = String(row[1]).trim();
    if (!rawName || rawName.toUpperCase() === "NAME") continue;

    // Parse name — format is "LastName, FirstName MI." or "FirstName LastName"
    let firstName = "";
    let lastName = "";
    if (rawName.includes(",")) {
      const parts = rawName.split(",");
      lastName  = parts[0].trim();
      firstName = parts.slice(1).join(",").trim();
    } else {
      const parts = rawName.split(" ");
      firstName = parts[0].trim();
      lastName  = parts.slice(1).join(" ").trim();
    }

    const statusRaw = String(row[2] || "Active").trim();
    const status = statusRaw.toLowerCase() === "deceased" ? "deceased" : "active";

    // Parse payments for each year
    const payments: StagedPayment[] = [];
    for (const { year, dateCol, amtCol } of YEAR_COLS) {
      const rawAmt = row[amtCol];
      const amount = rawAmt ? Math.round(Number(String(rawAmt).replace(/[^0-9.]/g, "")) * 100) / 100 : 0;
      if (amount <= 0) continue;

      let dateStr = "-";
      const rawDate = row[dateCol];
      if (rawDate) {
        // Could be a Date object (from cellDates), a string, or Excel serial
        if (rawDate instanceof Date) {
          dateStr = rawDate.toISOString().split("T")[0];
        } else {
          const parsed = new Date(String(rawDate));
          if (!isNaN(parsed.getTime())) {
            dateStr = parsed.toISOString().split("T")[0];
          } else {
            dateStr = String(rawDate).trim() || "-";
          }
        }
        // Fix obvious year typos (e.g. 2124 → 2024)
        if (dateStr.startsWith("21") || dateStr.startsWith("20" + (year + 100).toString().slice(2))) {
          const fixedYear = year.toString();
          dateStr = fixedYear + dateStr.slice(4);
        }
      }

      const amtFlag = flagAmount(amount, year);
      const dateFlag = flagDate(dateStr, year);
      const flag = amtFlag || dateFlag;

      // Default type assignment:
      // 740 = mas, 100 = aof, 840 = mas+aof bundled (we split it)
      // For review: default everything to "mas", admin adjusts
      let type: "mas" | "aof" | "lifetime" = "mas";

      payments.push({ year, date: dateStr, amount, type, flag, skip: false });
    }

    staged.push({
      id: `staged-${i}`,
      rowNum: i + 1,
      rawName,
      firstName,
      lastName,
      status,
      payments,
      existsInDb: null,
      dbId: null,
      action: "create",
      expanded: false,
    });
  }

  return staged;
}

// ── Main Component ────────────────────────────────────────────
export default function ImportPanel({ supabase, onImportComplete }: Props) {
  const [step, setStep] = useState<"upload" | "review" | "importing" | "done">("upload");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [staged, setStaged] = useState<StagedMember[]>([]);
  const [importLog, setImportLog] = useState<string[]>([]);
  const [checkingDb, setCheckingDb] = useState(false);
  const [filterFlag, setFilterFlag] = useState<"all" | "flagged" | "new" | "exists">("all");

  // ── Step 1: Parse file ────────────────────────────────────
  const handleParse = async () => {
    if (!importFile) return;
    setParsing(true);
    try {
      const members = await parseExcelFile(importFile);
      setStaged(members);
      setStep("review");
    } catch (err: any) {
      alert("Error reading file: " + err.message);
    }
    setParsing(false);
  };

  // ── Step 1b: Check which members already exist in DB ─────
  const checkDatabase = async () => {
    setCheckingDb(true);
    const updated = [...staged];
    for (let i = 0; i < updated.length; i++) {
      const m = updated[i];
      const { data } = await supabase
        .from("members")
        .select("id")
        .ilike("last_name", m.lastName)
        .ilike("first_name", m.firstName)
        .single();
      updated[i] = {
        ...m,
        existsInDb: !!data,
        dbId: data?.id || null,
        action: data ? "update" : "create",
      };
    }
    setStaged(updated);
    setCheckingDb(false);
  };

  // ── Edit helpers ──────────────────────────────────────────
  const toggleExpand = (id: string) => {
    setStaged((prev) =>
      prev.map((m) => (m.id === id ? { ...m, expanded: !m.expanded } : m))
    );
  };

  const setMemberAction = (id: string, action: "create" | "update" | "skip") => {
    setStaged((prev) => prev.map((m) => (m.id === id ? { ...m, action } : m)));
  };

  const updatePayment = (
    memberId: string,
    paymentIdx: number,
    field: keyof StagedPayment,
    value: any
  ) => {
    setStaged((prev) =>
      prev.map((m) => {
        if (m.id !== memberId) return m;
        const payments = [...m.payments];
        payments[paymentIdx] = { ...payments[paymentIdx], [field]: value };
        return { ...m, payments };
      })
    );
  };

  const updateMemberName = (id: string, field: "firstName" | "lastName", value: string) => {
    setStaged((prev) =>
      prev.map((m) => (m.id === id ? { ...m, [field]: value } : m))
    );
  };

  // ── Step 3: Confirm and save to DB ───────────────────────
  const handleConfirmImport = async () => {
    setStep("importing");
    const logs: string[] = ["Starting confirmed import..."];
    setImportLog([...logs]);

    let created = 0, updated = 0, skipped = 0;

    for (const m of staged) {
      if (m.action === "skip") { skipped++; continue; }

      try {
        let memberId = m.dbId;

        if (m.action === "create") {
          const email = `${m.firstName.toLowerCase().replace(/\s/g, "")}.${m.lastName.toLowerCase().replace(/\s/g, "")}@sunco.member`;
          const { data: newMember, error } = await supabase
            .from("members")
            .insert({
              first_name:      m.firstName,
              last_name:       m.lastName,
              status:          m.status,
              approval_status: "approved",
              email,
            })
            .select("id")
            .single();

          if (error) {
            logs.push(`⚠ Skipped ${m.rawName}: ${error.message}`);
            skipped++;
            setImportLog([...logs]);
            continue;
          }
          memberId = newMember.id;
          created++;
          logs.push(`✓ Created: ${m.rawName}`);
        } else {
          updated++;
          logs.push(`→ Updating payments for: ${m.rawName}`);
        }

        // Insert payments that are not skipped
        for (const p of m.payments) {
          if (p.skip || p.amount <= 0) continue;

          // Check if payment already exists for this member/year/type
          const { data: existing } = await supabase
            .from("payments")
            .select("id")
            .eq("member_id", memberId)
            .eq("year", p.year)
            .eq("type", p.type)
            .single();

          if (!existing) {
            const datePaid = p.date && p.date !== "-" ? p.date : `${p.year}-01-01`;
            await supabase.from("payments").insert({
              member_id: memberId,
              year:      p.year,
              type:      p.type,
              amount:    p.amount,
              date_paid: datePaid,
            });
            logs.push(`  + ${p.year} ${p.type.toUpperCase()} ₱${p.amount}`);
          } else {
            logs.push(`  ~ ${p.year} ${p.type.toUpperCase()} already exists, skipped`);
          }
        }

        setImportLog([...logs]);
      } catch (err: any) {
        logs.push(`❌ Error on ${m.rawName}: ${err.message}`);
        setImportLog([...logs]);
      }
    }

    logs.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    logs.push(`✅ Done! Created: ${created}  Updated: ${updated}  Skipped: ${skipped}`);
    setImportLog([...logs]);
    setStep("done");
    onImportComplete();
  };

  // ── Stats for review header ───────────────────────────────
  const flaggedCount   = staged.filter((m) => m.payments.some((p) => p.flag && !p.skip)).length;
  const newCount       = staged.filter((m) => m.existsInDb === false).length;
  const existsCount    = staged.filter((m) => m.existsInDb === true).length;
  const toImportCount  = staged.filter((m) => m.action !== "skip").length;

  const filtered =
    filterFlag === "all"      ? staged :
    filterFlag === "flagged"  ? staged.filter((m) => m.payments.some((p) => p.flag)) :
    filterFlag === "new"      ? staged.filter((m) => m.existsInDb === false) :
                                staged.filter((m) => m.existsInDb === true);

  // ─────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────

  // ── UPLOAD STEP ──
  if (step === "upload") {
    return (
      <div style={{ background: "white", borderRadius: 10, border: "1px solid rgba(26,92,42,0.08)", overflow: "hidden" }}>
        <div style={{ padding: "1.2rem 1.5rem", borderBottom: "1px solid rgba(26,92,42,0.08)", background: "var(--warm)" }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1rem", fontWeight: 700, color: "var(--green-dk)" }}>
            Import from Excel
          </h2>
          <p style={{ fontSize: "0.78rem", color: "var(--muted)", marginTop: "0.2rem" }}>
            Upload your SUNCO treasurer spreadsheet — you will review everything before it saves.
          </p>
        </div>

        <div style={{ padding: "1.5rem" }}>
          <div style={{ border: "2px dashed rgba(26,92,42,0.2)", borderRadius: 8, padding: "2rem", textAlign: "center", marginBottom: "1rem", background: importFile ? "rgba(46,139,68,0.04)" : "transparent" }}>
            <input type="file" accept=".xlsx,.xls" onChange={(e) => setImportFile(e.target.files?.[0] || null)} style={{ display: "none" }} id="import-file" />
            <label htmlFor="import-file" style={{ cursor: "pointer" }}>
              <Upload size={32} color={importFile ? "var(--green-dk)" : "rgba(26,92,42,0.25)"} style={{ marginBottom: "0.7rem" }} />
              <div style={{ fontSize: "0.88rem", fontWeight: 500, color: "var(--green-dk)", marginBottom: "0.3rem" }}>
                {importFile ? `✓ ${importFile.name}` : "Click to select Excel file"}
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>Supports .xlsx and .xls</div>
            </label>
          </div>

          {importFile && (
            <button
              onClick={handleParse}
              disabled={parsing}
              style={{ width: "100%", background: "var(--gold)", color: "var(--green-dk)", border: "none", padding: "0.9rem", borderRadius: 6, fontSize: "0.85rem", fontWeight: 600, cursor: parsing ? "not-allowed" : "pointer", fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.06em", textTransform: "uppercase" }}
            >
              {parsing ? "Reading file..." : "📋 Preview & Review Before Import"}
            </button>
          )}

          <div style={{ marginTop: "1rem", padding: "0.9rem 1rem", background: "rgba(43,95,168,0.06)", border: "1px solid rgba(43,95,168,0.15)", borderRadius: 8 }}>
            <p style={{ fontSize: "0.78rem", color: "#2B5FA8", lineHeight: 1.6 }}>
              <strong>ℹ️ How this works:</strong> Your file is read and shown to you first. You can review each member's payments, fix amounts, assign payment types (MAS / AOF / Lifetime), and skip any rows. Nothing is saved until you click <strong>Confirm &amp; Import</strong>.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── DONE STEP ──
  if (step === "done") {
    return (
      <div style={{ background: "white", borderRadius: 10, border: "1px solid rgba(26,92,42,0.08)", overflow: "hidden" }}>
        <div style={{ padding: "1.2rem 1.5rem", borderBottom: "1px solid rgba(26,92,42,0.08)", background: "var(--warm)" }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1rem", fontWeight: 700, color: "var(--green-dk)" }}>Import Complete</h2>
        </div>
        <div style={{ padding: "1.5rem" }}>
          <div style={{ background: "#0d1117", borderRadius: 6, padding: "1rem", maxHeight: 280, overflowY: "auto", marginBottom: "1rem" }}>
            {importLog.map((log, i) => (
              <div key={i} style={{ fontSize: "0.75rem", fontFamily: "monospace", color: log.startsWith("✅") ? "#2E8B44" : log.startsWith("✓") ? "#6bc46a" : log.startsWith("⚠") || log.startsWith("~") ? "#D4A017" : log.startsWith("❌") ? "#ff6b6b" : log.startsWith("+") ? "#58a6ff" : "#8b949e", marginBottom: 2, lineHeight: 1.5 }}>
                {log}
              </div>
            ))}
          </div>
          <button onClick={() => { setStep("upload"); setImportFile(null); setStaged([]); setImportLog([]); }}
            style={{ width: "100%", background: "var(--gold)", color: "var(--green-dk)", border: "none", padding: "0.8rem", borderRadius: 6, fontSize: "0.85rem", fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
            Import Another File
          </button>
        </div>
      </div>
    );
  }

  // ── IMPORTING STEP ──
  if (step === "importing") {
    return (
      <div style={{ background: "white", borderRadius: 10, border: "1px solid rgba(26,92,42,0.08)", overflow: "hidden" }}>
        <div style={{ padding: "1.2rem 1.5rem", borderBottom: "1px solid rgba(26,92,42,0.08)", background: "var(--warm)" }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1rem", fontWeight: 700, color: "var(--green-dk)" }}>Saving to Database...</h2>
        </div>
        <div style={{ padding: "1.5rem" }}>
          <div style={{ background: "#0d1117", borderRadius: 6, padding: "1rem", maxHeight: 300, overflowY: "auto" }}>
            {importLog.map((log, i) => (
              <div key={i} style={{ fontSize: "0.75rem", fontFamily: "monospace", color: log.startsWith("✅") ? "#2E8B44" : log.startsWith("✓") ? "#6bc46a" : log.startsWith("⚠") ? "#D4A017" : log.startsWith("❌") ? "#ff6b6b" : log.startsWith("+") ? "#58a6ff" : "#8b949e", marginBottom: 2, lineHeight: 1.5 }}>
                {log}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── REVIEW STEP ──
  return (
    <div style={{ background: "white", borderRadius: 10, border: "1px solid rgba(26,92,42,0.08)", overflow: "hidden" }}>

      {/* Review Header */}
      <div style={{ padding: "1.2rem 1.5rem", borderBottom: "1px solid rgba(26,92,42,0.08)", background: "var(--warm)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.8rem" }}>
          <div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1rem", fontWeight: 700, color: "var(--green-dk)" }}>
              Review Import — {staged.length} Members Found
            </h2>
            <p style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: "0.2rem" }}>
              Check each member and their payments before confirming. Nothing has been saved yet.
            </p>
          </div>
          <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
            <button onClick={checkDatabase} disabled={checkingDb}
              style={{ padding: "0.5rem 1rem", background: "#2B5FA8", color: "white", border: "none", borderRadius: 6, fontSize: "0.75rem", fontWeight: 500, cursor: checkingDb ? "not-allowed" : "pointer", fontFamily: "'DM Sans', sans-serif" }}>
              {checkingDb ? "Checking..." : "🔍 Check vs Database"}
            </button>
            <button onClick={() => setStep("upload")}
              style={{ padding: "0.5rem 1rem", background: "#F5F5F5", color: "#555", border: "none", borderRadius: 6, fontSize: "0.75rem", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
              ← Back
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: "flex", gap: "0.8rem", marginTop: "1rem", flexWrap: "wrap" }}>
          {[
            { label: "Total", count: staged.length, color: "#555", filter: "all" as const },
            { label: "⚠ Flagged", count: flaggedCount, color: "#C0392B", filter: "flagged" as const },
            { label: "🆕 New", count: newCount, color: "#2E8B44", filter: "new" as const },
            { label: "Existing", count: existsCount, color: "#2B5FA8", filter: "exists" as const },
          ].map(({ label, count, color, filter }) => (
            <button key={filter} onClick={() => setFilterFlag(filter)}
              style={{ padding: "0.4rem 0.9rem", borderRadius: 20, border: `1.5px solid ${filterFlag === filter ? color : "rgba(0,0,0,0.1)"}`, background: filterFlag === filter ? color : "white", color: filterFlag === filter ? "white" : color, fontSize: "0.72rem", fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
              {label}: {count}
            </button>
          ))}
        </div>
      </div>

      {/* Member review list */}
      <div style={{ maxHeight: "60vh", overflowY: "auto" }}>
        {filtered.map((m) => {
          const hasFlagged = m.payments.some((p) => p.flag && !p.skip);
          const isSkipped  = m.action === "skip";

          return (
            <div key={m.id} style={{ borderBottom: "1px solid rgba(26,92,42,0.07)", opacity: isSkipped ? 0.5 : 1 }}>

              {/* Member row */}
              <div style={{ padding: "0.7rem 1.2rem", display: "flex", alignItems: "center", gap: "0.8rem", background: hasFlagged ? "rgba(255,243,205,0.6)" : "white", cursor: "pointer" }}
                onClick={() => toggleExpand(m.id)}>

                {/* Status icon */}
                <div style={{ flexShrink: 0 }}>
                  {hasFlagged
                    ? <AlertTriangle size={15} color="#D4A017" />
                    : m.existsInDb === true
                    ? <CheckCircle size={15} color="#2B5FA8" />
                    : m.existsInDb === false
                    ? <CheckCircle size={15} color="#2E8B44" />
                    : <div style={{ width: 15, height: 15, borderRadius: "50%", background: "rgba(0,0,0,0.1)" }} />}
                </div>

                {/* Name */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--green-dk)", margin: 0 }}>
                    {m.rawName}
                  </p>
                  <p style={{ fontSize: "0.7rem", color: "var(--muted)", margin: 0 }}>
                    {m.payments.filter(p => !p.skip).length} payment(s) &nbsp;·&nbsp;
                    {m.existsInDb === null ? "Not checked" : m.existsInDb ? "⬤ Exists in DB" : "⬤ New member"}
                    {hasFlagged && <span style={{ color: "#D4A017", marginLeft: 6 }}>⚠ Has flagged payments</span>}
                  </p>
                </div>

                {/* Action selector */}
                <div onClick={(e) => e.stopPropagation()}>
                  <select value={m.action} onChange={(e) => setMemberAction(m.id, e.target.value as any)}
                    style={{ fontSize: "0.72rem", padding: "3px 6px", border: "1.5px solid rgba(0,0,0,0.15)", borderRadius: 4, fontFamily: "'DM Sans', sans-serif", color: m.action === "skip" ? "#999" : m.action === "create" ? "#2E8B44" : "#2B5FA8", cursor: "pointer" }}>
                    <option value="create">✓ Create New</option>
                    <option value="update">↑ Add Payments Only</option>
                    <option value="skip">✕ Skip This Member</option>
                  </select>
                </div>

                {/* Expand icon */}
                <div style={{ flexShrink: 0, color: "var(--muted)" }}>
                  {m.expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </div>
              </div>

              {/* Expanded detail panel */}
              {m.expanded && (
                <div style={{ padding: "0.8rem 1.2rem 1.2rem", background: "rgba(249,247,242,0.6)", borderTop: "1px solid rgba(26,92,42,0.06)" }}>

                  {/* Name edit */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginBottom: "1rem" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "0.6rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "#AAA", marginBottom: 3 }}>First Name</label>
                      <input value={m.firstName} onChange={(e) => updateMemberName(m.id, "firstName", e.target.value)}
                        style={{ width: "100%", padding: "0.5rem 0.7rem", border: "1.5px solid rgba(26,92,42,0.15)", borderRadius: 5, fontSize: "0.82rem", fontFamily: "'DM Sans', sans-serif", outline: "none", boxSizing: "border-box" }} />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "0.6rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "#AAA", marginBottom: 3 }}>Last Name</label>
                      <input value={m.lastName} onChange={(e) => updateMemberName(m.id, "lastName", e.target.value)}
                        style={{ width: "100%", padding: "0.5rem 0.7rem", border: "1.5px solid rgba(26,92,42,0.15)", borderRadius: 5, fontSize: "0.82rem", fontFamily: "'DM Sans', sans-serif", outline: "none", boxSizing: "border-box" }} />
                    </div>
                  </div>

                  {/* Payments table */}
                  <p style={{ fontSize: "0.65rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)", marginBottom: "0.5rem" }}>Payments to Import</p>

                  {m.payments.length === 0 && (
                    <p style={{ fontSize: "0.78rem", color: "var(--muted)", fontStyle: "italic" }}>No payments found in file for this member.</p>
                  )}

                  {m.payments.map((p, idx) => (
                    <div key={idx} style={{ display: "grid", gridTemplateColumns: "60px 1fr 90px 120px 80px 32px", gap: "0.5rem", alignItems: "center", marginBottom: "0.5rem", padding: "0.5rem 0.7rem", background: p.flag && !p.skip ? "rgba(255,243,205,0.8)" : p.skip ? "rgba(0,0,0,0.04)" : "white", borderRadius: 6, border: `1px solid ${p.flag && !p.skip ? "rgba(212,160,23,0.3)" : "rgba(26,92,42,0.08)"}`, opacity: p.skip ? 0.5 : 1 }}>

                      {/* Year */}
                      <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--green-dk)" }}>{p.year}</span>

                      {/* Date */}
                      <div>
                        <input value={p.date} onChange={(e) => updatePayment(m.id, idx, "date", e.target.value)}
                          style={{ width: "100%", padding: "0.3rem 0.5rem", border: `1.5px solid ${p.flag === "bad_date" ? "#D4A017" : "rgba(26,92,42,0.15)"}`, borderRadius: 4, fontSize: "0.75rem", fontFamily: "'DM Sans', sans-serif", outline: "none", boxSizing: "border-box" }} />
                        {p.flag === "bad_date" && <p style={{ fontSize: "0.6rem", color: "#D4A017", margin: "2px 0 0" }}>⚠ Check date</p>}
                      </div>

                      {/* Amount */}
                      <div>
                        <input type="number" value={p.amount} onChange={(e) => updatePayment(m.id, idx, "amount", Number(e.target.value))}
                          style={{ width: "100%", padding: "0.3rem 0.5rem", border: `1.5px solid ${p.flag === "unusual_amount" ? "#D4A017" : "rgba(26,92,42,0.15)"}`, borderRadius: 4, fontSize: "0.75rem", fontFamily: "'DM Sans', sans-serif", outline: "none", boxSizing: "border-box" }} />
                        {p.flag === "unusual_amount" && <p style={{ fontSize: "0.6rem", color: "#D4A017", margin: "2px 0 0" }}>⚠ Unusual</p>}
                      </div>

                      {/* Type */}
                      <select value={p.type} onChange={(e) => updatePayment(m.id, idx, "type", e.target.value as any)}
                        style={{ padding: "0.3rem 0.4rem", border: "1.5px solid rgba(26,92,42,0.15)", borderRadius: 4, fontSize: "0.72rem", fontFamily: "'DM Sans', sans-serif", color: p.type === "mas" ? "#2E8B44" : p.type === "aof" ? "#2B5FA8" : "#6B3FA0", cursor: "pointer" }}>
                        <option value="mas">MAS</option>
                        <option value="aof">AOF (Operating)</option>
                        <option value="lifetime">Lifetime</option>
                      </select>

                      {/* Skip label */}
                      <span style={{ fontSize: "0.65rem", color: "var(--muted)", textAlign: "center" }}>
                        {p.skip ? "Skipped" : "Import"}
                      </span>

                      {/* Skip toggle */}
                      <button onClick={() => updatePayment(m.id, idx, "skip", !p.skip)}
                        style={{ width: 28, height: 28, border: "none", borderRadius: 4, background: p.skip ? "rgba(192,57,43,0.1)" : "rgba(26,92,42,0.08)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {p.skip
                          ? <XCircle size={14} color="#C0392B" />
                          : <CheckCircle size={14} color="#2E8B44" />}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Confirm footer */}
      <div style={{ padding: "1.2rem 1.5rem", borderTop: "1px solid rgba(26,92,42,0.1)", background: "var(--warm)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
        <p style={{ fontSize: "0.78rem", color: "var(--muted)" }}>
          Ready to import <strong style={{ color: "var(--green-dk)" }}>{toImportCount}</strong> member(s).&nbsp;
          {flaggedCount > 0 && <span style={{ color: "#D4A017" }}>⚠ {flaggedCount} have flagged payments — please review above.</span>}
        </p>
        <button onClick={handleConfirmImport}
          style={{ padding: "0.8rem 2rem", background: "var(--gold)", border: "none", borderRadius: 8, fontSize: "0.85rem", fontWeight: 700, color: "var(--green-dk)", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.05em", textTransform: "uppercase" }}>
          ✓ Confirm &amp; Import {toImportCount} Members
        </button>
      </div>
    </div>
  );
}
