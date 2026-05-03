"use client";
// -------------------------------------------------
// cms/SettingsPanel.tsx -- Premium 2026 Edition
// Groups: Identity / Hero / About / Contact / SEO
// -------------------------------------------------
import { useEffect, useState, useRef } from "react";
import {
  Save, RefreshCw, Upload, Globe, Info, Image as ImageIcon,
  CheckCircle, AlertTriangle, Building2, Sparkles, DollarSign,
  Search, Eye, EyeOff, Phone, Mail, MapPin, Link2,
  ChevronRight, ToggleLeft, ToggleRight, ExternalLink,
} from "lucide-react";

interface Props { supabase: any; }

type Setting = {
  id: string; key: string; value: string;
  label: string; group_name: string;
};

const GROUPS = [
  { id: "identity", label: "Identity",     icon: Building2, desc: "Logo, org name, short name, registration numbers.", color: "#C9A84C" },
  { id: "hero",     label: "Hero Section", icon: Sparkles,  desc: "Homepage banner -- headline, stats, buttons.",      color: "#2E8B44" },
  { id: "about",    label: "About",        icon: Info,      desc: "About section headline and paragraphs.",            color: "#2B5FA8" },
  { id: "contact",  label: "Contact",      icon: Phone,     desc: "Address, email, phone, Facebook, GCash.",           color: "#9A2020" },
  { id: "seo",      label: "SEO & Meta",   icon: Search,    desc: "Google title, description, social sharing image.",  color: "#1A7A8A" },
];

const GROUP_MAP: Record<string, string[]> = {
  identity: ["general"],
  hero:     ["hero"],
  about:    ["about"],
  contact:  ["general"],
  seo:      ["seo"],
};

const IDENTITY_KEYS = ["org_name","org_short_name","org_established","org_sec_number","org_region","registration_open"];
const CONTACT_KEYS  = ["org_address","org_email","org_phone","org_facebook","gcash_number","gcash_name","footer_tagline"];

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
      canvas.toBlob(b => b ? resolve(b) : reject(new Error("Failed")), "image/webp", 0.88);
    };
    img.onerror = reject;
    img.src = url;
  });

export default function SettingsPanel({ supabase }: Props) {
  const [settings,      setSettings]      = useState<Setting[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [saving,        setSaving]        = useState(false);
  const [saveStatus,    setSaveStatus]    = useState<"idle"|"saved"|"error">("idle");
  const [activeGroup,   setActiveGroup]   = useState("identity");
  const [logoUploading, setLogoUploading] = useState(false);
  const [showPreview,   setShowPreview]   = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("site_settings").select("*").order("group_name");
    setSettings(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const update = (key: string, value: string) =>
    setSettings(prev => prev.map(s => s.key === key ? { ...s, value } : s));

  const get = (key: string, fallback = "") =>
    settings.find(s => s.key === key)?.value || fallback;

  const getGroupSettings = (groupId: string): Setting[] => {
    const dbGroups = GROUP_MAP[groupId] || [];
    return settings.filter(s => {
      if (!dbGroups.includes(s.group_name)) return false;
      if (groupId === "identity") return IDENTITY_KEYS.includes(s.key);
      if (groupId === "contact")  return CONTACT_KEYS.includes(s.key);
      return true;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveStatus("idle");
    try {
      const groupSettings = getGroupSettings(activeGroup);
      for (const s of groupSettings) {
        await supabase.from("site_settings")
          .update({ value: s.value, updated_at: new Date().toISOString() })
          .eq("key", s.key);
      }
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 3500);
    } catch { setSaveStatus("error"); }
    setSaving(false);
  };

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

  const activeMeta = GROUPS.find(g => g.id === activeGroup)!;
  const isOpen     = get("registration_open", "true") === "true";

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", padding:"4rem", gap:12, color:"var(--muted)" }}>
      <RefreshCw size={18} style={{ opacity:0.4 }} />
      <span style={{ fontSize:"0.9rem" }}>Loading settings...</span>
    </div>
  );

  return (
    <>
      <style>{`
        .sp-field { margin-bottom: 0; }
        .sp-label { display:block; font-size:0.65rem; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; color:#0A2818; margin-bottom:0.3rem; opacity:0.55; }
        .sp-hint  { font-size:0.68rem; color:var(--muted); margin-bottom:0.4rem; line-height:1.5; opacity:0.8; }
        .sp-input { width:100%; padding:0.72rem 1rem; border:1.5px solid rgba(26,92,42,0.14); border-radius:9px; font-size:0.88rem; font-family:'DM Sans',sans-serif; color:#0D3320; background:white; outline:none; box-sizing:border-box; transition:border-color 0.15s, box-shadow 0.15s; }
        .sp-input:focus { border-color:rgba(26,92,42,0.4); box-shadow:0 0 0 3px rgba(26,92,42,0.06); }
        .sp-textarea { width:100%; padding:0.72rem 1rem; border:1.5px solid rgba(26,92,42,0.14); border-radius:9px; font-size:0.88rem; font-family:'DM Sans',sans-serif; color:#0D3320; background:white; outline:none; resize:vertical; line-height:1.7; box-sizing:border-box; transition:border-color 0.15s; }
        .sp-textarea:focus { border-color:rgba(26,92,42,0.4); box-shadow:0 0 0 3px rgba(26,92,42,0.06); }
        .sp-card { background:white; border-radius:14px; border:1px solid rgba(26,92,42,0.07); overflow:hidden; margin-bottom:1rem; box-shadow:0 1px 8px rgba(0,0,0,0.04); }
        .sp-card-header { padding:0.9rem 1.2rem; background:linear-gradient(to right,#F7F4EE,#FAF8F2); border-bottom:1px solid rgba(26,92,42,0.06); display:flex; align-items:center; gap:8px; }
        .sp-card-body { padding:1.2rem; display:flex; flex-direction:column; gap:1rem; }
        .sp-grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:0.9rem; }
        .sp-grid-3 { display:grid; grid-template-columns:1fr 1fr 1fr; gap:0.9rem; }
        .sp-nav-btn { width:100%; display:flex; align-items:center; gap:10px; padding:0.8rem 1rem; border:none; background:transparent; cursor:pointer; text-align:left; font-family:'DM Sans',sans-serif; border-radius:10px; transition:all 0.15s; margin-bottom:2px; }
        .sp-nav-btn:hover { background:rgba(26,92,42,0.05); }
        .sp-nav-btn.active { background:rgba(26,92,42,0.08); }
        .sp-preview { background:linear-gradient(135deg,#0A2818 0%,#1A5C2A 100%); border-radius:14px; overflow:hidden; }
        @keyframes sp-fade { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        .sp-section { animation: sp-fade 0.2s ease; }
        @media(max-width:900px){ .sp-grid-2,.sp-grid-3{grid-template-columns:1fr;} }
      `}</style>

      {saveStatus === "saved" && (
        <div style={{ display:"flex", alignItems:"center", gap:10, background:"rgba(46,139,68,0.08)", border:"1px solid rgba(46,139,68,0.25)", borderRadius:10, padding:"0.85rem 1.2rem", marginBottom:"1.2rem" }}>
          <CheckCircle size={15} color="#2E8B44" />
          <p style={{ fontSize:"0.85rem", color:"#2E8B44", fontWeight:600 }}>Saved! Changes are now live on the public website.</p>
        </div>
      )}
      {saveStatus === "error" && (
        <div style={{ display:"flex", alignItems:"center", gap:10, background:"rgba(192,57,43,0.06)", border:"1px solid rgba(192,57,43,0.2)", borderRadius:10, padding:"0.85rem 1.2rem", marginBottom:"1.2rem" }}>
          <AlertTriangle size={15} color="#C0392B" />
          <p style={{ fontSize:"0.85rem", color:"#C0392B", fontWeight:600 }}>Save failed. Please try again.</p>
        </div>
      )}

      <div style={{ display:"grid", gridTemplateColumns:"200px 1fr", gap:"1.2rem", alignItems:"start" }}>

        {/* Left sidebar */}
        <div style={{ background:"white", borderRadius:14, border:"1px solid rgba(26,92,42,0.07)", padding:"0.6rem", position:"sticky", top:80, boxShadow:"0 1px 8px rgba(0,0,0,0.04)" }}>
          {GROUPS.map(g => {
            const Icon = g.icon;
            const isActive = activeGroup === g.id;
            return (
              <button key={g.id} className={`sp-nav-btn${isActive ? " active" : ""}`} onClick={() => setActiveGroup(g.id)}>
                <div style={{ width:32, height:32, borderRadius:8, background: isActive ? g.color : "rgba(26,92,42,0.06)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, transition:"background 0.15s" }}>
                  <Icon size={14} color={isActive ? "white" : "var(--muted)"} />
                </div>
                <div style={{ fontSize:"0.82rem", fontWeight: isActive ? 700 : 500, color: isActive ? "#0D3320" : "var(--muted)" }}>{g.label}</div>
                {isActive && <ChevronRight size={12} color="var(--muted)" style={{ marginLeft:"auto" }} />}
              </button>
            );
          })}
          <div style={{ borderTop:"1px solid rgba(26,92,42,0.07)", marginTop:"0.5rem", paddingTop:"0.6rem" }}>
            <button onClick={() => setShowPreview(v => !v)}
              style={{ width:"100%", display:"flex", alignItems:"center", gap:8, padding:"0.6rem 0.8rem", border:"none", background:"transparent", cursor:"pointer", fontFamily:"'DM Sans',sans-serif", color:"var(--muted)", fontSize:"0.75rem", borderRadius:8 }}>
              {showPreview ? <EyeOff size={13}/> : <Eye size={13}/>}
              {showPreview ? "Hide preview" : "Show preview"}
            </button>
          </div>
        </div>

        {/* Right: form */}
        <div>
          {/* Section header */}
          <div style={{ background:"linear-gradient(135deg,#0A2818,#1A5C2A)", borderRadius:14, padding:"1.2rem 1.5rem", marginBottom:"1rem", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              <div style={{ width:40, height:40, borderRadius:10, background:"rgba(201,168,76,0.2)", border:"1.5px solid rgba(201,168,76,0.35)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                {(() => { const Icon = activeMeta.icon; return <Icon size={18} color="#C9A84C" />; })()}
              </div>
              <div>
                <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.1rem", color:"#C9A84C", marginBottom:2 }}>{activeMeta.label}</h2>
                <p style={{ fontSize:"0.72rem", color:"rgba(255,255,255,0.45)" }}>{activeMeta.desc}</p>
              </div>
            </div>
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              <a href="/" target="_blank" rel="noreferrer"
                style={{ display:"flex", alignItems:"center", gap:5, background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.12)", color:"rgba(255,255,255,0.6)", padding:"0.5rem 0.9rem", borderRadius:8, fontSize:"0.75rem", textDecoration:"none", fontFamily:"'DM Sans',sans-serif" }}>
                <ExternalLink size={12} /> View Site
              </a>
              <button onClick={handleSave} disabled={saving}
                style={{ display:"flex", alignItems:"center", gap:6, background: saving ? "rgba(201,168,76,0.5)" : "#C9A84C", color:"#0A2818", border:"none", padding:"0.55rem 1.3rem", borderRadius:8, fontSize:"0.82rem", fontWeight:700, cursor: saving ? "not-allowed" : "pointer", fontFamily:"'DM Sans',sans-serif", whiteSpace:"nowrap" }}>
                {saving ? <><RefreshCw size={13}/> Saving...</> : <><Save size={13}/> Save {activeMeta.label}</>}
              </button>
            </div>
          </div>

          {/* IDENTITY */}
          {activeGroup === "identity" && (
            <div className="sp-section">
              <div className="sp-card">
                <div className="sp-card-header">
                  <Building2 size={14} color="#C9A84C" />
                  <span style={{ fontSize:"0.78rem", fontWeight:700, color:"#0D3320" }}>Organization Identity</span>
                </div>
                <div className="sp-card-body">
                  <div className="sp-grid-2">
                    <div className="sp-field">
                      <label className="sp-label">Full Organization Name</label>
                      <p className="sp-hint">Legal name as registered with SEC</p>
                      <input className="sp-input" value={get("org_name")} onChange={e => update("org_name", e.target.value)} placeholder="Surigao del Norte Consumers Organization, Inc." />
                    </div>
                    <div className="sp-field">
                      <label className="sp-label">Short Name / Abbreviation</label>
                      <p className="sp-hint">Used in nav bar and footer</p>
                      <input className="sp-input" value={get("org_short_name")} onChange={e => update("org_short_name", e.target.value)} placeholder="SUNCO" />
                    </div>
                  </div>
                  <div className="sp-grid-3">
                    <div className="sp-field">
                      <label className="sp-label">Year Established</label>
                      <p className="sp-hint">Founding year</p>
                      <input className="sp-input" type="number" value={get("org_established")} onChange={e => update("org_established", e.target.value)} placeholder="2011" />
                    </div>
                    <div className="sp-field">
                      <label className="sp-label">SEC Registration No.</label>
                      <p className="sp-hint">Certificate number</p>
                      <input className="sp-input" value={get("org_sec_number")} onChange={e => update("org_sec_number", e.target.value)} placeholder="CN 2011-31-445" />
                    </div>
                    <div className="sp-field">
                      <label className="sp-label">Region</label>
                      <p className="sp-hint">Administrative region</p>
                      <input className="sp-input" value={get("org_region")} onChange={e => update("org_region", e.target.value)} placeholder="Caraga Region (Region XIII)" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="sp-card">
                <div className="sp-card-header">
                  <ImageIcon size={14} color="#C9A84C" />
                  <span style={{ fontSize:"0.78rem", fontWeight:700, color:"#0D3320" }}>Organization Logo / Seal</span>
                </div>
                <div className="sp-card-body">
                  <div style={{ display:"flex", alignItems:"center", gap:"1.5rem", flexWrap:"wrap" }}>
                    <div style={{ width:90, height:90, borderRadius:"50%", background:"#0D3318", border:"3px solid rgba(201,168,76,0.35)", overflow:"hidden", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
                      <img src={get("hero_logo_url") || "/images/sunco-logo.png"} alt="Logo preview" style={{ width:"100%", height:"100%", objectFit:"contain", padding:4 }} />
                    </div>
                    <div>
                      <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={handleLogoUpload} style={{ display:"none" }} />
                      <button onClick={() => fileRef.current?.click()} disabled={logoUploading}
                        style={{ display:"inline-flex", alignItems:"center", gap:7, background: logoUploading ? "rgba(26,92,42,0.1)" : "#0D3318", color: logoUploading ? "var(--muted)" : "white", padding:"0.6rem 1.2rem", borderRadius:9, fontSize:"0.82rem", fontWeight:600, cursor: logoUploading ? "not-allowed" : "pointer", border:"none", fontFamily:"'DM Sans',sans-serif", marginBottom:"0.5rem" }}>
                        <Upload size={13}/> {logoUploading ? "Uploading..." : "Upload New Logo"}
                      </button>
                      <p style={{ fontSize:"0.7rem", color:"var(--muted)", lineHeight:1.6 }}>PNG, JPG or WebP. Auto-compressed.<br/>Recommended: square, minimum 400x400px.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="sp-card">
                <div className="sp-card-header">
                  {isOpen ? <ToggleRight size={14} color="#2E8B44" /> : <ToggleLeft size={14} color="#C0392B" />}
                  <span style={{ fontSize:"0.78rem", fontWeight:700, color:"#0D3320" }}>Membership Registration</span>
                  <span style={{ marginLeft:"auto", fontSize:"0.7rem", fontWeight:700, color: isOpen ? "#2E8B44" : "#C0392B", background: isOpen ? "rgba(46,139,68,0.1)" : "rgba(192,57,43,0.08)", padding:"2px 10px", borderRadius:20, border:`1px solid ${isOpen ? "rgba(46,139,68,0.25)" : "rgba(192,57,43,0.2)"}` }}>
                    {isOpen ? "Open" : "Closed"}
                  </span>
                </div>
                <div className="sp-card-body">
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0.9rem 1rem", background: isOpen ? "rgba(46,139,68,0.04)" : "rgba(192,57,43,0.04)", borderRadius:10, border:`1px solid ${isOpen ? "rgba(46,139,68,0.12)" : "rgba(192,57,43,0.12)"}` }}>
                    <div>
                      <p style={{ fontSize:"0.88rem", fontWeight:600, color:"#0D3320", marginBottom:3 }}>
                        {isOpen ? "Registration is currently open" : "Registration is currently closed"}
                      </p>
                      <p style={{ fontSize:"0.72rem", color:"var(--muted)" }}>
                        {isOpen ? "New members can register through the public website." : "The membership form will be hidden from the public site."}
                      </p>
                    </div>
                    <button onClick={() => update("registration_open", isOpen ? "false" : "true")}
                      style={{ width:52, height:28, borderRadius:14, background: isOpen ? "#2E8B44" : "rgba(0,0,0,0.15)", border:"none", cursor:"pointer", position:"relative", transition:"background 0.2s", flexShrink:0 }}>
                      <div style={{ position:"absolute", top:3, left: isOpen ? 27 : 3, width:22, height:22, borderRadius:"50%", background:"white", transition:"left 0.2s", boxShadow:"0 1px 4px rgba(0,0,0,0.25)" }} />
                    </button>
                  </div>
                  <p style={{ fontSize:"0.7rem", color:"var(--muted)", fontStyle:"italic" }}>Remember to click "Save Identity" after toggling.</p>
                </div>
              </div>
            </div>
          )}

          {/* HERO */}
          {activeGroup === "hero" && (
            <div className="sp-section">
              {showPreview && (
                <div className="sp-preview" style={{ marginBottom:"1rem", padding:"1.5rem" }}>
                  <p style={{ fontSize:"0.6rem", color:"rgba(255,255,255,0.3)", letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:"0.8rem" }}>Live Preview</p>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:"0.8rem" }}>
                    <div style={{ width:20, height:1.5, background:"#C9A84C" }} />
                    <span style={{ fontSize:"0.65rem", fontWeight:500, letterSpacing:"0.14em", textTransform:"uppercase", color:"#C9A84C" }}>{get("hero_eyebrow","Surigao del Norte - Est. 2011")}</span>
                  </div>
                  <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.6rem", fontWeight:900, color:"white", lineHeight:1.1, marginBottom:"0.4rem" }}>
                    {get("hero_title_line1","Protecting")} <em style={{ fontStyle:"italic", color:"#F0C842" }}>{get("hero_title_highlight","Consumers,")}</em><br/>
                    {get("hero_title_line2","Empowering")}<br/>
                    {get("hero_title_line3","Communities.")}
                  </div>
                  <p style={{ fontSize:"0.78rem", fontStyle:"italic", color:"rgba(255,255,255,0.45)", marginBottom:"0.5rem" }}>{get("hero_subtitle","SEC Registered - DTI Partner Organization")}</p>
                  <div style={{ display:"flex", gap:"1.5rem", paddingTop:"0.8rem", borderTop:"1px solid rgba(212,160,23,0.2)", flexWrap:"wrap" }}>
                    {[
                      [get("hero_stat1_num","2011"),           get("hero_stat1_label","Year Founded")],
                      [get("hero_stat2_num","CN 2011-31-445"), get("hero_stat2_label","SEC Registered")],
                      [get("hero_stat3_num","DTI"),            get("hero_stat3_label","Accredited Partner")],
                    ].map(([num, label]) => (
                      <div key={label}>
                        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"1rem", fontWeight:700, color:"#F0C842" }}>{num}</div>
                        <div style={{ fontSize:"0.6rem", fontWeight:500, letterSpacing:"0.08em", textTransform:"uppercase", color:"rgba(255,255,255,0.35)", marginTop:2 }}>{label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="sp-card">
                <div className="sp-card-header">
                  <Sparkles size={14} color="#C9A84C" />
                  <span style={{ fontSize:"0.78rem", fontWeight:700, color:"#0D3320" }}>Eyebrow &amp; Headline</span>
                </div>
                <div className="sp-card-body">
                  <div className="sp-field">
                    <label className="sp-label">Eyebrow Text</label>
                    <p className="sp-hint">Small uppercase text above the headline</p>
                    <input className="sp-input" value={get("hero_eyebrow")} onChange={e => update("hero_eyebrow", e.target.value)} placeholder="Surigao del Norte - Est. 2011" />
                  </div>
                  <div className="sp-grid-2">
                    <div className="sp-field">
                      <label className="sp-label">Headline Line 1</label>
                      <input className="sp-input" value={get("hero_title_line1")} onChange={e => update("hero_title_line1", e.target.value)} placeholder="Protecting" />
                    </div>
                    <div className="sp-field">
                      <label className="sp-label">Highlighted Word (golden italic)</label>
                      <input className="sp-input" value={get("hero_title_highlight")} onChange={e => update("hero_title_highlight", e.target.value)} placeholder="Consumers," />
                    </div>
                    <div className="sp-field">
                      <label className="sp-label">Headline Line 2</label>
                      <input className="sp-input" value={get("hero_title_line2")} onChange={e => update("hero_title_line2", e.target.value)} placeholder="Empowering" />
                    </div>
                    <div className="sp-field">
                      <label className="sp-label">Headline Line 3</label>
                      <input className="sp-input" value={get("hero_title_line3")} onChange={e => update("hero_title_line3", e.target.value)} placeholder="Communities." />
                    </div>
                  </div>
                  <div className="sp-field">
                    <label className="sp-label">Subtitle / Tagline</label>
                    <p className="sp-hint">Italic text below the headline</p>
                    <input className="sp-input" value={get("hero_subtitle")} onChange={e => update("hero_subtitle", e.target.value)} placeholder="SEC Registered - DTI Partner Organization" />
                  </div>
                  <div className="sp-field">
                    <label className="sp-label">Hero Description</label>
                    <p className="sp-hint">Paragraph text in the hero section</p>
                    <textarea className="sp-textarea" rows={3} value={get("hero_description")} onChange={e => update("hero_description", e.target.value)} placeholder="SUNCO is the voice of consumers..." />
                  </div>
                </div>
              </div>

              <div className="sp-card">
                <div className="sp-card-header">
                  <Globe size={14} color="#2B5FA8" />
                  <span style={{ fontSize:"0.78rem", fontWeight:700, color:"#0D3320" }}>Buttons &amp; Stats</span>
                </div>
                <div className="sp-card-body">
                  <div className="sp-grid-2">
                    <div className="sp-field">
                      <label className="sp-label">Button 1 Text</label>
                      <p className="sp-hint">Primary CTA button</p>
                      <input className="sp-input" value={get("hero_btn1_text")} onChange={e => update("hero_btn1_text", e.target.value)} placeholder="Become a Member" />
                    </div>
                    <div className="sp-field">
                      <label className="sp-label">Button 2 Text</label>
                      <p className="sp-hint">Secondary button</p>
                      <input className="sp-input" value={get("hero_btn2_text")} onChange={e => update("hero_btn2_text", e.target.value)} placeholder="Our Mission" />
                    </div>
                  </div>
                  <div className="sp-grid-3">
                    {[
                      ["hero_stat1_num","hero_stat1_label","Stat 1"],
                      ["hero_stat2_num","hero_stat2_label","Stat 2"],
                      ["hero_stat3_num","hero_stat3_label","Stat 3"],
                    ].map(([numKey, labelKey, title]) => (
                      <div key={title} style={{ background:"rgba(26,92,42,0.03)", borderRadius:10, padding:"0.9rem", border:"1px solid rgba(26,92,42,0.07)" }}>
                        <p style={{ fontSize:"0.65rem", fontWeight:700, color:"#C9A84C", letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:"0.6rem" }}>{title}</p>
                        <div className="sp-field" style={{ marginBottom:"0.6rem" }}>
                          <label className="sp-label">Number</label>
                          <input className="sp-input" value={get(numKey)} onChange={e => update(numKey, e.target.value)} style={{ fontSize:"0.82rem" }} />
                        </div>
                        <div className="sp-field">
                          <label className="sp-label">Label</label>
                          <input className="sp-input" value={get(labelKey)} onChange={e => update(labelKey, e.target.value)} style={{ fontSize:"0.82rem" }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ABOUT */}
          {activeGroup === "about" && (
            <div className="sp-section">
              <div className="sp-card">
                <div className="sp-card-header">
                  <Info size={14} color="#2B5FA8" />
                  <span style={{ fontSize:"0.78rem", fontWeight:700, color:"#0D3320" }}>About Section Content</span>
                </div>
                <div className="sp-card-body">
                  <div className="sp-field">
                    <label className="sp-label">Section Headline</label>
                    <p className="sp-hint">Main heading for the About section</p>
                    <textarea className="sp-textarea" rows={2} value={get("about_title")} onChange={e => update("about_title", e.target.value)} placeholder="A trusted organization built for every consumer." />
                  </div>
                  {["about_p1","about_p2","about_p3"].map((key, i) => (
                    <div key={key} className="sp-field">
                      <label className="sp-label">Paragraph {i + 1}</label>
                      <textarea className="sp-textarea" rows={4} value={get(key)} onChange={e => update(key, e.target.value)} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* CONTACT */}
          {activeGroup === "contact" && (
            <div className="sp-section">
              <div className="sp-card">
                <div className="sp-card-header">
                  <MapPin size={14} color="#9A2020" />
                  <span style={{ fontSize:"0.78rem", fontWeight:700, color:"#0D3320" }}>Address &amp; Contact</span>
                </div>
                <div className="sp-card-body">
                  <div className="sp-field">
                    <label className="sp-label">Office Address</label>
                    <p className="sp-hint">Shown in the footer</p>
                    <textarea className="sp-textarea" rows={2} value={get("org_address")} onChange={e => update("org_address", e.target.value)} placeholder="Surigao del Norte, Caraga Region, Philippines" />
                  </div>
                  <div className="sp-grid-2">
                    <div className="sp-field">
                      <label className="sp-label">Email Address</label>
                      <input className="sp-input" type="email" value={get("org_email")} onChange={e => update("org_email", e.target.value)} placeholder="info@sunco.org.ph" />
                    </div>
                    <div className="sp-field">
                      <label className="sp-label">Phone Number</label>
                      <input className="sp-input" value={get("org_phone")} onChange={e => update("org_phone", e.target.value)} placeholder="0946-365-7331" />
                    </div>
                  </div>
                  <div className="sp-field">
                    <label className="sp-label">Facebook Page URL</label>
                    <p className="sp-hint">Full URL e.g. https://facebook.com/suncosurigao</p>
                    <input className="sp-input" value={get("org_facebook")} onChange={e => update("org_facebook", e.target.value)} placeholder="https://facebook.com/suncosurigao" />
                  </div>
                  <div className="sp-field">
                    <label className="sp-label">Footer Tagline</label>
                    <p className="sp-hint">Short description in the footer about column</p>
                    <textarea className="sp-textarea" rows={2} value={get("footer_tagline")} onChange={e => update("footer_tagline", e.target.value)} />
                  </div>
                </div>
              </div>

              <div className="sp-card">
                <div className="sp-card-header">
                  <DollarSign size={14} color="#2E8B44" />
                  <span style={{ fontSize:"0.78rem", fontWeight:700, color:"#0D3320" }}>GCash Payment Details</span>
                  <span style={{ marginLeft:"auto", fontSize:"0.68rem", color:"var(--muted)" }}>Shown on membership form</span>
                </div>
                <div className="sp-card-body">
                  <div className="sp-grid-2">
                    <div className="sp-field">
                      <label className="sp-label">GCash Number</label>
                      <input className="sp-input" value={get("gcash_number")} onChange={e => update("gcash_number", e.target.value)} placeholder="09XX-XXX-XXXX" />
                    </div>
                    <div className="sp-field">
                      <label className="sp-label">GCash Account Name</label>
                      <input className="sp-input" value={get("gcash_name")} onChange={e => update("gcash_name", e.target.value)} placeholder="SUNCO Inc." />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SEO */}
          {activeGroup === "seo" && (
            <div className="sp-section">
              <div className="sp-card" style={{ marginBottom:"1rem" }}>
                <div className="sp-card-header">
                  <Search size={14} color="#2B5FA8" />
                  <span style={{ fontSize:"0.78rem", fontWeight:700, color:"#0D3320" }}>Google Search Preview</span>
                </div>
                <div className="sp-card-body">
                  <div style={{ background:"white", border:"1px solid #E0E0E0", borderRadius:10, padding:"1rem 1.2rem" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:"0.35rem" }}>
                      <div style={{ width:16, height:16, background:"#0D3318", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center" }}>
                        <span style={{ color:"#C9A84C", fontSize:"0.5rem", fontWeight:800 }}>S</span>
                      </div>
                      <span style={{ fontSize:"0.72rem", color:"#202124" }}>{get("site_url","https://sunco.org.ph")}</span>
                    </div>
                    <p style={{ fontSize:"1rem", color:"#1558D6", fontFamily:"Arial,sans-serif", marginBottom:"0.2rem", lineHeight:1.3 }}>
                      {get("seo_title") || `SUNCO -- ${get("org_name","Surigao del Norte Consumers Organization")}`}
                    </p>
                    <p style={{ fontSize:"0.82rem", color:"#4D5156", lineHeight:1.55, fontFamily:"Arial,sans-serif" }}>
                      {get("seo_description") || get("hero_description","SUNCO is the voice of consumers in Surigao del Norte...")}
                    </p>
                  </div>
                </div>
              </div>

              <div className="sp-card">
                <div className="sp-card-header">
                  <Search size={14} color="#1A7A8A" />
                  <span style={{ fontSize:"0.78rem", fontWeight:700, color:"#0D3320" }}>SEO Settings</span>
                </div>
                <div className="sp-card-body">
                  <div className="sp-field">
                    <label className="sp-label">Page Title</label>
                    <p className="sp-hint">Shown in Google results. Leave blank to auto-generate.</p>
                    <input className="sp-input" value={get("seo_title")} onChange={e => update("seo_title", e.target.value)} placeholder="SUNCO -- Protecting Consumers in Surigao del Norte" />
                    <p style={{ fontSize:"0.65rem", color: get("seo_title").length > 60 ? "#C0392B" : "var(--muted)", marginTop:3, textAlign:"right" }}>{get("seo_title").length}/60</p>
                  </div>
                  <div className="sp-field">
                    <label className="sp-label">Meta Description</label>
                    <p className="sp-hint">Shown under title in Google. Leave blank to auto-generate.</p>
                    <textarea className="sp-textarea" rows={3} value={get("seo_description")} onChange={e => update("seo_description", e.target.value)} placeholder="150-160 characters..." />
                    <p style={{ fontSize:"0.65rem", color: get("seo_description").length > 160 ? "#C0392B" : "var(--muted)", marginTop:3, textAlign:"right" }}>{get("seo_description").length}/160</p>
                  </div>
                  <div className="sp-field">
                    <label className="sp-label">Social Sharing Image URL</label>
                    <p className="sp-hint">Shown when sharing on Facebook/Messenger. Leave blank to use logo.</p>
                    <input className="sp-input" value={get("seo_og_image_url")} onChange={e => update("seo_og_image_url", e.target.value)} placeholder="https://..." />
                  </div>
                  <div className="sp-grid-2">
                    <div className="sp-field">
                      <label className="sp-label">Website URL</label>
                      <p className="sp-hint">Your live domain. Important for SEO.</p>
                      <input className="sp-input" value={get("site_url")} onChange={e => update("site_url", e.target.value)} placeholder="https://sunco.org.ph" />
                    </div>
                    <div className="sp-field">
                      <label className="sp-label">Facebook Page URL</label>
                      <p className="sp-hint">For Open Graph meta tags.</p>
                      <input className="sp-input" value={get("facebook_page")} onChange={e => update("facebook_page", e.target.value)} placeholder="https://facebook.com/suncosurigao" />
                    </div>
                  </div>
                  <div className="sp-field">
                    <label className="sp-label">Google Search Console Verification</label>
                    <p className="sp-hint">Verification code from Google Search Console.</p>
                    <input className="sp-input" value={get("google_site_verification")} onChange={e => update("google_site_verification", e.target.value)} placeholder="xxxxxxxxxxxxxxxxxxxxxx" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Bottom save */}
          <div style={{ display:"flex", justifyContent:"flex-end", paddingTop:"0.5rem" }}>
            <button onClick={handleSave} disabled={saving}
              style={{ display:"flex", alignItems:"center", gap:7, background: saving ? "rgba(201,168,76,0.5)" : "linear-gradient(135deg,#0A2818,#1A5C2A)", color: saving ? "#888" : "white", border:"none", padding:"0.8rem 1.8rem", borderRadius:10, fontSize:"0.85rem", fontWeight:700, cursor: saving ? "not-allowed" : "pointer", fontFamily:"'DM Sans',sans-serif", boxShadow: saving ? "none" : "0 4px 16px rgba(10,40,24,0.3)" }}>
              {saving ? <><RefreshCw size={14}/> Saving...</> : <><Save size={14}/> Save {activeMeta.label}</>}
            </button>
          </div>

        </div>
      </div>
    </>
  );
}