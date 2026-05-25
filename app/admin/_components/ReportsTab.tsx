"use client";

import { useState, useEffect } from "react";
import SummaryCards from "@/app/admin/_components/reports/SummaryCards";
import ExportPanel  from "@/app/admin/_components/reports/ExportPanel";
import ImportPanel  from "@/app/admin/_components/reports/ImportPanel";
import RecordsTable from "@/app/admin/_components/reports/RecordsTable";
import { useDelinquency } from "@/app/admin/hooks/useDelinquency";
import { useReportsData } from "@/app/admin/hooks/useReportsData";
import type { SummaryCardItem } from "@/types/reports.types";
import type { ActiveTab, FeeSchedule, OfficerRecord } from "@/utils/export";

interface Props {
  canCRUD: boolean;
  supabase: any;
}

// ── Org settings shape ──────────────────────────────────────
interface OrgSettings {
  org_name:       string;
  org_short_name: string;
  org_established:string;
  org_sec_number: string;
  org_region:     string;
  org_address:    string;
  org_email:      string;
  org_phone:      string;
}

const DEFAULT_ORG: OrgSettings = {
  org_name:        "Surigao del Norte Consumers Organization, Inc. (SUNCO)",
  org_short_name:  "SUNCO",
  org_established: "2011",
  org_sec_number:  "CN 2011-31-445",
  org_region:      "Caraga Region (Region XIII)",
  org_address:     "Surigao del Norte, Caraga Region (Region XIII), Philippines",
  org_email:       "sunco@gabrielsacro.com",
  org_phone:       "0946-365-7331",
};

export default function ReportsTab({ canCRUD, supabase }: Props) {
  const { getDelinquency, currentYear } = useDelinquency();

  const { members, payments, loading } = useReportsData(
    supabase,
    getDelinquency
  );

  const [feeSchedules, setFeeSchedules] = useState<FeeSchedule[]>([]);
  const [officers,     setOfficers]     = useState<OfficerRecord[]>([]);
  const [orgSettings,  setOrgSettings]  = useState<OrgSettings>(DEFAULT_ORG);

  useEffect(() => {
    // Load fee schedules
    supabase
      .from("fee_schedules")
      .select("year, fee_mas, fee_aof, fee_lifetime")
      .then(({ data }: { data: FeeSchedule[] | null }) => {
        if (data) setFeeSchedules(data);
      });

    // Load officers
    supabase
      .from("officers")
      .select("name, role, role_type")
      .then(({ data }: { data: OfficerRecord[] | null }) => {
        if (data) setOfficers(data);
      });

    // ── Load org settings from site_settings table ──
    supabase
      .from("site_settings")
      .select("key, value")
      .in("key", [
        "org_name",
        "org_short_name",
        "org_established",
        "org_sec_number",
        "org_region",
        "org_address",
        "org_email",
        "org_phone",
      ])
      .then(({ data }: { data: { key: string; value: string }[] | null }) => {
        if (!data) return;
        const map: any = {};
        data.forEach((row) => { map[row.key] = row.value; });
        setOrgSettings((prev) => ({ ...prev, ...map }));
      });

  }, [supabase]);

  const [activeTab, setActiveTab] = useState<ActiveTab>("all");

  const displayYears = Array.from({ length: 5 }, (_, i) => currentYear - 4 + i);

  const totalCollected = payments.reduce((s, p) => s + Number(p.amount), 0);
  const totalMas       = payments.filter((p) => p.type === "mas").reduce((s, p) => s + Number(p.amount), 0);
  const totalAof       = payments.filter((p) => p.type === "aof").reduce((s, p) => s + Number(p.amount), 0);
  const totalLifetime  = payments.filter((p) => p.type === "lifetime").reduce((s, p) => s + Number(p.amount), 0);

  const summaryItems: SummaryCardItem[] = [
    { label: "Total Collected", value: `₱${totalCollected.toLocaleString()}`, color: "var(--gold)"  },
    { label: "MAS Collected",   value: `₱${totalMas.toLocaleString()}`,       color: "#2E8B44"       },
    { label: "AOF Collected",   value: `₱${totalAof.toLocaleString()}`,       color: "#2B5FA8"       },
    { label: "Lifetime Fees",   value: `₱${totalLifetime.toLocaleString()}`,  color: "#6B3FA0"       },
  ];

  const buildRecords = () =>
    members.map((m, i) => {
      const memberPayments = payments.filter((p) => p.member_id === m.id);
      const delinquency    = getDelinquency(m, payments);
      return {
        no:             i + 1,
        name:           `${m.last_name}, ${m.first_name}${m.middle_name ? " " + m.middle_name[0] + "." : ""}`,
        status:         delinquency.derivedStatus,
        member_id_code: m.member_id_code || "—",
        date_joined:    m.date_joined || "—",
        payments:       memberPayments.map((p) => ({
          year:    p.year,
          date:    p.date_paid ? new Date(p.date_paid).toLocaleDateString("en-PH") : "—",
          amount:  Number(p.amount),
          receipt: p.receipt_number || "—",
          type:    p.type,
        })),
        years_delinquent: delinquency.count,
        total_amount:     memberPayments.reduce((s, p) => s + Number(p.amount), 0),
      };
    });

  if (loading) {
    return (
      <div style={{ padding: "3rem", textAlign: "center", color: "var(--muted)" }}>
        Loading records...
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: "2rem" }}>
        <p style={{ fontSize: "0.72rem", color: "var(--muted)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.3rem" }}>
          Admin Panel
        </p>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.8rem", fontWeight: 700, color: "var(--green-dk)" }}>
          Reports & Records
          <span style={{ marginLeft: 10, fontSize: "0.9rem", color: "var(--muted)", fontFamily: "'DM Sans', sans-serif", fontWeight: 400 }}>
            as of {new Date().toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" })}
          </span>
        </h1>
      </div>

      <SummaryCards items={summaryItems} />

      <div style={{ display: "grid", gridTemplateColumns: canCRUD ? "1fr 1fr" : "1fr", gap: "1.5rem", marginBottom: "2rem" }}>
        <ExportPanel
          records={buildRecords()}
          filename={`SUNCO-Records-${new Date().toISOString().split("T")[0]}`}
          memberCount={members.length}
          paymentCount={payments.length}
          activeTab={activeTab}
          feeSchedules={feeSchedules}
          officers={officers}
          orgSettings={orgSettings}
        />
        {canCRUD && (
          <ImportPanel
            supabase={supabase}
            onImportComplete={() => window.location.reload()}
          />
        )}
      </div>

      <RecordsTable
        members={members}
        payments={payments}
        currentYear={currentYear}
        displayYears={displayYears}
        getDelinquency={getDelinquency}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
    </div>
  );
}