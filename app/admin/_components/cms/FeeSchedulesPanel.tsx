"use client";
// ─────────────────────────────────────────────────────────────────────────────
// cms/FeeSchedulesPanel.tsx
// Year-by-year fee schedule management with BOD resolution tracking.
// Shows a 5-year sliding window (current year − 4  →  current year).
// Stored in: public.fee_schedules (Supabase)
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useState } from "react";
import {
  Save, RefreshCw, Plus, CheckCircle, AlertTriangle,
  Calendar, FileText, ChevronDown, ChevronUp, Clock,
} from "lucide-react";

interface Props {
  supabase: any;
}

type FeeSchedule = {
  id:            string;
  year:          number;
  fee_lifetime:  number;
  fee_aof:       number;
  fee_mas:       number;
  resolution_no: string;
  effective_date: string;
  approved_by:   string;
  notes:         string;
  created_at:    string;
  updated_at:    string;
};

type SaveStatus = "idle" | "saved" | "error";

// ── Helpers ──────────────────────────────────────────────────────────────────
const THIS_YEAR = new Date().getFullYear();

/** Returns the 5-year window ending at the current year. */
function getWindowYears(): number[] {
  return [THIS_YEAR - 4, THIS_YEAR - 3, THIS_YEAR - 2, THIS_YEAR - 1, THIS_YEAR];
}

function fmt(n: number | string) {
  const num = typeof n === "string" ? parseFloat(n) : n;
  return isNaN(num) ? "—" : `₱${num.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;
}

function fmtDate(d: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" });
}

// ── Sub-components ────────────────────────────────────────────────────────────

function FieldRow({
  label, hint, children,
}: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{
        display: "block", fontSize: "0.68rem", fontWeight: 700,
        letterSpacing: "0.09em", textTransform: "uppercase",
        color: "#0D3320", marginBottom: hint ? "0.2rem" : "0.35rem",
      }}>
        {label}
      </label>
      {hint && (
        <p style={{ fontSize: "0.69rem", color: "var(--muted)", marginBottom: "0.35rem", lineHeight: 1.5 }}>
          {hint}
        </p>
      )}
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "0.68rem 0.9rem",
  border: "1.5px solid rgba(26,92,42,0.15)", borderRadius: 8,
  fontSize: "0.88rem", fontFamily: "'DM Sans', sans-serif",
  color: "var(--text)", outline: "none", background: "white",
  boxSizing: "border-box",
};

const moneyInputStyle: React.CSSProperties = {
  ...inputStyle,
  fontVariantNumeric: "tabular-nums",
  fontWeight: 600,
};

// ── Main component ────────────────────────────────────────────────────────────

export default function FeeSchedulesPanel({ supabase }: Props) {
  const windowYears = getWindowYears();

  const [schedules,   setSchedules]   = useState<FeeSchedule[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [activeYear,  setActiveYear]  = useState<number>(THIS_YEAR);
  const [saving,      setSaving]      = useState(false);
  const [saveStatus,  setSaveStatus]  = useState<SaveStatus>("idle");
  const [addingYear,  setAddingYear]  = useState(false);
  const [newYearVal,  setNewYearVal]  = useState<string>("");
  const [expanded,    setExpanded]    = useState<Record<number, boolean>>({});

  // ── Load ──
  const loadSchedules = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("fee_schedules")
      .select("*")
      .order("year", { ascending: false });
    setSchedules(data || []);
    setLoading(false);
  };

  useEffect(() => { loadSchedules(); }, []);

  // ── Helpers ──
  const getSchedule = (year: number): FeeSchedule | undefined =>
    schedules.find(s => s.year === year);

  const updateField = (year: number, field: keyof FeeSchedule, value: string | number) =>
    setSchedules(prev => prev.map(s =>
      s.year === year ? { ...s, [field]: value } : s
    ));

  // ── Save ──
  const handleSave = async (year: number) => {
    const s = getSchedule(year);
    if (!s) return;
    setSaving(true);
    setSaveStatus("idle");
    try {
      const payload = {
        fee_lifetime:  parseFloat(String(s.fee_lifetime))  || 0,
        fee_aof:       parseFloat(String(s.fee_aof))       || 0,
        fee_mas:       parseFloat(String(s.fee_mas))       || 0,
        resolution_no: s.resolution_no || null,
        effective_date: s.effective_date || null,
        approved_by:   s.approved_by || null,
        notes:         s.notes || null,
        updated_at:    new Date().toISOString(),
      };
      if (s.id) {
        await supabase.from("fee_schedules").update(payload).eq("id", s.id);
      } else {
        await supabase.from("fee_schedules").insert({ ...payload, year });
      }
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 3500);
      await loadSchedules();
    } catch {
      setSaveStatus("error");
    }
    setSaving(false);
  };

  // ── Add new year ──
  const handleAddYear = async () => {
    const yr = parseInt(newYearVal, 10);
    if (!yr || yr < 2011 || yr > 2100) return alert("Enter a valid year (2011–2100).");
    if (schedules.find(s => s.year === yr)) return alert(`Year ${yr} already exists.`);
    const { error } = await supabase.from("fee_schedules").insert({
      year: yr, fee_lifetime: 0, fee_aof: 0, fee_mas: 0,
    });
    if (error) return alert("Failed to add year: " + error.message);
    setNewYearVal("");
    setAddingYear(false);
    await loadSchedules();
    setActiveYear(yr);
  };

  // ── Derived ──
  const activeSchedule = getSchedule(activeYear);
  const visibleSchedules = schedules.filter(s => windowYears.includes(s.year));
  const archivedSchedules = schedules.filter(s => !windowYears.includes(s.year));

  // ── Loading state ──
  if (loading) return (
    <div style={{ padding: "4rem", textAlign: "center", color: "var(--muted)", fontSize: "0.9rem" }}>
      <RefreshCw size={20} style={{ marginBottom: 8, opacity: 0.4 }} />
      <p>Loading fee schedules...</p>
    </div>
  );

  return (
    <div>

      {/* ── Status banners ── */}
      {saveStatus === "saved" && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(46,139,68,0.1)", border: "1px solid rgba(46,139,68,0.3)", borderRadius: 8, padding: "0.85rem 1.2rem", marginBottom: "1.5rem" }}>
          <CheckCircle size={16} color="#2E8B44" />
          <p style={{ fontSize: "0.88rem", color: "#2E8B44", fontWeight: 600 }}>
            Fee schedule saved. Members paying for this year will use these rates.
          </p>
        </div>
      )}
      {saveStatus === "error" && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(192,57,43,0.08)", border: "1px solid rgba(192,57,43,0.25)", borderRadius: 8, padding: "0.85rem 1.2rem", marginBottom: "1.5rem" }}>
          <AlertTriangle size={16} color="#C0392B" />
          <p style={{ fontSize: "0.88rem", color: "#C0392B", fontWeight: 600 }}>Save failed. Please try again.</p>
        </div>
      )}

      {/* ── Info banner ── */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, background: "rgba(26,92,42,0.06)", border: "1px solid rgba(26,92,42,0.15)", borderRadius: 10, padding: "1rem 1.2rem", marginBottom: "1.5rem" }}>
        <Clock size={15} color="var(--green-dk)" style={{ marginTop: 2, flexShrink: 0 }} />
        <div>
          <p style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--green-dk)", marginBottom: 3 }}>
            Showing {windowYears[0]}–{windowYears[4]} · Auto-advances every January 1
          </p>
          <p style={{ fontSize: "0.76rem", color: "var(--muted)", lineHeight: 1.6 }}>
            Each year has its own approved fee rates and BOD resolution reference. When a member pays for a specific year, the system uses that year's rates — not the current ones. Older years roll off the display window but remain on record.
          </p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: "1.5rem", alignItems: "start" }}>

        {/* ── Left: Year selector ── */}
        <div style={{ background: "white", borderRadius: 12, border: "1px solid rgba(26,92,42,0.08)", overflow: "hidden", position: "sticky", top: 80 }}>
          <div style={{ padding: "1rem 1.2rem", borderBottom: "1px solid rgba(26,92,42,0.07)", background: "var(--warm)" }}>
            <p style={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--muted)" }}>
              Fee Years
            </p>
          </div>

          {/* Window years */}
          {windowYears.slice().reverse().map(year => {
            const s = getSchedule(year);
            const isActive = activeYear === year;
            const isCurrent = year === THIS_YEAR;
            const hasResolution = !!s?.resolution_no;

            return (
              <button key={year} onClick={() => setActiveYear(year)}
                style={{
                  width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "0.85rem 1.2rem", border: "none",
                  borderLeft: `3px solid ${isActive ? "var(--gold)" : "transparent"}`,
                  background: isActive ? "rgba(201,168,76,0.08)" : "white",
                  cursor: "pointer", textAlign: "left", fontFamily: "'DM Sans',sans-serif",
                  borderBottom: "1px solid rgba(26,92,42,0.05)",
                }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: 7,
                    background: isActive ? "var(--gold)" : "rgba(26,92,42,0.07)",
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}>
                    <Calendar size={13} color={isActive ? "var(--green-dk)" : "var(--muted)"} />
                  </div>
                  <div>
                    <span style={{ fontSize: "0.85rem", fontWeight: isActive ? 700 : 600, color: isActive ? "var(--green-dk)" : "#333", display: "block" }}>
                      {year}
                    </span>
                    {isCurrent && (
                      <span style={{ fontSize: "0.6rem", fontWeight: 700, background: "var(--green-dk)", color: "var(--gold)", padding: "1px 6px", borderRadius: 4, letterSpacing: "0.06em" }}>
                        CURRENT
                      </span>
                    )}
                  </div>
                </div>
                {/* Resolution badge */}
                {hasResolution
                  ? <FileText size={12} color="#2E8B44" />
                  : <span style={{ fontSize: "0.6rem", color: "#C0392B", fontWeight: 700 }}>NO RES.</span>
                }
              </button>
            );
          })}

          {/* Add year button */}
          <div style={{ padding: "0.8rem 1rem", borderTop: "1px solid rgba(26,92,42,0.08)" }}>
            {addingYear ? (
              <div style={{ display: "flex", gap: 6 }}>
                <input
                  type="number" placeholder="e.g. 2027"
                  value={newYearVal}
                  onChange={e => setNewYearVal(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleAddYear()}
                  style={{ ...inputStyle, fontSize: "0.8rem", padding: "0.45rem 0.7rem", flex: 1 }}
                />
                <button onClick={handleAddYear}
                  style={{ background: "var(--green-dk)", color: "white", border: "none", borderRadius: 7, padding: "0 10px", cursor: "pointer", fontWeight: 700, fontSize: "0.78rem" }}>
                  Add
                </button>
              </div>
            ) : (
              <button onClick={() => setAddingYear(true)}
                style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: "rgba(26,92,42,0.07)", border: "1.5px dashed rgba(26,92,42,0.2)", borderRadius: 8, padding: "0.55rem", cursor: "pointer", fontSize: "0.75rem", fontWeight: 700, color: "var(--muted)", fontFamily: "'DM Sans',sans-serif" }}>
                <Plus size={13} /> Add Year
              </button>
            )}
          </div>

          {/* Archived years (collapsed) */}
          {archivedSchedules.length > 0 && (
            <div style={{ borderTop: "1px solid rgba(26,92,42,0.08)" }}>
              <button
                onClick={() => setExpanded(p => ({ ...p, archived: !p["archived" as any] }))}
                style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.65rem 1.2rem", border: "none", background: "var(--warm)", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", fontSize: "0.68rem", fontWeight: 700, color: "var(--muted)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                Archive ({archivedSchedules.length})
                {expanded["archived" as any] ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
              {expanded["archived" as any] && archivedSchedules.map(s => (
                <button key={s.year} onClick={() => setActiveYear(s.year)}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "0.7rem 1.2rem", border: "none", borderLeft: `3px solid ${activeYear === s.year ? "var(--gold)" : "transparent"}`, background: activeYear === s.year ? "rgba(201,168,76,0.08)" : "white", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", borderBottom: "1px solid rgba(26,92,42,0.04)" }}>
                  <Calendar size={12} color="var(--muted)" />
                  <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--muted)" }}>{s.year}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Right: Fee form ── */}
        <div>
          {!activeSchedule ? (
            <div style={{ background: "white", borderRadius: 12, border: "1px solid rgba(26,92,42,0.08)", padding: "3rem", textAlign: "center", color: "var(--muted)" }}>
              <Calendar size={32} style={{ opacity: 0.2, marginBottom: 12 }} />
              <p style={{ fontSize: "0.9rem", fontWeight: 600 }}>No fee schedule for {activeYear}</p>
              <p style={{ fontSize: "0.78rem", marginTop: 6 }}>This year is not yet in the database. Use "Add Year" to create it.</p>
            </div>
          ) : (
            <div style={{ background: "white", borderRadius: 12, border: "1px solid rgba(26,92,42,0.08)", overflow: "hidden" }}>

              {/* Header */}
              <div style={{ padding: "1.2rem 1.5rem", background: "var(--green-dk)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.15rem", color: "#C9A84C", marginBottom: 3 }}>
                    Fee Schedule — {activeYear}
                  </h2>
                  <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.5)" }}>
                    {activeYear === THIS_YEAR ? "Current year · Active rates" : activeYear < THIS_YEAR ? "Past year · Historical record" : "Future year · Planned rates"}
                  </p>
                </div>
                <button onClick={() => handleSave(activeYear)} disabled={saving}
                  style={{ display: "flex", alignItems: "center", gap: 6, background: saving ? "rgba(201,168,76,0.5)" : "var(--gold)", color: "var(--green-dk)", border: "none", padding: "0.6rem 1.3rem", borderRadius: 8, fontSize: "0.82rem", fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", fontFamily: "'DM Sans',sans-serif", whiteSpace: "nowrap" }}>
                  {saving ? <><RefreshCw size={13} /> Saving...</> : <><Save size={13} /> Save {activeYear}</>}
                </button>
              </div>

              {/* Summary strip */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", background: "rgba(26,92,42,0.04)", borderBottom: "1px solid rgba(26,92,42,0.08)" }}>
                {[
                  { label: "Lifetime Fee", value: activeSchedule.fee_lifetime, key: "fee_lifetime" },
                  { label: "AOF (Annual)", value: activeSchedule.fee_aof, key: "fee_aof" },
                  { label: "MAS (Annual)", value: activeSchedule.fee_mas, key: "fee_mas" },
                ].map((f, i) => (
                  <div key={f.key} style={{ padding: "1rem 1.2rem", borderRight: i < 2 ? "1px solid rgba(26,92,42,0.08)" : "none", textAlign: "center" }}>
                    <p style={{ fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 4 }}>{f.label}</p>
                    <p style={{ fontSize: "1.15rem", fontWeight: 800, color: "var(--green-dk)", fontVariantNumeric: "tabular-nums" }}>
                      {fmt(f.value)}
                    </p>
                  </div>
                ))}
              </div>

              {/* Fields */}
              <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.4rem" }}>

                {/* ── Fee amounts ── */}
                <div>
                  <p style={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--muted)", marginBottom: "1rem", paddingBottom: "0.5rem", borderBottom: "1px solid rgba(26,92,42,0.07)" }}>
                    Fee Amounts (₱)
                  </p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
                    <FieldRow label="Lifetime Membership Fee" hint="One-time fee paid upon joining.">
                      <input type="number" min={0} style={moneyInputStyle}
                        value={activeSchedule.fee_lifetime}
                        onChange={e => updateField(activeYear, "fee_lifetime", e.target.value)}
                      />
                    </FieldRow>
                    <FieldRow label="Annual Operating Fund (AOF)" hint="Paid every year by all members.">
                      <input type="number" min={0} style={moneyInputStyle}
                        value={activeSchedule.fee_aof}
                        onChange={e => updateField(activeYear, "fee_aof", e.target.value)}
                      />
                    </FieldRow>
                    <FieldRow label="Mortuary Assistance (MAS)" hint="Annual mutual aid contribution.">
                      <input type="number" min={0} style={moneyInputStyle}
                        value={activeSchedule.fee_mas}
                        onChange={e => updateField(activeYear, "fee_mas", e.target.value)}
                      />
                    </FieldRow>
                  </div>
                </div>

                {/* ── BOD Resolution ── */}
                <div>
                  <p style={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--muted)", marginBottom: "1rem", paddingBottom: "0.5rem", borderBottom: "1px solid rgba(26,92,42,0.07)" }}>
                    BOD Resolution Reference
                  </p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                    <FieldRow
                      label="Resolution Number"
                      hint={`Format: Resolution No. ${activeYear}-001`}>
                      <input type="text" style={inputStyle}
                        placeholder={`Resolution No. ${activeYear}-001`}
                        value={activeSchedule.resolution_no || ""}
                        onChange={e => updateField(activeYear, "resolution_no", e.target.value)}
                      />
                    </FieldRow>
                    <FieldRow label="Date Approved / Effective Date" hint="The date the BOD approved these rates.">
                      <input type="date" style={inputStyle}
                        value={activeSchedule.effective_date || ""}
                        onChange={e => updateField(activeYear, "effective_date", e.target.value)}
                      />
                    </FieldRow>
                  </div>
                  <div style={{ marginTop: "1rem" }}>
                    <FieldRow label="Approved By" hint="Name or title of the approving officer or body.">
                      <input type="text" style={inputStyle}
                        placeholder="e.g. SUNCO Board of Directors"
                        value={activeSchedule.approved_by || ""}
                        onChange={e => updateField(activeYear, "approved_by", e.target.value)}
                      />
                    </FieldRow>
                  </div>
                </div>

                {/* ── Notes ── */}
                <div>
                  <p style={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--muted)", marginBottom: "1rem", paddingBottom: "0.5rem", borderBottom: "1px solid rgba(26,92,42,0.07)" }}>
                    Additional Notes
                  </p>
                  <FieldRow label="Notes / Remarks" hint="Any context about this year's fee changes (optional).">
                    <textarea
                      rows={3}
                      style={{ ...inputStyle, resize: "vertical", lineHeight: 1.65 }}
                      placeholder={`e.g. AOF increased by ₱100 per Resolution No. ${activeYear}-001 due to operational cost adjustments approved during the ${activeYear} Annual General Meeting.`}
                      value={activeSchedule.notes || ""}
                      onChange={e => updateField(activeYear, "notes", e.target.value)}
                    />
                  </FieldRow>
                </div>

                {/* ── Audit info ── */}
                {activeSchedule.updated_at && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0.75rem 1rem", background: "rgba(26,92,42,0.04)", borderRadius: 8, border: "1px solid rgba(26,92,42,0.08)" }}>
                    <Clock size={13} color="var(--muted)" />
                    <p style={{ fontSize: "0.71rem", color: "var(--muted)" }}>
                      Last updated: <strong>{fmtDate(activeSchedule.updated_at)}</strong>
                      {" · "}Created: <strong>{fmtDate(activeSchedule.created_at)}</strong>
                    </p>
                  </div>
                )}
              </div>

              {/* Bottom save */}
              <div style={{ padding: "1rem 1.5rem", borderTop: "1px solid rgba(26,92,42,0.07)", background: "var(--warm)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <p style={{ fontSize: "0.72rem", color: "var(--muted)" }}>
                  {activeSchedule.resolution_no
                    ? <>📋 {activeSchedule.resolution_no} · Effective {fmtDate(activeSchedule.effective_date)}</>
                    : <span style={{ color: "#C0392B", fontWeight: 600 }}>⚠ No resolution number recorded for {activeYear}</span>
                  }
                </p>
                <button onClick={() => handleSave(activeYear)} disabled={saving}
                  style={{ display: "flex", alignItems: "center", gap: 6, background: saving ? "var(--gold-dk)" : "var(--gold)", color: "var(--green-dk)", border: "none", padding: "0.7rem 1.6rem", borderRadius: 8, fontSize: "0.85rem", fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                  {saving ? <><RefreshCw size={14} /> Saving...</> : <><Save size={14} /> Save {activeYear} Rates</>}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
