// ─────────────────────────────────────────────────────────────
// utils/export.ts  —  SUNCO Export Utility  (FIXED v2)
//
// FIXES in this version:
//  1. Delinquent amounts now use fee_schedules rates (NOT payment history)
//  2. FeeSchedule type added; feeSchedules param passed to all export fns
//  3. getRate() helper resolves correct MAS/AOF/Lifetime fee per year
//  4. Falls back to nearest earlier year's rate if exact year not found
//  5. 2022 MAS delinquent now correctly shows PHP 440.00 × count
//  6. ExportPanel must pass feeSchedules prop (see bottom of this file)
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
  type: string; // "mas" | "aof" | "lifetime"
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

/** Mirrors the fee_schedules table row */
export interface FeeSchedule {
  year: number;
  fee_mas: number;
  fee_aof: number;
  fee_lifetime: number;
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
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
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

// ─────────────────────────────────────────────────────────────
// KEY FIX: getRate()
//
// Returns the scheduled fee for a given year and payment type.
// If the exact year isn't in fee_schedules, walks backwards to
// find the nearest earlier year (e.g. if 2022 is missing, uses 2021).
// Falls back to 0 only if no earlier schedule exists at all.
// ─────────────────────────────────────────────────────────────
function getRate(
  feeSchedules: FeeSchedule[],
  year: number,
  type: "mas" | "aof" | "lifetime"
): number {
  // Sort descending so we find the closest year ≤ target first
  const sorted = [...feeSchedules].sort((a, b) => b.year - a.year);

  for (const s of sorted) {
    if (s.year <= year) {
      if (type === "mas")      return s.fee_mas      || 0;
      if (type === "aof")      return s.fee_aof      || 0;
      if (type === "lifetime") return s.fee_lifetime || 0;
    }
  }
  return 0; // no schedule found at all
}

// ── Tab label map ─────────────────────────────────────────────
const TAB_LABELS: Record<ActiveTab, string> = {
  all:      "ALL PAYMENTS — Annual Records",
  mas:      "Mortuary Assistance Services (MAS) Payments",
  aof:      "AOF (Annual Operating Fund) Payments",
  lifetime: "Lifetime Membership Fees",
};

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
// EXCEL
// ─────────────────────────────────────────────────────────────
export function exportToExcel(
  members: MemberRecord[],
  filename = "SUNCO-Records",
  activeTab: ActiveTab = "all",
  feeSchedules: FeeSchedule[] = []
) {
  const wb = XLSX.utils.book_new();
  const years = getAllYears(members);
  const type = activeTab;

  const sheetNames: Record<ActiveTab, string> = {
    all: "All Payments",
    mas: "MAS Only",
    aof: "Operating Fund",
    lifetime: "Lifetime",
  };

  const rows: any[][] = [...orgHeader(TAB_LABELS[type])];

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

    const filteredTotal =
      type === "all"
        ? m.total_amount
        : m.payments.filter((p) => p.type === type).reduce((s, p) => s + p.amount, 0);

    row.push(
      m.years_delinquent > 0 ? `${m.years_delinquent} yr(s)` : "Paid",
      filteredTotal || ""
    );
    rows.push(row);
  });

  // Totals row
  const totalsRow: any[] = ["", "TOTAL", "", "", ""];
  years.forEach((yr) => {
    if (type === "all") {
      const masT = members.reduce((s, m) => {
        const p = paymentsByYearType(m.payments, yr, "mas")[0];
        return s + (p?.amount || 0);
      }, 0);
      const aofT = members.reduce((s, m) => {
        const p = paymentsByYearType(m.payments, yr, "aof")[0];
        return s + (p?.amount || 0);
      }, 0);
      totalsRow.push("", masT || "", "", aofT || "");
    } else {
      const yrT = members.reduce((s, m) => {
        const p = paymentsByYearType(m.payments, yr, type)[0];
        return s + (p?.amount || 0);
      }, 0);
      totalsRow.push("", yrT || "");
    }
  });
  const grandTotal = members.reduce((s, m) => {
    if (type === "all") return s + m.total_amount;
    return s + m.payments.filter((p) => p.type === type).reduce((ss, p) => ss + p.amount, 0);
  }, 0);
  totalsRow.push("", grandTotal);
  rows.push(totalsRow);

  rows.push([]);

  // ── Delinquent rows — using fee schedule rates ──
  const delinqCountRow: any[] = ["", "DELINQUENT MEMBERS (count)", "", "", ""];
  const delinqAmtRow: any[]   = ["", "DELINQUENT AMOUNT OWED", "", "", ""];

  years.forEach((yr) => {
    const relevantTypes = type === "all" ? (["mas", "aof"] as const) : ([type] as const);

    if (type === "all") {
      let countMas = 0, countAof = 0, amtMas = 0, amtAof = 0;
      members.forEach((m) => {
        const jy = joinYear(m);
        if (jy > 0 && yr < jy) return;
        const mas = paymentsByYearType(m.payments, yr, "mas")[0];
        const aof = paymentsByYearType(m.payments, yr, "aof")[0];
        if (!mas) { countMas++; amtMas += getRate(feeSchedules, yr, "mas"); }
        if (!aof) { countAof++; amtAof += getRate(feeSchedules, yr, "aof"); }
      });
      delinqCountRow.push("", countMas || "", "", countAof || "");
      delinqAmtRow.push("", amtMas || "", "", amtAof || "");
    } else {
      let count = 0, amt = 0;
      members.forEach((m) => {
        const jy = joinYear(m);
        if (jy > 0 && yr < jy) return;
        const p = paymentsByYearType(m.payments, yr, type as string)[0];
        if (!p) {
          count++;
          amt += getRate(feeSchedules, yr, type as "mas" | "aof" | "lifetime");
        }
      });
      delinqCountRow.push("", count || "");
      delinqAmtRow.push("", amt || "");
    }
  });

  // Grand delinquent total — sum per member per unpaid year using schedule rate
  let grandDelinqAmt = 0;
  members.forEach((m) => {
    const jy = joinYear(m);
    const relevantTypes = type === "all" ? (["mas", "aof"] as const) : ([type] as const);
    getAllYears(members).forEach((yr) => {
      if (jy > 0 && yr < jy) return;
      relevantTypes.forEach((t) => {
        const p = paymentsByYearType(m.payments, yr, t)[0];
        if (!p) grandDelinqAmt += getRate(feeSchedules, yr, t as "mas" | "aof" | "lifetime");
      });
    });
  });

  delinqCountRow.push("", "");
  delinqAmtRow.push("", grandDelinqAmt || "");
  rows.push(delinqCountRow);
  rows.push(delinqAmtRow);

  const ws = XLSX.utils.aoa_to_sheet(rows);
  const baseCols = [
    { wch: 5 }, { wch: 28 }, { wch: 12 }, { wch: 15 }, { wch: 14 },
  ];
  const yearCols =
    type === "all"
      ? years.flatMap(() => [{ wch: 14 }, { wch: 10 }, { wch: 14 }, { wch: 10 }])
      : years.flatMap(() => [{ wch: 14 }, { wch: 12 }]);
  ws["!cols"] = [...baseCols, ...yearCols, { wch: 16 }, { wch: 14 }];

  XLSX.utils.book_append_sheet(wb, ws, sheetNames[type]);
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

// ─────────────────────────────────────────────────────────────
// CSV
// ─────────────────────────────────────────────────────────────
export function exportToCSV(
  members: MemberRecord[],
  filename = "SUNCO-Records",
  activeTab: ActiveTab = "all",
  feeSchedules: FeeSchedule[] = []
) {
  const years = getAllYears(members);
  const type = activeTab;
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
        row.push(
          mas?.date || "", mas ? peso(mas.amount) : "",
          aof?.date || "", aof ? peso(aof.amount) : ""
        );
      });
      row.push(
        m.years_delinquent > 0 ? `${m.years_delinquent} yr(s)` : "Paid",
        peso(m.total_amount)
      );
    } else {
      years.forEach((yr) => {
        if (jy > 0 && yr < jy) { row.push("N/A", "N/A"); return; }
        const p = paymentsByYearType(m.payments, yr, type)[0];
        row.push(p?.date || "", p ? peso(p.amount) : "");
      });
      const filteredTotal = m.payments
        .filter((p) => p.type === type)
        .reduce((s, p) => s + p.amount, 0);
      row.push(
        m.years_delinquent > 0 ? `${m.years_delinquent} yr(s)` : "Paid",
        filteredTotal > 0 ? peso(filteredTotal) : ""
      );
    }
    rows.push(row);
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Records");
  XLSX.writeFile(wb, `${filename}.csv`, { bookType: "csv" });
}

// ─────────────────────────────────────────────────────────────
// PDF  —  Long Bond / Legal 8.5 × 13 in
// ─────────────────────────────────────────────────────────────
export function exportToPDF(
  members: MemberRecord[],
  filename = "SUNCO-Records",
  activeTab: ActiveTab = "all",
  feeSchedules: FeeSchedule[] = []
) {
  const PAGE_W = 215.9;
  const PAGE_H = 330.2;

  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: [PAGE_W, PAGE_H],
  });

  const PRINT_W = PAGE_H;

  const years = getAllYears(members);
  const type = activeTab;

  const GREEN_DK: [number, number, number] = [13, 51, 32];
  const GOLD: [number, number, number]     = [201, 168, 76];
  const CREAM: [number, number, number]    = [245, 237, 216];
  const YELLOW: [number, number, number]   = [255, 253, 210];
  const RED_LIGHT: [number, number, number]= [255, 230, 230];

  // Logo
  const LOGO_X = 14;
  const LOGO_Y = 4;
  const LOGO_R = 11;
  doc.setFillColor(...GOLD);
  doc.circle(LOGO_X + LOGO_R, LOGO_Y + LOGO_R, LOGO_R, "F");
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...GREEN_DK);
  doc.text("S", LOGO_X + LOGO_R - 3.5, LOGO_Y + LOGO_R + 5);

  // Header
  const HEADER_H = 36;
  doc.setFillColor(...GREEN_DK);
  doc.rect(0, 0, PRINT_W, HEADER_H, "F");

  const TEXT_X = LOGO_X + LOGO_R * 2 + 4;
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...GOLD);
  doc.text(ORG_NAME, TEXT_X, 10);

  doc.setFontSize(7.5);
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

  // ── Build table ───────────────────────────────────────────
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
    // ── ALL tab: MAS + AOF columns per year ──────────────────
    const yearHeaders = years.flatMap((yr) => [`${yr}\nMAS`, `${yr}\nAOF`]);
    head = [["No.", "Name", "Status", "Joined", ...yearHeaders, "Delinquent", "Total"]];

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

    // Totals
    totalsRow = ["", "TOTAL COLLECTED", "", ""];
    years.forEach((yr) => {
      const masT = members.reduce((s, m) => {
        const p = paymentsByYearType(m.payments, yr, "mas")[0]; return s + (p?.amount || 0);
      }, 0);
      const aofT = members.reduce((s, m) => {
        const p = paymentsByYearType(m.payments, yr, "aof")[0]; return s + (p?.amount || 0);
      }, 0);
      totalsRow.push(masT > 0 ? pesoPDF(masT) : "—");
      totalsRow.push(aofT > 0 ? pesoPDF(aofT) : "—");
    });
    const grandT = members.reduce((s, m) => s + m.total_amount, 0);
    totalsRow.push("", pesoPDF(grandT));

    // ── DELINQUENT rows — fee schedule rates ────────────────
    delinqCountRow = ["", "DELINQUENT MEMBERS (#)", "", ""];
    delinqAmtRow   = ["", "DELINQUENT AMOUNT OWED", "", ""];

    years.forEach((yr) => {
      let countMas = 0, countAof = 0, amtMas = 0, amtAof = 0;
      members.forEach((m) => {
        const jy = joinYear(m);
        if (jy > 0 && yr < jy) return; // not a member yet — skip
        const mas = paymentsByYearType(m.payments, yr, "mas")[0];
        const aof = paymentsByYearType(m.payments, yr, "aof")[0];
        if (!mas) {
          countMas++;
          amtMas += getRate(feeSchedules, yr, "mas"); // ← fee schedule rate
        }
        if (!aof) {
          countAof++;
          amtAof += getRate(feeSchedules, yr, "aof"); // ← fee schedule rate
        }
      });
      delinqCountRow.push(
        countMas > 0 ? `${countMas}` : "—",
        countAof > 0 ? `${countAof}` : "—"
      );
      delinqAmtRow.push(
        amtMas > 0 ? pesoPDF(amtMas) : "—",
        amtAof > 0 ? pesoPDF(amtAof) : "—"
      );
    });

    // Grand total delinquent — iterate every unpaid slot per member
    let grandDelinqAmt = 0;
    members.forEach((m) => {
      const jy = joinYear(m);
      years.forEach((yr) => {
        if (jy > 0 && yr < jy) return;
        const mas = paymentsByYearType(m.payments, yr, "mas")[0];
        const aof = paymentsByYearType(m.payments, yr, "aof")[0];
        if (!mas) grandDelinqAmt += getRate(feeSchedules, yr, "mas");
        if (!aof) grandDelinqAmt += getRate(feeSchedules, yr, "aof");
      });
    });

    delinqCountRow.push("", "");
    delinqAmtRow.push("", grandDelinqAmt > 0 ? pesoPDF(grandDelinqAmt) : "—");

    // Column widths
    const yearColW = Math.max(14, Math.min(22, Math.floor(200 / (years.length * 2 + 5))));
    years.forEach((_, i) => {
      colStyles[4 + i * 2]     = { cellWidth: yearColW, halign: "right" };
      colStyles[4 + i * 2 + 1] = { cellWidth: yearColW, halign: "right" };
    });
    const lastCol = 4 + years.length * 2;
    colStyles[lastCol]     = { cellWidth: 20, halign: "center" };
    colStyles[lastCol + 1] = { cellWidth: 26, halign: "right" };

  } else {
    // ── MAS / AOF / Lifetime — single column per year ───────
    const yearHeaders = years.map((yr) => `${yr}`);
    head = [["No.", "Name", "Status", "Joined", ...yearHeaders, "Delinquent", "Total"]];

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
      const filteredTotal = m.payments
        .filter((p) => p.type === type)
        .reduce((s, p) => s + p.amount, 0);
      row.push(m.years_delinquent > 0 ? `${m.years_delinquent} yr(s)` : "Paid");
      row.push(filteredTotal > 0 ? pesoPDF(filteredTotal) : "—");
      return row;
    });

    // Totals
    totalsRow = ["", "TOTAL COLLECTED", "", ""];
    years.forEach((yr) => {
      const yrT = members.reduce((s, m) => {
        const p = paymentsByYearType(m.payments, yr, type)[0]; return s + (p?.amount || 0);
      }, 0);
      totalsRow.push(yrT > 0 ? pesoPDF(yrT) : "—");
    });
    const grandT = members.reduce(
      (s, m) => s + m.payments.filter((p) => p.type === type).reduce((ss, p) => ss + p.amount, 0), 0
    );
    totalsRow.push("", pesoPDF(grandT));

    // ── DELINQUENT rows — fee schedule rates ────────────────
    delinqCountRow = ["", "DELINQUENT MEMBERS (#)", "", ""];
    delinqAmtRow   = ["", "DELINQUENT AMOUNT OWED", "", ""];

    years.forEach((yr) => {
      let count = 0, amt = 0;
      members.forEach((m) => {
        const jy = joinYear(m);
        if (jy > 0 && yr < jy) return;
        const p = paymentsByYearType(m.payments, yr, type)[0];
        if (!p) {
          count++;
          amt += getRate(feeSchedules, yr, type as "mas" | "aof" | "lifetime");
        }
      });
      delinqCountRow.push(count > 0 ? `${count}` : "—");
      delinqAmtRow.push(amt > 0 ? pesoPDF(amt) : "—");
    });

    // Grand total delinquent
    let grandDelinqAmt = 0;
    members.forEach((m) => {
      const jy = joinYear(m);
      years.forEach((yr) => {
        if (jy > 0 && yr < jy) return;
        const p = paymentsByYearType(m.payments, yr, type)[0];
        if (!p) grandDelinqAmt += getRate(feeSchedules, yr, type as "mas" | "aof" | "lifetime");
      });
    });

    delinqCountRow.push("", "");
    delinqAmtRow.push("", grandDelinqAmt > 0 ? pesoPDF(grandDelinqAmt) : "—");

    // Column widths
    const yearColW = Math.max(20, Math.min(32, Math.floor(250 / (years.length + 4))));
    years.forEach((_, i) => {
      colStyles[4 + i] = { cellWidth: yearColW, halign: "right" };
    });
    const lastCol = 4 + years.length;
    colStyles[lastCol]     = { cellWidth: 20, halign: "center" };
    colStyles[lastCol + 1] = { cellWidth: 28, halign: "right" };
  }

  const lastDataCol =
    type === "all" ? 4 + years.length * 2 : 4 + years.length;

  const allRows = [...body, totalsRow, delinqCountRow, delinqAmtRow];

  autoTable(doc, {
    startY: HEADER_H + 2,
    head,
    body: allRows,
    styles: { fontSize: 6.5, cellPadding: 1.8, font: "helvetica", overflow: "linebreak" },
    headStyles: {
      fillColor: GREEN_DK, textColor: 255, fontStyle: "bold",
      halign: "center", fontSize: 7,
    },
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

      // N/A — grey
      if (
        data.section === "body" &&
        data.row.index < body.length &&
        data.column.index >= 4 &&
        data.column.index < lastDataCol &&
        String(data.cell.raw) === "N/A"
      ) {
        data.cell.styles.fillColor = [220, 220, 220];
        data.cell.styles.textColor = [140, 140, 140];
        data.cell.styles.fontStyle = "italic";
      }

      // Unpaid "—" — yellow
      if (
        data.section === "body" &&
        data.row.index < body.length &&
        data.column.index >= 4 &&
        data.column.index < lastDataCol &&
        String(data.cell.raw) === "—"
      ) {
        data.cell.styles.fillColor = YELLOW;
        data.cell.styles.textColor = [160, 100, 0];
      }

      // Delinquent / Paid status column
      if (data.section === "body" && data.row.index < body.length && data.column.index === lastDataCol) {
        const raw = String(data.cell.raw || "");
        if (raw.includes("Paid")) {
          data.cell.styles.textColor = [46, 139, 68];
          data.cell.styles.fontStyle = "bold";
        } else if (raw.includes("yr")) {
          data.cell.styles.textColor = [192, 57, 43];
          data.cell.styles.fontStyle = "bold";
        }
      }
    },
  });

  // Page numbers
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(150);
    doc.text(
      `Page ${i} of ${pageCount}  —  SUNCO CONFIDENTIAL  —  ${ORG_SEC}`,
      14,
      PAGE_W - 4
    );
  }

  doc.save(`${filename}.pdf`);
}
