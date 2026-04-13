import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface MemberRecord {
  no: number;
  name: string;
  status: string;
  member_id_code: string;
  date_joined: string;
  payments: { year: number; date: string; amount: number; receipt: string }[];
  years_delinquent: number;
  total_amount: number;
}

// ── EXPORT TO CSV ──
export function exportToCSV(members: MemberRecord[], filename = "SUNCO-Records") {
  const rows: any[] = [];

  // Header
  rows.push([
    "NO.", "NAME", "STATUS", "MEMBER ID", "DATE JOINED",
    "YEAR 2022 DATE", "YEAR 2022 AMOUNT",
    "YEAR 2023 DATE", "YEAR 2023 AMOUNT",
    "YEAR 2024 DATE", "YEAR 2024 AMOUNT",
    "YEAR 2025 DATE", "YEAR 2025 AMOUNT",
    "YEARS DELINQUENT", "TOTAL AMOUNT"
  ]);

  members.forEach(m => {
    const getPayment = (year: number) => {
      const p = m.payments.find(p => p.year === year);
      return p ? [p.date, `₱${p.amount.toFixed(2)}`] : ["", ""];
    };
    rows.push([
      m.no, m.name, m.status, m.member_id_code, m.date_joined,
      ...getPayment(2022), ...getPayment(2023),
      ...getPayment(2024), ...getPayment(2025),
      `${m.years_delinquent} year(s) delinquent`,
      `₱${m.total_amount.toFixed(2)}`
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Records");
  XLSX.writeFile(wb, `${filename}.csv`, { bookType: "csv" });
}

// ── EXPORT TO EXCEL ──
export function exportToExcel(members: MemberRecord[], filename = "SUNCO-Records") {
  const rows: any[] = [];

  // Title rows
  rows.push(["SURIGAO DEL NORTE CONSUMERS ORGANIZATION INC. (SUNCO)"]);
  rows.push(["RECORDS"]);
  rows.push([]);

  // Header
  rows.push([
    "NO.", "NAME", "STATUS", "MEMBER ID",
    "YEAR 2022 DATE", "YEAR 2022 AMOUNT",
    "YEAR 2023 DATE", "YEAR 2023 AMOUNT",
    "YEAR 2024 DATE", "YEAR 2024 AMOUNT",
    "YEAR 2025 DATE", "YEAR 2025 AMOUNT",
    "YEARS DELINQUENT", "TOTAL AMOUNT"
  ]);

  members.forEach(m => {
    const getPayment = (year: number) => {
      const p = m.payments.find(p => p.year === year);
      return p ? [p.date, p.amount] : ["", ""];
    };
    rows.push([
      m.no, m.name, m.status, m.member_id_code,
      ...getPayment(2022), ...getPayment(2023),
      ...getPayment(2024), ...getPayment(2025),
      `${m.years_delinquent} year(s) delinquent`,
      m.total_amount
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Column widths
  ws["!cols"] = [
    { wch: 5 }, { wch: 25 }, { wch: 12 }, { wch: 20 },
    { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
    { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
    { wch: 22 }, { wch: 14 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Records");
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

// ── EXPORT TO PDF ──
export function exportToPDF(members: MemberRecord[], filename = "SUNCO-Records") {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  // Title
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("SURIGAO DEL NORTE CONSUMERS ORGANIZATION INC. (SUNCO)", 14, 15);
  doc.setFontSize(11);
  doc.text("OFFICIAL RECORDS", 14, 22);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Generated: ${new Date().toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}`, 14, 28);

  const tableData = members.map(m => {
    const getPayment = (year: number) => {
      const p = m.payments.find(p => p.year === year);
      return p ? [`${p.date}\n₱${p.amount.toFixed(2)}` ] : ["—"];
    };
    return [
      m.no,
      m.name,
      m.status,
      m.member_id_code,
      ...getPayment(2022),
      ...getPayment(2023),
      ...getPayment(2024),
      ...getPayment(2025),
      `${m.years_delinquent} yr(s)`,
      `₱${m.total_amount.toFixed(2)}`
    ];
  });

  autoTable(doc, {
    startY: 32,
    head: [[
      "No.", "Name", "Status", "Member ID",
      "2022", "2023", "2024", "2025",
      "Delinquent", "Total"
    ]],
    body: tableData,
    styles: { fontSize: 7, cellPadding: 2 },
    headStyles: { fillColor: [13, 51, 24], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [245, 237, 216] },
    columnStyles: {
      0: { cellWidth: 8 },
      1: { cellWidth: 40 },
      2: { cellWidth: 18 },
      3: { cellWidth: 30 },
      4: { cellWidth: 22 },
      5: { cellWidth: 22 },
      6: { cellWidth: 22 },
      7: { cellWidth: 22 },
      8: { cellWidth: 18 },
      9: { cellWidth: 20 },
    },
    didParseCell: (data) => {
      // Highlight delinquent cells (empty payment cells) in yellow
      if (data.section === "body" && data.column.index >= 4 && data.column.index <= 7) {
        if (!data.cell.raw || data.cell.raw === "—") {
          data.cell.styles.fillColor = [255, 255, 0];
          data.cell.styles.textColor = [0, 0, 0];
        }
      }
    }
  });

  // Page numbers
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Page ${i} of ${pageCount} — SUNCO Confidential`, 14, doc.internal.pageSize.height - 5);
  }

  doc.save(`${filename}.pdf`);
}