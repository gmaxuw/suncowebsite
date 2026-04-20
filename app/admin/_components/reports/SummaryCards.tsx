// ─────────────────────────────────────────────
// reports/SummaryCards.tsx
//
// Reusable summary card strip.
// Accepts any array of { label, value, color } items.
// Used in ReportsTab — but can be dropped on any page.
// ─────────────────────────────────────────────
import type { SummaryCardItem } from "@/types/summaryCards.types";

interface Props {
  items: SummaryCardItem[];
}

export default function SummaryCards({ items }: Props) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${items.length}, 1fr)`,
        gap: "1rem",
        marginBottom: "2rem",
      }}
    >
      {items.map(({ label, value, color }) => (
        <div
          key={label}
          style={{
            background: "white",
            borderRadius: 10,
            padding: "1.2rem 1.5rem",
            border: "1px solid rgba(26,92,42,0.08)",
            borderLeft: `4px solid ${color}`,
          }}
        >
          <p
            style={{
              fontSize: "0.68rem",
              fontWeight: 500,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--muted)",
              marginBottom: "0.4rem",
            }}
          >
            {label}
          </p>
          <p
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "1.6rem",
              fontWeight: 700,
              color,
            }}
          >
            {value}
          </p>
        </div>
      ))}
    </div>
  );
}
