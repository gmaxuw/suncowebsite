"use client";

import { useState, useCallback } from "react";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
type ScenarioType =
  | "restaurant-solo"
  | "restaurant-group"
  | "pharmacy"
  | "market-20"
  | "market-5"
  | null;

interface SelectedProduct {
  id: string;
  name: string;
  cat: "basic" | "prime";
  price: number;
}

interface BreakdownRow {
  label: string;
  sub?: string;
  value: string;
  isTotal?: boolean;
  isEmpty?: boolean;
}

// ─────────────────────────────────────────────
// BNPC Product Lists — RA 7581 / RA 10623 / JAO 24-02
// ─────────────────────────────────────────────
const BASIC_NECESSITIES = [
  "Rice",
  "Corn / Root crops",
  "Bread",
  "Fresh fish / Marine products",
  "Canned fish / Marine products",
  "Dried fish",
  "Fresh pork",
  "Fresh beef",
  "Fresh poultry (chicken/duck)",
  "Fresh eggs",
  "Fresh vegetables",
  "Fresh fruits",
  "Fresh milk",
  "Processed milk",
  "Instant noodles (locally manufactured)",
  "Coffee",
  "Sugar",
  "Cooking oil",
  "Salt",
  "Laundry soap",
  "Detergent",
  "Candles",
  "Firewood / Charcoal",
  "Kerosene",
  "Household LPG (≤11kg cylinder)",
  "Bottled / Purified water",
  "DOH-classified essential drugs",
];

const PRIME_COMMODITIES = [
  "Flour",
  "Canned / Processed pork, beef, poultry",
  "Dairy products (non-basic)",
  "Onions",
  "Garlic",
  "Vinegar",
  "Patis (fish sauce)",
  "Soy sauce",
  "Toilet soap",
  "Fertilizer",
  "Pesticides / Herbicides",
  "Poultry & livestock feeds",
  "Fishery feeds",
  "Veterinary products",
  "Paper / Pad paper",
  "School supplies",
  "Nipa shingles",
  "Sawali",
  "Cement / Clinker",
  "GI sheets (galvanized iron)",
  "Hollow blocks",
  "Plywood / Plyboard",
  "Construction nails",
  "Batteries (single-use household)",
  "Electrical supplies",
  "Light bulbs",
  "Steel wire",
];

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
const fmt = (n: number) =>
  "₱" +
  n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────

function ScenarioButton({
  type,
  icon,
  label,
  sub,
  active,
  onClick,
}: {
  type: ScenarioType;
  icon: string;
  label: string;
  sub: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`scenario-btn ${active ? "active" : ""}`}
      aria-pressed={active}
    >
      <span className="scenario-icon">{icon}</span>
      <span className="scenario-label">{label}</span>
      <span className="scenario-sub">{sub}</span>
    </button>
  );
}

function InfoBox({ children }: { children: React.ReactNode }) {
  return <div className="info-box">{children}</div>;
}

function WarnBox({ message }: { message: string }) {
  if (!message) return null;
  return <div className="warn-box">⚠️ {message}</div>;
}

function BreakdownTable({ rows }: { rows: BreakdownRow[] }) {
  return (
    <div className="breakdown-table">
      {rows.map((r, i) =>
        r.isEmpty ? null : (
          <div key={i} className={`b-row ${r.isTotal ? "b-total" : ""}`}>
            <span className="b-label">
              {r.label}
              {r.sub && <small>{r.sub}</small>}
            </span>
            <span className="b-value">{r.value}</span>
          </div>
        )
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Main Calculator Component
// ─────────────────────────────────────────────
export default function SeniorCitizenCalculator() {
  const [scenario, setScenario] = useState<ScenarioType>(null);
  const [amount, setAmount] = useState("");
  const [totalPersons, setTotalPersons] = useState("3");
  const [scPersons, setScPersons] = useState("1");
  const [selectedProds, setSelectedProds] = useState<
    Record<string, SelectedProduct>
  >({});
  const [result, setResult] = useState<{
    rows: BreakdownRow[];
    savings: string;
    lawnote: string;
    title: string;
  } | null>(null);
  const [warn, setWarn] = useState("");

  const pickScenario = useCallback((t: ScenarioType) => {
    setScenario(t);
    setResult(null);
    setWarn("");
    setSelectedProds({});
    setAmount("");
  }, []);

  const toggleProduct = useCallback(
    (id: string, name: string, cat: "basic" | "prime") => {
      setSelectedProds((prev) => {
        const next = { ...prev };
        if (next[id]) {
          delete next[id];
        } else {
          next[id] = { id, name, cat, price: 0 };
        }
        return next;
      });
      setResult(null);
    },
    []
  );

  const setProductPrice = useCallback((id: string, val: string) => {
    setSelectedProds((prev) => ({
      ...prev,
      [id]: { ...prev[id], price: parseFloat(val) || 0 },
    }));
    setResult(null);
  }, []);

  const selectedIds = Object.keys(selectedProds);
  const selectedCount = selectedIds.length;
  const bnpcTotal = selectedIds.reduce(
    (sum, id) => sum + (selectedProds[id]?.price || 0),
    0
  );

  const compute = () => {
    setWarn("");
    if (!scenario) return;

    const rows: BreakdownRow[] = [];
    let savings = "";
    let lawnote = "";
    let title = "📋 Discount Breakdown";

    if (scenario === "market-5") {
      if (selectedCount < 4) {
        setWarn(
          "You need at least 4 different BNPC item types selected to qualify for the 5% special discount under JAO 24-02."
        );
        return;
      }
      const anyMissing = selectedIds.some((id) => !selectedProds[id].price);
      if (anyMissing || bnpcTotal <= 0) {
        setWarn("Please enter a price for each selected product.");
        return;
      }

      const eligible = Math.min(bnpcTotal, 2500);
      const excess = bnpcTotal > 2500 ? bnpcTotal - 2500 : 0;
      const discount = eligible * 0.05;
      const toPay = bnpcTotal - discount;
      title = "📋 5% BNPC Special Discount — JAO 24-02";

      rows.push({
        label: `Selected BNPC items (${selectedCount} kinds)`,
        value: fmt(bnpcTotal),
      });
      rows.push({
        label: "Items purchased",
        sub: selectedIds
          .map(
            (id) =>
              `${selectedProds[id].name} (${selectedProds[id].cat === "basic" ? "Basic" : "Prime"}) — ${fmt(selectedProds[id].price)}`
          )
          .join(" • "),
        value: "",
        isEmpty: false,
      });
      if (excess > 0) {
        rows.push({
          label: "Eligible amount (weekly cap ₱2,500)",
          sub: "JAO 24-02: maximum ₱2,500 eligible per week",
          value: fmt(eligible),
        });
        rows.push({
          label: "Amount above weekly cap (no discount)",
          sub: fmt(excess) + " charged at full price",
          value: fmt(excess),
        });
      }
      rows.push({
        label: "5% special discount",
        sub: "No VAT exemption under this discount (JAO 24-02)",
        value: "− " + fmt(discount),
      });
      rows.push({
        label: "AMOUNT TO PAY",
        value: fmt(toPay),
        isTotal: true,
      });

      savings = `You save ${fmt(discount)} this week (max ₱125/week)`;
      lawnote = [
        "<strong>JAO 24-02 (DTI–DA–DOE, March 21, 2024):</strong>",
        "• 5% discount — <strong>no VAT exemption</strong> under this discount",
        "• Max discount: ₱125 per week | Max eligible purchase: ₱2,500 per week",
        "• Must purchase at least <strong>4 different kinds</strong> of locally produced BNPCs",
        "• <strong>Purchase booklet is required</strong> at every transaction",
        "• Cannot be combined with the 20% RA 9994 discount or store promotions",
        "• Unused discount does <strong>not carry over</strong> to the next week",
        "• LPG (≤11kg): 5% discount once every 5 months only",
        "• Does not apply to BMBEs and CDA-registered cooperatives",
      ].join("<br>");
    } else {
      const amt = parseFloat(amount);
      if (!amt || amt <= 0) {
        setWarn("Please enter a valid amount.");
        return;
      }
      let scShare = amt;

      if (scenario === "restaurant-group") {
        const totP = parseInt(totalPersons) || 1;
        const scP = parseInt(scPersons) || 1;
        if (scP > totP) {
          setWarn("Senior citizens cannot exceed total persons.");
          return;
        }
        scShare = (amt / totP) * scP;
        rows.push({
          label: `Full group bill (${totP} persons)`,
          value: fmt(amt),
        });
        rows.push({
          label: `SC's proportional share (${scP} of ${totP})`,
          sub: "Formula: Total Bill ÷ Total Persons × No. of SCs",
          value: fmt(scShare),
        });
      } else {
        rows.push({
          label: "Total bill / purchase amount",
          value: fmt(amt),
        });
      }

      const vatAmt = scShare - scShare / 1.12;
      const base = scShare / 1.12;
      rows.push({
        label: "Less: 12% VAT removed",
        sub: "SC is VAT-exempt under RA 9994 — Formula: Amount ÷ 1.12",
        value: "− " + fmt(vatAmt),
      });
      rows.push({
        label: "Price exclusive of VAT",
        sub: "This is the base for the 20% SC discount",
        value: fmt(base),
      });
      const disc = base * 0.2;
      const scPays = base - disc;
      rows.push({
        label: "Less: 20% Senior Citizen discount",
        sub: "RA 9994 — no cap, no maximum, no expiry",
        value: "− " + fmt(disc),
      });

      if (scenario === "restaurant-group") {
        const nonSc = amt - scShare;
        const grand = nonSc + scPays;
        rows.push({
          label: "SC portion to pay",
          sub: "After VAT removal + 20% off",
          value: fmt(scPays),
        });
        rows.push({
          label: "Non-SC companions (full price)",
          sub: "No discount for non-senior companions",
          value: fmt(nonSc),
        });
        rows.push({
          label: "TOTAL GROUP BILL TO PAY",
          value: fmt(grand),
          isTotal: true,
        });
        savings = `SC saves ${fmt(disc + vatAmt)} on their portion`;
      } else {
        rows.push({
          label: "AMOUNT TO PAY",
          value: fmt(scPays),
          isTotal: true,
        });
        savings = `Total savings: ${fmt(amt - scPays)}`;
      }

      const notes: Record<string, string> = {
        "restaurant-solo":
          "<strong>Legal basis:</strong> RA 9994, Rule IV Art. 7; BIR RR 7-2010. Covers food, non-alcoholic beverages, desserts, and other consumables (dine-in, take-out, delivery). Excluded: alcohol, tobacco, and children's meal sets not for the senior's personal consumption. Present OSCA ID or any government-issued ID showing age 60+. No purchase booklet required.",
        "restaurant-group":
          "<strong>Legal basis:</strong> BIR RR 7-2010, Q&A No. 1. When orders are shared or cannot be individualized, the SC's share is computed proportionally (Total Bill ÷ Total Persons × SC Count). Tip: Ask the restaurant to process the SC's order separately to simplify the transaction and avoid disputes.",
        pharmacy:
          "<strong>Legal basis:</strong> RA 9994 Sec. 4(a); BIR RR 7-2010; FDA Circular 2025-005; DOH AO 2024-0017 (Dec. 23, 2024). Both the 12% VAT exemption AND 20% discount apply together. Covers all FDA-approved medicines, vitamins, mineral supplements, and medical devices. <strong>No purchase booklet required</strong> — only a valid OSCA ID or government-issued ID. A doctor's prescription is required for prescription (Rx) medicines.",
        "market-20":
          "<strong>Legal basis:</strong> RA 9994 Sec. 4(a). The 20% SC discount + 12% VAT exemption apply to goods for the SC's personal and exclusive use. Excluded: alcohol, tobacco, luxury goods, and goods purchased for resale. No booklet required. This discount cannot be combined with the separate 5% BNPC special discount under JAO 24-02.",
      };
      lawnote = notes[scenario] || "";
    }

    setResult({ rows, savings, lawnote, title });
  };

  const reset = () => {
    setScenario(null);
    setResult(null);
    setWarn("");
    setAmount("");
    setSelectedProds({});
  };

  return (
    <>
      <style>{`
        .sc-calc {
          font-family: 'Noto Serif', Georgia, serif;
          max-width: 720px;
          margin: 0 auto;
          padding: 2rem 1rem 3rem;
          color: #1a2e1a;
        }

        /* ── Header ── */
        .sc-header {
          text-align: center;
          margin-bottom: 2rem;
        }
        .sc-law-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #0F6E56;
          color: #E1F5EE;
          font-family: 'DM Sans', system-ui, sans-serif;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 1px;
          text-transform: uppercase;
          padding: 4px 14px;
          border-radius: 20px;
          margin-bottom: 12px;
        }
        .sc-header h2 {
          font-size: clamp(22px, 4vw, 30px);
          font-weight: 700;
          color: #0a1f0a;
          line-height: 1.2;
          margin-bottom: 8px;
        }
        .sc-header p {
          font-size: 14px;
          color: #4a6b4a;
          font-family: 'DM Sans', system-ui, sans-serif;
          line-height: 1.6;
        }
        .sc-divider {
          width: 48px;
          height: 3px;
          background: #1D9E75;
          margin: 14px auto 0;
          border-radius: 2px;
        }

        /* ── Cards ── */
        .sc-card {
          background: #fff;
          border: 1px solid #c8dfc8;
          border-radius: 14px;
          padding: 1.4rem;
          margin-bottom: 1.1rem;
          box-shadow: 0 2px 8px rgba(15,110,86,0.06);
        }
        .sc-card-title {
          font-family: 'DM Sans', system-ui, sans-serif;
          font-size: 11px;
          font-weight: 700;
          color: #4a7a5a;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 1rem;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .sc-card-title::before {
          content: '';
          display: inline-block;
          width: 18px;
          height: 2px;
          background: #1D9E75;
          border-radius: 1px;
        }

        /* ── Scenario buttons ── */
        .scenario-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(126px, 1fr));
          gap: 9px;
        }
        .scenario-btn {
          border: 1.5px solid #c8dfc8;
          border-radius: 12px;
          padding: 12px 8px 10px;
          cursor: pointer;
          background: #f8fdf8;
          text-align: center;
          transition: all 0.15s ease;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0;
        }
        .scenario-btn:hover {
          background: #edf7ed;
          border-color: #5DCAA5;
        }
        .scenario-btn.active {
          border: 2px solid #0F6E56;
          background: #e1f5ee;
          box-shadow: 0 0 0 3px rgba(29,158,117,0.12);
        }
        .scenario-icon {
          font-size: 22px;
          display: block;
          margin-bottom: 5px;
          line-height: 1;
        }
        .scenario-label {
          font-family: 'DM Sans', system-ui, sans-serif;
          font-size: 12px;
          font-weight: 600;
          color: #1a3a1a;
          display: block;
          line-height: 1.3;
        }
        .scenario-sub {
          font-family: 'DM Sans', system-ui, sans-serif;
          font-size: 10px;
          color: #5a7a5a;
          margin-top: 2px;
          display: block;
          line-height: 1.3;
        }

        /* ── Form inputs ── */
        .field-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
          margin-bottom: 14px;
        }
        .field-row.one { grid-template-columns: 1fr; }
        @media (max-width: 500px) { .field-row { grid-template-columns: 1fr; } }
        .field-group label {
          font-family: 'DM Sans', system-ui, sans-serif;
          font-size: 12px;
          font-weight: 600;
          color: #2a5a2a;
          display: block;
          margin-bottom: 5px;
          text-transform: uppercase;
          letter-spacing: 0.4px;
        }
        .field-group input,
        .field-group select {
          width: 100%;
          padding: 9px 12px;
          border: 1.5px solid #c8dfc8;
          border-radius: 8px;
          font-family: 'DM Sans', system-ui, sans-serif;
          font-size: 14px;
          color: #1a2e1a;
          background: #f8fdf8;
          outline: none;
          transition: border-color 0.15s;
        }
        .field-group input:focus,
        .field-group select:focus {
          border-color: #1D9E75;
          background: #fff;
        }
        .field-hint {
          font-family: 'DM Sans', system-ui, sans-serif;
          font-size: 11px;
          color: #5a7a5a;
          margin-top: 4px;
          line-height: 1.4;
        }

        /* ── Info / warn boxes ── */
        .info-box {
          background: #edf7f1;
          border: 1px solid #9FE1CB;
          border-left: 4px solid #1D9E75;
          border-radius: 0 8px 8px 0;
          padding: 10px 14px;
          font-family: 'DM Sans', system-ui, sans-serif;
          font-size: 12px;
          color: #085041;
          margin-bottom: 14px;
          line-height: 1.7;
        }
        .warn-box {
          background: #FFF8EE;
          border: 1px solid #FAC775;
          border-left: 4px solid #EF9F27;
          border-radius: 0 8px 8px 0;
          padding: 10px 14px;
          font-family: 'DM Sans', system-ui, sans-serif;
          font-size: 12px;
          color: #633806;
          margin-bottom: 12px;
          line-height: 1.6;
        }

        /* ── BNPC Product picker ── */
        .cat-header {
          font-family: 'DM Sans', system-ui, sans-serif;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.8px;
          text-transform: uppercase;
          color: #3a6a3a;
          margin: 14px 0 7px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .cat-tag {
          font-size: 10px;
          font-weight: 600;
          padding: 2px 8px;
          border-radius: 10px;
          letter-spacing: 0.3px;
        }
        .cat-tag.basic { background: #E1F5EE; color: #0F6E56; }
        .cat-tag.prime { background: #E6F1FB; color: #185FA5; }

        .prod-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
          gap: 6px;
          margin-bottom: 6px;
        }
        .prod-btn {
          border: 1px solid #d0e8d0;
          border-radius: 8px;
          padding: 7px 10px;
          cursor: pointer;
          background: #f4faf4;
          font-family: 'DM Sans', system-ui, sans-serif;
          font-size: 12px;
          color: #3a5a3a;
          text-align: left;
          display: flex;
          align-items: center;
          gap: 7px;
          transition: all 0.1s;
          line-height: 1.3;
        }
        .prod-btn:hover { border-color: #5DCAA5; background: #e8f5e8; }
        .prod-btn.sel {
          border: 1.5px solid #0F6E56;
          background: #E1F5EE;
          color: #085041;
          font-weight: 600;
        }
        .prod-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          border: 1.5px solid #9FE1CB;
          background: #fff;
          flex-shrink: 0;
          transition: all 0.1s;
        }
        .prod-btn.sel .prod-dot {
          background: #1D9E75;
          border-color: #1D9E75;
        }

        .kinds-counter {
          font-family: 'DM Sans', system-ui, sans-serif;
          font-size: 12px;
          font-weight: 600;
          padding: 4px 12px;
          border-radius: 12px;
          background: #f0f7f0;
          color: #5a7a5a;
          border: 1px solid #c8dfc8;
          display: inline-block;
          margin-bottom: 10px;
          transition: all 0.15s;
        }
        .kinds-counter.ok {
          background: #E1F5EE;
          color: #0F6E56;
          border-color: #5DCAA5;
        }

        .price-inputs-section {
          border-top: 1px solid #d0e8d0;
          margin-top: 14px;
          padding-top: 14px;
        }
        .price-inputs-title {
          font-family: 'DM Sans', system-ui, sans-serif;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          color: #3a6a3a;
          margin-bottom: 10px;
        }
        .price-row {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 8px;
        }
        .price-row-name {
          font-family: 'DM Sans', system-ui, sans-serif;
          font-size: 13px;
          color: #1a3a1a;
          flex: 1;
          min-width: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .price-row input {
          width: 100px;
          flex-shrink: 0;
          padding: 7px 10px;
          border: 1.5px solid #c8dfc8;
          border-radius: 7px;
          font-family: 'DM Sans', system-ui, sans-serif;
          font-size: 13px;
          background: #f8fdf8;
          color: #1a2e1a;
          outline: none;
        }
        .price-row input:focus { border-color: #1D9E75; background: #fff; }
        .bnpc-total-display {
          background: #f0f7f0;
          border: 1px solid #c8dfc8;
          border-radius: 8px;
          padding: 9px 14px;
          font-family: 'DM Sans', system-ui, sans-serif;
          font-size: 13px;
          color: #3a5a3a;
          margin-top: 8px;
        }
        .bnpc-total-display strong {
          color: #0F6E56;
          font-size: 15px;
        }

        /* ── Compute button ── */
        .compute-btn {
          width: 100%;
          padding: 13px;
          background: #0F6E56;
          color: #fff;
          border: none;
          border-radius: 10px;
          font-family: 'DM Sans', system-ui, sans-serif;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          margin-top: 6px;
          letter-spacing: 0.3px;
          transition: background 0.15s, transform 0.1s;
        }
        .compute-btn:hover { background: #085041; }
        .compute-btn:active { transform: scale(0.99); }

        /* ── Result card ── */
        .result-card {
          background: linear-gradient(145deg, #e8f5e8, #f0faf0);
          border: 1.5px solid #5DCAA5;
          border-radius: 14px;
          padding: 1.4rem;
          margin-top: 1rem;
        }
        .result-title {
          font-family: 'DM Sans', system-ui, sans-serif;
          font-size: 11px;
          font-weight: 700;
          color: #0F6E56;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 1rem;
        }
        .breakdown-table { border-collapse: collapse; width: 100%; }
        .b-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 8px 0;
          border-bottom: 1px solid rgba(29,158,117,0.2);
          gap: 12px;
        }
        .b-row:last-child { border-bottom: none; }
        .b-label {
          font-family: 'DM Sans', system-ui, sans-serif;
          font-size: 13px;
          color: #085041;
          flex: 1;
          line-height: 1.4;
        }
        .b-label small {
          display: block;
          font-size: 11px;
          color: #5DCAA5;
          margin-top: 2px;
          line-height: 1.4;
          font-weight: 400;
        }
        .b-value {
          font-family: 'DM Sans', system-ui, sans-serif;
          font-size: 14px;
          font-weight: 600;
          color: #085041;
          white-space: nowrap;
          padding-top: 1px;
        }
        .b-total {
          padding-top: 12px;
          margin-top: 6px;
          border-top: 2px solid #1D9E75;
          border-bottom: none !important;
        }
        .b-total .b-label {
          font-size: 15px;
          font-weight: 700;
          color: #0F6E56;
        }
        .b-total .b-value {
          font-size: 22px;
          color: #0F6E56;
        }
        .savings-pill {
          display: inline-block;
          background: #085041;
          color: #9FE1CB;
          font-family: 'DM Sans', system-ui, sans-serif;
          font-size: 12px;
          font-weight: 600;
          padding: 5px 16px;
          border-radius: 20px;
          margin-top: 12px;
        }

        /* ── Law note ── */
        .law-note {
          background: #fff;
          border: 1px solid #c8dfc8;
          border-left: 4px solid #1D9E75;
          border-radius: 0 10px 10px 0;
          padding: 12px 16px;
          font-family: 'DM Sans', system-ui, sans-serif;
          font-size: 12px;
          color: #3a5a3a;
          margin-top: 1rem;
          line-height: 1.8;
        }
        .law-note strong { color: #0a2a0a; font-weight: 600; }

        /* ── Reset button ── */
        .reset-btn {
          width: 100%;
          padding: 9px;
          background: transparent;
          border: 1px solid #c8dfc8;
          border-radius: 8px;
          font-family: 'DM Sans', system-ui, sans-serif;
          font-size: 13px;
          color: #4a6b4a;
          cursor: pointer;
          margin-top: 10px;
          transition: background 0.12s;
        }
        .reset-btn:hover { background: #f0f7f0; }

        /* ── Disclaimer ── */
        .sc-disclaimer {
          font-family: 'DM Sans', system-ui, sans-serif;
          font-size: 11px;
          color: #7a9a7a;
          text-align: center;
          margin-top: 1.5rem;
          line-height: 1.6;
          padding: 0 1rem;
        }
      `}</style>

      <div className="sc-calc">
        {/* Header */}
        <div className="sc-header">
          <div className="sc-law-badge">
            RA 9994 · JAO 24-02 · BIR RR 7-2010 · RA 7581
          </div>
          <h2>Senior Citizen Discount Calculator</h2>
          <p>
            Know your rights under Philippine law.
            <br />
            Accurate computation for restaurants, drugstores, and basic
            necessities.
          </p>
          <div className="sc-divider" />
        </div>

        {/* Step 1 — Scenario */}
        <div className="sc-card">
          <div className="sc-card-title">Step 1 — Type of purchase</div>
          <div className="scenario-grid">
            {[
              {
                type: "restaurant-solo" as ScenarioType,
                icon: "🍽️",
                label: "Restaurant",
                sub: "Dining alone",
              },
              {
                type: "restaurant-group" as ScenarioType,
                icon: "👨‍👩‍👧",
                label: "Restaurant",
                sub: "With companions",
              },
              {
                type: "pharmacy" as ScenarioType,
                icon: "💊",
                label: "Drugstore",
                sub: "Medicines & medical",
              },
              {
                type: "market-20" as ScenarioType,
                icon: "🛒",
                label: "Store — 20% SC",
                sub: "Personal use items",
              },
              {
                type: "market-5" as ScenarioType,
                icon: "📋",
                label: "Store — 5% BNPC",
                sub: "Basic necessities",
              },
            ].map((s) => (
              <ScenarioButton
                key={s.type}
                type={s.type}
                icon={s.icon}
                label={s.label}
                sub={s.sub}
                active={scenario === s.type}
                onClick={() => pickScenario(s.type)}
              />
            ))}
          </div>
        </div>

        {/* Step 2 — Inputs */}
        {scenario && (
          <div className="sc-card">
            <div className="sc-card-title">
              {scenario === "market-5"
                ? "Step 2 — Select BNPC items & enter prices"
                : "Step 2 — Enter details"}
            </div>

            {/* Info boxes per scenario */}
            {scenario === "restaurant-solo" && (
              <InfoBox>
                <strong>Formula (BIR RR 7-2010):</strong> Remove 12% VAT first,
                then deduct 20% SC discount.
                <br />
                Amount ÷ 1.12 × 0.80 = Amount to pay
              </InfoBox>
            )}
            {scenario === "restaurant-group" && (
              <InfoBox>
                <strong>BIR RR 7-2010, Q&A No. 1:</strong> The SC's
                proportional share of the bill gets VAT removed + 20% discount.
                Non-SC companions pay full price.
              </InfoBox>
            )}
            {scenario === "pharmacy" && (
              <InfoBox>
                <strong>BIR RR 7-2010 + FDA Circular 2025-005:</strong> VAT
                (12%) is removed first, then 20% SC discount applied. Both
                exemptions apply together.
                <br />
                Formula: Amount ÷ 1.12 × 0.80 = Amount to pay
                <br />
                <br />
                No purchase booklet required as of DOH AO 2024-0017 (Dec. 23,
                2024). Valid ID only.
              </InfoBox>
            )}
            {scenario === "market-20" && (
              <InfoBox>
                <strong>RA 9994 Sec. 4(a):</strong> VAT removed first, then 20%
                SC discount. For goods purchased for the SC's personal and
                exclusive use only. Excluded: alcohol, tobacco, luxury goods. No
                booklet required.
              </InfoBox>
            )}
            {scenario === "market-5" && (
              <InfoBox>
                <strong>JAO 24-02 (March 21, 2024):</strong> 5% special
                discount on Basic Necessities & Prime Commodities. Separate from
                the 20% SC discount — cannot be combined.{" "}
                <strong>Purchase booklet is required.</strong>
              </InfoBox>
            )}

            {/* Group dining fields */}
            {scenario === "restaurant-group" && (
              <div className="field-row">
                <div className="field-group">
                  <label>Total persons in group</label>
                  <input
                    type="number"
                    min={2}
                    max={50}
                    value={totalPersons}
                    onChange={(e) => {
                      setTotalPersons(e.target.value);
                      setResult(null);
                    }}
                  />
                </div>
                <div className="field-group">
                  <label>Senior citizens with valid ID</label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={scPersons}
                    onChange={(e) => {
                      setScPersons(e.target.value);
                      setResult(null);
                    }}
                  />
                  <div className="field-hint">
                    Each must present OSCA ID or gov't ID showing age 60+
                  </div>
                </div>
              </div>
            )}

            {/* BNPC product picker */}
            {scenario === "market-5" && (
              <>
                <div
                  className={`kinds-counter ${selectedCount >= 4 ? "ok" : ""}`}
                >
                  {selectedCount} kind{selectedCount !== 1 ? "s" : ""} selected
                  {selectedCount >= 4 ? " ✓" : ` (minimum 4 required)`}
                </div>

                <div className="cat-header">
                  Basic Necessities{" "}
                  <span className="cat-tag basic">RA 7581</span>
                </div>
                <div className="prod-grid">
                  {BASIC_NECESSITIES.map((p, i) => {
                    const id = `B${i}`;
                    const sel = !!selectedProds[id];
                    return (
                      <button
                        key={id}
                        className={`prod-btn ${sel ? "sel" : ""}`}
                        onClick={() => toggleProduct(id, p, "basic")}
                      >
                        <span className="prod-dot" />
                        {p}
                      </button>
                    );
                  })}
                </div>

                <div className="cat-header">
                  Prime Commodities{" "}
                  <span className="cat-tag prime">RA 7581</span>
                </div>
                <div className="prod-grid">
                  {PRIME_COMMODITIES.map((p, i) => {
                    const id = `P${i}`;
                    const sel = !!selectedProds[id];
                    return (
                      <button
                        key={id}
                        className={`prod-btn ${sel ? "sel" : ""}`}
                        onClick={() => toggleProduct(id, p, "prime")}
                      >
                        <span className="prod-dot" />
                        {p}
                      </button>
                    );
                  })}
                </div>

                {selectedCount > 0 && (
                  <div className="price-inputs-section">
                    <div className="price-inputs-title">
                      Enter price for each selected item (₱)
                    </div>
                    {selectedIds.map((id) => (
                      <div key={id} className="price-row">
                        <span className="price-row-name">
                          {selectedProds[id].name}
                        </span>
                        <input
                          type="number"
                          min={0}
                          step={0.01}
                          placeholder="₱0.00"
                          value={selectedProds[id].price || ""}
                          onChange={(e) => setProductPrice(id, e.target.value)}
                        />
                      </div>
                    ))}
                    <div className="bnpc-total-display">
                      Computed total:{" "}
                      <strong>{fmt(bnpcTotal)}</strong>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Standard amount input */}
            {scenario !== "market-5" && (
              <div className="field-row one">
                <div className="field-group">
                  <label>
                    {scenario === "pharmacy"
                      ? "Total medicine / medical purchase (₱)"
                      : scenario === "market-20"
                        ? "Total eligible goods amount (₱)"
                        : "Total bill amount (₱)"}
                  </label>
                  <input
                    type="number"
                    min={1}
                    placeholder="e.g. 750.00"
                    value={amount}
                    onChange={(e) => {
                      setAmount(e.target.value);
                      setResult(null);
                    }}
                  />
                  <div className="field-hint">
                    {scenario === "pharmacy"
                      ? "Medicines, vitamins, supplements, medical devices at retail price"
                      : scenario === "market-20"
                        ? "For personal and exclusive use only — not for resale or bulk"
                        : "Enter the full amount before any discount"}
                  </div>
                </div>
              </div>
            )}

            <WarnBox message={warn} />
            <button className="compute-btn" onClick={compute}>
              Compute my discount →
            </button>
          </div>
        )}

        {/* Result */}
        {result && (
          <>
            <div className="result-card">
              <div className="result-title">{result.title}</div>
              <BreakdownTable rows={result.rows} />
              <div className="savings-pill">{result.savings}</div>
            </div>
            {result.lawnote && (
              <div
                className="law-note"
                dangerouslySetInnerHTML={{ __html: result.lawnote }}
              />
            )}
            <button className="reset-btn" onClick={reset}>
              ← Compute another
            </button>
          </>
        )}

        <div className="sc-disclaimer">
          This calculator is for informational purposes only. Results are based
          on RA 9994, JAO 24-02, BIR RR 7-2010, and RA 7581 as of 2025.
          <br />
          Always verify with the establishment. Compiled by SUNCO — Surigao del
          Norte Consumers Organization, Inc.
        </div>
      </div>
    </>
  );
}
