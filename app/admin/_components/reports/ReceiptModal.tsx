// ─────────────────────────────────────────────
// reports/ReceiptModal.tsx
//
// Modal overlay showing full payment details.
// Triggered when a paid PaymentCell is clicked.
// ─────────────────────────────────────────────
import { X } from "lucide-react";
import type { ReceiptModalData } from "@/types/reports.types";

interface Props {
  data: ReceiptModalData;
  onClose: () => void;
}

export default function ReceiptModal({ data, onClose }: Props) {
  const { member, payments, total } = data;

  const typeLabel = (type: string) => {
    if (type === "mas")      return "Mortuary Assistance (MAS)";
    if (type === "aof")      return "Annual Operating Fund";
    if (type === "lifetime") return "Lifetime Membership";
    return type;
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        zIndex: 300,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
      }}
      onClick={(e) => {
        // Close on backdrop click
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: "white",
          borderRadius: 12,
          maxWidth: 460,
          width: "100%",
          overflow: "hidden",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        }}
      >
        {/* Header */}
        <div
          style={{
            background: "var(--green-dk)",
            padding: "1.5rem 2rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <p
              style={{
                fontSize: "0.65rem",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.5)",
                marginBottom: "0.2rem",
              }}
            >
              Official Receipt
            </p>
            <h2
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "1.1rem",
                fontWeight: 700,
                color: "var(--gold-lt)",
              }}
            >
              Payment Details
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.1)",
              border: "none",
              color: "white",
              width: 30,
              height: 30,
              borderRadius: "50%",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={15} />
          </button>
        </div>

        <div style={{ padding: "1.5rem 2rem" }}>
          {/* Member info */}
          <div
            style={{
              background: "var(--warm)",
              borderRadius: 8,
              padding: "1rem",
              marginBottom: "1.2rem",
            }}
          >
            <p
              style={{
                fontSize: "0.7rem",
                color: "var(--muted)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: "0.3rem",
              }}
            >
              Member
            </p>
            <p style={{ fontSize: "1rem", fontWeight: 600, color: "var(--green-dk)" }}>
              {member.first_name} {member.last_name}
            </p>
            <p style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: 2 }}>
              {member.member_id_code || "No ID"} · Joined{" "}
              {member.date_joined
                ? new Date(member.date_joined).getFullYear()
                : "—"}
            </p>
          </div>

          {/* Payment rows */}
          {payments.map((p, i) => (
            <div
              key={p.id || i}
              style={{
                borderBottom: "1px solid rgba(26,92,42,0.08)",
                paddingBottom: "0.8rem",
                marginBottom: "0.8rem",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                <div>
                  <p
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: 500,
                      color: "var(--green-dk)",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    {typeLabel(p.type)}
                  </p>
                  <p style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: 2 }}>
                    Year: {p.year}
                  </p>
                  {p.receipt_number && (
                    <p style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: 1 }}>
                      OR No.:{" "}
                      <strong style={{ color: "var(--green-dk)", fontFamily: "monospace" }}>
                        {p.receipt_number}
                      </strong>
                    </p>
                  )}
                </div>
                <p
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    fontSize: "1.1rem",
                    fontWeight: 700,
                    color: "var(--green-dk)",
                  }}
                >
                  ₱{Number(p.amount).toLocaleString()}
                </p>
              </div>

              {/* Date grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "0.5rem",
                  marginTop: "0.6rem",
                }}
              >
                {[
                  {
                    label: "Date Paid",
                    value: p.date_paid
                      ? new Date(p.date_paid).toLocaleDateString("en-PH", {
                          year: "numeric", month: "long", day: "numeric",
                        })
                      : "—",
                  },
                  {
                    label: "Recorded",
                    value: p.created_at
                      ? new Date(p.created_at).toLocaleDateString("en-PH", {
                          year: "numeric", month: "short", day: "numeric",
                        }) +
                        " " +
                        new Date(p.created_at).toLocaleTimeString("en-PH", {
                          hour: "2-digit", minute: "2-digit",
                        })
                      : "—",
                  },
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    style={{ background: "var(--cream)", borderRadius: 4, padding: "0.4rem 0.6rem" }}
                  >
                    <p
                      style={{
                        fontSize: "0.62rem",
                        color: "var(--muted)",
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        marginBottom: "0.1rem",
                      }}
                    >
                      {label}
                    </p>
                    <p style={{ fontSize: "0.78rem", fontWeight: 500, color: "var(--text)" }}>
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Total */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "0.8rem 0",
              borderTop: "2px solid var(--gold)",
            }}
          >
            <span style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--green-dk)" }}>
              Total
            </span>
            <span
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "1.4rem",
                fontWeight: 700,
                color: "var(--green-dk)",
              }}
            >
              ₱{Number(total).toLocaleString()}
            </span>
          </div>

          <button
            onClick={onClose}
            style={{
              width: "100%",
              background: "var(--gold)",
              color: "var(--green-dk)",
              border: "none",
              padding: "0.8rem",
              borderRadius: 6,
              fontSize: "0.85rem",
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              marginTop: "0.5rem",
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
