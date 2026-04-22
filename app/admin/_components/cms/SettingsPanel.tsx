"use client";
// ─────────────────────────────────────────────
// cms/SettingsPanel.tsx
// Site settings panel — embedded inside CmsTab
// Groups: Hero · About · Fees · Org Info
// ─────────────────────────────────────────────
import { useEffect, useState } from "react";
import {
  Save, RefreshCw, Upload, Globe, DollarSign,
  Info, Image, CheckCircle, AlertTriangle,
} from "lucide-react";

interface Props {
  supabase: any;
}

type Setting = {
  id:         string;
  key:        string;
  value:      string;
  label:      string;
  group_name: string;
};

const GROUPS = [
  { id: "hero",    label: "Hero Section",      icon: Image,       desc: "Main banner text, logo, and stats shown on the homepage." },
  { id: "about",   label: "About Section",     icon: Info,        desc: "Organization description and history timeline text." },
  { id: "fees",    label: "Membership Fees",   icon: DollarSign,  desc: "Official fee amounts shown on the website and used in registration totals." },
  { id: "general", label: "Organization Info", icon: Globe,       desc: "Name, address, email and other official organization details." },
];

// Human-friendly labels for known keys
const KEY_LABELS: Record<string, { label: string; hint: string; multiline?: boolean; type?: string }> = {
  hero_logo_url:     { label: "Logo / Seal URL",            hint: "Auto-filled when you upload a logo above." },
  hero_eyebrow:      { label: "Eyebrow Text",               hint: "Small text above the headline, e.g. 'Surigao del Norte · Est. 2011'" },
  hero_title_line1:  { label: "Headline — Line 1",          hint: "First line of the large hero headline." },
  hero_title_highlight: { label: "Headline — Highlighted Word", hint: "The italic golden word in the headline." },
  hero_title_line2:  { label: "Headline — Line 2",          hint: "Second line." },
  hero_title_line3:  { label: "Headline — Line 3",          hint: "Third line." },
  hero_subtitle:     { label: "Subtitle / Tagline",         hint: "Italic text below the headline, e.g. 'SEC Registered · DTI Partner'" },
  hero_description:  { label: "Hero Description",           hint: "Paragraph text in the hero section.", multiline: true },
  hero_stat1_num:    { label: "Stat 1 — Number",            hint: "e.g. 2011" },
  hero_stat1_label:  { label: "Stat 1 — Label",             hint: "e.g. Year Founded" },
  hero_stat2_num:    { label: "Stat 2 — Number",            hint: "e.g. SEC" },
  hero_stat2_label:  { label: "Stat 2 — Label",             hint: "e.g. Registered Org." },
  hero_stat3_num:    { label: "Stat 3 — Number",            hint: "e.g. DTI" },
  hero_stat3_label:  { label: "Stat 3 — Label",             hint: "e.g. Accredited Partner" },
  about_title:       { label: "About — Section Headline",   hint: "Main heading for the About section.", multiline: true },
  about_p1:          { label: "About — Paragraph 1",        hint: "First paragraph of the about text.", multiline: true },
  about_p2:          { label: "About — Paragraph 2",        hint: "Second paragraph.", multiline: true },
  about_p3:          { label: "About — Paragraph 3",        hint: "Third paragraph.", multiline: true },
  fee_lifetime:      { label: "Lifetime Membership Fee (₱)", hint: "One-time fee paid upon joining.", type: "number" },
  fee_aof:           { label: "Annual Operating Fund — AOF (₱)", hint: "Paid every year.", type: "number" },
  fee_mas:           { label: "Mortuary Assistance — MAS (₱)", hint: "Annual mutual aid contribution.", type: "number" },
  org_name:          { label: "Full Organization Name",     hint: "e.g. Surigao del Norte Consumers Organization, Inc." },
  org_short_name:    { label: "Short Name / Abbreviation",  hint: "e.g. SUNCO" },
  org_established:   { label: "Year Established",           hint: "e.g. 2011", type: "number" },
  org_address:       { label: "Office Address",             hint: "Full address for the footer.", multiline: true },
  org_email:         { label: "Email Address",              hint: "Public contact email.", type: "email" },
};

export default function SettingsPanel({ supabase }: Props) {
  const [settings,      setSettings]      = useState<Setting[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [saving,        setSaving]        = useState(false);
  const [saveStatus,    setSaveStatus]    = useState<"idle"|"saved"|"error">("idle");
  const [activeGroup,   setActiveGroup]   = useState("hero");
  const [logoUploading, setLogoUploading] = useState(false);

  const loadSettings = async () => {
    setLoading(true);
    const { data } = await supabase.from("site_settings").select("*").order("group_name");
    setSettings(data || []);
    setLoading(false);
  };

  useEffect(() => { loadSettings(); }, []);

  const update = (key: string, value: string) =>
    setSettings(prev => prev.map(s => s.key === key ? { ...s, value } : s));

  const get = (key: string) => settings.find(s => s.key === key)?.value || "";

  const handleSave = async () => {
    setSaving(true);
    setSaveStatus("idle");
    try {
      const group = settings.filter(s => s.group_name === activeGroup);
      for (const s of group) {
        await supabase.from("site_settings")
          .update({ value: s.value, updated_at: new Date().toISOString() })
          .eq("key", s.key);
      }
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 3500);
    } catch {
      setSaveStatus("error");
    }
    setSaving(false);
  };

  // ── Logo upload ──
  const compressToWebP = (file: File): Promise<Blob> =>
    new Promise((resolve, reject) => {
      const img = document.createElement("img") as HTMLImageElement;
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const MAX = 400;
        let { width, height } = img;
        if (width > MAX || height > MAX) {
          if (width > height) { height = Math.round((height / width) * MAX); width = MAX; }
          else { width = Math.round((width / height) * MAX); height = MAX; }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width; canvas.height = height;
        canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
        canvas.toBlob(b => b ? resolve(b) : reject(new Error("Failed")), "image/webp", 0.85);
      };
      img.onerror = reject;
      img.src = url;
    });

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoUploading(true);
    try {
      const blob = await compressToWebP(file);
      const filename = `logos/hero-logo-${Date.now()}.webp`;
      const { error } = await supabase.storage.from("officers").upload(filename, blob, { contentType: "image/webp", upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("officers").getPublicUrl(filename);
      update("hero_logo_url", urlData.publicUrl);
      await supabase.from("site_settings").update({ value: urlData.publicUrl }).eq("key", "hero_logo_url");
    } catch (err: any) { alert("Upload failed: " + err.message); }
    setLogoUploading(false);
  };

  const groupSettings = settings.filter(s => s.group_name === activeGroup);
  const activeGroupMeta = GROUPS.find(g => g.id === activeGroup)!;

  if (loading) return (
    <div style={{ padding: "4rem", textAlign: "center", color: "var(--muted)", fontSize: "0.9rem" }}>
      <RefreshCw size={20} style={{ marginBottom: 8, opacity: 0.4 }} />
      <p>Loading settings...</p>
    </div>
  );

  return (
    <div>
      {/* ── Save status banner ── */}
      {saveStatus === "saved" && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(46,139,68,0.1)", border: "1px solid rgba(46,139,68,0.3)", borderRadius: 8, padding: "0.85rem 1.2rem", marginBottom: "1.5rem" }}>
          <CheckCircle size={16} color="#2E8B44" />
          <p style={{ fontSize: "0.88rem", color: "#2E8B44", fontWeight: 600 }}>Changes saved! The public website will reflect these updates immediately.</p>
        </div>
      )}
      {saveStatus === "error" && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(192,57,43,0.08)", border: "1px solid rgba(192,57,43,0.25)", borderRadius: 8, padding: "0.85rem 1.2rem", marginBottom: "1.5rem" }}>
          <AlertTriangle size={16} color="#C0392B" />
          <p style={{ fontSize: "0.88rem", color: "#C0392B", fontWeight: 600 }}>Save failed. Please try again.</p>
        </div>
      )}

      {/* ── Fees warning ── */}
      {activeGroup === "fees" && (
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, background: "rgba(212,160,23,0.1)", border: "1px solid rgba(212,160,23,0.35)", borderRadius: 10, padding: "1rem 1.2rem", marginBottom: "1.5rem" }}>
          <AlertTriangle size={16} color="#A66C00" style={{ marginTop: 2, flexShrink: 0 }} />
          <div>
            <p style={{ fontSize: "0.85rem", fontWeight: 700, color: "#A66C00", marginBottom: 3 }}>Important — Fee Changes</p>
            <p style={{ fontSize: "0.82rem", color: "#555", lineHeight: 1.6 }}>
              Changing these values will update what is shown on the public website <strong>and</strong> the total calculation in the membership registration form. Make sure these match your official approved rates.
            </p>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: "1.5rem", alignItems: "start" }}>

        {/* ── Left: Group selector ── */}
        <div style={{ background: "white", borderRadius: 12, border: "1px solid rgba(26,92,42,0.08)", overflow: "hidden", position: "sticky", top: 80 }}>
          <div style={{ padding: "1rem 1.2rem", borderBottom: "1px solid rgba(26,92,42,0.07)", background: "var(--warm)" }}>
            <p style={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--muted)" }}>Settings Sections</p>
          </div>
          {GROUPS.map(g => {
            const Icon = g.icon;
            const isActive = activeGroup === g.id;
            return (
              <button key={g.id} onClick={() => setActiveGroup(g.id)}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "0.85rem 1.2rem", border: "none", borderLeft: `3px solid ${isActive ? "var(--gold)" : "transparent"}`, background: isActive ? "rgba(201,168,76,0.08)" : "white", cursor: "pointer", textAlign: "left", fontFamily: "'DM Sans',sans-serif", borderBottom: "1px solid rgba(26,92,42,0.05)" }}>
                <div style={{ width: 30, height: 30, borderRadius: 7, background: isActive ? "var(--gold)" : "rgba(26,92,42,0.07)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Icon size={14} color={isActive ? "var(--green-dk)" : "var(--muted)"} />
                </div>
                <span style={{ fontSize: "0.82rem", fontWeight: isActive ? 700 : 500, color: isActive ? "var(--green-dk)" : "var(--muted)" }}>{g.label}</span>
              </button>
            );
          })}
        </div>

        {/* ── Right: Settings form ── */}
        <div>
          {/* Section header */}
          <div style={{ background: "white", borderRadius: 12, border: "1px solid rgba(26,92,42,0.08)", overflow: "hidden", marginBottom: "1rem" }}>
            <div style={{ padding: "1.2rem 1.5rem", background: "var(--green-dk)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.1rem", color: "#C9A84C", marginBottom: 3 }}>{activeGroupMeta.label}</h2>
                <p style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.5)" }}>{activeGroupMeta.desc}</p>
              </div>
              <button onClick={handleSave} disabled={saving}
                style={{ display: "flex", alignItems: "center", gap: 6, background: saving ? "rgba(201,168,76,0.5)" : "var(--gold)", color: "var(--green-dk)", border: "none", padding: "0.6rem 1.3rem", borderRadius: 8, fontSize: "0.82rem", fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", fontFamily: "'DM Sans',sans-serif", whiteSpace: "nowrap" }}>
                {saving ? <><RefreshCw size={13} /> Saving...</> : <><Save size={13} /> Save Section</>}
              </button>
            </div>

            {/* Logo upload — hero only */}
            {activeGroup === "hero" && (
              <div style={{ padding: "1.5rem", borderBottom: "1px solid rgba(26,92,42,0.07)", background: "var(--warm)" }}>
                <p style={{ fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)", marginBottom: "0.8rem" }}>Organization Logo / Seal</p>
                <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
                  <div style={{ width: 90, height: 90, borderRadius: "50%", border: "3px solid rgba(201,168,76,0.4)", overflow: "hidden", background: "var(--green-dk)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: 4 }}>
                    <img src={get("hero_logo_url") || "/images/sunco-logo.png"} alt="Logo" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: "50%" }} />
                  </div>
                  <div>
                    <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleLogoUpload} style={{ display: "none" }} id="logo-upload-panel" />
                    <label htmlFor="logo-upload-panel" style={{ display: "inline-flex", alignItems: "center", gap: 6, background: logoUploading ? "rgba(26,92,42,0.1)" : "var(--green-dk)", color: logoUploading ? "var(--muted)" : "white", padding: "0.55rem 1.1rem", borderRadius: 7, fontSize: "0.8rem", fontWeight: 600, cursor: logoUploading ? "not-allowed" : "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                      <Upload size={13} /> {logoUploading ? "Uploading..." : "Upload New Logo"}
                    </label>
                    <p style={{ fontSize: "0.7rem", color: "var(--muted)", marginTop: "0.4rem", lineHeight: 1.5 }}>
                      PNG or JPG. Auto-converted to WebP.<br />Recommended: square, minimum 400×400px.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Settings fields */}
            <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.2rem" }}>
              {groupSettings.length === 0 ? (
                <p style={{ color: "var(--muted)", fontSize: "0.88rem", textAlign: "center", padding: "2rem" }}>No settings found for this section.</p>
              ) : groupSettings.map(s => {
                const meta = KEY_LABELS[s.key];
                const label  = meta?.label  || s.label || s.key;
                const hint   = meta?.hint   || "";
                const isMulti = meta?.multiline || (!meta && s.value && s.value.length > 80);
                const inputType = meta?.type || "text";

                return (
                  <div key={s.key}>
                    <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#0D3320", marginBottom: "0.3rem" }}>
                      {label}
                    </label>
                    {hint && <p style={{ fontSize: "0.7rem", color: "var(--muted)", marginBottom: "0.45rem", lineHeight: 1.5 }}>{hint}</p>}
                    {isMulti ? (
                      <textarea
                        value={s.value || ""}
                        onChange={e => update(s.key, e.target.value)}
                        rows={4}
                        style={{ width: "100%", padding: "0.72rem 1rem", border: "1.5px solid rgba(26,92,42,0.15)", borderRadius: 8, fontSize: "0.88rem", fontFamily: "'DM Sans',sans-serif", color: "var(--text)", outline: "none", resize: "vertical", lineHeight: 1.65, boxSizing: "border-box" }}
                      />
                    ) : (
                      <input
                        type={inputType}
                        value={s.value || ""}
                        onChange={e => update(s.key, e.target.value)}
                        style={{ width: "100%", padding: "0.72rem 1rem", border: "1.5px solid rgba(26,92,42,0.15)", borderRadius: 8, fontSize: "0.88rem", fontFamily: "'DM Sans',sans-serif", color: "var(--text)", outline: "none", background: "white", boxSizing: "border-box" }}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Bottom save */}
            <div style={{ padding: "1rem 1.5rem", borderTop: "1px solid rgba(26,92,42,0.07)", background: "var(--warm)", display: "flex", justifyContent: "flex-end" }}>
              <button onClick={handleSave} disabled={saving}
                style={{ display: "flex", alignItems: "center", gap: 6, background: saving ? "var(--gold-dk)" : "var(--gold)", color: "var(--green-dk)", border: "none", padding: "0.7rem 1.6rem", borderRadius: 8, fontSize: "0.85rem", fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                {saving ? <><RefreshCw size={14} /> Saving...</> : <><Save size={14} /> Save {activeGroupMeta.label}</>}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
