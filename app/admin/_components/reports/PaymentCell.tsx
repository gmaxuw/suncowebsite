// ─────────────────────────────────────────────
// reports/PaymentCell.tsx
//
// Single cell in the records table.
// Shows: ₱amount (paid) | — (unpaid) | N/A (pre-membership)
// Clicking a paid cell opens the receipt modal.
// ─────────────────────────────────────────────
import type { Member, Payment, ReceiptModalData } from "@/types/reports.types";

interface Props {
  memberId: string;
  year: number;
  type: string;
  members: Member[];
  payments: Payment[];
  currentYear: number;
  onReceiptClick: (data: ReceiptModalData) => void;
}

export default function PaymentCell({
  memberId,
  year,
  type,
  members,
  payments,
  currentYear,
  onReceiptClick,
}: Props) {
  const memberData     = members.find((m) => m.id === memberId);
  const memberPayments = payments.filter((p) => p.member_id === memberId);

  // Determine join year (same logic as useDelinquency)
  const paymentYears        = memberPayments.map((p) => p.year).filter(Boolean);
  const earliestPaymentYear = paymentYears.length > 0 ? Math.min(...paymentYears) : null;
  const dateJoinedYear      = memberData?.date_joined
    ? new Date(memberData.date_joined).getFullYear()
    : null;
  const joinYear = Math.min(
    ...([dateJoinedYear, earliestPaymentYear, currentYear].filter(Boolean) as number[])
  );

  // Not yet a member this year
  if (year < joinYear) {
    return (
      <td
        style={{
          padding: "0.7rem 0.8rem",
          fontSize: "0.75rem",
          textAlign: "center",
          color: "rgba(150,150,150,0.4)",
          background: "rgba(240,240,240,0.3)",
        }}
      >
        N/A
      </td>
    );
  }

  const cellPayments = payments.filter(
    (p) => p.member_id === memberId && p.year === year && p.type === type
  );
  const paid   = cellPayments.length > 0;
  const amount = cellPayments.reduce((s, p) => s + Number(p.amount), 0);

  return (
    <td
      style={{
        padding: "0.7rem 0.8rem",
        fontSize: "0.8rem",
        textAlign: "center",
        background: paid ? "transparent" : "rgba(255,220,0,0.2)",
        cursor: paid ? "pointer" : "default",
      }}
      onClick={() => {
        if (paid && cellPayments.length > 0 && memberData) {
          onReceiptClick({
            member:   memberData,
            payments: cellPayments,
            year,
            type,
            total:    amount,
          });
        }
      }}
    >
      {paid ? (
        <span
          style={{
            color: "#2E8B44",
            fontWeight: 600,
            textDecoration: "underline",
            textDecorationStyle: "dotted",
            cursor: "pointer",
          }}
        >
          ₱{amount.toLocaleString()}
        </span>
      ) : (
        <span style={{ color: "#C0392B", fontSize: "0.72rem", fontWeight: 500 }}>
          —
        </span>
      )}
    </td>
  );
}
