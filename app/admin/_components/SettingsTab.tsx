"use client";
// ─────────────────────────────────────────────
// SettingsTab.tsx
// Handles: edit all homepage content, fees,
//          org info, hero text, logo/image
// Accessible by: admin, president, secretary
// ─────────────────────────────────────────────
import { useEffect, useState } from "react";
import { Save, RefreshCw } from "lucide-react";

interface Props {
  supabase: any;
}

type Setting = {
  key: string;
  value: string;
  label: string;
  group_name: string;
};

const groups = [
  { id: "hero", label: "Hero Section" },
  { id: "about", label: "About Section" },
  { id: "fees", label: "Membership Fees" },
  { id: "general", label: "Organization Info" },
];

export default function SettingsTab({ supabase }: Props) {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeGroup, setActiveGroup] = useState("hero");
  const [logoUploading, setLogoUploading] = useState(false);

  const loadSettings = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("site_settings")
      .select("*")
      .order("group_name");
    setSettings(data || []);
    setLoading(false);
  };

  useEffect(() => { loadSettings(); }, []);

  const updateLocal = (key: string, value: string) => {
    setSettings(prev => prev.map(s => s.key === key ? { ...s, value } : s));
  };

  const getSetting = (key: string) =>
    settings.find(s => s.key === key)?.value || "";

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    const groupSettings = settings.filter(s => s.group_name === activeGroup);
    for (const s of groupSettings) {
      await supabase.from("site_settings")
        .update({ value: s.value, updated_at: new Date().toISOString() })
        .eq("key", s.key);
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoUploading(true);

    // Convert to WebP
    const imageCompression = (await import("browser-image-compression")).default;
    const compressed = await imageCompression(file, {
      maxSizeMB: 0.3,
      maxWidthOrHeight: 400,
      fileType: "image/webp",
      useWebWorker: true,
    });

    const filename = `hero-logo-${Date.now()}.webp`;
    const { data, error } = await supabase.storage
      .from("officers")
      .upload(`logos/${filename}`, compressed, { contentType: "image/webp", upsert: true });

    if (!error) {
      const { data: urlData } = supabase.storage
        .from("officers")
        .getPublicUrl(`logos/${filename}`);
      updateLocal("hero_logo_url", urlData.publicUrl);
      await supabase.from("site_settings")
        .update({ value: urlData.publicUrl })
        .eq("key", "hero_logo_url");
    }
    setLogoUploading(false);
  };

  const inputStyle = {
    width: "100%", padding: "0.7rem 1rem",
    border: "1.5px solid rgba(26,92,42,0.15)",
    borderRadius: 6, fontSize: "0.88rem",
    fontFamily: "'DM Sans', sans-serif",
    color: "var(--text)", background: "white", outline: "none",
  };

  const labelStyle = {
    display: "block" as const,
    fontSize: "0.72rem", fontWeight: 500 as const,
    letterSpacing: "0.08em", textTransform: "uppercase" as const,
    color: "var(--muted)", marginBottom: "0.4rem",
  };

  const groupSettings = settings.filter(s => s.group_name === activeGroup);

  if (loading) return (
    <div style={{ padding: "3rem", textAlign: "center", color: "var(--muted)" }}>Loading settings...</div>
  );

  return (
    <div>
      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div>
          <p style={{ fontSize: "0.72rem", color: "var(--muted)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.3rem" }}>Admin Panel</p>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.8rem", fontWeight: 700, color: "var(--green-dk)" }}>Site Settings</h1>
        </div>
        <button onClick={handleSave} disabled={saving}
          style={{ display: "flex", alignItems: "center", gap: 6, background: saving ? "var(--gold-dk)" : "var(--gold)", color: "var(--green-dk)", border: "none", padding: "0.7rem 1.4rem", borderRadius: 6, fontSize: "0.82rem", fontWeight: 500, cursor: saving ? "not-allowed" : "pointer", fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.06em", textTransform: "uppercase" }}>
          {saving ? <><RefreshCw size={14} /> Saving...</> : <><Save size={14} /> Save Changes</>}
        </button>
      </div>

      {saved && (
        <div style={{ background: "rgba(46,139,68,0.1)", border: "1px solid rgba(46,139,68,0.3)", borderRadius: 8, padding: "0.8rem 1.2rem", marginBottom: "1.5rem", fontSize: "0.85rem", color: "#2E8B44", fontWeight: 500 }}>
          ✓ Settings saved successfully! Changes will appear on the public website.
        </div>
      )}

      {/* ── Group Tabs ── */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        {groups.map(g => (
          <button key={g.id} onClick={() => setActiveGroup(g.id)}
            style={{ padding: "0.45rem 1rem", borderRadius: 20, border: "1.5px solid", borderColor: activeGroup === g.id ? "var(--gold)" : "rgba(26,92,42,0.15)", background: activeGroup === g.id ? "var(--gold)" : "white", color: activeGroup === g.id ? "var(--green-dk)" : "var(--muted)", fontSize: "0.75rem", fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
            {g.label}
          </button>
        ))}
      </div>

      {/* ── Settings Form ── */}
      <div style={{ background: "white", borderRadius: 10, border: "1px solid rgba(26,92,42,0.08)", overflow: "hidden" }}>
        <div style={{ padding: "1.2rem 1.5rem", borderBottom: "1px solid rgba(26,92,42,0.08)", background: "var(--warm)" }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1rem", fontWeight: 700, color: "var(--green-dk)" }}>
            {groups.find(g => g.id === activeGroup)?.label}
          </h2>
          <p style={{ fontSize: "0.78rem", color: "var(--muted)", marginTop: "0.2rem" }}>
            Changes here will update the public website immediately after saving.
          </p>
        </div>

        <div style={{ padding: "2rem", display: "flex", flexDirection: "column", gap: "1.2rem" }}>

          {/* Special: Hero logo upload */}
          {activeGroup === "hero" && (
            <div style={{ background: "var(--warm)", borderRadius: 8, padding: "1.2rem", marginBottom: "0.5rem" }}>
              <label style={labelStyle}>Hero Image / Logo</label>
              <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
                <img
                  src={getSetting("hero_logo_url") || "/images/sunco-logo.png"}
                  alt="Hero logo"
                  loading="lazy"
                  style={{ width: 80, height: 80, borderRadius: "50%", objectFit: "contain", border: "2px solid rgba(212,160,23,0.3)", background: "var(--green-dk)", padding: 4 }}
                />
                <div>
                  <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleLogoUpload} style={{ display: "none" }} id="logo-upload" />
                  <label htmlFor="logo-upload"
                    style={{ display: "inline-block", background: logoUploading ? "var(--gold-dk)" : "var(--gold)", color: "var(--green-dk)", padding: "0.6rem 1.2rem", borderRadius: 6, fontSize: "0.8rem", fontWeight: 500, cursor: logoUploading ? "not-allowed" : "pointer", fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                    {logoUploading ? "Uploading..." : "Upload New Image"}
                  </label>
                  <p style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: "0.4rem" }}>
                    PNG or JPG. Auto-converted to WebP and compressed. Recommended: square image, min 400×400px.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Special: Fees display */}
          {activeGroup === "fees" && (
            <div style={{ background: "var(--green-dk)", borderRadius: 8, padding: "1.2rem", marginBottom: "0.5rem" }}>
              <p style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.6)", lineHeight: 1.6 }}>
                ⚠ Changing fees here will update what is displayed on the public website AND used in the registration form total calculation. Make sure these match your official rates.
              </p>
            </div>
          )}

          {/* All settings in this group */}
          {groupSettings.map(s => (
            <div key={s.key}>
              <label style={labelStyle}>{s.label}</label>
              {s.value && s.value.length > 80 ? (
                <textarea
                  value={s.value}
                  onChange={e => updateLocal(s.key, e.target.value)}
                  rows={4}
                  style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }}
                />
              ) : (
                <input
                  type={s.key.startsWith("fee_") ? "number" : "text"}
                  value={s.value}
                  onChange={e => updateLocal(s.key, e.target.value)}
                  style={inputStyle}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}