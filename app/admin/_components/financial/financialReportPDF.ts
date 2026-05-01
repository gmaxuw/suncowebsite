// ─────────────────────────────────────────────────────────────
// financialReportPDF.ts — SUNCO Financial Report PDF Generator
// Page 1: Summary   Page 2: Transaction Breakdown
// Place at: D:\suncowebsite\app\admin\_components\financial\financialReportPDF.ts
// ─────────────────────────────────────────────────────────────
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ── Org constants ─────────────────────────────────────────────
const ORG_NAME    = "Surigao del Norte Consumers Organization, Inc. (SUNCO)";
const ORG_SEC     = "SEC CN 2011-31-445";
const ORG_EMAIL   = "gabu.sacro@gmail.com";
const ORG_MOBILE  = "0946-365-7331";
const ORG_DTI     = "Accredited Partner — Department of Trade and Industry (DTI), Caraga Region";
const ORG_ADDRESS = "Surigao City, Surigao del Norte, Philippines";

// ── Colours ───────────────────────────────────────────────────
const GREEN_DK: [number,number,number] = [13, 51, 32];
const GOLD:     [number,number,number] = [201,168, 76];
const CREAM:    [number,number,number] = [245,237,216];
const GREEN_LT: [number,number,number] = [220,235,220];
const RED_LT:   [number,number,number] = [255,230,230];
const BLUE_LT:  [number,number,number] = [220,230,250];

// ── Helpers ───────────────────────────────────────────────────
function peso(n: number): string {
  return `PHP ${Number(n||0).toLocaleString("en-PH", { minimumFractionDigits:2 })}`;
}

function fmtDate(d: string): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-PH", { year:"numeric", month:"long", day:"numeric" });
}

function fmtDateTime(): string {
  return new Date().toLocaleDateString("en-PH", {
    year:"numeric", month:"long", day:"numeric",
    hour:"2-digit", minute:"2-digit",
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

// ── Draw org header (used on both pages) ─────────────────────
async function drawHeader(doc: jsPDF, pageW: number, logoB64: string | null, subtitle: string): Promise<number> {
  const HEADER_H = 42;
  doc.setFillColor(...GREEN_DK);
  doc.rect(0, 0, pageW, HEADER_H, "F");

  // Logo
  if (logoB64) {
    doc.addImage(logoB64, "PNG", 8, 5, 30, 30);
  } else {
    doc.setFillColor(...GOLD);
    doc.circle(19, 19, 11, "F");
    doc.setFontSize(13); doc.setFont("helvetica","bold");
    doc.setTextColor(...GREEN_DK);
    doc.text("S", 15.5, 24);
  }

  const TX = 44;
  doc.setFontSize(10.5); doc.setFont("helvetica","bold");
  doc.setTextColor(...GOLD);
  doc.text(ORG_NAME, TX, 10);

  doc.setFontSize(6.5); doc.setFont("helvetica","normal");
  doc.setTextColor(200,200,200);
  doc.text(`${ORG_SEC}   |   ${ORG_DTI}`, TX, 16);
  doc.text(`${ORG_ADDRESS}   |   Email: ${ORG_EMAIL}   |   Mobile: ${ORG_MOBILE}`, TX, 21);

  doc.setFont("helvetica","bold");
  doc.setTextColor(...GOLD);
  doc.text(subtitle, TX, 28);

  doc.setFont("helvetica","normal");
  doc.setTextColor(190,190,190);
  doc.text(`Generated: ${fmtDateTime()}`, TX, 34);

  return HEADER_H + 4;
}

// ── Draw signature block ──────────────────────────────────────
function drawSignatures(
  doc: jsPDF, pageW: number, y: number,
  officers: { treasurer: string; president: string; auditor: string }
): void {
  doc.setFontSize(7); doc.setFont("helvetica","italic");
  doc.setTextColor(100,100,100);
  doc.text("Prepared and certified by:", 14, y);

  const cols = [
    { name: officers.treasurer, title: "Treasurer" },
    { name: officers.president, title: "President" },
    { name: officers.auditor,   title: "Auditor"   },
  ];
  const colW = (pageW - 28) / 3;

  cols.forEach(({ name, title }, i) => {
    const x  = 14 + i * colW;
    const cx = x + colW / 2;
    const ly = y + 14;

    doc.setDrawColor(...GREEN_DK);
    doc.setLineWidth(0.3);
    doc.line(x + 6, ly, x + colW - 6, ly);

    doc.setFont("helvetica","bold"); doc.setFontSize(7.5);
    doc.setTextColor(...GREEN_DK);
    doc.text(name.toUpperCase(), cx, ly + 4, { align:"center" });

    doc.setFont("helvetica","italic"); doc.setFontSize(6.5);
    doc.setTextColor(100,100,100);
    doc.text(title, cx, ly + 9, { align:"center" });

    doc.setFont("helvetica","normal"); doc.setFontSize(6);
    doc.text(`Date: ${fmtDateTime()}`, cx, ly + 14, { align:"center" });
  });
}

// ── Ledger row helper ─────────────────────────────────────────
function ledgerRow(
  doc: jsPDF, x: number, y: number, pageW: number,
  label: string, value: number,
  opts: { bold?:boolean; color?:[number,number,number]; indent?:number; divider?: boolean } = {}
): number {
  const { bold=false, color=GREEN_DK, indent=0, divider=false } = opts;
  if (divider) {
    doc.setDrawColor(100,100,100);
    doc.setLineWidth(0.2);
    doc.line(x, y, pageW - x, y);
    y += 2;
  }
  doc.setFont("helvetica", bold ? "bold" : "normal");
  doc.setFontSize(8);
  if (bold) { doc.setTextColor(...GREEN_DK); } else { doc.setTextColor(60, 60, 60); }
  doc.text(label, x + indent, y);
  doc.setFont("helvetica", bold ? "bold" : "normal");
  doc.setTextColor(...color);
  doc.text(peso(value), pageW - x, y, { align:"right" });
  return y + 5.5;
}

// ═════════════════════════════════════════════════════════════
// MAIN EXPORT
// ═════════════════════════════════════════════════════════════
export async function generateFinancialReportPDF(snapshot: any): Promise<void> {
  // A4 portrait
  const PAGE_W = 210;
  const PAGE_H = 297;
  const MARGIN = 14;

  const doc = new jsPDF({ orientation:"portrait", unit:"mm", format:"a4" });

  const logoB64 = await loadLogo();

  const {
    reportNo, periodFrom, periodTo,
    accounts = [],
    periodMas, periodAof, periodLifetime,
    allTimeMas, allTimeAof, allTimeLifetime,
    grandTotalAssets,
    officers = { treasurer:"___________", president:"___________", auditor:"___________" },
    lifetimeRows = [],
  } = snapshot;

  const TYPE_LABEL: Record<string,string> = {
    mas:"MAS Account", aof:"AOF / Operational Account", cash:"Cash on Hand / Petty Cash",
  };

  // ══════════════════════════════════════════════════════════
  // PAGE 1 — Summary
  // ══════════════════════════════════════════════════════════
  const subtitle1 = `FINANCIAL REPORT   |   ${reportNo}   |   Period: ${fmtDate(periodFrom)} — ${fmtDate(periodTo)}`;
  let y = await drawHeader(doc, PAGE_W, logoB64, subtitle1);

  // Report info box
  doc.setFillColor(...CREAM);
  doc.roundedRect(MARGIN, y, PAGE_W - MARGIN*2, 14, 3, 3, "F");
  doc.setFontSize(7.5); doc.setFont("helvetica","bold");
  doc.setTextColor(...GREEN_DK);
  doc.text(`Report No: ${reportNo}`, MARGIN+4, y+5);
  doc.setFont("helvetica","normal"); doc.setFontSize(7);
  doc.text(`Period: ${fmtDate(periodFrom)} to ${fmtDate(periodTo)}`, MARGIN+4, y+10);
  doc.text(`Total Accounts: ${accounts.length}`, PAGE_W/2, y+5);
  doc.text(`Generated: ${fmtDateTime()}`, PAGE_W/2, y+10);
  y += 18;

  // ── Per-account ledger ──
  for (const s of accounts) {
    const acct = s.account;

    // Section header
    doc.setFillColor(...GREEN_DK);
    doc.roundedRect(MARGIN, y, PAGE_W - MARGIN*2, 9, 2, 2, "F");
    doc.setFontSize(7.5); doc.setFont("helvetica","bold");
    doc.setTextColor(...GOLD);
    const headerLine = `${TYPE_LABEL[acct.account_type] || acct.account_type}  —  ${acct.name}  (${acct.bank_name}${acct.account_number ? " · " + acct.account_number : ""})`;
    doc.text(headerLine, MARGIN+4, y+6);
    y += 13;

    // Ledger lines
    y = ledgerRow(doc, MARGIN, y, PAGE_W, "Opening Balance", s.openingBalance, { bold:true });

    if (acct.account_type === "mas" || acct.account_type === "aof") {
      y = ledgerRow(doc, MARGIN, y, PAGE_W,
        `(+) Member ${acct.account_type.toUpperCase()} Collections`,
        s.memberIncome,
        { color:[46,139,68], indent:4 }
      );
    }

    // Manual income by category
    for (const [cat, amt] of Object.entries(s.incomeByCategory || {})) {
      y = ledgerRow(doc, MARGIN, y, PAGE_W, `(+) ${cat}`, amt as number, { color:[46,139,68], indent:4 });
    }

    // Expenses by category
    for (const [cat, amt] of Object.entries(s.expenseByCategory || {})) {
      y = ledgerRow(doc, MARGIN, y, PAGE_W, `(−) ${cat}`, amt as number, { color:[192,57,43], indent:4 });
    }

    // Closing balance
    y = ledgerRow(doc, MARGIN, y, PAGE_W, "Closing Balance", s.closingBalance,
      { bold:true, divider:true, color: s.closingBalance >= 0 ? GREEN_DK : [192,57,43] }
    );

    y += 4;

    // Page break check
    if (y > PAGE_H - 60) { doc.addPage(); y = await drawHeader(doc, PAGE_W, logoB64, subtitle1) + 4; }
  }

  // ── Period collections summary ──
  y += 2;
  doc.setFillColor(...GREEN_DK);
  doc.roundedRect(MARGIN, y, PAGE_W - MARGIN*2, 9, 2, 2, "F");
  doc.setFontSize(7.5); doc.setFont("helvetica","bold");
  doc.setTextColor(...GOLD);
  doc.text(`PERIOD COLLECTIONS  —  ${fmtDate(periodFrom)} to ${fmtDate(periodTo)}`, MARGIN+4, y+6);
  y += 13;

  y = ledgerRow(doc, MARGIN, y, PAGE_W, "MAS Collections (this period)",      periodMas,      { color:[46,139,68] });
  y = ledgerRow(doc, MARGIN, y, PAGE_W, "AOF Collections (this period)",      periodAof,      { color:[43,95,168] });
  y = ledgerRow(doc, MARGIN, y, PAGE_W, "Lifetime Collections (this period)",  periodLifetime, { color:[107,63,160] });
  y = ledgerRow(doc, MARGIN, y, PAGE_W, "Total Period Collections",
    periodMas + periodAof + periodLifetime, { bold:true, divider:true });

  if (periodLifetime > 0) {
    y += 2;
    doc.setFillColor(255,248,220);
    doc.roundedRect(MARGIN, y, PAGE_W - MARGIN*2, 10, 2, 2, "F");
    doc.setFontSize(6.5); doc.setFont("helvetica","italic");
    doc.setTextColor(120, 90, 0);
    doc.text(
      `NOTE: Lifetime membership fees of ${peso(periodLifetime)} are shown for transparency. Allocation to be determined by the Board of Directors.`,
      MARGIN+4, y+4, { maxWidth: PAGE_W - MARGIN*2 - 8 }
    );
    y += 14;
  }

  // Page break check
  if (y > PAGE_H - 70) { doc.addPage(); y = await drawHeader(doc, PAGE_W, logoB64, subtitle1) + 4; }

  // ── All-time cumulative ──
  y += 4;
  doc.setFillColor(...GREEN_DK);
  doc.roundedRect(MARGIN, y, PAGE_W - MARGIN*2, 9, 2, 2, "F");
  doc.setFontSize(7.5); doc.setFont("helvetica","bold");
  doc.setTextColor(...GOLD);
  doc.text("ALL-TIME CUMULATIVE COLLECTIONS", MARGIN+4, y+6);
  y += 13;

  y = ledgerRow(doc, MARGIN, y, PAGE_W, "Total MAS Collected (all time)",      allTimeMas,      { color:[46,139,68] });
  y = ledgerRow(doc, MARGIN, y, PAGE_W, "Total AOF Collected (all time)",      allTimeAof,      { color:[43,95,168] });
  y = ledgerRow(doc, MARGIN, y, PAGE_W, "Total Lifetime Collected (all time)",  allTimeLifetime, { color:[107,63,160] });
  y = ledgerRow(doc, MARGIN, y, PAGE_W, "Total All-Time Collections",
    allTimeMas + allTimeAof + allTimeLifetime, { bold:true, divider:true });

  // ── Grand total assets ──
  y += 6;
  doc.setFillColor(...GREEN_DK);
  doc.roundedRect(MARGIN, y, PAGE_W - MARGIN*2, 9, 2, 2, "F");
  doc.setFontSize(7.5); doc.setFont("helvetica","bold");
  doc.setTextColor(...GOLD);
  doc.text("TOTAL ASSETS — CLOSING BALANCES", MARGIN+4, y+6);
  y += 13;

  for (const s of accounts) {
    y = ledgerRow(doc, MARGIN, y, PAGE_W,
      `${s.account.name} — ${s.account.bank_name}`,
      s.closingBalance,
      { color: s.closingBalance >= 0 ? GREEN_DK : [192,57,43] }
    );
  }

  y = ledgerRow(doc, MARGIN, y, PAGE_W, "GRAND TOTAL ASSETS", grandTotalAssets,
    { bold:true, divider:true, color: grandTotalAssets >= 0 ? GREEN_DK : [192,57,43] }
  );

  // Signatures — page 1
  const sigY1 = Math.max(y + 10, PAGE_H - 50);
  if (sigY1 > PAGE_H - 45) { doc.addPage(); drawSignatures(doc, PAGE_W, 30, officers); }
  else { drawSignatures(doc, PAGE_W, sigY1, officers); }

  // ══════════════════════════════════════════════════════════
  // PAGE 2 — Transaction Breakdown
  // ══════════════════════════════════════════════════════════
  doc.addPage();
  const subtitle2 = `TRANSACTION BREAKDOWN   |   ${reportNo}   |   ${fmtDate(periodFrom)} — ${fmtDate(periodTo)}`;
  y = await drawHeader(doc, PAGE_W, logoB64, subtitle2);

  const tableStyles = {
    styles: { fontSize:6.5, cellPadding:1.8, font:"helvetica", overflow:"linebreak" as const },
    headStyles: { fillColor:GREEN_DK, textColor:255, fontStyle:"bold" as const, halign:"center" as const, fontSize:7 },
    alternateRowStyles: { fillColor:CREAM },
  };

  // ── Per account breakdown ──
  for (const s of accounts) {
    const acct = s.account;

    // ── Member collections ──
    if ((acct.account_type === "mas" || acct.account_type === "aof") && s.memberRows?.length > 0) {
      const sectionLabel = `${acct.account_type.toUpperCase()} COLLECTIONS — ${acct.name}`;
      doc.setFillColor(...GREEN_DK);
      doc.roundedRect(MARGIN, y, PAGE_W - MARGIN*2, 8, 2, 2, "F");
      doc.setFontSize(7); doc.setFont("helvetica","bold");
      doc.setTextColor(...GOLD);
      doc.text(sectionLabel, MARGIN+4, y+5.5);
      y += 11;

      const memberBody = s.memberRows.map((p: any, idx: number) => {
        const name = p.members
          ? `${p.members.last_name}, ${p.members.first_name}${p.members.middle_name ? " "+p.members.middle_name[0]+"." : ""}`
          : "—";
        return [
          idx + 1,
          name,
          fmtDate(p.date_paid),
          peso(Number(p.amount)),
          p.receipt_number || "—",
        ];
      });
      const memberTotal = s.memberRows.reduce((sum: number, p: any) => sum + Number(p.amount), 0);
      memberBody.push(["", "TOTAL", "", peso(memberTotal), ""] as any);

      autoTable(doc, {
        startY: y,
        head: [["No.", "Member Name", "Date", "Amount", "OR No."]],
        body: memberBody,
        ...tableStyles,
        columnStyles: {
          0: { cellWidth:10, halign:"center" },
          1: { cellWidth:65 },
          2: { cellWidth:35, halign:"center" },
          3: { cellWidth:35, halign:"right" },
          4: { cellWidth:30, halign:"center" },
        },
        didParseCell: (data) => {
          if (data.row.index === memberBody.length - 1) {
            data.cell.styles.fontStyle = "bold";
            data.cell.styles.fillColor = GREEN_LT;
            data.cell.styles.textColor = GREEN_DK;
          }
        },
      });
      y = (doc as any).lastAutoTable.finalY + 8;
    }

    // ── Manual income ──
    if (s.incomeRows?.length > 0) {
      const sectionLabel = `MANUAL INCOME — ${acct.name}`;
      doc.setFillColor(43,95,168);
      doc.roundedRect(MARGIN, y, PAGE_W - MARGIN*2, 8, 2, 2, "F");
      doc.setFontSize(7); doc.setFont("helvetica","bold");
      doc.setTextColor(255,255,255);
      doc.text(sectionLabel, MARGIN+4, y+5.5);
      y += 11;

      const incBody = s.incomeRows.map((t: any, idx: number) => [
        idx+1, t.description||"—", t.category,
        fmtDate(t.transaction_date), peso(t.amount), t.reference_no||"—",
      ]);
      const incTotal = s.incomeRows.reduce((sum: number, t: any) => sum + t.amount, 0);
      incBody.push(["","TOTAL","","",peso(incTotal),""] as any);

      autoTable(doc, {
        startY: y,
        head: [["No.","Description","Category","Date","Amount","Reference"]],
        body: incBody,
        ...tableStyles,
        headStyles: { fillColor:[43,95,168], textColor:255, fontStyle:"bold", halign:"center", fontSize:7 },
        columnStyles: {
          0: { cellWidth:10, halign:"center" },
          1: { cellWidth:50 },
          2: { cellWidth:40 },
          3: { cellWidth:30, halign:"center" },
          4: { cellWidth:30, halign:"right" },
          5: { cellWidth:25, halign:"center" },
        },
        didParseCell: (data) => {
          if (data.row.index === incBody.length - 1) {
            data.cell.styles.fontStyle = "bold";
            data.cell.styles.fillColor = BLUE_LT;
            data.cell.styles.textColor = [43,95,168];
          }
        },
      });
      y = (doc as any).lastAutoTable.finalY + 8;
    }

    // ── Expenditures ──
    if (s.expenseRows?.length > 0) {
      const sectionLabel = `EXPENDITURES — ${acct.name}`;
      doc.setFillColor(160,20,20);
      doc.roundedRect(MARGIN, y, PAGE_W - MARGIN*2, 8, 2, 2, "F");
      doc.setFontSize(7); doc.setFont("helvetica","bold");
      doc.setTextColor(255,255,255);
      doc.text(sectionLabel, MARGIN+4, y+5.5);
      y += 11;

      const expBody = s.expenseRows.map((t: any, idx: number) => [
        idx+1, t.description||"—", t.category,
        fmtDate(t.transaction_date), peso(t.amount), t.reference_no||"—",
      ]);
      const expTotal = s.expenseRows.reduce((sum: number, t: any) => sum + t.amount, 0);
      expBody.push(["","TOTAL","","",peso(expTotal),""] as any);

      autoTable(doc, {
        startY: y,
        head: [["No.","Payee / Description","Category","Date","Amount","Reference"]],
        body: expBody,
        ...tableStyles,
        headStyles: { fillColor:[160,20,20], textColor:255, fontStyle:"bold", halign:"center", fontSize:7 },
        columnStyles: {
          0: { cellWidth:10, halign:"center" },
          1: { cellWidth:50 },
          2: { cellWidth:40 },
          3: { cellWidth:30, halign:"center" },
          4: { cellWidth:30, halign:"right" },
          5: { cellWidth:25, halign:"center" },
        },
        didParseCell: (data) => {
          if (data.row.index === expBody.length - 1) {
            data.cell.styles.fontStyle = "bold";
            data.cell.styles.fillColor = RED_LT;
            data.cell.styles.textColor = [160,20,20];
          }
        },
      });
      y = (doc as any).lastAutoTable.finalY + 8;
    }

    // Page break between accounts
    if (y > PAGE_H - 40) { doc.addPage(); y = await drawHeader(doc, PAGE_W, logoB64, subtitle2) + 4; }
  }

  // ── Lifetime breakdown ──
  if (lifetimeRows?.length > 0) {
    doc.setFillColor(107,63,160);
    doc.roundedRect(MARGIN, y, PAGE_W - MARGIN*2, 8, 2, 2, "F");
    doc.setFontSize(7); doc.setFont("helvetica","bold");
    doc.setTextColor(255,255,255);
    doc.text("LIFETIME MEMBERSHIP COLLECTIONS", MARGIN+4, y+5.5);
    y += 11;

    const ltBody = lifetimeRows.map((p: any, idx: number) => {
      const name = p.members
        ? `${p.members.last_name}, ${p.members.first_name}${p.members.middle_name ? " "+p.members.middle_name[0]+"." : ""}`
        : "—";
      return [idx+1, name, fmtDate(p.date_paid), peso(Number(p.amount)), p.receipt_number||"—"];
    });
    const ltTotal = lifetimeRows.reduce((sum: number, p: any) => sum + Number(p.amount), 0);
    ltBody.push(["","TOTAL","",peso(ltTotal),""] as any);

    autoTable(doc, {
      startY: y,
      head: [["No.","Member Name","Date","Amount","OR No."]],
      body: ltBody,
      ...tableStyles,
      headStyles: { fillColor:[107,63,160], textColor:255, fontStyle:"bold", halign:"center", fontSize:7 },
      columnStyles: {
        0: { cellWidth:10, halign:"center" },
        1: { cellWidth:65 },
        2: { cellWidth:35, halign:"center" },
        3: { cellWidth:35, halign:"right" },
        4: { cellWidth:30, halign:"center" },
      },
      didParseCell: (data) => {
        if (data.row.index === ltBody.length - 1) {
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.fillColor = [235,225,250];
          data.cell.styles.textColor = [107,63,160];
        }
      },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // Signatures — page 2
  const sigY2 = Math.max(y + 10, PAGE_H - 50);
  if (sigY2 > PAGE_H - 45) { doc.addPage(); drawSignatures(doc, PAGE_W, 30, officers); }
  else { drawSignatures(doc, PAGE_W, sigY2, officers); }

  // ── Page numbers ──────────────────────────────────────────
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(6.5); doc.setTextColor(150);
    doc.text(
      `Page ${i} of ${pageCount}   —   SUNCO CONFIDENTIAL   —   ${ORG_SEC}   —   ${reportNo}`,
      PAGE_W / 2, PAGE_H - 4, { align:"center" }
    );
  }

  doc.save(`${reportNo}.pdf`);
}
