// ─────────────────────────────────────────────
// reports/ImportPanel.tsx
//
// Excel/CSV import with progress log.
// Only shown when canCRUD is true.
// ─────────────────────────────────────────────
"use client";
import { useState } from "react";

interface Props {
  supabase: any;
  onImportComplete: () => void; // callback to refresh data after import
}

export default function ImportPanel({ supabase, onImportComplete }: Props) {
  const [importing, setImporting]   = useState(false);
  const [importLog, setImportLog]   = useState<string[]>([]);
  const [importFile, setImportFile] = useState<File | null>(null);

  const handleImport = async () => {
    if (!importFile) return;
    setImporting(true);
    setImportLog(["Starting import..."]);

    const XLSX = await import("xlsx");
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb   = XLSX.read(data, { type: "array" });
        const ws   = wb.Sheets[wb.SheetNames[0]];
        const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

        let imported = 0;
        let skipped  = 0;
        const logs: string[] = ["Reading file..."];

        // Find header row
        let startRow = 0;
        for (let i = 0; i < rows.length; i++) {
          if (rows[i]?.[1] && String(rows[i][1]).toLowerCase().includes("name")) {
            startRow = i + 1;
            break;
          }
        }

        logs.push(`Found data starting at row ${startRow + 1}`);
        setImportLog([...logs]);

        for (let i = startRow; i < rows.length; i++) {
          const row = rows[i];
          if (!row || !row[1]) continue;

          const fullName = String(row[1]).trim();
          if (!fullName || fullName === "NAME") continue;

          let firstName = "";
          let lastName  = "";

          if (fullName.includes(",")) {
            const parts = fullName.split(",");
            lastName  = parts[0].trim();
            firstName = parts[1]?.trim() || "";
          } else {
            const parts = fullName.split(" ");
            firstName = parts[0] || "";
            lastName  = parts.slice(1).join(" ") || "";
          }

          const status = String(row[2] || "").trim().toLowerCase();

          const { data: existing } = await supabase
            .from("members")
            .select("id")
            .ilike("last_name", lastName)
            .ilike("first_name", firstName)
            .single();

          let memberId = existing?.id;

          if (!existing) {
            const { data: newMember, error } = await supabase
              .from("members")
              .insert({
                first_name:      firstName,
                last_name:       lastName,
                status:          status === "deceased" ? "deceased" : "active",
                approval_status: "approved",
                date_joined:     "2022-01-01",
                email: `${firstName.toLowerCase().replace(/\s/g, "")}.${lastName
                  .toLowerCase()
                  .replace(/\s/g, "")}@sunco.member`,
              })
              .select("id")
              .single();

            if (error) {
              logs.push(`⚠ Skipped ${fullName}: ${error.message}`);
              skipped++;
              continue;
            }

            memberId = newMember.id;
            logs.push(`✓ Imported: ${fullName}`);
            imported++;
          } else {
            logs.push(`→ Exists: ${fullName}`);
          }

          // Import year payments
          const yearCols = [
            { year: 2022, amountCol: 4 },
            { year: 2023, amountCol: 6 },
            { year: 2024, amountCol: 8 },
            { year: 2025, amountCol: 10 },
          ];

          for (const { year, amountCol } of yearCols) {
            const amount = row[amountCol];
            if (amount && Number(amount) > 0) {
              const { data: ep } = await supabase
                .from("payments")
                .select("id")
                .eq("member_id", memberId)
                .eq("year", year)
                .eq("type", "mas")
                .single();

              if (!ep) {
                await supabase.from("payments").insert({
                  member_id: memberId,
                  year,
                  type:      "mas",
                  amount:    Number(amount),
                  date_paid: `${year}-01-01`,
                });
              }
            }
          }

          setImportLog([...logs]);
        }

        logs.push("━━━━━━━━━━━━━━━━━━━━━━━━");
        logs.push(`✅ Done! Imported: ${imported} · Skipped: ${skipped}`);
        setImportLog([...logs]);
        onImportComplete();
      } catch (err: any) {
        setImportLog((prev) => [...prev, `❌ Error: ${err.message}`]);
      }

      setImporting(false);
    };

    reader.readAsArrayBuffer(importFile);
  };

  return (
    <div
      style={{
        background: "white",
        borderRadius: 10,
        border: "1px solid rgba(26,92,42,0.08)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "1.2rem 1.5rem",
          borderBottom: "1px solid rgba(26,92,42,0.08)",
          background: "var(--warm)",
        }}
      >
        <h2
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "1rem",
            fontWeight: 700,
            color: "var(--green-dk)",
          }}
        >
          Import from Excel
        </h2>
        <p style={{ fontSize: "0.78rem", color: "var(--muted)", marginTop: "0.2rem" }}>
          Upload your existing SUNCO spreadsheet
        </p>
      </div>

      <div style={{ padding: "1.5rem" }}>
        {/* Drop zone */}
        <div
          style={{
            border: "2px dashed rgba(26,92,42,0.2)",
            borderRadius: 8,
            padding: "1.5rem",
            textAlign: "center",
            marginBottom: "1rem",
          }}
        >
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={(e) => setImportFile(e.target.files?.[0] || null)}
            style={{ display: "none" }}
            id="import-file"
          />
          <label htmlFor="import-file" style={{ cursor: "pointer" }}>
            <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📁</div>
            <div
              style={{
                fontSize: "0.85rem",
                fontWeight: 500,
                color: "var(--green-dk)",
                marginBottom: "0.3rem",
              }}
            >
              {importFile ? importFile.name : "Click to select file"}
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
              Supports .xlsx, .xls, .csv
            </div>
          </label>
        </div>

        {/* Import button */}
        {importFile && (
          <button
            onClick={handleImport}
            disabled={importing}
            style={{
              width: "100%",
              background: importing ? "var(--gold-dk)" : "var(--gold)",
              color: "var(--green-dk)",
              border: "none",
              padding: "0.85rem",
              borderRadius: 6,
              fontSize: "0.85rem",
              fontWeight: 500,
              cursor: importing ? "not-allowed" : "pointer",
              fontFamily: "'DM Sans', sans-serif",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              marginBottom: "1rem",
            }}
          >
            {importing ? "Importing..." : "Start Import"}
          </button>
        )}

        {/* Log console */}
        {importLog.length > 0 && (
          <div
            style={{
              background: "#0d1117",
              borderRadius: 6,
              padding: "1rem",
              maxHeight: 200,
              overflowY: "auto",
            }}
          >
            {importLog.map((log, i) => (
              <div
                key={i}
                style={{
                  fontSize: "0.75rem",
                  fontFamily: "monospace",
                  color: log.startsWith("✅")
                    ? "#2E8B44"
                    : log.startsWith("✓")
                    ? "#6bc46a"
                    : log.startsWith("⚠")
                    ? "#D4A017"
                    : log.startsWith("❌")
                    ? "#ff6b6b"
                    : "#8b949e",
                  marginBottom: 2,
                  lineHeight: 1.5,
                }}
              >
                {log}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
