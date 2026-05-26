"use client";
import { useEffect, useState, useRef } from "react";
import {
  Plus, Trash2, Eye, EyeOff, RefreshCw, X, Check,
  FileText, Upload, Image as ImageIcon, Layout,
  AlignCenter, Columns, Newspaper, Users, ChevronDown, ChevronUp,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────
interface ContentBlock {
  id: string;
  type: "text" | "image" | "divider" | "heading" | "two-col";
  content: string;
  content2?: string;
  image_url?: string;
  align?: "left" | "center" | "right";
}

interface PageFeatures {
  show_recent_news?: boolean;
  show_officers?: boolean;
  show_programs?: boolean;
  show_membership?: boolean;
  show_senior_calc?: boolean;
  show_datetime?: boolean;
}

interface Page {
  id: string;
  title: string;
  slug: string;
  content: string;
  meta_description: string;
  show_in_nav: boolean;
  nav_label: string;
  nav_order: number;
  status: "draft" | "published";
  template: "centered" | "fullwidth" | "news" | "twocol" | "profile";
  cover_image_url: string;
  bg_color: string;
  content_blocks: ContentBlock[];
  show_date: boolean;
  show_breadcrumb: boolean;
  features: PageFeatures;
  created_at: string;
}

const EMPTY_PAGE: Omit<Page, "id" | "created_at"> = {
  title: "", slug: "", content: "", meta_description: "",
  show_in_nav: true, nav_label: "", nav_order: 99, status: "draft",
  template: "centered", cover_image_url: "", bg_color: "#F5EDD8",
  content_blocks: [], show_date: false, show_breadcrumb: true,
  features: {},
};

const EMPTY_BLOCK = (): ContentBlock => ({
  id: Math.random().toString(36).slice(2),
  type: "text", content: "", align: "left",
});

interface Props { supabase: any; canCRUD: boolean; }

// ── Templates ─────────────────────────────────────────────────
const TEMPLATES = [
  {
    id: "centered",
    label: "Document",
    icon: AlignCenter,
    desc: "Clean centered text — ideal for About, Policy, or Info pages",
    preview: (
      <div style={{ padding: "8px", background: "#F5EDD8", borderRadius: 4, height: 60, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
        <div style={{ width: "60%", height: 6, background: "#0D3320", borderRadius: 2 }} />
        <div style={{ width: "80%", height: 3, background: "rgba(0,0,0,0.15)", borderRadius: 2 }} />
        <div style={{ width: "75%", height: 3, background: "rgba(0,0,0,0.15)", borderRadius: 2 }} />
        <div style={{ width: "70%", height: 3, background: "rgba(0,0,0,0.15)", borderRadius: 2 }} />
      </div>
    ),
  },
  {
    id: "fullwidth",
    label: "Full Width",
    icon: Layout,
    desc: "Edge-to-edge sections — great for landing pages or campaigns",
    preview: (
      <div style={{ padding: 0, background: "#0D3320", borderRadius: 4, height: 60, overflow: "hidden" }}>
        <div style={{ background: "#C9A84C", height: 18, width: "100%" }} />
        <div style={{ padding: "4px 6px", display: "flex", flexDirection: "column", gap: 3 }}>
          <div style={{ width: "90%", height: 4, background: "rgba(255,255,255,0.3)", borderRadius: 2 }} />
          <div style={{ width: "70%", height: 4, background: "rgba(255,255,255,0.2)", borderRadius: 2 }} />
        </div>
      </div>
    ),
  },
  {
    id: "news",
    label: "News / Magazine",
    icon: Newspaper,
    desc: "Big hero banner with article-style content and news sidebar",
    preview: (
      <div style={{ background: "#fff", borderRadius: 4, height: 60, overflow: "hidden", border: "1px solid #eee" }}>
        <div style={{ background: "#0D3320", height: 16, width: "100%" }} />
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 3, padding: "4px 4px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <div style={{ width: "100%", height: 5, background: "#0D3320", borderRadius: 1 }} />
            <div style={{ width: "90%", height: 3, background: "#ccc", borderRadius: 1 }} />
            <div style={{ width: "80%", height: 3, background: "#ccc", borderRadius: 1 }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <div style={{ width: "100%", height: 3, background: "#C9A84C", borderRadius: 1 }} />
            <div style={{ width: "100%", height: 3, background: "#eee", borderRadius: 1 }} />
            <div style={{ width: "100%", height: 3, background: "#eee", borderRadius: 1 }} />
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "twocol",
    label: "Two Column",
    icon: Columns,
    desc: "Content on left, sidebar on right — good for programs or announcements",
    preview: (
      <div style={{ background: "#F5EDD8", borderRadius: 4, height: 60, padding: "6px", display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 4 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <div style={{ width: "80%", height: 5, background: "#0D3320", borderRadius: 1 }} />
          <div style={{ width: "100%", height: 3, background: "rgba(0,0,0,0.15)", borderRadius: 1 }} />
          <div style={{ width: "90%", height: 3, background: "rgba(0,0,0,0.15)", borderRadius: 1 }} />
          <div style={{ width: "95%", height: 3, background: "rgba(0,0,0,0.15)", borderRadius: 1 }} />
        </div>
        <div style={{ background: "white", borderRadius: 3, padding: 4, display: "flex", flexDirection: "column", gap: 2 }}>
          <div style={{ width: "100%", height: 3, background: "#C9A84C", borderRadius: 1 }} />
          <div style={{ width: "100%", height: 3, background: "#eee", borderRadius: 1 }} />
          <div style={{ width: "100%", height: 3, background: "#eee", borderRadius: 1 }} />
        </div>
      </div>
    ),
  },
  {
    id: "profile",
    label: "Team / Cards",
    icon: Users,
    desc: "Cards grid layout — perfect for team pages or featured members",
    preview: (
      <div style={{ background: "#F5EDD8", borderRadius: 4, height: 60, padding: "6px" }}>
        <div style={{ width: "50%", height: 5, background: "#0D3320", borderRadius: 1, margin: "0 auto 6px" }} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 3 }}>
          {[0,1,2].map(i => (
            <div key={i} style={{ background: "white", borderRadius: 2, padding: 3, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#C9A84C" }} />
              <div style={{ width: "80%", height: 2, background: "#ccc", borderRadius: 1 }} />
            </div>
          ))}
        </div>
      </div>
    ),
  },
];

// ── BG Color options ──────────────────────────────────────────
const BG_COLORS = [
  { label: "Cream",       value: "#F5EDD8" },
  { label: "White",       value: "#FFFFFF" },
  { label: "Dark Green",  value: "#0D3320" },
  { label: "Light Green", value: "#F0F7F0" },
  { label: "Gold Tint",   value: "#FDF8EC" },
  { label: "Dark Navy",   value: "#0A1628" },
];

// ── Main Component ────────────────────────────────────────────
export default function PagesPanel({ supabase, canCRUD }: Props) {
  const [pages,       setPages]       = useState<Page[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [editing,     setEditing]     = useState<Page | null>(null);
  const [isNew,       setIsNew]       = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [saved,       setSaved]       = useState(false);
  const [form,        setForm]        = useState<Omit<Page,"id"|"created_at">>({ ...EMPTY_PAGE });
  const [coverUploading, setCoverUploading] = useState(false);
  const [activeSection,  setActiveSection]  = useState<"template"|"content"|"settings"|"features">("template");
  const coverRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("pages").select("*").order("nav_order");
    setPages(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setForm({ ...EMPTY_PAGE });
    setEditing(null);
    setIsNew(true);
    setActiveSection("template");
  };

  const openEdit = (p: Page) => {
    setForm({
      title: p.title, slug: p.slug, content: p.content,
      meta_description: p.meta_description, show_in_nav: p.show_in_nav,
      nav_label: p.nav_label, nav_order: p.nav_order, status: p.status,
      template: p.template || "centered",
      cover_image_url: p.cover_image_url || "",
      bg_color: p.bg_color || "#F5EDD8",
      content_blocks: p.content_blocks || [],
      show_date: p.show_date || false,
      show_breadcrumb: p.show_breadcrumb !== false,
      features: p.features || {},
    });
    setEditing(p);
    setIsNew(false);
    setActiveSection("template");
  };

  const closeEditor = () => { setEditing(null); setIsNew(false); };

  const autoSlug = (title: string) =>
    title.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").trim();

  const setF = (key: keyof typeof form, value: any) =>
    setForm(f => ({ ...f, [key]: value }));

  const setFeature = (key: keyof PageFeatures, value: boolean) =>
    setForm(f => ({ ...f, features: { ...f.features, [key]: value } }));

  // ── Content blocks ──────────────────────────────────────────
  const addBlock = (type: ContentBlock["type"]) => {
    const block: ContentBlock = { ...EMPTY_BLOCK(), type };
    setForm(f => ({ ...f, content_blocks: [...f.content_blocks, block] }));
  };

  const updateBlock = (id: string, key: keyof ContentBlock, value: any) =>
    setForm(f => ({
      ...f,
      content_blocks: f.content_blocks.map(b => b.id === id ? { ...b, [key]: value } : b),
    }));

  const removeBlock = (id: string) =>
    setForm(f => ({ ...f, content_blocks: f.content_blocks.filter(b => b.id !== id) }));

  const moveBlock = (id: string, dir: "up" | "down") => {
    setForm(f => {
      const blocks = [...f.content_blocks];
      const idx = blocks.findIndex(b => b.id === id);
      if (dir === "up" && idx > 0) [blocks[idx-1], blocks[idx]] = [blocks[idx], blocks[idx-1]];
      if (dir === "down" && idx < blocks.length-1) [blocks[idx], blocks[idx+1]] = [blocks[idx+1], blocks[idx]];
      return { ...f, content_blocks: blocks };
    });
  };

  // ── Cover image upload ──────────────────────────────────────
  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverUploading(true);
    const ext = file.name.split(".").pop();
    const filename = `pages/cover-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("articles").upload(filename, file, { contentType: file.type, upsert: true });
    if (error) { alert("Upload failed: " + error.message); setCoverUploading(false); return; }
    const { data: urlData } = supabase.storage.from("articles").getPublicUrl(filename);
    setF("cover_image_url", urlData.publicUrl);
    setCoverUploading(false);
  };

  // ── Block image upload ──────────────────────────────────────
  const handleBlockImageUpload = async (blockId: string, file: File) => {
    const ext = file.name.split(".").pop();
    const filename = `pages/block-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("articles").upload(filename, file, { contentType: file.type, upsert: true });
    if (error) { alert("Upload failed: " + error.message); return; }
    const { data: urlData } = supabase.storage.from("articles").getPublicUrl(filename);
    updateBlock(blockId, "image_url", urlData.publicUrl);
  };

  // ── Save ────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.title.trim() || !form.slug.trim()) return;
    setSaving(true);
    const payload = {
      ...form,
      nav_label:  form.nav_label || form.title,
      nav_order:  Number(form.nav_order),
      updated_at: new Date().toISOString(),
    };
    if (isNew) {
      await supabase.from("pages").insert(payload);
    } else if (editing) {
      await supabase.from("pages").update(payload).eq("id", editing.id);
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    closeEditor();
    load();
  };

  const handleDelete = async (p: Page) => {
    if (!confirm(`Delete "${p.title}"? This cannot be undone.`)) return;
    await supabase.from("pages").delete().eq("id", p.id);
    setPages(prev => prev.filter(x => x.id !== p.id));
  };

  const toggleStatus = async (p: Page) => {
    const next = p.status === "published" ? "draft" : "published";
    await supabase.from("pages").update({ status: next }).eq("id", p.id);
    setPages(prev => prev.map(x => x.id === p.id ? { ...x, status: next } : x));
  };

  // ── Styles ──────────────────────────────────────────────────
  const S = {
    input: {
      width: "100%", padding: "0.65rem 0.9rem",
      border: "1.5px solid rgba(26,92,42,0.15)", borderRadius: 7,
      fontSize: "0.85rem", fontFamily: "'DM Sans',sans-serif",
      color: "#0D3320", outline: "none", background: "white",
      boxSizing: "border-box" as const,
    },
    label: {
      display: "block" as const, fontSize: "0.65rem", fontWeight: 700,
      letterSpacing: "0.1em", textTransform: "uppercase" as const,
      color: "#0D3320", marginBottom: "0.3rem", opacity: 0.6,
    },
    section: {
      background: "white", borderRadius: 10,
      border: "1px solid rgba(26,92,42,0.08)",
      marginBottom: "1rem", overflow: "hidden",
    },
    sectionHead: {
      padding: "0.8rem 1.2rem",
      background: "linear-gradient(to right, #F7F4EE, #FAF8F2)",
      borderBottom: "1px solid rgba(26,92,42,0.06)",
      display: "flex", alignItems: "center", justifyContent: "space-between",
    },
    toggle: (on: boolean) => ({
      width: 44, height: 24, borderRadius: 12,
      background: on ? "#2E8B44" : "rgba(0,0,0,0.15)",
      border: "none", cursor: "pointer", position: "relative" as const,
      transition: "background 0.2s", flexShrink: 0,
    }),
    toggleDot: (on: boolean) => ({
      position: "absolute" as const, top: 2,
      left: on ? 22 : 2, width: 20, height: 20,
      borderRadius: "50%", background: "white",
      transition: "left 0.2s", boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
    }),
  };

  const showEditor = editing !== null || isNew;

  // ── Section nav tabs ────────────────────────────────────────
  const SECTIONS = [
    { id: "template", label: "1. Template" },
    { id: "content",  label: "2. Content"  },
    { id: "settings", label: "3. Settings" },
    { id: "features", label: "4. Features" },
  ] as const;

  return (
    <div style={{ fontFamily: "'DM Sans',sans-serif" }}>

      {/* ── Top bar ── */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"1.2rem", flexWrap:"wrap", gap:"0.8rem" }}>
        <p style={{ fontSize:"0.72rem", color:"var(--muted)", maxWidth: 600 }}>
          Pages you create here become real URLs (e.g. <code style={{ background:"rgba(26,92,42,0.07)", padding:"1px 5px", borderRadius:3 }}>/about</code>). Choose a template, add content blocks, and control which site features appear on each page.
        </p>
        {canCRUD && (
          <button onClick={openNew}
            style={{ display:"flex", alignItems:"center", gap:6, background:"var(--gold)", color:"var(--green-dk)", border:"none", padding:"0.65rem 1.25rem", borderRadius:7, fontSize:"0.82rem", fontWeight:700, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", whiteSpace:"nowrap" }}>
            <Plus size={14}/> New Page
          </button>
        )}
      </div>

      {saved && (
        <div style={{ display:"flex", alignItems:"center", gap:8, background:"rgba(46,139,68,0.08)", border:"1px solid rgba(46,139,68,0.25)", borderRadius:8, padding:"0.75rem 1rem", marginBottom:"1rem" }}>
          <Check size={14} color="#2E8B44"/>
          <p style={{ fontSize:"0.82rem", color:"#2E8B44", fontWeight:600 }}>Page saved! Changes are live.</p>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          PAGE EDITOR
      ══════════════════════════════════════════════════════ */}
      {showEditor && (
        <div style={{ background:"white", borderRadius:14, border:"1px solid rgba(26,92,42,0.1)", marginBottom:"1.5rem", overflow:"hidden" }}>

          {/* Editor header */}
          <div style={{ background:"var(--green-dk)", padding:"1rem 1.5rem", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div>
              <h3 style={{ fontFamily:"'Playfair Display',serif", color:"var(--gold)", fontSize:"1rem", marginBottom:2 }}>
                {isNew ? "Create New Page" : `Editing: ${editing?.title}`}
              </h3>
              <p style={{ fontSize:"0.7rem", color:"rgba(255,255,255,0.45)" }}>
                {isNew ? "Choose a template, add content, then publish." : `/${form.slug}`}
              </p>
            </div>
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              {/* Status toggle */}
              <div style={{ display:"flex", background:"rgba(255,255,255,0.08)", borderRadius:6, padding:3, gap:2 }}>
                {(["draft","published"] as const).map(s => (
                  <button key={s} onClick={() => setF("status", s)}
                    style={{ padding:"0.35rem 0.8rem", borderRadius:4, border:"none", background: form.status===s ? (s==="published"?"#2E8B44":"#666") : "transparent", color: form.status===s ? "white" : "rgba(255,255,255,0.5)", fontSize:"0.72rem", fontWeight:600, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>
                    {s==="draft" ? "📝 Draft" : "🌐 Published"}
                  </button>
                ))}
              </div>
              <button onClick={handleSave} disabled={saving || !form.title.trim() || !form.slug.trim()}
                style={{ display:"flex", alignItems:"center", gap:6, background:saving?"rgba(201,168,76,0.5)":"var(--gold)", color:"var(--green-dk)", border:"none", padding:"0.5rem 1.2rem", borderRadius:7, fontSize:"0.82rem", fontWeight:700, cursor:saving?"not-allowed":"pointer", fontFamily:"'DM Sans',sans-serif" }}>
                {saving ? <><RefreshCw size={13}/> Saving...</> : <><Check size={13}/> Save Page</>}
              </button>
              <button onClick={closeEditor} style={{ background:"none", border:"none", cursor:"pointer", color:"rgba(255,255,255,0.6)" }}>
                <X size={18}/>
              </button>
            </div>
          </div>

          {/* Section tabs */}
          <div style={{ display:"flex", background:"rgba(26,92,42,0.04)", borderBottom:"1px solid rgba(26,92,42,0.08)" }}>
            {SECTIONS.map(sec => (
              <button key={sec.id} onClick={() => setActiveSection(sec.id)}
                style={{ flex:1, padding:"0.75rem", border:"none", background: activeSection===sec.id ? "white" : "transparent", color: activeSection===sec.id ? "var(--green-dk)" : "var(--muted)", fontSize:"0.78rem", fontWeight: activeSection===sec.id ? 700 : 500, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", borderBottom: activeSection===sec.id ? "2px solid var(--green-dk)" : "2px solid transparent" }}>
                {sec.label}
              </button>
            ))}
          </div>

          <div style={{ padding:"1.5rem" }}>

            {/* ══ TAB 1: TEMPLATE ══ */}
            {activeSection === "template" && (
              <div style={{ display:"flex", flexDirection:"column", gap:"1.5rem" }}>

                {/* Title + Slug */}
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1rem" }}>
                  <div>
                    <label style={S.label}>Page Title *</label>
                    <input style={S.input} value={form.title}
                      onChange={e => setForm(f => ({
                        ...f, title: e.target.value,
                        slug: isNew ? autoSlug(e.target.value) : f.slug,
                        nav_label: isNew ? e.target.value : f.nav_label,
                      }))}
                      placeholder="e.g. About Us" />
                  </div>
                  <div>
                    <label style={S.label}>URL Slug *</label>
                    <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                      <span style={{ fontSize:"0.75rem", color:"var(--muted)", whiteSpace:"nowrap" }}>yoursite.com/</span>
                      <input style={S.input} value={form.slug}
                        onChange={e => setForm(f => ({ ...f, slug: autoSlug(e.target.value) }))}
                        placeholder="about-us" />
                    </div>
                  </div>
                </div>

                {/* Template picker */}
                <div>
                  <label style={S.label}>Page Template</label>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:"0.8rem", marginTop:"0.5rem" }}>
                    {TEMPLATES.map(t => {
                      const Icon = t.icon;
                      const active = form.template === t.id;
                      return (
                        <button key={t.id} onClick={() => setF("template", t.id)}
                          style={{ border:`2px solid ${active?"var(--green-dk)":"rgba(26,92,42,0.12)"}`, borderRadius:10, padding:"0.8rem 0.6rem", background: active?"rgba(13,51,32,0.04)":"white", cursor:"pointer", textAlign:"left", transition:"all 0.15s" }}>
                          <div style={{ marginBottom:6 }}>{t.preview}</div>
                          <div style={{ display:"flex", alignItems:"center", gap:5, marginBottom:3 }}>
                            <Icon size={12} color={active?"var(--green-dk)":"var(--muted)"}/>
                            <span style={{ fontSize:"0.72rem", fontWeight:700, color: active?"var(--green-dk)":"#333" }}>{t.label}</span>
                          </div>
                          <p style={{ fontSize:"0.62rem", color:"var(--muted)", lineHeight:1.4, margin:0 }}>{t.desc}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Background color */}
                <div>
                  <label style={S.label}>Page Background Color</label>
                  <div style={{ display:"flex", gap:"0.6rem", flexWrap:"wrap", marginTop:"0.5rem" }}>
                    {BG_COLORS.map(c => (
                      <button key={c.value} onClick={() => setF("bg_color", c.value)}
                        style={{ display:"flex", alignItems:"center", gap:6, padding:"0.4rem 0.8rem", border:`2px solid ${form.bg_color===c.value?"var(--green-dk)":"rgba(26,92,42,0.12)"}`, borderRadius:20, background:"white", cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>
                        <div style={{ width:14, height:14, borderRadius:"50%", background:c.value, border:"1px solid rgba(0,0,0,0.1)" }}/>
                        <span style={{ fontSize:"0.72rem", fontWeight: form.bg_color===c.value ? 700 : 400, color:"#333" }}>{c.label}</span>
                      </button>
                    ))}
                    <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                      <span style={{ fontSize:"0.72rem", color:"var(--muted)" }}>Custom:</span>
                      <input type="color" value={form.bg_color} onChange={e => setF("bg_color", e.target.value)}
                        style={{ width:32, height:32, border:"none", borderRadius:6, cursor:"pointer", padding:0 }}/>
                    </div>
                  </div>
                </div>

                {/* Cover image */}
                <div>
                  <label style={S.label}>Cover / Banner Image <span style={{ fontWeight:400, textTransform:"none", letterSpacing:0 }}>(shown at top of page)</span></label>
                  <input ref={coverRef} type="file" accept="image/*" onChange={handleCoverUpload} style={{ display:"none" }}/>
                  {form.cover_image_url ? (
                    <div style={{ position:"relative", borderRadius:8, overflow:"hidden", border:"1px solid rgba(26,92,42,0.12)" }}>
                      <img src={form.cover_image_url} alt="Cover" style={{ width:"100%", height:160, objectFit:"cover" }}/>
                      <div style={{ position:"absolute", top:8, right:8, display:"flex", gap:6 }}>
                        <button onClick={() => coverRef.current?.click()}
                          style={{ background:"rgba(0,0,0,0.6)", border:"none", borderRadius:6, padding:"0.35rem 0.7rem", color:"white", fontSize:"0.72rem", cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>
                          Change
                        </button>
                        <button onClick={() => setF("cover_image_url", "")}
                          style={{ background:"rgba(192,57,43,0.8)", border:"none", borderRadius:6, padding:"0.35rem 0.7rem", color:"white", fontSize:"0.72rem", cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => coverRef.current?.click()} disabled={coverUploading}
                      style={{ display:"flex", alignItems:"center", gap:8, padding:"1.2rem", border:"2px dashed rgba(26,92,42,0.2)", borderRadius:8, background:"rgba(26,92,42,0.02)", cursor:"pointer", fontFamily:"'DM Sans',sans-serif", width:"100%" }}>
                      {coverUploading ? <RefreshCw size={16} color="var(--muted)"/> : <ImageIcon size={16} color="var(--muted)"/>}
                      <span style={{ fontSize:"0.82rem", color:"var(--muted)" }}>{coverUploading ? "Uploading..." : "Click to upload cover image"}</span>
                    </button>
                  )}
                </div>

                <div style={{ display:"flex", justifyContent:"flex-end" }}>
                  <button onClick={() => setActiveSection("content")}
                    style={{ display:"flex", alignItems:"center", gap:6, background:"var(--green-dk)", color:"white", border:"none", padding:"0.6rem 1.4rem", borderRadius:7, fontSize:"0.82rem", fontWeight:700, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>
                    Next: Add Content →
                  </button>
                </div>
              </div>
            )}

            {/* ══ TAB 2: CONTENT ══ */}
            {activeSection === "content" && (
              <div style={{ display:"flex", flexDirection:"column", gap:"1rem" }}>

                <div style={{ background:"rgba(26,92,42,0.03)", borderRadius:8, padding:"0.8rem 1rem", border:"1px solid rgba(26,92,42,0.08)" }}>
                  <p style={{ fontSize:"0.75rem", color:"var(--green-dk)", fontWeight:600, marginBottom:3 }}>
                    Template: <span style={{ color:"var(--gold-dk)" }}>{TEMPLATES.find(t=>t.id===form.template)?.label}</span>
                  </p>
                  <p style={{ fontSize:"0.7rem", color:"var(--muted)" }}>Add content blocks below. They appear in order on your page.</p>
                </div>

                {/* Content blocks */}
                {form.content_blocks.map((block, idx) => (
                  <div key={block.id} style={{ border:"1px solid rgba(26,92,42,0.1)", borderRadius:8, overflow:"hidden" }}>
                    {/* Block header */}
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0.6rem 0.9rem", background:"rgba(26,92,42,0.03)", borderBottom:"1px solid rgba(26,92,42,0.07)" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                        <span style={{ fontSize:"0.65rem", fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", color:"var(--muted)" }}>
                          {block.type === "text" ? "📝 Text Block" : block.type === "image" ? "🖼️ Image" : block.type === "heading" ? "📌 Heading" : block.type === "divider" ? "➖ Divider" : "⬜ Two Column"}
                        </span>
                      </div>
                      <div style={{ display:"flex", gap:4 }}>
                        <button onClick={() => moveBlock(block.id, "up")} disabled={idx===0}
                          style={{ background:"none", border:"1px solid rgba(26,92,42,0.15)", borderRadius:4, padding:"2px 6px", cursor:idx===0?"not-allowed":"pointer", opacity:idx===0?0.3:1, color:"var(--muted)" }}>
                          <ChevronUp size={12}/>
                        </button>
                        <button onClick={() => moveBlock(block.id, "down")} disabled={idx===form.content_blocks.length-1}
                          style={{ background:"none", border:"1px solid rgba(26,92,42,0.15)", borderRadius:4, padding:"2px 6px", cursor:idx===form.content_blocks.length-1?"not-allowed":"pointer", opacity:idx===form.content_blocks.length-1?0.3:1, color:"var(--muted)" }}>
                          <ChevronDown size={12}/>
                        </button>
                        <button onClick={() => removeBlock(block.id)}
                          style={{ background:"none", border:"1px solid rgba(192,57,43,0.2)", borderRadius:4, padding:"2px 6px", cursor:"pointer", color:"#C0392B" }}>
                          <X size={12}/>
                        </button>
                      </div>
                    </div>

                    {/* Block content */}
                    <div style={{ padding:"0.9rem" }}>
                      {block.type === "heading" && (
                        <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                          <input style={S.input} value={block.content}
                            onChange={e => updateBlock(block.id, "content", e.target.value)}
                            placeholder="Heading text..." />
                          <div style={{ display:"flex", gap:4 }}>
                            {(["left","center","right"] as const).map(a => (
                              <button key={a} onClick={() => updateBlock(block.id, "align", a)}
                                style={{ padding:"0.3rem 0.7rem", borderRadius:5, border:`1.5px solid ${block.align===a?"var(--green-dk)":"rgba(26,92,42,0.15)"}`, background: block.align===a?"var(--green-dk)":"white", color: block.align===a?"white":"var(--muted)", fontSize:"0.7rem", cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>
                                {a}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      {block.type === "text" && (
                        <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                          <textarea style={{ ...S.input, resize:"vertical", minHeight:100, lineHeight:1.7 }}
                            value={block.content}
                            onChange={e => updateBlock(block.id, "content", e.target.value)}
                            placeholder="Write your text here... Basic HTML is supported: <b>bold</b>, <i>italic</i>, <br/> for line break, <a href='...'>link</a>" />
                          <div style={{ display:"flex", gap:4 }}>
                            {(["left","center","right"] as const).map(a => (
                              <button key={a} onClick={() => updateBlock(block.id, "align", a)}
                                style={{ padding:"0.3rem 0.7rem", borderRadius:5, border:`1.5px solid ${block.align===a?"var(--green-dk)":"rgba(26,92,42,0.15)"}`, background: block.align===a?"var(--green-dk)":"white", color: block.align===a?"white":"var(--muted)", fontSize:"0.7rem", cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>
                                {a}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      {block.type === "image" && (
                        <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                          {block.image_url ? (
                            <div style={{ position:"relative" }}>
                              <img src={block.image_url} alt="" style={{ width:"100%", maxHeight:200, objectFit:"cover", borderRadius:6 }}/>
                              <button onClick={() => updateBlock(block.id, "image_url", "")}
                                style={{ position:"absolute", top:6, right:6, background:"rgba(192,57,43,0.8)", border:"none", borderRadius:4, padding:"3px 8px", color:"white", fontSize:"0.7rem", cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>
                                Remove
                              </button>
                            </div>
                          ) : (
                            <label style={{ display:"flex", alignItems:"center", gap:8, padding:"1rem", border:"2px dashed rgba(26,92,42,0.2)", borderRadius:6, cursor:"pointer" }}>
                              <Upload size={14} color="var(--muted)"/>
                              <span style={{ fontSize:"0.78rem", color:"var(--muted)" }}>Click to upload image</span>
                              <input type="file" accept="image/*" style={{ display:"none" }}
                                onChange={e => { const f=e.target.files?.[0]; if(f) handleBlockImageUpload(block.id, f); }}/>
                            </label>
                          )}
                          <input style={S.input} value={block.content}
                            onChange={e => updateBlock(block.id, "content", e.target.value)}
                            placeholder="Image caption (optional)" />
                        </div>
                      )}
                      {block.type === "two-col" && (
                        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0.8rem" }}>
                          <div>
                            <label style={S.label}>Left Column</label>
                            <textarea style={{ ...S.input, resize:"vertical", minHeight:80, lineHeight:1.7 }}
                              value={block.content}
                              onChange={e => updateBlock(block.id, "content", e.target.value)}
                              placeholder="Left column content..." />
                          </div>
                          <div>
                            <label style={S.label}>Right Column</label>
                            <textarea style={{ ...S.input, resize:"vertical", minHeight:80, lineHeight:1.7 }}
                              value={block.content2 || ""}
                              onChange={e => updateBlock(block.id, "content2", e.target.value)}
                              placeholder="Right column content..." />
                          </div>
                        </div>
                      )}
                      {block.type === "divider" && (
                        <div style={{ display:"flex", alignItems:"center", gap:8, padding:"0.5rem 0" }}>
                          <div style={{ flex:1, height:1, background:"rgba(26,92,42,0.15)", borderRadius:1 }}/>
                          <span style={{ fontSize:"0.68rem", color:"var(--muted)" }}>Divider</span>
                          <div style={{ flex:1, height:1, background:"rgba(26,92,42,0.15)", borderRadius:1 }}/>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* Add block buttons */}
                <div style={{ background:"rgba(26,92,42,0.02)", borderRadius:8, padding:"1rem", border:"1px dashed rgba(26,92,42,0.15)" }}>
                  <p style={{ fontSize:"0.68rem", fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", color:"var(--muted)", marginBottom:"0.7rem" }}>Add Content Block</p>
                  <div style={{ display:"flex", gap:"0.5rem", flexWrap:"wrap" }}>
                    {[
                      { type: "heading",  label: "📌 Heading"    },
                      { type: "text",     label: "📝 Text"       },
                      { type: "image",    label: "🖼️ Image"      },
                      { type: "two-col",  label: "⬜ Two Column" },
                      { type: "divider",  label: "➖ Divider"    },
                    ].map(({ type, label }) => (
                      <button key={type} onClick={() => addBlock(type as ContentBlock["type"])}
                        style={{ display:"flex", alignItems:"center", gap:5, padding:"0.45rem 0.9rem", border:"1.5px solid rgba(26,92,42,0.15)", borderRadius:6, background:"white", cursor:"pointer", fontSize:"0.78rem", color:"var(--green-dk)", fontFamily:"'DM Sans',sans-serif", fontWeight:500 }}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display:"flex", justifyContent:"space-between" }}>
                  <button onClick={() => setActiveSection("template")}
                    style={{ background:"none", border:"1.5px solid rgba(26,92,42,0.15)", color:"var(--muted)", padding:"0.6rem 1.2rem", borderRadius:7, fontSize:"0.82rem", cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>
                    ← Back
                  </button>
                  <button onClick={() => setActiveSection("settings")}
                    style={{ display:"flex", alignItems:"center", gap:6, background:"var(--green-dk)", color:"white", border:"none", padding:"0.6rem 1.4rem", borderRadius:7, fontSize:"0.82rem", fontWeight:700, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>
                    Next: Settings →
                  </button>
                </div>
              </div>
            )}

            {/* ══ TAB 3: SETTINGS ══ */}
            {activeSection === "settings" && (
              <div style={{ display:"flex", flexDirection:"column", gap:"1rem" }}>

                {/* Nav settings */}
                <div style={S.section}>
                  <div style={S.sectionHead}>
                    <span style={{ fontSize:"0.78rem", fontWeight:700, color:"#0D3320" }}>Navigation Bar</span>
                  </div>
                  <div style={{ padding:"1rem", display:"flex", flexDirection:"column", gap:"0.9rem" }}>
                    <div style={{ display:"grid", gridTemplateColumns:"auto 1fr 80px", gap:"1rem", alignItems:"end" }}>
                      <div>
                        <label style={S.label}>Show in Nav?</label>
                        <button onClick={() => setF("show_in_nav", !form.show_in_nav)} style={S.toggle(form.show_in_nav)}>
                          <div style={S.toggleDot(form.show_in_nav)}/>
                        </button>
                      </div>
                      <div>
                        <label style={S.label}>Nav Label</label>
                        <input style={S.input} value={form.nav_label}
                          onChange={e => setF("nav_label", e.target.value)}
                          placeholder={form.title || "Page title"} />
                      </div>
                      <div>
                        <label style={S.label}>Order</label>
                        <input style={S.input} type="number" value={form.nav_order}
                          onChange={e => setF("nav_order", Number(e.target.value))}/>
                      </div>
                    </div>
                    <p style={{ fontSize:"0.7rem", color:"var(--muted)" }}>Lower order number = appears earlier in nav. Your fixed nav links (About, Programs, etc.) are separate.</p>
                  </div>
                </div>

                {/* Page options */}
                <div style={S.section}>
                  <div style={S.sectionHead}>
                    <span style={{ fontSize:"0.78rem", fontWeight:700, color:"#0D3320" }}>Page Options</span>
                  </div>
                  <div style={{ padding:"1rem", display:"flex", flexDirection:"column", gap:"0.9rem" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"0.7rem 0.9rem", background:"rgba(26,92,42,0.02)", borderRadius:7, border:"1px solid rgba(26,92,42,0.07)" }}>
                      <div>
                        <p style={{ fontSize:"0.82rem", fontWeight:600, color:"#0D3320" }}>Show Date & Time</p>
                        <p style={{ fontSize:"0.7rem", color:"var(--muted)" }}>Displays when the page was published</p>
                      </div>
                      <button onClick={() => setF("show_date", !form.show_date)} style={S.toggle(form.show_date)}>
                        <div style={S.toggleDot(form.show_date)}/>
                      </button>
                    </div>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"0.7rem 0.9rem", background:"rgba(26,92,42,0.02)", borderRadius:7, border:"1px solid rgba(26,92,42,0.07)" }}>
                      <div>
                        <p style={{ fontSize:"0.82rem", fontWeight:600, color:"#0D3320" }}>Show Breadcrumb</p>
                        <p style={{ fontSize:"0.7rem", color:"var(--muted)" }}>Shows "Home › Page Title" at top</p>
                      </div>
                      <button onClick={() => setF("show_breadcrumb", !form.show_breadcrumb)} style={S.toggle(form.show_breadcrumb)}>
                        <div style={S.toggleDot(form.show_breadcrumb)}/>
                      </button>
                    </div>
                  </div>
                </div>

                {/* SEO */}
                <div style={S.section}>
                  <div style={S.sectionHead}>
                    <span style={{ fontSize:"0.78rem", fontWeight:700, color:"#0D3320" }}>SEO / Meta Description</span>
                  </div>
                  <div style={{ padding:"1rem" }}>
                    <label style={S.label}>Meta Description <span style={{ fontWeight:400, textTransform:"none", letterSpacing:0 }}>(shown in Google)</span></label>
                    <input style={S.input} value={form.meta_description}
                      onChange={e => setF("meta_description", e.target.value)}
                      placeholder="Short description for search results..." />
                  </div>
                </div>

                <div style={{ display:"flex", justifyContent:"space-between" }}>
                  <button onClick={() => setActiveSection("content")}
                    style={{ background:"none", border:"1.5px solid rgba(26,92,42,0.15)", color:"var(--muted)", padding:"0.6rem 1.2rem", borderRadius:7, fontSize:"0.82rem", cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>
                    ← Back
                  </button>
                  <button onClick={() => setActiveSection("features")}
                    style={{ display:"flex", alignItems:"center", gap:6, background:"var(--green-dk)", color:"white", border:"none", padding:"0.6rem 1.4rem", borderRadius:7, fontSize:"0.82rem", fontWeight:700, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>
                    Next: Features →
                  </button>
                </div>
              </div>
            )}

            {/* ══ TAB 4: FEATURES ══ */}
            {activeSection === "features" && (
              <div style={{ display:"flex", flexDirection:"column", gap:"1rem" }}>

                <div style={{ background:"rgba(26,92,42,0.03)", borderRadius:8, padding:"0.8rem 1rem", border:"1px solid rgba(26,92,42,0.08)" }}>
                  <p style={{ fontSize:"0.75rem", color:"var(--green-dk)", fontWeight:600, marginBottom:3 }}>Website Features</p>
                  <p style={{ fontSize:"0.7rem", color:"var(--muted)" }}>Choose which sections from your main website appear at the bottom of this page.</p>
                </div>

                {[
                  { key: "show_recent_news",  label: "Recent News",            desc: "Shows your 3 latest published articles",         emoji: "📰" },
                  { key: "show_officers",     label: "Officers Section",        desc: "Shows your executive officers and BOD",           emoji: "👥" },
                  { key: "show_programs",     label: "Programs Section",        desc: "Shows your consumer rights programs",             emoji: "📋" },
                  { key: "show_membership",   label: "Membership & Fees",       desc: "Shows membership fees and registration form",     emoji: "💳" },
                  { key: "show_senior_calc",  label: "Senior Citizen Calculator", desc: "Shows the senior citizen discount calculator",  emoji: "🧮" },
                  { key: "show_datetime",     label: "Live Date & Time",        desc: "Shows current date and time on the page",         emoji: "🕐" },
                ] .map(({ key, label, desc, emoji }) => (
                  <div key={key} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"0.9rem 1rem", background:"white", borderRadius:8, border:"1px solid rgba(26,92,42,0.08)" }}>
                    <div style={{ display:"flex", alignItems:"flex-start", gap:10 }}>
                      <span style={{ fontSize:"1.2rem" }}>{emoji}</span>
                      <div>
                        <p style={{ fontSize:"0.85rem", fontWeight:600, color:"#0D3320", marginBottom:2 }}>{label}</p>
                        <p style={{ fontSize:"0.72rem", color:"var(--muted)" }}>{desc}</p>
                      </div>
                    </div>
                    <button onClick={() => setFeature(key as keyof PageFeatures, !form.features[key as keyof PageFeatures])}
                      style={S.toggle(!!form.features[key as keyof PageFeatures])}>
                      <div style={S.toggleDot(!!form.features[key as keyof PageFeatures])}/>
                    </button>
                  </div>
                ))}

                <div style={{ display:"flex", justifyContent:"space-between", paddingTop:"0.5rem" }}>
                  <button onClick={() => setActiveSection("settings")}
                    style={{ background:"none", border:"1.5px solid rgba(26,92,42,0.15)", color:"var(--muted)", padding:"0.6rem 1.2rem", borderRadius:7, fontSize:"0.82rem", cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>
                    ← Back
                  </button>
                  <button onClick={handleSave} disabled={saving || !form.title.trim() || !form.slug.trim()}
                    style={{ display:"flex", alignItems:"center", gap:6, background:saving?"rgba(201,168,76,0.5)":"var(--gold)", color:"var(--green-dk)", border:"none", padding:"0.7rem 1.8rem", borderRadius:7, fontSize:"0.85rem", fontWeight:700, cursor:saving?"not-allowed":"pointer", fontFamily:"'DM Sans',sans-serif", boxShadow:"0 4px 12px rgba(201,168,76,0.3)" }}>
                    {saving ? <><RefreshCw size={14}/> Saving...</> : <><Check size={14}/> Save & Publish Page</>}
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          PAGES LIST
      ══════════════════════════════════════════════════════ */}
      {loading ? (
        <div style={{ textAlign:"center", padding:"3rem", color:"var(--muted)" }}>
          <RefreshCw size={18} style={{ opacity:0.4, marginBottom:8 }}/><p>Loading pages...</p>
        </div>
      ) : pages.length === 0 ? (
        <div style={{ textAlign:"center", padding:"3rem", background:"white", borderRadius:10, border:"1px solid rgba(26,92,42,0.08)", color:"var(--muted)" }}>
          <FileText size={32} style={{ opacity:0.2, marginBottom:8 }}/>
          <p style={{ fontWeight:600 }}>No pages yet</p>
          <p style={{ fontSize:"0.82rem", marginTop:4 }}>Click "New Page" to create your first page.</p>
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:"0.6rem" }}>
          {pages.map(p => (
            <div key={p.id} style={{ background:"white", borderRadius:10, border:"1px solid rgba(26,92,42,0.08)", overflow:"hidden" }}>
              {/* Cover thumbnail strip */}
              {p.cover_image_url && (
                <div style={{ height:60, overflow:"hidden" }}>
                  <img src={p.cover_image_url} alt="" style={{ width:"100%", height:"100%", objectFit:"cover", opacity:0.7 }}/>
                </div>
              )}
              <div style={{ display:"flex", alignItems:"center", padding:"0.9rem 1.2rem", gap:"1rem", flexWrap:"wrap" }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:3, flexWrap:"wrap" }}>
                    <p style={{ fontWeight:700, fontSize:"0.9rem", color:"var(--green-dk)" }}>{p.title}</p>
                    <span style={{ fontSize:"0.65rem", fontWeight:700, padding:"2px 8px", borderRadius:20, background: p.status==="published"?"rgba(46,139,68,0.1)":"rgba(100,100,100,0.1)", color: p.status==="published"?"#2E8B44":"#666" }}>
                      {p.status==="published" ? "Published" : "Draft"}
                    </span>
                    {p.show_in_nav && (
                      <span style={{ fontSize:"0.65rem", fontWeight:700, padding:"2px 8px", borderRadius:20, background:"rgba(43,95,168,0.1)", color:"#2B5FA8" }}>In Nav</span>
                    )}
                    <span style={{ fontSize:"0.65rem", padding:"2px 8px", borderRadius:20, background:"rgba(201,168,76,0.1)", color:"#A06400", fontWeight:600 }}>
                      {TEMPLATES.find(t=>t.id===p.template)?.label || "Document"}
                    </span>
                  </div>
                  <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
                    <a href={`/${p.slug}`} target="_blank" rel="noreferrer"
                      style={{ fontSize:"0.72rem", color:"var(--muted)", fontFamily:"monospace" }}>
                      /{p.slug}
                    </a>
                    {p.show_in_nav && (
                      <span style={{ fontSize:"0.72rem", color:"var(--muted)" }}>Nav: "{p.nav_label||p.title}" (#{p.nav_order})</span>
                    )}
                  </div>
                </div>
                {canCRUD && (
                  <div style={{ display:"flex", gap:6 }}>
                    <button onClick={() => toggleStatus(p)}
                      style={{ padding:"0.4rem 0.8rem", borderRadius:6, border:"1.5px solid rgba(26,92,42,0.15)", background:"white", cursor:"pointer", display:"flex", alignItems:"center", gap:4, fontSize:"0.72rem", color:"var(--muted)", fontFamily:"'DM Sans',sans-serif" }}>
                      {p.status==="published" ? <><EyeOff size={13}/> Unpublish</> : <><Eye size={13}/> Publish</>}
                    </button>
                    <button onClick={() => openEdit(p)}
                      style={{ padding:"0.4rem 0.8rem", borderRadius:6, border:"1.5px solid rgba(26,92,42,0.15)", background:"white", cursor:"pointer", fontSize:"0.72rem", color:"var(--green-dk)", fontWeight:600, fontFamily:"'DM Sans',sans-serif" }}>
                      Edit
                    </button>
                    <button onClick={() => handleDelete(p)}
                      style={{ padding:"0.4rem 0.8rem", borderRadius:6, border:"1.5px solid rgba(192,57,43,0.2)", background:"white", cursor:"pointer", display:"flex", alignItems:"center", color:"#C0392B", fontFamily:"'DM Sans',sans-serif" }}>
                      <Trash2 size={13}/>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}