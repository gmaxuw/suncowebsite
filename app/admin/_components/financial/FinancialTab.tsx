"use client";
// ─────────────────────────────────────────────────────────────
// FinancialTab.tsx — SUNCO Financial Report System
// Main shell with 4 tabs:
//   1. Accounts   2. Transactions   3. Generate Report   4. Archive
//
// Place at: D:\suncowebsite\app\admin\_components\financial\FinancialTab.tsx
// ─────────────────────────────────────────────────────────────
import { useState } from "react";
import { Building2, ArrowLeftRight, FileText, Archive } from "lucide-react";
import AccountsPanel     from "./AccountsPanel";
import TransactionsPanel from "./TransactionsPanel";
import GeneratePanel     from "./GeneratePanel";
import ArchivePanel      from "./ArchivePanel";

interface Props {
  canCRUD: boolean;
  supabase: any;
  currentUser?: { id: string; name: string; role: string };
}

type Tab = "accounts" | "transactions" | "generate" | "archive";

const TABS: { id: Tab; label: string; icon: any; desc: string }[] = [
  { id: "accounts",     label: "Accounts",        icon: Building2,      desc: "Bank accounts & cash on hand"   },
  { id: "transactions", label: "Transactions",     icon: ArrowLeftRight, desc: "Income & expenditures"          },
  { id: "generate",     label: "Generate Report",  icon: FileText,       desc: "Create & lock financial report" },
  { id: "archive",      label: "Report Archive",   icon: Archive,        desc: "Past generated reports"         },
];

export default function FinancialTab({ canCRUD, supabase, currentUser }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("accounts");

  return (
    <div>
      {/* ── Page header ── */}
      <div style={{ marginBottom: "2rem" }}>
        <p style={{
          fontSize: "0.72rem", color: "var(--muted)",
          letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.3rem",
        }}>
          Admin Panel
        </p>
        <h1 style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: "1.8rem", fontWeight: 700, color: "var(--green-dk)",
        }}>
          Financial Reports
          <span style={{
            marginLeft: 10, fontSize: "0.9rem", color: "var(--muted)",
            fontFamily: "'DM Sans', sans-serif", fontWeight: 400,
          }}>
            as of {new Date().toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" })}
          </span>
        </h1>
      </div>

      {/* ── Tab bar ── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: "0.75rem",
        marginBottom: "2rem",
      }}>
        {TABS.map(({ id, label, icon: Icon, desc }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "1rem 1.2rem",
                background: isActive ? "var(--green-dk)" : "white",
                border: `1.5px solid ${isActive ? "var(--green-dk)" : "rgba(26,92,42,0.12)"}`,
                borderRadius: 10,
                cursor: "pointer",
                textAlign: "left",
                fontFamily: "'DM Sans', sans-serif",
                transition: "all 0.15s ease",
                boxShadow: isActive ? "0 4px 12px rgba(13,51,32,0.15)" : "none",
              }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                background: isActive ? "rgba(201,168,76,0.2)" : "rgba(26,92,42,0.06)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Icon size={16} color={isActive ? "var(--gold)" : "var(--muted)"} />
              </div>
              <div>
                <div style={{
                  fontSize: "0.82rem", fontWeight: 700,
                  color: isActive ? "var(--gold)" : "var(--green-dk)",
                }}>
                  {label}
                </div>
                <div style={{
                  fontSize: "0.68rem",
                  color: isActive ? "rgba(255,255,255,0.5)" : "var(--muted)",
                  marginTop: 2,
                }}>
                  {desc}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Tab content ── */}
      {activeTab === "accounts"     && <AccountsPanel     supabase={supabase} canCRUD={canCRUD} />}
      {activeTab === "transactions" && <TransactionsPanel supabase={supabase} canCRUD={canCRUD} />}
      {activeTab === "generate"     && <GeneratePanel     supabase={supabase} canCRUD={canCRUD} currentUser={currentUser} />}
      {activeTab === "archive"      && <ArchivePanel      supabase={supabase} canCRUD={canCRUD} />}
    </div>
  );
}
