// ─────────────────────────────────────────────────────────────
// financialReportPDF.ts — SUNCO Financial Report PDF Generator
// Page 1: Summary   Page 2+: Transaction Breakdown
// Place at: D:\suncowebsite\app\admin\_components\financial\financialReportPDF.ts
// ─────────────────────────────────────────────────────────────
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ── Org constants ─────────────────────────────────────────────
let ORG_NAME    = "Surigao del Norte Consumers Organization, Inc. (SUNCO)";
let ORG_SEC     = "SEC CN 2011-31-445";
let ORG_EMAIL   = "gabu.sacro@gmail.com";
let ORG_MOBILE  = "0946-365-7331";
let ORG_DTI     = "Accredited Partner — Department of Trade and Industry (DTI), Caraga Region";
let ORG_ADDRESS = "Surigao City, Surigao del Norte, Philippines";

// ── Colours ───────────────────────────────────────────────────
const GREEN_DK: [number,number,number] = [13, 51, 32];
const GOLD:     [number,number,number] = [201,168, 76];
const CREAM:    [number,number,number] = [245,237,216];
const GREEN_LT: [number,number,number] = [220,235,220];
const RED_LT:   [number,number,number] = [255,230,230];
const BLUE_LT:  [number,number,number] = [220,230,250];

// ── Layout constants ──────────────────────────────────────────
const PAGE_W  = 210;
const PAGE_H  = 297;
const MARGIN  = 14;
const HEADER_H = 42;

// Minimum space (mm) required at bottom of page before we force a break.
// SIG_SPACE: enough for "prepared by" label + 3 signature columns
const SIG_SPACE   = 52;
// MIN_SECTION: section header (13mm) + at least 2 ledger lines (12mm)
const MIN_SECTION = 28;
// MIN_TABLE: section banner (19mm) + table header + 1 data row (~22mm total)
const MIN_TABLE   = 22;

// ── Helpers ───────────────────────────────────────────────────
function peso(n: number): string {
  return `PHP ${Number(n || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;
}

function fmtDate(d: string): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-PH", {
    year: "numeric", month: "long", day: "numeric",
  });
}

function fmtDateTime(): string {
  return new Date().toLocaleDateString("en-PH", {
    year: "numeric", month: "long", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

async function loadLogo(): Promise<string | null> {
  try {
    const res = await fetch("/images/sunco-logo.png");
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise(resolve => {
      const r = new FileReader();
      r.onload  = () => resolve(r.result as string);
      r.onerror = () => resolve(null);
      r.readAsDataURL(blob);
    });
  } catch { return null; }
}

// ── Draw org header ───────────────────────────────────────────
async function drawHeader(
  doc: jsPDF,
  logoB64: string | null,
  subtitle: string
): Promise<number> {
  doc.setFillColor(...GREEN_DK);
  doc.rect(0, 0, PAGE_W, HEADER_H, "F");

  if (logoB64) {
    doc.addImage(logoB64, "PNG", 8, 5, 30, 30);
  } else {
    doc.setFillColor(...GOLD);
    doc.circle(19, 19, 11, "F");
    doc.setFontSize(13); doc.setFont("helvetica", "bold");
    doc.setTextColor(...GREEN_DK);
    doc.text("S", 15.5, 24);
  }

  const TX = 44;
  doc.setFontSize(10.5); doc.setFont("helvetica", "bold");
  doc.setTextColor(...GOLD);
  doc.text(ORG_NAME, TX, 10);

  doc.setFontSize(6.5); doc.setFont("helvetica", "normal");
  doc.setTextColor(200, 200, 200);
  doc.text(`${ORG_SEC}   |   ${ORG_DTI}`, TX, 16);
  doc.text(`${ORG_ADDRESS}   |   Email: ${ORG_EMAIL}   |   Mobile: ${ORG_MOBILE}`, TX, 21);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...GOLD);
  doc.text(subtitle, TX, 28);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(190, 190, 190);
  doc.text(`Generated: ${fmtDateTime()}`, TX, 34);

  return HEADER_H + 4; // first usable Y after header
}

// ── Draw signature block ──────────────────────────────────────
function drawSignatures(
  doc: jsPDF,
  y: number,
  officers: { treasurer: string; president: string; auditor: string }
): void {
  doc.setFontSize(7); doc.setFont("helvetica", "italic");
  doc.setTextColor(100, 100, 100);
  doc.text("Prepared and certified by:", MARGIN, y);

  const cols = [
    { name: officers.treasurer, title: "Treasurer" },
    { name: officers.president, title: "President" },
    { name: officers.auditor,   title: "Auditor"   },
  ];
  const colW = (PAGE_W - MARGIN * 2) / 3;

  cols.forEach(({ name, title }, i) => {
    const x  = MARGIN + i * colW;
    const cx = x + colW / 2;
    const ly = y + 14;

    doc.setDrawColor(...GREEN_DK);
    doc.setLineWidth(0.3);
    doc.line(x + 6, ly, x + colW - 6, ly);

    doc.setFont("helvetica", "bold"); doc.setFontSize(7.5);
    doc.setTextColor(...GREEN_DK);
    doc.text(name.toUpperCase(), cx, ly + 5, { align: "center" });

    doc.setFont("helvetica", "italic"); doc.setFontSize(6.5);
    doc.setTextColor(100, 100, 100);
    doc.text(title, cx, ly + 10, { align: "center" });

    doc.setFont("helvetica", "normal"); doc.setFontSize(6);
    doc.text(`Date: ${fmtDateTime()}`, cx, ly + 15, { align: "center" });
  });
}

// ── Ledger row ────────────────────────────────────────────────
function ledgerRow(
  doc: jsPDF,
  y: number,
  label: string,
  value: number,
  opts: {
    bold?: boolean;
    color?: [number, number, number];
    indent?: number;
    divider?: boolean;
  } = {}
): number {
  const { bold = false, color = GREEN_DK, indent = 0, divider = false } = opts;

  if (divider) {
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.2);
    doc.line(MARGIN, y, PAGE_W - MARGIN, y);
    y += 3;
  }

  doc.setFont("helvetica", bold ? "bold" : "normal");
  doc.setFontSize(8);
  doc.setTextColor(bold ? GREEN_DK[0] : 60, bold ? GREEN_DK[1] : 60, bold ? GREEN_DK[2] : 60);
  doc.text(label, MARGIN + indent, y);

  doc.setFont("helvetica", bold ? "bold" : "normal");
  doc.setTextColor(...color);
  doc.text(peso(value), PAGE_W - MARGIN, y, { align: "right" });

  return y + 5.5;
}

// ── Section banner (green or coloured header bar) ─────────────
function sectionBanner(
  doc: jsPDF,
  y: number,
  label: string,
  color: [number, number, number] = GREEN_DK
): number {
  doc.setFillColor(...color);
  doc.roundedRect(MARGIN, y, PAGE_W - MARGIN * 2, 8, 2, 2, "F");
  doc.setFontSize(7); doc.setFont("helvetica", "bold");
  doc.setTextColor(color === GREEN_DK ? GOLD[0] : 255, color === GREEN_DK ? GOLD[1] : 255, color === GREEN_DK ? GOLD[2] : 255);
  doc.text(label, MARGIN + 4, y + 5.5);
  return y + 11; // returns Y after banner
}

// ── Force page break if not enough room ───────────────────────
async function ensureSpace(
  doc: jsPDF,
  y: number,
  needed: number,
  logoB64: string | null,
  subtitle: string
): Promise<number> {
  if (y + needed > PAGE_H - MARGIN) {
    doc.addPage();
    return await drawHeader(doc, logoB64, subtitle);
  }
  return y;
}

// ═════════════════════════════════════════════════════════════
// MAIN EXPORT
// ═════════════════════════════════════════════════════════════
export async function generateFinancialReportPDF(snapshot: any, orgSettings?: Record<string, string>): Promise<void> {
  if (orgSettings) {
    if (orgSettings.org_name)    ORG_NAME    = orgSettings.org_name + " (SUNCO)";
    if (orgSettings.org_sec)     ORG_SEC     = orgSettings.org_sec;
    if (orgSettings.org_email)   ORG_EMAIL   = orgSettings.org_email;
    if (orgSettings.org_mobile)  ORG_MOBILE  = orgSettings.org_mobile;
    if (orgSettings.org_address) ORG_ADDRESS = orgSettings.org_address;
  }
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const logoB64 = await loadLogo();

  const {
    reportNo,
    periodFrom,
    periodTo,
    accounts = [],
    periodMas,
    periodAof,
    periodLifetime,
    allTimeMas,
    allTimeAof,
    allTimeLifetime,
    grandTotalAssets,
    officers = { treasurer: "___________", president: "___________", auditor: "___________" },
    lifetimeRows = [],
  } = snapshot;

  const TYPE_LABEL: Record<string, string> = {
    mas:  "MAS Account",
    aof:  "AOF / Operational Account",
    cash: "Cash on Hand / Petty Cash",
  };

  const tableStyles = {
    styles: { fontSize: 6.5, cellPadding: 1.8, font: "helvetica", overflow: "linebreak" as const },
    headStyles: {
      fillColor: GREEN_DK,
      textColor: 255,
      fontStyle: "bold" as const,
      halign: "center" as const,
      fontSize: 7,
    },
    alternateRowStyles: { fillColor: CREAM },
  };

  // ══════════════════════════════════════════════════════════
  // PAGE 1 — Summary
  // ══════════════════════════════════════════════════════════
  const subtitle1 = `FINANCIAL REPORT   |   ${reportNo}   |   Period: ${fmtDate(periodFrom)} — ${fmtDate(periodTo)}`;
  let y = await drawHeader(doc, logoB64, subtitle1);

  // Report info box
  doc.setFillColor(...CREAM);
  doc.roundedRect(MARGIN, y, PAGE_W - MARGIN * 2, 14, 3, 3, "F");
  doc.setFontSize(7.5); doc.setFont("helvetica", "bold");
  doc.setTextColor(...GREEN_DK);
  doc.text(`Report No: ${reportNo}`, MARGIN + 4, y + 5);
  doc.setFont("helvetica", "normal"); doc.setFontSize(7);
  doc.setTextColor(60, 60, 60);
  doc.text(`Period: ${fmtDate(periodFrom)} to ${fmtDate(periodTo)}`, MARGIN + 4, y + 10);
  doc.text(`Total Accounts: ${accounts.length}`, PAGE_W / 2, y + 5);
  doc.text(`Generated: ${fmtDateTime()}`, PAGE_W / 2, y + 10);
  y += 18;

  // ── Per-account ledger blocks ──────────────────────────────
  for (const s of accounts) {
    const acct = s.account;

    // Estimate height: banner (13) + opening (5.5) + lines + closing (8) + gap (4)
    const lineCount =
      1 + // opening balance
      (acct.account_type === "mas" || acct.account_type === "aof" ? 1 : 0) +
      Object.keys(s.incomeByCategory || {}).length +
      Object.keys(s.expenseByCategory || {}).length +
      1; // closing balance
    const estHeight = 13 + lineCount * 6 + 12;
    y = await ensureSpace(doc, y, estHeight, logoB64, subtitle1);

    // Section header banner
    const headerLine = `${TYPE_LABEL[acct.account_type] || acct.account_type}  —  ${acct.name}  (${acct.bank_name}${acct.account_number ? " · " + acct.account_number : ""})`;
    doc.setFillColor(...GREEN_DK);
    doc.roundedRect(MARGIN, y, PAGE_W - MARGIN * 2, 9, 2, 2, "F");
    doc.setFontSize(7.5); doc.setFont("helvetica", "bold");
    doc.setTextColor(...GOLD);
    doc.text(headerLine, MARGIN + 4, y + 6);
    y += 13;

    y = ledgerRow(doc, y, "Opening Balance", s.openingBalance, { bold: true });

    if (acct.account_type === "mas" || acct.account_type === "aof") {
      y = ledgerRow(doc, y,
        `(+) Member ${acct.account_type.toUpperCase()} Collections`,
        s.memberIncome,
        { color: [46, 139, 68], indent: 4 }
      );
    }

    for (const [cat, amt] of Object.entries(s.incomeByCategory || {})) {
      y = ledgerRow(doc, y, `(+) ${cat}`, amt as number, { color: [46, 139, 68], indent: 4 });
    }

    for (const [cat, amt] of Object.entries(s.expenseByCategory || {})) {
      y = ledgerRow(doc, y, `(−) ${cat}`, amt as number, { color: [192, 57, 43], indent: 4 });
    }

    y = ledgerRow(doc, y, "Closing Balance", s.closingBalance, {
      bold: true,
      divider: true,
      color: s.closingBalance >= 0 ? GREEN_DK : [192, 57, 43],
    });

    y += 4;
  }

  // ── Period collections summary ─────────────────────────────
  // Estimate: banner + 4 lines + note box if needed
  const periodNoteH = periodLifetime > 0 ? 14 : 0;
  const periodEst   = 13 + 4 * 6 + 8 + periodNoteH + MIN_SECTION;
  y = await ensureSpace(doc, y, periodEst, logoB64, subtitle1);

  y += 2;
  doc.setFillColor(...GREEN_DK);
  doc.roundedRect(MARGIN, y, PAGE_W - MARGIN * 2, 9, 2, 2, "F");
  doc.setFontSize(7.5); doc.setFont("helvetica", "bold");
  doc.setTextColor(...GOLD);
  doc.text(`PERIOD COLLECTIONS  —  ${fmtDate(periodFrom)} to ${fmtDate(periodTo)}`, MARGIN + 4, y + 6);
  y += 13;

  y = ledgerRow(doc, y, "MAS Collections (this period)",      periodMas,      { color: [46, 139, 68] });
  y = ledgerRow(doc, y, "AOF Collections (this period)",      periodAof,      { color: [43, 95, 168] });
  y = ledgerRow(doc, y, "Lifetime Collections (this period)", periodLifetime, { color: [107, 63, 160] });
  y = ledgerRow(doc, y, "Total Period Collections",
    periodMas + periodAof + periodLifetime,
    { bold: true, divider: true }
  );

  if (periodLifetime > 0) {
    y += 2;
    doc.setFillColor(255, 248, 220);
    doc.roundedRect(MARGIN, y, PAGE_W - MARGIN * 2, 10, 2, 2, "F");
    doc.setFontSize(6.5); doc.setFont("helvetica", "italic");
    doc.setTextColor(120, 90, 0);
    doc.text(
      `NOTE: Lifetime membership fees of ${peso(periodLifetime)} are shown for transparency. Allocation to be determined by the Board of Directors.`,
      MARGIN + 4, y + 4,
      { maxWidth: PAGE_W - MARGIN * 2 - 8 }
    );
    y += 14;
  }

  // ── All-time + Total Assets — keep these TWO sections together ──
  // Estimate combined height so we never split them across pages
  const allTimeLines  = 4;  // 3 type rows + 1 total
  const assetsLines   = accounts.length + 1; // 1 per account + grand total
  const combinedEst   = (13 + allTimeLines * 6 + 8) + 6 + (13 + assetsLines * 6 + 8);

  // If both sections + signatures won't fit, push everything to next page
  y = await ensureSpace(doc, y, combinedEst + SIG_SPACE + 10, logoB64, subtitle1);

  // ── All-time cumulative ────────────────────────────────────
  y += 4;
  doc.setFillColor(...GREEN_DK);
  doc.roundedRect(MARGIN, y, PAGE_W - MARGIN * 2, 9, 2, 2, "F");
  doc.setFontSize(7.5); doc.setFont("helvetica", "bold");
  doc.setTextColor(...GOLD);
  doc.text("ALL-TIME CUMULATIVE COLLECTIONS", MARGIN + 4, y + 6);
  y += 13;

  y = ledgerRow(doc, y, "Total MAS Collected (all time)",      allTimeMas,      { color: [46, 139, 68] });
  y = ledgerRow(doc, y, "Total AOF Collected (all time)",      allTimeAof,      { color: [43, 95, 168] });
  y = ledgerRow(doc, y, "Total Lifetime Collected (all time)", allTimeLifetime, { color: [107, 63, 160] });
  y = ledgerRow(doc, y, "Total All-Time Collections",
    allTimeMas + allTimeAof + allTimeLifetime,
    { bold: true, divider: true }
  );

  // ── Grand total assets ─────────────────────────────────────
  y += 6;
  doc.setFillColor(...GREEN_DK);
  doc.roundedRect(MARGIN, y, PAGE_W - MARGIN * 2, 9, 2, 2, "F");
  doc.setFontSize(7.5); doc.setFont("helvetica", "bold");
  doc.setTextColor(...GOLD);
  doc.text("TOTAL ASSETS — CLOSING BALANCES", MARGIN + 4, y + 6);
  y += 13;

  for (const s of accounts) {
    y = ledgerRow(doc, y,
      `${s.account.name} — ${s.account.bank_name}`,
      s.closingBalance,
      { color: s.closingBalance >= 0 ? GREEN_DK : [192, 57, 43] }
    );
  }

  y = ledgerRow(doc, y, "GRAND TOTAL ASSETS", grandTotalAssets, {
    bold: true,
    divider: true,
    color: grandTotalAssets >= 0 ? GREEN_DK : [192, 57, 43],
  });

  // ── Page 1 Signatures ──────────────────────────────────────
  // Place signatures immediately after content if there's room (≥ SIG_SPACE),
  // otherwise push to a fresh page.
  y += 8;
  if (y + SIG_SPACE > PAGE_H - MARGIN) {
    doc.addPage();
    y = MARGIN + 20;
  }
  drawSignatures(doc, y, officers);

  // ══════════════════════════════════════════════════════════
  // PAGE 2+ — Transaction Breakdown
  // ══════════════════════════════════════════════════════════
  doc.addPage();
  const subtitle2 = `TRANSACTION BREAKDOWN   |   ${reportNo}   |   ${fmtDate(periodFrom)} — ${fmtDate(periodTo)}`;
  y = await drawHeader(doc, logoB64, subtitle2);

  // Helper: draw a coloured section banner then an autoTable.
  // If there's not enough room for the banner + minimum table rows, page-break FIRST,
  // then draw banner, then draw table — so banner and table are always together.
  async function drawSection(
    label: string,
    color: [number, number, number],
    head: string[][],
    body: any[][],
    colStyles: any,
    totalRowIndex: number,
    totalColor: [number, number, number],
    totalBg: [number, number, number]
  ): Promise<void> {
    // Ensure banner + at least MIN_TABLE mm of table fit before starting
    y = await ensureSpace(doc, y, MIN_TABLE + 19, logoB64, subtitle2);

    // Banner
    doc.setFillColor(...color);
    doc.roundedRect(MARGIN, y, PAGE_W - MARGIN * 2, 8, 2, 2, "F");
    doc.setFontSize(7); doc.setFont("helvetica", "bold");
    doc.setTextColor(
      color === GREEN_DK ? GOLD[0] : 255,
      color === GREEN_DK ? GOLD[1] : 255,
      color === GREEN_DK ? GOLD[2] : 255
    );
    doc.text(label, MARGIN + 4, y + 5.5);
    y += 11;

    autoTable(doc, {
      startY: y,
      head,
      body,
      ...tableStyles,
      headStyles: {
        fillColor: color,
        textColor: 255,
        fontStyle: "bold",
        halign: "center",
        fontSize: 7,
      },
      columnStyles: colStyles,
      didParseCell: (data) => {
        if (data.row.index === totalRowIndex) {
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.fillColor = totalBg;
          data.cell.styles.textColor = totalColor;
        }
      },
      // Repeat header on each page so tables always have context
      showHead: "everyPage",
    });

    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // Member collection / expense column styles
  const memberCols = {
    0: { cellWidth: 10, halign: "center" as const },
    1: { cellWidth: 65 },
    2: { cellWidth: 35, halign: "center" as const },
    3: { cellWidth: 35, halign: "right" as const },
    4: { cellWidth: 30, halign: "center" as const },
  };

  const txnCols = {
    0: { cellWidth: 10, halign: "center" as const },
    1: { cellWidth: 50 },
    2: { cellWidth: 40 },
    3: { cellWidth: 30, halign: "center" as const },
    4: { cellWidth: 30, halign: "right" as const },
    5: { cellWidth: 25, halign: "center" as const },
  };

  // ── Per-account breakdown ──────────────────────────────────
  for (const s of accounts) {
    const acct = s.account;

    // Member collections
    if ((acct.account_type === "mas" || acct.account_type === "aof") && s.memberRows?.length > 0) {
      const memberBody = s.memberRows.map((p: any, idx: number) => {
        const name = p.members
          ? `${p.members.last_name}, ${p.members.first_name}${p.members.middle_name ? " " + p.members.middle_name[0] + "." : ""}`
          : "—";
        return [idx + 1, name, fmtDate(p.date_paid), peso(Number(p.amount)), p.receipt_number || "—"];
      });
      const memberTotal = s.memberRows.reduce((sum: number, p: any) => sum + Number(p.amount), 0);
      memberBody.push(["", "TOTAL", "", peso(memberTotal), ""] as any);

      await drawSection(
        `${acct.account_type.toUpperCase()} COLLECTIONS — ${acct.name}`,
        GREEN_DK,
        [["No.", "Member Name", "Date", "Amount", "OR No."]],
        memberBody,
        memberCols,
        memberBody.length - 1,
        GREEN_DK,
        GREEN_LT
      );
    }

    // Manual income
    if (s.incomeRows?.length > 0) {
      const incBody = s.incomeRows.map((t: any, idx: number) => [
        idx + 1, t.description || "—", t.category,
        fmtDate(t.transaction_date), peso(t.amount), t.reference_no || "—",
      ]);
      const incTotal = s.incomeRows.reduce((sum: number, t: any) => sum + t.amount, 0);
      incBody.push(["", "TOTAL", "", "", peso(incTotal), ""] as any);

      await drawSection(
        `MANUAL INCOME — ${acct.name}`,
        [43, 95, 168],
        [["No.", "Description", "Category", "Date", "Amount", "Reference"]],
        incBody,
        txnCols,
        incBody.length - 1,
        [43, 95, 168],
        BLUE_LT
      );
    }

    // Expenditures
    if (s.expenseRows?.length > 0) {
      const expBody = s.expenseRows.map((t: any, idx: number) => [
        idx + 1, t.description || "—", t.category,
        fmtDate(t.transaction_date), peso(t.amount), t.reference_no || "—",
      ]);
      const expTotal = s.expenseRows.reduce((sum: number, t: any) => sum + t.amount, 0);
      expBody.push(["", "TOTAL", "", "", peso(expTotal), ""] as any);

      await drawSection(
        `EXPENDITURES — ${acct.name}`,
        [160, 20, 20],
        [["No.", "Payee / Description", "Category", "Date", "Amount", "Reference"]],
        expBody,
        txnCols,
        expBody.length - 1,
        [160, 20, 20],
        RED_LT
      );
    }
  }

  // ── Lifetime breakdown ─────────────────────────────────────
  if (lifetimeRows?.length > 0) {
    const ltBody = lifetimeRows.map((p: any, idx: number) => {
      const name = p.members
        ? `${p.members.last_name}, ${p.members.first_name}${p.members.middle_name ? " " + p.members.middle_name[0] + "." : ""}`
        : "—";
      return [idx + 1, name, fmtDate(p.date_paid), peso(Number(p.amount)), p.receipt_number || "—"];
    });
    const ltTotal = lifetimeRows.reduce((sum: number, p: any) => sum + Number(p.amount), 0);
    ltBody.push(["", "TOTAL", "", peso(ltTotal), ""] as any);

    await drawSection(
      "LIFETIME MEMBERSHIP COLLECTIONS",
      [107, 63, 160],
      [["No.", "Member Name", "Date", "Amount", "OR No."]],
      ltBody,
      memberCols,
      ltBody.length - 1,
      [107, 63, 160],
      [235, 225, 250]
    );
  }

  // ── Transaction Breakdown Signatures ──────────────────────
  // Always keep signature block on same page as last table if room;
  // otherwise start a fresh page.
  y += 4;
  if (y + SIG_SPACE > PAGE_H - MARGIN) {
    doc.addPage();
    y = MARGIN + 20;
  }
  drawSignatures(doc, y, officers);

  // ── Page numbers ───────────────────────────────────────────
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(6.5);
    doc.setTextColor(150);
    doc.text(
      `Page ${i} of ${pageCount}   —   SUNCO CONFIDENTIAL   —   ${ORG_SEC}   —   ${reportNo}`,
      PAGE_W / 2,
      PAGE_H - 4,
      { align: "center" }
    );
  }

  doc.save(`${reportNo}.pdf`);
}
