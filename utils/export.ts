// ─────────────────────────────────────────────────────────────
// utils/export.ts  —  SUNCO Export Utility
//
// Exports: Excel (4 sheets), CSV, PDF
// Replace: D:\suncowebsite\utils\export.ts
// ─────────────────────────────────────────────────────────────
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ── Organisation constants ────────────────────────────────────
const ORG_NAME    = "Surigao del Norte Consumers Organization, Inc. (SUNCO)";
const ORG_SEC     = "SEC CN 2011-31-445";
const ORG_EMAIL   = "gabu.sacro@gmail.com";
const ORG_MOBILE  = "0946-365-7331";
const ORG_DTI     = "Accredited Partner — Department of Trade and Industry (DTI), Caraga Region";

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

// ── Active tab type ───────────────────────────────────────────
export type ActiveTab = "all" | "mas" | "aof" | "lifetime";

// ── Helpers ───────────────────────────────────────────────────

/**
 * peso() for Excel/CSV — uses the real ₱ sign (these renderers support Unicode)
 */
function peso(amount: number) {
  return amount > 0
    ? `₱${amount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`
    : "—";
}

/**
 * pesoPDF() for PDF — jsPDF's built-in fonts are Latin-1 only; ₱ becomes ±.
 * We use "PHP" prefix instead, which is universally understood and renders cleanly.
 */
function pesoPDF(amount: number) {
  return amount > 0
    ? `PHP ${amount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`
    : "—";
}

function getAllYears(members: MemberRecord[]) {
  const years = new Set<number>();
  members.forEach((m) => m.payments.forEach((p) => years.add(p.year)));
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

// ── Build org header rows ─────────────────────────────────────
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

// ── Tab label map ─────────────────────────────────────────────
const TAB_LABELS: Record<ActiveTab, string> = {
  all:      "ALL PAYMENTS — Annual Records",
  mas:      "MAS (Mutual Aid System) Payments",
  aof:      "AOF (Annual Operating Fund) Payments",
  lifetime: "Lifetime Membership Fees",
};

// ─────────────────────────────────────────────────────────────
// EXCEL — exports only the sheet matching activeTab
// ─────────────────────────────────────────────────────────────
export function exportToExcel(
  members: MemberRecord[],
  filename = "SUNCO-Records",
  activeTab: ActiveTab = "all"
) {
  const wb = XLSX.utils.book_new();
  const years = getAllYears(members);

  const sheetConfig: { name: string; type: ActiveTab; label: string }[] =
    activeTab === "all"
      ? [{ name: "All Payments", type: "all", label: TAB_LABELS.all }]
      : activeTab === "mas"
      ? [{ name: "MAS Only", type: "mas", label: TAB_LABELS.mas }]
      : activeTab === "aof"
      ? [{ name: "Operating Fund", type: "aof", label: TAB_LABELS.aof }]
      : [{ name: "Lifetime", type: "lifetime", label: TAB_LABELS.lifetime }];

  sheetConfig.forEach(({ name, type, label }) => {
    const rows: any[][] = [...orgHeader(label)];

    // ── Column header ──
    const header: any[] = ["NO.", "NAME", "STATUS", "MEMBER ID", "DATE JOINED"];
    years.forEach((yr) => {
      if (type === "all") {
        header.push(`${yr} MAS DATE`, `${yr} MAS AMT`, `${yr} AOF DATE`, `${yr} AOF AMT`);
      } else {
        header.push(`${yr} DATE`, `${yr} AMOUNT`);
      }
    });
    header.push("YRS DELINQUENT", "TOTAL PAID");
    rows.push(header);

    // ── Data rows ──
    members.forEach((m) => {
      const row: any[] = [
        m.no, m.name, m.status, m.member_id_code, m.date_joined,
      ];

      years.forEach((yr) => {
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
          : m.payments
              .filter((p) => p.type === type)
              .reduce((s, p) => s + p.amount, 0);

      row.push(m.years_delinquent > 0 ? `${m.years_delinquent} yr(s)` : "Paid", filteredTotal || "");
      rows.push(row);
    });

    // ── Summary totals row ──
    const totalsRow: any[] = ["", "TOTAL", "", "", ""];
    years.forEach((yr) => {
      if (type === "all") {
        const masTotal = members.reduce((s, m) => {
          const p = paymentsByYearType(m.payments, yr, "mas")[0];
          return s + (p?.amount || 0);
        }, 0);
        const aofTotal = members.reduce((s, m) => {
          const p = paymentsByYearType(m.payments, yr, "aof")[0];
          return s + (p?.amount || 0);
        }, 0);
        totalsRow.push("", masTotal || "", "", aofTotal || "");
      } else {
        const yrTotal = members.reduce((s, m) => {
          const p = paymentsByYearType(m.payments, yr, type)[0];
          return s + (p?.amount || 0);
        }, 0);
        totalsRow.push("", yrTotal || "");
      }
    });
    const grandTotal = members.reduce((s, m) => {
      if (type === "all") return s + m.total_amount;
      return s + m.payments.filter((p) => p.type === type).reduce((ss, p) => ss + p.amount, 0);
    }, 0);
    totalsRow.push("", grandTotal);
    rows.push(totalsRow);

    const ws = XLSX.utils.aoa_to_sheet(rows);

    const baseCols = [
      { wch: 5 }, { wch: 28 }, { wch: 12 }, { wch: 15 }, { wch: 14 },
    ];
    const yearCols =
      type === "all"
        ? years.flatMap(() => [{ wch: 14 }, { wch: 10 }, { wch: 14 }, { wch: 10 }])
        : years.flatMap(() => [{ wch: 14 }, { wch: 12 }]);
    ws["!cols"] = [...baseCols, ...yearCols, { wch: 16 }, { wch: 14 }];

    XLSX.utils.book_append_sheet(wb, ws, name);
  });

  XLSX.writeFile(wb, `${filename}.xlsx`);
}

// ─────────────────────────────────────────────────────────────
// CSV  —  respects activeTab
// ─────────────────────────────────────────────────────────────
export function exportToCSV(
  members: MemberRecord[],
  filename = "SUNCO-Records",
  activeTab: ActiveTab = "all"
) {
  const years = getAllYears(members);
  const rows: any[][] = [];
  const type = activeTab;

  rows.push([ORG_NAME]);
  rows.push([ORG_SEC]);
  rows.push(["Email: " + ORG_EMAIL + "  |  Mobile: " + ORG_MOBILE]);
  rows.push(["As of: " + exportDate()]);
  rows.push([TAB_LABELS[type]]);
  rows.push([]);

  const header = ["NO.", "NAME", "STATUS", "MEMBER ID", "DATE JOINED"];
  if (type === "all") {
    years.forEach((yr) => {
      header.push(`${yr} MAS DATE`, `${yr} MAS AMT`, `${yr} AOF DATE`, `${yr} AOF AMT`);
    });
  } else {
    years.forEach((yr) => {
      header.push(`${yr} DATE`, `${yr} AMT`);
    });
  }
  header.push("YRS DELINQUENT", "TOTAL PAID");
  rows.push(header);

  members.forEach((m) => {
    const row: any[] = [m.no, m.name, m.status, m.member_id_code, m.date_joined];

    if (type === "all") {
      years.forEach((yr) => {
        const mas = paymentsByYearType(m.payments, yr, "mas")[0];
        const aof = paymentsByYearType(m.payments, yr, "aof")[0];
        row.push(mas?.date || "", mas ? peso(mas.amount) : "", aof?.date || "", aof ? peso(aof.amount) : "");
      });
      row.push(
        m.years_delinquent > 0 ? `${m.years_delinquent} yr(s)` : "Paid",
        peso(m.total_amount)
      );
    } else {
      years.forEach((yr) => {
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
// PDF  —  respects activeTab, uses pesoPDF() to avoid ± glitch
// ─────────────────────────────────────────────────────────────
export function exportToPDF(
  members: MemberRecord[],
  filename = "SUNCO-Records",
  activeTab: ActiveTab = "all"
) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const years = getAllYears(members);
  const type = activeTab;

  const GREEN_DK: [number, number, number] = [13, 51, 32];
  const GOLD: [number, number, number]     = [201, 168, 76];
  const CREAM: [number, number, number]    = [245, 237, 216];
  const YELLOW: [number, number, number]   = [255, 253, 210];

  // ── Header block ──
  doc.setFillColor(...GREEN_DK);
  doc.rect(0, 0, 297, 32, "F");

  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...GOLD);
  doc.text(ORG_NAME, 14, 10);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(200, 200, 200);
  doc.text(`${ORG_SEC}   |   ${ORG_DTI}`, 14, 16);
  doc.text(`Email: ${ORG_EMAIL}   |   Mobile: ${ORG_MOBILE}`, 14, 21);
  doc.text(TAB_LABELS[type], 14, 26);
  doc.text(`As of: ${exportDate()}`, 14, 31);

  // ── Build columns based on activeTab ──
  let head: string[][];
  let body: any[][];
  let footerRow: any[];
  let colStyles: any = {
    0: { cellWidth: 8,  halign: "center" },
    1: { cellWidth: 40 },
    2: { cellWidth: 16 },
    3: { cellWidth: 14 },
  };

  if (type === "all") {
    // All Payments: show MAS + AOF columns per year
    const yearHeaders = years.flatMap((yr) => [`${yr}\nMAS`, `${yr}\nAOF`]);
    head = [["No.", "Name", "Status", "Joined", ...yearHeaders, "Delinquent", "Total"]];

    body = members.map((m) => {
      const row: any[] = [
        m.no, m.name, m.status,
        m.date_joined ? m.date_joined.toString().slice(0, 7) : "—",
      ];
      years.forEach((yr) => {
        const mas = paymentsByYearType(m.payments, yr, "mas")[0];
        const aof = paymentsByYearType(m.payments, yr, "aof")[0];
        row.push(mas ? pesoPDF(mas.amount) : "—");
        row.push(aof ? pesoPDF(aof.amount) : "—");
      });
      row.push(m.years_delinquent > 0 ? `${m.years_delinquent} yr(s)` : "Paid");
      row.push(m.total_amount > 0 ? pesoPDF(m.total_amount) : "—");
      return row;
    });

    footerRow = ["", "TOTAL", "", ""];
    years.forEach((yr) => {
      const masT = members.reduce((s, m) => {
        const p = paymentsByYearType(m.payments, yr, "mas")[0];
        return s + (p?.amount || 0);
      }, 0);
      const aofT = members.reduce((s, m) => {
        const p = paymentsByYearType(m.payments, yr, "aof")[0];
        return s + (p?.amount || 0);
      }, 0);
      footerRow.push(masT > 0 ? pesoPDF(masT) : "—");
      footerRow.push(aofT > 0 ? pesoPDF(aofT) : "—");
    });
    const grandT = members.reduce((s, m) => s + m.total_amount, 0);
    footerRow.push("", pesoPDF(grandT));

    const yearColWidth = Math.max(5, Math.min(18, Math.floor(220 / (years.length * 2 + 5))));
    years.forEach((_, i) => {
      colStyles[4 + i * 2]     = { cellWidth: yearColWidth, halign: "right" };
      colStyles[4 + i * 2 + 1] = { cellWidth: yearColWidth, halign: "right" };
    });
    const lastCol = 4 + years.length * 2;
    colStyles[lastCol]     = { cellWidth: 18, halign: "center" };
    colStyles[lastCol + 1] = { cellWidth: 22, halign: "right" };

  } else {
    // MAS / AOF / Lifetime: one column per year
    const yearHeaders = years.map((yr) => `${yr}`);
    const typeLabel = type === "mas" ? "MAS" : type === "aof" ? "AOF" : "Lifetime";
    head = [["No.", "Name", "Status", "Joined", ...yearHeaders, "Delinquent", "Total"]];

    body = members.map((m) => {
      const row: any[] = [
        m.no, m.name, m.status,
        m.date_joined ? m.date_joined.toString().slice(0, 7) : "—",
      ];
      years.forEach((yr) => {
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

    footerRow = ["", "TOTAL", "", ""];
    years.forEach((yr) => {
      const yrT = members.reduce((s, m) => {
        const p = paymentsByYearType(m.payments, yr, type)[0];
        return s + (p?.amount || 0);
      }, 0);
      footerRow.push(yrT > 0 ? pesoPDF(yrT) : "—");
    });
    const grandT = members.reduce(
      (s, m) => s + m.payments.filter((p) => p.type === type).reduce((ss, p) => ss + p.amount, 0),
      0
    );
    footerRow.push("", pesoPDF(grandT));

    const yearColWidth = Math.max(18, Math.min(30, Math.floor(240 / (years.length + 4))));
    years.forEach((_, i) => {
      colStyles[4 + i] = { cellWidth: yearColWidth, halign: "right" };
    });
    const lastCol = 4 + years.length;
    colStyles[lastCol]     = { cellWidth: 18, halign: "center" };
    colStyles[lastCol + 1] = { cellWidth: 24, halign: "right" };
  }

  const lastDataCol =
    type === "all" ? 4 + years.length * 2 : 4 + years.length;

  autoTable(doc, {
    startY: 35,
    head,
    body: [...body, footerRow],
    styles: { fontSize: 6.5, cellPadding: 1.8, font: "helvetica", overflow: "linebreak" },
    headStyles: { fillColor: GREEN_DK, textColor: 255, fontStyle: "bold", halign: "center", fontSize: 7 },
    alternateRowStyles: { fillColor: CREAM },
    columnStyles: colStyles,
    didParseCell: (data) => {
      // Totals row — bold light-green background
      if (data.row.index === body.length) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = [230, 240, 230];
        data.cell.styles.textColor = GREEN_DK;
      }
      // Highlight missing payments in yellow
      if (
        data.section === "body" &&
        data.row.index < body.length &&
        data.column.index >= 4 &&
        data.column.index < lastDataCol
      ) {
        if (data.cell.raw === "—") {
          data.cell.styles.fillColor = YELLOW;
          data.cell.styles.textColor = [160, 100, 0];
        }
      }
      // Green for "Paid", red for delinquent
      if (data.section === "body" && data.column.index === lastDataCol) {
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

  // ── Page numbers ──
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(150);
    doc.text(
      `Page ${i} of ${pageCount}  —  SUNCO CONFIDENTIAL  —  ${ORG_SEC}`,
      14,
      doc.internal.pageSize.height - 5
    );
  }

  doc.save(`${filename}.pdf`);
}
