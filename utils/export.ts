// ─────────────────────────────────────────────────────────────
// utils/export.ts  —  SUNCO Export Utility  (FIXED v3)
//
// Changes in this version:
//  1. PDF: Real SUNCO logo from /images/sunco-logo.png
//  2. PDF: Treasurer + President + Auditor signature block
//  3. PDF: Officers pulled dynamically (names auto-update)
//  4. Excel: Full styling — green header, colored cells, bold rows
//  5. Delinquent amounts use fee_schedules rates (not payment history)
//
// Replace: D:\suncowebsite\utils\export.ts
// ─────────────────────────────────────────────────────────────
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ── Organisation constants ────────────────────────────────────
const ORG_NAME   = "Surigao del Norte Consumers Organization, Inc. (SUNCO)";
const ORG_SEC    = "SEC CN 2011-31-445";
const ORG_EMAIL  = "gabu.sacro@gmail.com";
const ORG_MOBILE = "0946-365-7331";
const ORG_DTI    =
  "Accredited Partner — Department of Trade and Industry (DTI), Caraga Region";

// ── Types ─────────────────────────────────────────────────────
export interface PaymentRecord {
  year: number;
  date: string;
  amount: number;
  receipt: string;
  type: string;
}

export interface MemberRecord {
  no: number;
  name: string;
  status: string;
  member_id_code: string;
  date_joined: string;
  payments: PaymentRecord[];
  years_delinquent: number;
  total_amount: number;
}

export interface FeeSchedule {
  year: number;
  fee_mas: number;
  fee_aof: number;
  fee_lifetime: number;
}

export interface OfficerRecord {
  name: string;
  role: string;
  role_type: string;
}

export type ActiveTab = "all" | "mas" | "aof" | "lifetime";

// ── Helpers ───────────────────────────────────────────────────
function joinYear(member: MemberRecord): number {
  const raw = String(member.date_joined || "").trim();
  const y = parseInt(raw.slice(0, 4), 10);
  return isNaN(y) ? 0 : y;
}

function currentYear(): number {
  return new Date().getFullYear();
}

function getAllYears(members: MemberRecord[]): number[] {
  const years = new Set<number>();
  years.add(currentYear());
  members.forEach((m) => {
    m.payments.forEach((p) => years.add(p.year));
    const jy = joinYear(m);
    if (jy > 0) years.add(jy);
  });
  return Array.from(years).sort();
}

function paymentsByYearType(
  payments: PaymentRecord[],
  year: number,
  type: string
): PaymentRecord[] {
  return payments.filter((p) => p.year === year && p.type === type);
}

function exportDate() {
  return new Date().toLocaleDateString("en-PH", {
    year: "numeric", month: "long", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function peso(amount: number) {
  return amount > 0
    ? `₱${amount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`
    : "—";
}

function pesoPDF(amount: number) {
  return amount > 0
    ? `PHP ${amount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`
    : "—";
}

// ── Fee schedule rate lookup ──────────────────────────────────
function getRate(
  feeSchedules: FeeSchedule[],
  year: number,
  type: "mas" | "aof" | "lifetime"
): number {
  const sorted = [...feeSchedules].sort((a, b) => b.year - a.year);
  for (const s of sorted) {
    if (s.year <= year) {
      if (type === "mas")      return s.fee_mas      || 0;
      if (type === "aof")      return s.fee_aof      || 0;
      if (type === "lifetime") return s.fee_lifetime || 0;
    }
  }
  return 0;
}

// ── Tab labels ────────────────────────────────────────────────
const TAB_LABELS: Record<ActiveTab, string> = {
  all:      "ALL PAYMENTS — Annual Records",
  mas:      "Mortuary Assistance Services (MAS) Payments",
  aof:      "AOF (Annual Operating Fund) Payments",
  lifetime: "Lifetime Membership Fees",
};

// ── Load logo as base64 for jsPDF ────────────────────────────
async function loadLogoBase64(): Promise<string | null> {
  try {
    const res = await fetch("/images/sunco-logo.png");
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload  = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

// ── Org header rows for Excel / CSV ──────────────────────────
function orgHeader(label: string): any[][] {
  return [
    [ORG_NAME],
    [ORG_SEC + "   |   " + ORG_DTI],
    ["Email: " + ORG_EMAIL + "   |   Mobile: " + ORG_MOBILE],
    [label],
    ["As of: " + exportDate()],
    [],
  ];
}

// ─────────────────────────────────────────────────────────────
// EXCEL — Fully styled
// ─────────────────────────────────────────────────────────────
export function exportToExcel(
  members: MemberRecord[],
  filename = "SUNCO-Records",
  activeTab: ActiveTab = "all",
  feeSchedules: FeeSchedule[] = [],
  officers: OfficerRecord[] = []
) {
  const wb   = XLSX.utils.book_new();
  const years = getAllYears(members);
  const type  = activeTab;

  const sheetNames: Record<ActiveTab, string> = {
    all: "All Payments", mas: "MAS Only",
    aof: "Operating Fund", lifetime: "Lifetime",
  };

  // ── ARGB colour constants ──
  const C_GREEN_DK = "FF0D3320";
  const C_GOLD     = "FFC9A84C";
  const C_CREAM    = "FFF5EDD8";
  const C_YELLOW   = "FFFFFDD2";
  const C_RED_LT   = "FFFFE6E6";
  const C_RED_DK   = "FF8C0000";
  const C_GREEN_TOT= "FFDCEBDC";
  const C_GREY_NA  = "FFDCDCDC";
  const C_WHITE    = "FFFFFFFF";

  const fill = (argb: string) => ({
    type: "pattern" as const, pattern: "solid" as const,
    fgColor: { argb },
  });

  const thinBorder = {
    top:    { style: "thin" as const, color: { argb: "FFB0B0B0" } },
    bottom: { style: "thin" as const, color: { argb: "FFB0B0B0" } },
    left:   { style: "thin" as const, color: { argb: "FFB0B0B0" } },
    right:  { style: "thin" as const, color: { argb: "FFB0B0B0" } },
  };

  // ── Build raw data rows ──
  const rows: any[][] = [...orgHeader(TAB_LABELS[type])];
  const ORG_ROW_COUNT = 6;

  const header: any[] = ["NO.", "NAME", "STATUS", "MEMBER ID", "DATE JOINED"];
  if (type === "all") {
    years.forEach((yr) =>
      header.push(`${yr} MAS DATE`, `${yr} MAS AMT`, `${yr} AOF DATE`, `${yr} AOF AMT`)
    );
  } else {
    years.forEach((yr) => header.push(`${yr} DATE`, `${yr} AMOUNT`));
  }
  header.push("YRS DELINQUENT", "TOTAL PAID");
  rows.push(header);

  members.forEach((m) => {
    const jy = joinYear(m);
    const row: any[] = [m.no, m.name, m.status, m.member_id_code, m.date_joined];
    years.forEach((yr) => {
      if (jy > 0 && yr < jy) {
        if (type === "all") row.push("N/A", "N/A", "N/A", "N/A");
        else row.push("N/A", "N/A");
        return;
      }
      if (type === "all") {
        const mas = paymentsByYearType(m.payments, yr, "mas")[0];
        const aof = paymentsByYearType(m.payments, yr, "aof")[0];
        row.push(mas?.date || "", mas?.amount || "", aof?.date || "", aof?.amount || "");
      } else {
        const p = paymentsByYearType(m.payments, yr, type)[0];
        row.push(p?.date || "", p?.amount || "");
      }
    });
    const filteredTotal = type === "all"
      ? m.total_amount
      : m.payments.filter((p) => p.type === type).reduce((s, p) => s + p.amount, 0);
    row.push(
      m.years_delinquent > 0 ? `${m.years_delinquent} yr(s)` : "Paid",
      filteredTotal || ""
    );
    rows.push(row);
  });

  // Totals
  const totalsRow: any[] = ["", "TOTAL COLLECTED", "", "", ""];
  years.forEach((yr) => {
    if (type === "all") {
      const mT = members.reduce((s, m) => s + (paymentsByYearType(m.payments, yr, "mas")[0]?.amount || 0), 0);
      const aT = members.reduce((s, m) => s + (paymentsByYearType(m.payments, yr, "aof")[0]?.amount || 0), 0);
      totalsRow.push("", mT || "", "", aT || "");
    } else {
      const yT = members.reduce((s, m) => s + (paymentsByYearType(m.payments, yr, type)[0]?.amount || 0), 0);
      totalsRow.push("", yT || "");
    }
  });
  const grandTotal = members.reduce((s, m) =>
    type === "all" ? s + m.total_amount
      : s + m.payments.filter((p) => p.type === type).reduce((ss, p) => ss + p.amount, 0), 0);
  totalsRow.push("", grandTotal);
  rows.push(totalsRow);
  rows.push([]);

  // Delinquent rows
  const dCountRow: any[] = ["", "DELINQUENT MEMBERS (#)", "", "", ""];
  const dAmtRow: any[]   = ["", "DELINQUENT AMOUNT OWED", "", "", ""];
  years.forEach((yr) => {
    if (type === "all") {
      let cM = 0, cA = 0, aM = 0, aA = 0;
      members.forEach((m) => {
        const jy = joinYear(m);
        if (jy > 0 && yr < jy) return;
        if (!paymentsByYearType(m.payments, yr, "mas")[0]) { cM++; aM += getRate(feeSchedules, yr, "mas"); }
        if (!paymentsByYearType(m.payments, yr, "aof")[0]) { cA++; aA += getRate(feeSchedules, yr, "aof"); }
      });
      dCountRow.push("", cM || "", "", cA || "");
      dAmtRow.push("", aM || "", "", aA || "");
    } else {
      let cnt = 0, amt = 0;
      members.forEach((m) => {
        const jy = joinYear(m);
        if (jy > 0 && yr < jy) return;
        if (!paymentsByYearType(m.payments, yr, type)[0]) {
          cnt++; amt += getRate(feeSchedules, yr, type as "mas" | "aof" | "lifetime");
        }
      });
      dCountRow.push("", cnt || "");
      dAmtRow.push("", amt || "");
    }
  });
  let grandDelinq = 0;
  members.forEach((m) => {
    const jy = joinYear(m);
    const tl = type === "all" ? (["mas", "aof"] as const) : ([type] as const);
    getAllYears(members).forEach((yr) => {
      if (jy > 0 && yr < jy) return;
      tl.forEach((t) => {
        if (!paymentsByYearType(m.payments, yr, t)[0])
          grandDelinq += getRate(feeSchedules, yr, t as "mas" | "aof" | "lifetime");
      });
    });
  });
  dCountRow.push("", "");
  dAmtRow.push("", grandDelinq || "");
  rows.push(dCountRow);
  rows.push(dAmtRow);

  // Signature block
  const president = officers.find(o => o.role === "President")?.name || "___________________";
  const treasurer = officers.find(o => o.role === "Treasurer")?.name || "___________________";
  const auditor   = officers.find(o => o.role === "Auditor")?.name   || "___________________";
  rows.push([]);
  rows.push([]);
  rows.push(["Prepared and certified by:"]);
  rows.push([]);
  rows.push([treasurer, "", president, "", auditor]);
  rows.push(["Treasurer", "", "President", "", "Auditor"]);
  rows.push(["Date: _______________", "", "Date: _______________", "", "Date: _______________"]);

  // ── Write sheet ──
  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Column widths
  const baseCols = [{ wch: 5 }, { wch: 30 }, { wch: 12 }, { wch: 15 }, { wch: 14 }];
  const yearCols = type === "all"
    ? years.flatMap(() => [{ wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 12 }])
    : years.flatMap(() => [{ wch: 14 }, { wch: 14 }]);
  ws["!cols"] = [...baseCols, ...yearCols, { wch: 18 }, { wch: 16 }];

  const totalCols = 5 + (type === "all" ? years.length * 4 : years.length * 2) + 2;

  const setStyle = (r: number, c: number, s: any) => {
    const ref = XLSX.utils.encode_cell({ r, c });
    if (!ws[ref]) ws[ref] = { t: "z", v: "" };
    ws[ref].s = s;
  };

  // Org header rows 0–4 → green bg
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < totalCols; c++) {
      setStyle(r, c, {
        fill: fill(C_GREEN_DK),
        font: {
          color: { argb: r === 3 ? C_GOLD : "FFC8C8C8" },
          bold: r === 0 || r === 3,
          size: r === 0 ? 12 : 8,
        },
        border: thinBorder,
        alignment: { vertical: "middle" },
      });
    }
  }

  // Column header row
  const hRow = ORG_ROW_COUNT;
  for (let c = 0; c < totalCols; c++) {
    setStyle(hRow, c, {
      fill: fill(C_GREEN_DK),
      font: { bold: true, color: { argb: "FFFFFFFF" }, size: 8 },
      alignment: { horizontal: "center", vertical: "middle", wrapText: true },
      border: thinBorder,
    });
  }

  // Data rows
  const dataStart = ORG_ROW_COUNT + 1;
  const firstYrCol = 5;
  const lastYrCol  = type === "all"
    ? firstYrCol + years.length * 4
    : firstYrCol + years.length * 2;
  const delinqCol = lastYrCol;
  const totalCol  = lastYrCol + 1;

  members.forEach((m, mi) => {
    const r   = dataStart + mi;
    const isAlt = mi % 2 === 1;

    for (let c = 0; c < totalCols; c++) {
      const ref = XLSX.utils.encode_cell({ r, c });
      const raw = String(ws[ref]?.v ?? "");

      let cellFill = fill(isAlt ? C_CREAM : C_WHITE);
      let font: any = { size: 8, color: { argb: "FF222222" } };
      let align: any = { vertical: "middle" };

      if (c >= firstYrCol && c < lastYrCol) {
        if (raw === "N/A") {
          cellFill = fill(C_GREY_NA);
          font = { ...font, italic: true, color: { argb: "FF8C8C8C" } };
          align = { ...align, horizontal: "center" };
        } else if (raw === "" || raw === "0") {
          cellFill = fill(C_YELLOW);
          font = { ...font, color: { argb: "FFA06400" } };
        }
      } else if (c === delinqCol) {
        align = { ...align, horizontal: "center" };
        if (raw.includes("yr")) font = { ...font, bold: true, color: { argb: "FFC0392B" } };
        else if (raw === "Paid") font = { ...font, bold: true, color: { argb: "FF2E8B44" } };
      } else if (c === totalCol) {
        align = { ...align, horizontal: "right" };
        font = { ...font, bold: true, color: { argb: C_GREEN_DK } };
      }

      setStyle(r, c, { fill: cellFill, font, alignment: align, border: thinBorder });
    }
  });

  // Totals row
  const totIdx = dataStart + members.length;
  for (let c = 0; c < totalCols; c++) {
    setStyle(totIdx, c, {
      fill: fill(C_GREEN_TOT),
      font: { bold: true, color: { argb: C_GREEN_DK }, size: 8 },
      alignment: { horizontal: c > 1 ? "right" : "left", vertical: "middle" },
      border: thinBorder,
    });
  }

  // Delinquent count row
  const dCIdx = totIdx + 2;
  for (let c = 0; c < totalCols; c++) {
    setStyle(dCIdx, c, {
      fill: fill(C_RED_LT),
      font: { bold: true, color: { argb: "FFA01414" }, size: 8 },
      alignment: { horizontal: c > 1 ? "center" : "left", vertical: "middle" },
      border: thinBorder,
    });
  }

  // Delinquent amount row
  const dAIdx = dCIdx + 1;
  for (let c = 0; c < totalCols; c++) {
    setStyle(dAIdx, c, {
      fill: fill("FFFFD7D7"),
      font: { bold: true, color: { argb: C_RED_DK }, size: 8 },
      alignment: { horizontal: c > 1 ? "right" : "left", vertical: "middle" },
      border: thinBorder,
    });
  }

  // Signature name + title rows
  const sigNameIdx  = dAIdx + 4;
  const sigTitleIdx = sigNameIdx + 1;
  [0, 2, 4].forEach((c) => {
    setStyle(sigNameIdx, c, {
      font: { bold: true, underline: true, color: { argb: C_GREEN_DK }, size: 9 },
      alignment: { horizontal: "center" },
    });
    setStyle(sigTitleIdx, c, {
      font: { italic: true, color: { argb: "FF666666" }, size: 8 },
      alignment: { horizontal: "center" },
    });
  });

  // Merges: org header + "prepared by" label
  if (!ws["!merges"]) ws["!merges"] = [];
  for (let r = 0; r < 5; r++) {
    ws["!merges"].push({ s: { r, c: 0 }, e: { r, c: totalCols - 1 } });
  }
  ws["!merges"].push({
    s: { r: dAIdx + 2, c: 0 },
    e: { r: dAIdx + 2, c: totalCols - 1 },
  });

  // Freeze pane below header row
  ws["!freeze"] = { xSplit: 0, ySplit: hRow + 1 } as any;

  XLSX.utils.book_append_sheet(wb, ws, sheetNames[type]);
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

// ─────────────────────────────────────────────────────────────
// CSV  (plain text — no formatting by design)
// ─────────────────────────────────────────────────────────────
export function exportToCSV(
  members: MemberRecord[],
  filename = "SUNCO-Records",
  activeTab: ActiveTab = "all",
  feeSchedules: FeeSchedule[] = []
) {
  const years = getAllYears(members);
  const type  = activeTab;
  const rows: any[][] = [];

  rows.push([ORG_NAME]);
  rows.push([ORG_SEC]);
  rows.push(["Email: " + ORG_EMAIL + "  |  Mobile: " + ORG_MOBILE]);
  rows.push(["As of: " + exportDate()]);
  rows.push([TAB_LABELS[type]]);
  rows.push([]);

  const header = ["NO.", "NAME", "STATUS", "MEMBER ID", "DATE JOINED"];
  if (type === "all") {
    years.forEach((yr) =>
      header.push(`${yr} MAS DATE`, `${yr} MAS AMT`, `${yr} AOF DATE`, `${yr} AOF AMT`)
    );
  } else {
    years.forEach((yr) => header.push(`${yr} DATE`, `${yr} AMT`));
  }
  header.push("YRS DELINQUENT", "TOTAL PAID");
  rows.push(header);

  members.forEach((m) => {
    const jy = joinYear(m);
    const row: any[] = [m.no, m.name, m.status, m.member_id_code, m.date_joined];
    if (type === "all") {
      years.forEach((yr) => {
        if (jy > 0 && yr < jy) { row.push("N/A", "N/A", "N/A", "N/A"); return; }
        const mas = paymentsByYearType(m.payments, yr, "mas")[0];
        const aof = paymentsByYearType(m.payments, yr, "aof")[0];
        row.push(mas?.date || "", mas ? peso(mas.amount) : "", aof?.date || "", aof ? peso(aof.amount) : "");
      });
      row.push(m.years_delinquent > 0 ? `${m.years_delinquent} yr(s)` : "Paid", peso(m.total_amount));
    } else {
      years.forEach((yr) => {
        if (jy > 0 && yr < jy) { row.push("N/A", "N/A"); return; }
        const p = paymentsByYearType(m.payments, yr, type)[0];
        row.push(p?.date || "", p ? peso(p.amount) : "");
      });
      const tot = m.payments.filter((p) => p.type === type).reduce((s, p) => s + p.amount, 0);
      row.push(m.years_delinquent > 0 ? `${m.years_delinquent} yr(s)` : "Paid", tot > 0 ? peso(tot) : "");
    }
    rows.push(row);
  });

  const wbCSV = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wbCSV, XLSX.utils.aoa_to_sheet(rows), "Records");
  XLSX.writeFile(wbCSV, `${filename}.csv`, { bookType: "csv" });
}

// ─────────────────────────────────────────────────────────────
// PDF  —  Long Bond / Legal 8.5 × 13 in  (landscape)
// ─────────────────────────────────────────────────────────────
export async function exportToPDF(
  members: MemberRecord[],
  filename = "SUNCO-Records",
  activeTab: ActiveTab = "all",
  feeSchedules: FeeSchedule[] = [],
  officers: OfficerRecord[] = []
) {
  const PAGE_W = 215.9;
  const PAGE_H = 330.2;

  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: [PAGE_W, PAGE_H],
  });

  const PRINT_W = PAGE_H; // landscape: width = longer dimension

  const years = getAllYears(members);
  const type  = activeTab;

  const GREEN_DK: [number, number, number] = [13, 51, 32];
  const GOLD: [number, number, number]     = [201, 168, 76];
  const CREAM: [number, number, number]    = [245, 237, 216];
  const YELLOW: [number, number, number]   = [255, 253, 210];
  const RED_LIGHT: [number, number, number]= [255, 230, 230];

  // ── Header background ─────────────────────────────────────
  const HEADER_H = 38;
  doc.setFillColor(...GREEN_DK);
  doc.rect(0, 0, PRINT_W, HEADER_H, "F");

  // ── Logo ─────────────────────────────────────────────────
  const LOGO_X    = 8;
  const LOGO_Y    = 4;
  const LOGO_SIZE = 30;

  const logoBase64 = await loadLogoBase64();
  if (logoBase64) {
    doc.addImage(logoBase64, "PNG", LOGO_X, LOGO_Y, LOGO_SIZE, LOGO_SIZE);
  } else {
    // Fallback circle
    doc.setFillColor(...GOLD);
    doc.circle(LOGO_X + 11, LOGO_Y + 11, 11, "F");
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...GREEN_DK);
    doc.text("S", LOGO_X + 7.5, LOGO_Y + 16);
  }

  // ── Header text ───────────────────────────────────────────
  const TEXT_X = LOGO_X + LOGO_SIZE + 4;

  doc.setFontSize(11.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...GOLD);
  doc.text(ORG_NAME, TEXT_X, 10);

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(200, 200, 200);
  doc.text(`${ORG_SEC}   |   ${ORG_DTI}`, TEXT_X, 16);
  doc.text(`Email: ${ORG_EMAIL}   |   Mobile: ${ORG_MOBILE}`, TEXT_X, 21);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...GOLD);
  doc.text(TAB_LABELS[type], TEXT_X, 27);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(200, 200, 200);
  doc.text(`As of: ${exportDate()}`, TEXT_X, 32);

  // ── Table data ────────────────────────────────────────────
  let head: string[][];
  let body: any[][];
  let totalsRow: any[];
  let delinqCountRow: any[];
  let delinqAmtRow: any[];

  const colStyles: any = {
    0: { cellWidth: 8,  halign: "center" },
    1: { cellWidth: 44 },
    2: { cellWidth: 15, halign: "center" },
    3: { cellWidth: 13, halign: "center" },
  };

  if (type === "all") {
    head = [["No.", "Name", "Status", "Joined",
      ...years.flatMap((yr) => [`${yr}\nMAS`, `${yr}\nAOF`]),
      "Delinquent", "Total"]];

    body = members.map((m) => {
      const jy = joinYear(m);
      const row: any[] = [
        m.no, m.name, m.status,
        m.date_joined ? String(m.date_joined).slice(0, 7) : "—",
      ];
      years.forEach((yr) => {
        if (jy > 0 && yr < jy) { row.push("N/A", "N/A"); return; }
        const mas = paymentsByYearType(m.payments, yr, "mas")[0];
        const aof = paymentsByYearType(m.payments, yr, "aof")[0];
        row.push(mas ? pesoPDF(mas.amount) : "—");
        row.push(aof ? pesoPDF(aof.amount) : "—");
      });
      row.push(m.years_delinquent > 0 ? `${m.years_delinquent} yr(s)` : "Paid");
      row.push(m.total_amount > 0 ? pesoPDF(m.total_amount) : "—");
      return row;
    });

    totalsRow = ["", "TOTAL COLLECTED", "", ""];
    years.forEach((yr) => {
      const mT = members.reduce((s, m) => s + (paymentsByYearType(m.payments, yr, "mas")[0]?.amount || 0), 0);
      const aT = members.reduce((s, m) => s + (paymentsByYearType(m.payments, yr, "aof")[0]?.amount || 0), 0);
      totalsRow.push(mT > 0 ? pesoPDF(mT) : "—", aT > 0 ? pesoPDF(aT) : "—");
    });
    totalsRow.push("", pesoPDF(members.reduce((s, m) => s + m.total_amount, 0)));

    delinqCountRow = ["", "DELINQUENT MEMBERS (#)", "", ""];
    delinqAmtRow   = ["", "DELINQUENT AMOUNT OWED", "", ""];
    years.forEach((yr) => {
      let cM = 0, cA = 0, aM = 0, aA = 0;
      members.forEach((m) => {
        const jy = joinYear(m);
        if (jy > 0 && yr < jy) return;
        if (!paymentsByYearType(m.payments, yr, "mas")[0]) { cM++; aM += getRate(feeSchedules, yr, "mas"); }
        if (!paymentsByYearType(m.payments, yr, "aof")[0]) { cA++; aA += getRate(feeSchedules, yr, "aof"); }
      });
      delinqCountRow.push(cM > 0 ? `${cM}` : "—", cA > 0 ? `${cA}` : "—");
      delinqAmtRow.push(aM > 0 ? pesoPDF(aM) : "—", aA > 0 ? pesoPDF(aA) : "—");
    });
    let gD = 0;
    members.forEach((m) => {
      const jy = joinYear(m);
      years.forEach((yr) => {
        if (jy > 0 && yr < jy) return;
        if (!paymentsByYearType(m.payments, yr, "mas")[0]) gD += getRate(feeSchedules, yr, "mas");
        if (!paymentsByYearType(m.payments, yr, "aof")[0]) gD += getRate(feeSchedules, yr, "aof");
      });
    });
    delinqCountRow.push("", "");
    delinqAmtRow.push("", gD > 0 ? pesoPDF(gD) : "—");

    const yw = Math.max(14, Math.min(22, Math.floor(200 / (years.length * 2 + 5))));
    years.forEach((_, i) => {
      colStyles[4 + i * 2]     = { cellWidth: yw, halign: "right" };
      colStyles[4 + i * 2 + 1] = { cellWidth: yw, halign: "right" };
    });
    const lc = 4 + years.length * 2;
    colStyles[lc]     = { cellWidth: 20, halign: "center" };
    colStyles[lc + 1] = { cellWidth: 26, halign: "right" };

  } else {
    head = [["No.", "Name", "Status", "Joined",
      ...years.map((yr) => `${yr}`), "Delinquent", "Total"]];

    body = members.map((m) => {
      const jy = joinYear(m);
      const row: any[] = [
        m.no, m.name, m.status,
        m.date_joined ? String(m.date_joined).slice(0, 7) : "—",
      ];
      years.forEach((yr) => {
        if (jy > 0 && yr < jy) { row.push("N/A"); return; }
        const p = paymentsByYearType(m.payments, yr, type)[0];
        row.push(p ? pesoPDF(p.amount) : "—");
      });
      const tot = m.payments.filter((p) => p.type === type).reduce((s, p) => s + p.amount, 0);
      row.push(m.years_delinquent > 0 ? `${m.years_delinquent} yr(s)` : "Paid");
      row.push(tot > 0 ? pesoPDF(tot) : "—");
      return row;
    });

    totalsRow = ["", "TOTAL COLLECTED", "", ""];
    years.forEach((yr) => {
      const yT = members.reduce((s, m) => s + (paymentsByYearType(m.payments, yr, type)[0]?.amount || 0), 0);
      totalsRow.push(yT > 0 ? pesoPDF(yT) : "—");
    });
    const gT = members.reduce((s, m) => s + m.payments.filter((p) => p.type === type).reduce((ss, p) => ss + p.amount, 0), 0);
    totalsRow.push("", pesoPDF(gT));

    delinqCountRow = ["", "DELINQUENT MEMBERS (#)", "", ""];
    delinqAmtRow   = ["", "DELINQUENT AMOUNT OWED", "", ""];
    years.forEach((yr) => {
      let cnt = 0, amt = 0;
      members.forEach((m) => {
        const jy = joinYear(m);
        if (jy > 0 && yr < jy) return;
        if (!paymentsByYearType(m.payments, yr, type)[0]) {
          cnt++; amt += getRate(feeSchedules, yr, type as "mas" | "aof" | "lifetime");
        }
      });
      delinqCountRow.push(cnt > 0 ? `${cnt}` : "—");
      delinqAmtRow.push(amt > 0 ? pesoPDF(amt) : "—");
    });
    let gD = 0;
    members.forEach((m) => {
      const jy = joinYear(m);
      years.forEach((yr) => {
        if (jy > 0 && yr < jy) return;
        if (!paymentsByYearType(m.payments, yr, type)[0])
          gD += getRate(feeSchedules, yr, type as "mas" | "aof" | "lifetime");
      });
    });
    delinqCountRow.push("", "");
    delinqAmtRow.push("", gD > 0 ? pesoPDF(gD) : "—");

    const yw = Math.max(20, Math.min(32, Math.floor(250 / (years.length + 4))));
    years.forEach((_, i) => { colStyles[4 + i] = { cellWidth: yw, halign: "right" }; });
    const lc = 4 + years.length;
    colStyles[lc]     = { cellWidth: 20, halign: "center" };
    colStyles[lc + 1] = { cellWidth: 28, halign: "right" };
  }

  const lastDataCol = type === "all" ? 4 + years.length * 2 : 4 + years.length;
  const allRows = [...body, totalsRow, delinqCountRow, delinqAmtRow];

  autoTable(doc, {
    startY: HEADER_H + 2,
    head,
    body: allRows,
    styles: { fontSize: 6.5, cellPadding: 1.8, font: "helvetica", overflow: "linebreak" },
    headStyles: { fillColor: GREEN_DK, textColor: 255, fontStyle: "bold", halign: "center", fontSize: 7 },
    alternateRowStyles: { fillColor: CREAM },
    columnStyles: colStyles,
    didParseCell: (data) => {
      const isTotal   = data.row.index === body.length;
      const isDelinqC = data.row.index === body.length + 1;
      const isDelinqA = data.row.index === body.length + 2;

      if (isTotal) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = [220, 235, 220];
        data.cell.styles.textColor = GREEN_DK;
      }
      if (isDelinqC) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = RED_LIGHT;
        data.cell.styles.textColor = [160, 20, 20];
      }
      if (isDelinqA) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = [255, 215, 215];
        data.cell.styles.textColor = [140, 0, 0];
      }
      if (data.section === "body" && data.row.index < body.length &&
          data.column.index >= 4 && data.column.index < lastDataCol &&
          String(data.cell.raw) === "N/A") {
        data.cell.styles.fillColor = [220, 220, 220];
        data.cell.styles.textColor = [140, 140, 140];
        data.cell.styles.fontStyle = "italic";
      }
      if (data.section === "body" && data.row.index < body.length &&
          data.column.index >= 4 && data.column.index < lastDataCol &&
          String(data.cell.raw) === "—") {
        data.cell.styles.fillColor = YELLOW;
        data.cell.styles.textColor = [160, 100, 0];
      }
      if (data.section === "body" && data.row.index < body.length &&
          data.column.index === lastDataCol) {
        const raw = String(data.cell.raw || "");
        if (raw.includes("Paid")) { data.cell.styles.textColor = [46, 139, 68]; data.cell.styles.fontStyle = "bold"; }
        else if (raw.includes("yr")) { data.cell.styles.textColor = [192, 57, 43]; data.cell.styles.fontStyle = "bold"; }
      }
    },
  });

  // ── Signature block ───────────────────────────────────────
  const finalY     = (doc as any).lastAutoTable.finalY + 14;
  const sigHeight  = 28;
  const pageHeight = PAGE_W; // landscape height

  // If no room on current page, add a new one
  const sigY = finalY + sigHeight > pageHeight - 10
    ? (() => { doc.addPage(); return 20; })()
    : finalY;

  const president = officers.find(o => o.role === "President")?.name || "_________";
  const treasurer = officers.find(o => o.role === "Treasurer")?.name || "_________";
  const auditor   = officers.find(o => o.role === "Auditor")?.name   || "_________";

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(100, 100, 100);
  doc.text("Prepared and certified by:", 14, sigY);

  const sigCols = [
    { name: treasurer, title: "Treasurer" },
    { name: president, title: "President" },
    { name: auditor,   title: "Auditor"   },
  ];

  const colW  = (PRINT_W - 28) / 3;
  const lineY = sigY + 16;
  const nameY = lineY + 4;
  const titY  = nameY + 5;
  const dateY = titY + 5;

  sigCols.forEach(({ name, title }, i) => {
    const x  = 14 + i * colW;
    const cx = x + colW / 2;

    // Underline / signature line
    doc.setDrawColor(...GREEN_DK);
    doc.setLineWidth(0.3);
    doc.line(x + 8, lineY, x + colW - 8, lineY);

    // Name — bold green
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...GREEN_DK);
    doc.text(name, cx, nameY, { align: "center" });

    // Title — italic muted
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);
    doc.text(title, cx, titY, { align: "center" });

    // Date line
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.text("Date: _______________", cx, dateY, { align: "center" });
  });

  // ── Page numbers ──────────────────────────────────────────
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(150);
    doc.text(
      `Page ${i} of ${pageCount}  —  SUNCO CONFIDENTIAL  —  ${ORG_SEC}`,
      14, PAGE_W - 4
    );
  }

  doc.save(`${filename}.pdf`);
}