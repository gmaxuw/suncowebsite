"use client";
// ─────────────────────────────────────────────────────────────
// FinancialTab.tsx — Mobile-responsive shell
// Place at: D:\suncowebsite\app\admin\_components\financial\FinancialTab.tsx
// ─────────────────────────────────────────────────────────────
import { useState } from "react";
import { Building2, ArrowLeftRight, FileText, Archive } from "lucide-react";
import { useWindowWidth } from "@/app/admin/hooks/useWindowWidth";
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
  { id: "accounts",     label: "Accounts",       icon: Building2,      desc: "Bank accounts & cash on hand"   },
  { id: "transactions", label: "Transactions",    icon: ArrowLeftRight, desc: "Income & expenditures"          },
  { id: "generate",     label: "Generate",        icon: FileText,       desc: "Create & lock financial report" },
  { id: "archive",      label: "Archive",         icon: Archive,        desc: "Past generated reports"         },
];

export default function FinancialTab({ canCRUD, supabase, currentUser }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("accounts");
  const { isMobile, isTablet } = useWindowWidth();

  return (
    <div>
      {/* ── Page header ── */}
      <div style={{ marginBottom: isMobile ? "1.2rem" : "2rem" }}>
        <p style={{
          fontSize: "0.72rem", color: "var(--muted)",
          letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.3rem",
        }}>
          Admin Panel
        </p>
        <h1 style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: isMobile ? "1.4rem" : "1.8rem",
          fontWeight: 700, color: "var(--green-dk)",
        }}>
          Financial Reports
          {!isMobile && (
            <span style={{
              marginLeft: 10, fontSize: "0.9rem", color: "var(--muted)",
              fontFamily: "'DM Sans', sans-serif", fontWeight: 400,
            }}>
              as of {new Date().toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" })}
            </span>
          )}
        </h1>
        {isMobile && (
          <p style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: 3 }}>
            {new Date().toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" })}
          </p>
        )}
      </div>

      {/* ── Tab bar ── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)",
        gap: isMobile ? "0.5rem" : "0.75rem",
        marginBottom: isMobile ? "1.2rem" : "2rem",
      }}>
        {TABS.map(({ id, label, icon: Icon, desc }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: isMobile ? 8 : 12,
                padding: isMobile ? "0.75rem 0.8rem" : "1rem 1.2rem",
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
                width: isMobile ? 28 : 36,
                height: isMobile ? 28 : 36,
                borderRadius: 8, flexShrink: 0,
                background: isActive ? "rgba(201,168,76,0.2)" : "rgba(26,92,42,0.06)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Icon size={isMobile ? 13 : 16} color={isActive ? "var(--gold)" : "var(--muted)"} />
              </div>
              <div>
                <div style={{
                  fontSize: isMobile ? "0.72rem" : "0.82rem",
                  fontWeight: 700,
                  color: isActive ? "var(--gold)" : "var(--green-dk)",
                }}>
                  {label}
                </div>
                {!isMobile && (
                  <div style={{
                    fontSize: "0.68rem",
                    color: isActive ? "rgba(255,255,255,0.5)" : "var(--muted)",
                    marginTop: 2,
                  }}>
                    {desc}
                  </div>
                )}
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
