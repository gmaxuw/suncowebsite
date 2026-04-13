"use client";
// ─────────────────────────────────────────────
// ReportsTab.tsx
// Handles: export Excel/CSV/PDF, import from Excel,
//          full records table with delinquency
// Accessible by: all officers and BOD (view)
//               admin/president/treasurer/secretary (import)
// ─────────────────────────────────────────────
import { useEffect, useState } from "react";
import { BarChart2 } from "lucide-react";

interface Props {
  canCRUD: boolean;
  supabase: any;
}

export default function ReportsTab({ canCRUD, supabase }: Props) {
  const [members, setMembers] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState("");
  const [importing, setImporting] = useState(false);
  const [importLog, setImportLog] = useState<string[]>([]);
  const [importFile, setImportFile] = useState<File | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data: m } = await supabase.from("members").select("*").order("last_name");
      const { data: p } = await supabase.from("payments").select("*");
      setMembers(m || []);
      setPayments(p || []);
      setLoading(false);
    };
    load();
  }, []);

  const buildRecords = () => {
    return members.map((m, i) => {
      const memberPayments = payments.filter(p => p.member_id === m.id);
      const currentYear = new Date().getFullYear();
      let consecutive = 0;
      let delinquentYears = 0;
      for (let y = 2022; y <= currentYear; y++) {
        const paid = memberPayments.some(p => p.year === y);
        if (!paid) { consecutive++; delinquentYears = Math.max(delinquentYears, consecutive); }
        else consecutive = 0;
      }
      return {
        no: i + 1,
        name: `${m.last_name}, ${m.first_name}${m.middle_name ? " " + m.middle_name[0] + "." : ""}`,
        status: m.status,
        member_id_code: m.member_id_code || "—",
        date_joined: m.date_joined || "—",
        payments: memberPayments.map(p => ({
          year: p.year,
          date: p.date_paid ? new Date(p.date_paid).toLocaleDateString("en-PH") : "—",
          amount: Number(p.amount),
          receipt: p.receipt_number || "—",
        })),
        years_delinquent: delinquentYears,
        total_amount: memberPayments.reduce((s, p) => s + Number(p.amount), 0),
      };
    });
  };

  const handleExport = async (type: string) => {
    setExporting(type);
    const { exportToCSV, exportToExcel, exportToPDF } = await import("@/utils/export");
    const records = buildRecords();
    const filename = `SUNCO-Records-${new Date().toISOString().split("T")[0]}`;
    if (type === "csv") exportToCSV(records, filename);
    if (type === "excel") exportToExcel(records, filename);
    if (type === "pdf") exportToPDF(records, filename);
    setExporting("");
  };

  const handleImport = async () => {
    if (!importFile) return;
    setImporting(true);
    setImportLog(["Starting import..."]);
    const XLSX = await import("xlsx");
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
        let imported = 0, skipped = 0;
        const logs: string[] = ["Reading file..."];
        let startRow = 0;
        for (let i = 0; i < rows.length; i++) {
          if (rows[i] && rows[i][1] && String(rows[i][1]).toLowerCase().includes("name")) {
            startRow = i + 1; break;
          }
        }
        logs.push(`Found data starting at row ${startRow + 1}`);
        setImportLog([...logs]);
        for (let i = startRow; i < rows.length; i++) {
          const row = rows[i];
          if (!row || !row[1]) continue;
          const fullName = String(row[1]).trim();
          if (!fullName || fullName === "NAME") continue;
          let firstName = "", lastName = "";
          if (fullName.includes(",")) {
            const parts = fullName.split(",");
            lastName = parts[0].trim();
            firstName = parts[1]?.trim() || "";
          } else {
            const parts = fullName.split(" ");
            firstName = parts[0] || "";
            lastName = parts.slice(1).join(" ") || "";
          }
          const status = String(row[2] || "").trim().toLowerCase();
          const { data: existing } = await supabase.from("members").select("id").ilike("last_name", lastName).ilike("first_name", firstName).single();
          let memberId = existing?.id;
          if (!existing) {
            const { data: newMember, error } = await supabase.from("members").insert({
              first_name: firstName, last_name: lastName,
              status: status === "deceased" ? "deceased" : "active",
              approval_status: "approved",
              date_joined: "2022-01-01",
              email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@sunco.member`.replace(/\s/g, ""),
            }).select("id").single();
            if (error) { logs.push(`⚠ Skipped ${fullName}: ${error.message}`); skipped++; continue; }
            memberId = newMember.id;
            logs.push(`✓ Imported: ${fullName}`);
            imported++;
          } else {
            logs.push(`→ Exists: ${fullName}`);
          }
          const yearCols = [
            { year: 2022, amountCol: 4 }, { year: 2023, amountCol: 6 },
            { year: 2024, amountCol: 8 }, { year: 2025, amountCol: 10 },
          ];
          for (const { year, amountCol } of yearCols) {
            const amount = row[amountCol];
            if (amount && Number(amount) > 0) {
              const { data: ep } = await supabase.from("payments").select("id").eq("member_id", memberId).eq("year", year).eq("type", "mas").single();
              if (!ep) await supabase.from("payments").insert({ member_id: memberId, year, type: "mas", amount: Number(amount), date_paid: `${year}-01-01` });
            }
          }
          setImportLog([...logs]);
        }
        logs.push(`━━━━━━━━━━━━━━━━━━━━━━━━`);
        logs.push(`✅ Done! Imported: ${imported} · Skipped: ${skipped}`);
        setImportLog([...logs]);
      } catch (err: any) {
        setImportLog(prev => [...prev, `❌ Error: ${err.message}`]);
      }
      setImporting(false);
    };
    reader.readAsArrayBuffer(importFile);
  };

  const statusColor: any = {
    active: "#2E8B44", "non-active": "#D4A017",
    dropped: "#C0392B", deceased: "#95A5A6",
  };

  const totalCollected = payments.reduce((s, p) => s + Number(p.amount), 0);

  if (loading) return (
    <div style={{ padding: "3rem", textAlign: "center", color: "var(--muted)" }}>Loading records...</div>
  );

  return (
    <div>
      {/* ── Header ── */}
      <div style={{ marginBottom: "2rem" }}>
        <p style={{ fontSize: "0.72rem", color: "var(--muted)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.3rem" }}>Admin Panel</p>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.8rem", fontWeight: 700, color: "var(--green-dk)" }}>Reports & Records</h1>
      </div>

      {/* ── Summary Cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "1.2rem", marginBottom: "2rem" }}>
        {[
          { label: "Total Collected", value: `₱${totalCollected.toLocaleString()}`, color: "var(--gold)" },
          { label: "Active Members", value: members.filter(m => m.status === "active").length, color: "#2E8B44" },
          { label: "Delinquent", value: members.filter(m => m.status === "non-active").length, color: "#D4A017" },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: "white", borderRadius: 10, padding: "1.3rem 1.5rem", border: "1px solid rgba(26,92,42,0.08)", borderLeft: `4px solid ${color}` }}>
            <p style={{ fontSize: "0.7rem", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)", marginBottom: "0.4rem" }}>{label}</p>
            <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.8rem", fontWeight: 700, color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* ── Export & Import ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "2rem" }}>

        {/* Export */}
        <div style={{ background: "white", borderRadius: 10, border: "1px solid rgba(26,92,42,0.08)", overflow: "hidden" }}>
          <div style={{ padding: "1.2rem 1.5rem", borderBottom: "1px solid rgba(26,92,42,0.08)", background: "var(--warm)" }}>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1rem", fontWeight: 700, color: "var(--green-dk)" }}>Export Records</h2>
            <p style={{ fontSize: "0.78rem", color: "var(--muted)", marginTop: "0.2rem" }}>Download all member and payment data</p>
          </div>
          <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "0.8rem" }}>
            {[
              { type: "excel", label: "Export to Excel (.xlsx)", icon: "📊", color: "#1A5C2A" },
              { type: "csv", label: "Export to CSV (.csv)", icon: "📋", color: "#1A3C6E" },
              { type: "pdf", label: "Export to PDF (.pdf)", icon: "📄", color: "#9A2020" },
            ].map(({ type, label, icon, color }) => (
              <button key={type} onClick={() => handleExport(type)} disabled={!!exporting}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "0.9rem 1.2rem", background: exporting === type ? "var(--warm)" : "white", border: `1.5px solid ${color}22`, borderRadius: 8, cursor: exporting ? "not-allowed" : "pointer", fontFamily: "'DM Sans', sans-serif", textAlign: "left" }}>
                <span style={{ fontSize: "1.2rem" }}>{icon}</span>
                <div>
                  <div style={{ fontSize: "0.85rem", fontWeight: 500, color }}>{exporting === type ? "Exporting..." : label}</div>
                  <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: 2 }}>{members.length} members · {payments.length} payments</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Import */}
        {canCRUD && (
          <div style={{ background: "white", borderRadius: 10, border: "1px solid rgba(26,92,42,0.08)", overflow: "hidden" }}>
            <div style={{ padding: "1.2rem 1.5rem", borderBottom: "1px solid rgba(26,92,42,0.08)", background: "var(--warm)" }}>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1rem", fontWeight: 700, color: "var(--green-dk)" }}>Import from Excel</h2>
              <p style={{ fontSize: "0.78rem", color: "var(--muted)", marginTop: "0.2rem" }}>Upload your existing SUNCO spreadsheet</p>
            </div>
            <div style={{ padding: "1.5rem" }}>
              <div style={{ border: "2px dashed rgba(26,92,42,0.2)", borderRadius: 8, padding: "1.5rem", textAlign: "center", marginBottom: "1rem" }}>
                <input type="file" accept=".xlsx,.xls,.csv" onChange={e => setImportFile(e.target.files?.[0] || null)} style={{ display: "none" }} id="import-file" />
                <label htmlFor="import-file" style={{ cursor: "pointer" }}>
                  <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📁</div>
                  <div style={{ fontSize: "0.85rem", fontWeight: 500, color: "var(--green-dk)", marginBottom: "0.3rem" }}>
                    {importFile ? importFile.name : "Click to select file"}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>Supports .xlsx, .xls, .csv</div>
                </label>
              </div>
              {importFile && (
                <button onClick={handleImport} disabled={importing}
                  style={{ width: "100%", background: importing ? "var(--gold-dk)" : "var(--gold)", color: "var(--green-dk)", border: "none", padding: "0.85rem", borderRadius: 6, fontSize: "0.85rem", fontWeight: 500, cursor: importing ? "not-allowed" : "pointer", fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "1rem" }}>
                  {importing ? "Importing..." : "Start Import"}
                </button>
              )}
              {importLog.length > 0 && (
                <div style={{ background: "#0d1117", borderRadius: 6, padding: "1rem", maxHeight: 200, overflowY: "auto" }}>
                  {importLog.map((log, i) => (
                    <div key={i} style={{ fontSize: "0.75rem", fontFamily: "monospace", color: log.startsWith("✅") ? "#2E8B44" : log.startsWith("✓") ? "#6bc46a" : log.startsWith("⚠") ? "#D4A017" : log.startsWith("❌") ? "#ff6b6b" : "#8b949e", marginBottom: 2, lineHeight: 1.5 }}>
                      {log}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Full Records Table ── */}
      <div style={{ background: "white", borderRadius: 10, border: "1px solid rgba(26,92,42,0.08)", overflow: "hidden" }}>
        <div style={{ padding: "1.2rem 1.5rem", borderBottom: "1px solid rgba(26,92,42,0.08)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1rem", fontWeight: 700, color: "var(--green-dk)" }}>
            All Records — {members.length} Members
          </h2>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            {["excel","csv","pdf"].map(type => (
              <button key={type} onClick={() => handleExport(type)}
                style={{ background: "none", border: "1px solid rgba(26,92,42,0.2)", color: "var(--green-dk)", padding: "0.3rem 0.8rem", borderRadius: 4, fontSize: "0.72rem", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                {type.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
            <thead>
              <tr style={{ background: "var(--green-dk)" }}>
                {["No.", "Name", "Status", "Member ID", "2022", "2023", "2024", "2025", "Delinquent", "Total"].map(h => (
                  <th key={h} style={{ padding: "0.8rem 1rem", textAlign: "left", fontSize: "0.68rem", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.8)", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {buildRecords().map((m, i) => (
                <tr key={i} style={{ borderBottom: "1px solid rgba(26,92,42,0.06)", background: i % 2 === 0 ? "white" : "var(--cream)" }}>
                  <td style={{ padding: "0.8rem 1rem", fontSize: "0.8rem", color: "var(--muted)" }}>{m.no}</td>
                  <td style={{ padding: "0.8rem 1rem", fontSize: "0.88rem", fontWeight: 500, color: "var(--green-dk)", whiteSpace: "nowrap" }}>{m.name}</td>
                  <td style={{ padding: "0.8rem 1rem" }}>
                    <span style={{ background: `${statusColor[m.status] || "#95A5A6"}22`, color: statusColor[m.status] || "#95A5A6", fontSize: "0.7rem", fontWeight: 500, padding: "2px 8px", borderRadius: 20, textTransform: "capitalize" }}>{m.status}</span>
                  </td>
                  <td style={{ padding: "0.8rem 1rem", fontSize: "0.75rem", color: "var(--muted)", fontFamily: "monospace" }}>{m.member_id_code}</td>
                  {[2022, 2023, 2024, 2025].map(year => {
                    const p = m.payments.find(p => p.year === year);
                    return (
                      <td key={year} style={{ padding: "0.8rem 1rem", fontSize: "0.8rem", background: !p ? "rgba(255,255,0,0.3)" : "transparent" }}>
                        {p ? <span style={{ color: "#2E8B44", fontWeight: 500 }}>₱{p.amount.toFixed(2)}</span> : <span style={{ color: "#C0392B", fontSize: "0.72rem" }}>—</span>}
                      </td>
                    );
                  })}
                  <td style={{ padding: "0.8rem 1rem", fontSize: "0.78rem", color: m.years_delinquent > 0 ? "#C0392B" : "var(--muted)", fontWeight: m.years_delinquent > 0 ? 500 : 400 }}>
                    {m.years_delinquent > 0 ? `${m.years_delinquent} yr(s)` : "—"}
                  </td>
                  <td style={{ padding: "0.8rem 1rem", fontSize: "0.88rem", fontWeight: 500, color: "var(--green-dk)" }}>₱{m.total_amount.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}