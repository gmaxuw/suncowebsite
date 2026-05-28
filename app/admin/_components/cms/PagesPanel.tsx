"use client";
// ─────────────────────────────────────────────
// cms/PagesPanel.tsx — Rebuilt 2026 Edition
// Same editor quality as PostEditor
// One layout (3-col news style), AI generation, SEO
// AI Generator restricted to admin role only
// ─────────────────────────────────────────────
import { useEffect, useState, useRef } from "react";
import {
  Plus, Trash2, Eye, EyeOff, RefreshCw, X, Check,
  FileText, Upload, Image as ImageIcon, Sparkles,
  Globe, Hash, Star, Clock, ChevronDown, ChevronUp,
  AlertCircle, Zap, BookOpen, Camera, Tag,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────
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
  cover_image_url: string;
  bg_color: string;
  show_date: boolean;
  show_breadcrumb: boolean;
  features: PageFeatures;
  seo_title: string;
  seo_description: string;
  seo_keywords: string[];
  created_at: string;
}

const EMPTY_PAGE: Omit<Page, "id" | "created_at"> = {
  title: "", slug: "", content: "", meta_description: "",
  show_in_nav: true, nav_label: "", nav_order: 99, status: "draft",
  cover_image_url: "", bg_color: "#F7F5F0",
  show_date: true, show_breadcrumb: true, features: {},
  seo_title: "", seo_description: "", seo_keywords: [],
};

interface Props { supabase: any; canCRUD: boolean; }

type EditorTab = "content" | "seo" | "settings" | "features";

function slugify(text: string) {
  return text.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

// ── Main Component ────────────────────────────────────────────
export default function PagesPanel({ supabase, canCRUD }: Props) {
  const [pages,       setPages]       = useState<Page[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [editing,     setEditing]     = useState<Page | null>(null);
  const [isNew,       setIsNew]       = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [saved,       setSaved]       = useState(false);
  const [form,        setForm]        = useState<Omit<Page,"id"|"created_at">>({ ...EMPTY_PAGE });
  const [activeTab,   setActiveTab]   = useState<EditorTab>("content");
  const [coverUploading, setCoverUploading] = useState(false);
  const [coverPreview,   setCoverPreview]   = useState<string | null>(null);
  const [showAI,      setShowAI]      = useState(false);
  const [aiLoading,   setAiLoading]   = useState(false);
  const [aiError,     setAiError]     = useState("");
  const [aiPrompt,    setAiPrompt]    = useState("");
  const [tagInput,    setTagInput]    = useState("");
  const [contentImgUploading, setContentImgUploading] = useState(false);

  // ── NEW: track whether the logged-in user is an admin ────────
  const [isAdmin,     setIsAdmin]     = useState(false);

  const coverRef      = useRef<HTMLInputElement>(null);
  const contentImgRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("pages").select("*").order("nav_order");
    setPages(data || []);
    setLoading(false);
  };

  // ── NEW: check the current user's role from the user_roles table
  const checkAdminRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: userRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();
    setIsAdmin(userRole?.role === "admin");
  };

  useEffect(() => {
    load();
    checkAdminRole();
  }, []);

  const wordCount = (form.content || "").split(/\s+/).filter(Boolean).length;
  const readTime  = Math.max(1, Math.ceil(wordCount / 200));

  const openNew = () => {
    setForm({ ...EMPTY_PAGE });
    setCoverPreview(null);
    setEditing(null);
    setIsNew(true);
    setActiveTab("content");
    setShowAI(false);
  };

  const openEdit = (p: Page) => {
    setForm({
      title: p.title, slug: p.slug, content: p.content,
      meta_description: p.meta_description || "",
      show_in_nav: p.show_in_nav, nav_label: p.nav_label,
      nav_order: p.nav_order, status: p.status,
      cover_image_url: p.cover_image_url || "",
      bg_color: p.bg_color || "#F7F5F0",
      show_date: p.show_date ?? true,
      show_breadcrumb: p.show_breadcrumb !== false,
      features: p.features || {},
      seo_title: p.seo_title || "",
      seo_description: p.seo_description || "",
      seo_keywords: p.seo_keywords || [],
    });
    setCoverPreview(p.cover_image_url || null);
    setEditing(p);
    setIsNew(false);
    setActiveTab("content");
    setShowAI(false);
  };

  const closeEditor = () => { setEditing(null); setIsNew(false); };

  const setF = (key: keyof typeof form, value: any) =>
    setForm(f => ({ ...f, [key]: value }));

  const setFeature = (key: keyof PageFeatures, value: boolean) =>
    setForm(f => ({ ...f, features: { ...f.features, [key]: value } }));

  const handleTitleChange = (val: string) => {
    setForm(prev => ({
      ...prev,
      title:     val,
      slug:      prev.slug && prev.slug !== slugify(prev.title) ? prev.slug : slugify(val),
      nav_label: prev.nav_label || val,
      seo_title: prev.seo_title || val,
    }));
  };

  // ── Cover image upload ──────────────────────────────────────
  const compressToWebP = (file: File, maxPx = 1400): Promise<Blob> =>
    new Promise((resolve, reject) => {
      const img = document.createElement("img") as HTMLImageElement;
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        let { width, height } = img;
        if (width > maxPx || height > maxPx) {
          if (width > height) { height = Math.round((height / width) * maxPx); width = maxPx; }
          else { width = Math.round((width / height) * maxPx); height = maxPx; }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width; canvas.height = height;
        canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
        canvas.toBlob(b => b ? resolve(b) : reject(new Error("Failed")), "image/webp", 0.85);
      };
      img.onerror = reject;
      img.src = url;
    });

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverUploading(true);
    const reader = new FileReader();
    reader.onload = ev => setCoverPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    try {
      const blob = await compressToWebP(file);
      const filename = `pages/cover-${Date.now()}.webp`;
      const { error } = await supabase.storage.from("articles").upload(filename, blob, { contentType: "image/webp", upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("articles").getPublicUrl(filename);
      setF("cover_image_url", urlData.publicUrl);
    } catch (err: any) { alert("Upload failed: " + err.message); }
    setCoverUploading(false);
  };

  // ── Content image upload ────────────────────────────────────
  const handleContentImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setContentImgUploading(true);
    try {
      const blob = await compressToWebP(file);
      const filename = `pages/img-${Date.now()}.webp`;
      const { error } = await supabase.storage.from("articles").upload(filename, blob, { contentType: "image/webp", upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("articles").getPublicUrl(filename);
      const altText = prompt("Enter caption for this image (optional):") || "";
      const tag = `\n\n[img:${urlData.publicUrl}|${altText}]\n\n`;
      setF("content", (form.content || "") + tag);
    } catch (err: any) { alert("Image upload failed: " + err.message); }
    setContentImgUploading(false);
  };

  // ── AI Generation ───────────────────────────────────────────
  const handleAIGenerate = async () => {
    if (!form.title.trim()) { setAiError("Please enter a page title first."); return; }
    setAiLoading(true);
    setAiError("");
    try {
      const res = await fetch("/api/generate-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title:    form.title.trim(),
          category: "pages",
          context:  aiPrompt.trim(),
        }),
      });
      const parsed = await res.json();
      if (!res.ok) throw new Error(parsed.error || "Generation failed");
      setForm(prev => ({
        ...prev,
        content:         parsed.content         || prev.content,
        meta_description: parsed.excerpt        || prev.meta_description,
        seo_title:       parsed.seo_title       || prev.seo_title,
        seo_description: parsed.seo_description || prev.seo_description,
        seo_keywords:    parsed.seo_keywords    || prev.seo_keywords,
      }));
      setShowAI(false);
      setActiveTab("seo");
    } catch (err: any) { setAiError("Generation failed: " + err.message); }
    setAiLoading(false);
  };

  // ── Save ────────────────────────────────────────────────────
  const handleSave = async (publishNow = false) => {
    if (!form.title.trim() || !form.slug.trim()) return;
    setSaving(true);
    const status = publishNow ? "published" : form.status;
    const payload = {
      ...form,
      status,
      nav_label:       form.nav_label || form.title,
      nav_order:       Number(form.nav_order),
      seo_title:       form.seo_title || form.title,
      seo_description: form.seo_description || form.meta_description,
      updated_at:      new Date().toISOString(),
      ...(publishNow ? { published_at: new Date().toISOString() } : {}),
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

  const addKeyword = (k: string) => {
    const kw = k.trim().toLowerCase();
    if (kw && !(form.seo_keywords || []).includes(kw))
      setForm(prev => ({ ...prev, seo_keywords: [...(prev.seo_keywords || []), kw] }));
  };
  const removeKeyword = (k: string) =>
    setForm(prev => ({ ...prev, seo_keywords: (prev.seo_keywords || []).filter(x => x !== k) }));

  const showEditor = editing !== null || isNew;

  // ── Toggle style helper ─────────────────────────────────────
  const Toggle = ({ on, onToggle }: { on: boolean; onToggle: () => void }) => (
    <button onClick={onToggle} style={{ width:44, height:24, borderRadius:12, background: on ? "#2E8B44" : "rgba(0,0,0,0.15)", border:"none", cursor:"pointer", position:"relative", transition:"background 0.2s", flexShrink:0 }}>
      <div style={{ position:"absolute", top:3, left: on ? 23 : 3, width:18, height:18, borderRadius:"50%", background:"white", transition:"left 0.2s", boxShadow:"0 1px 4px rgba(0,0,0,0.2)" }} />
    </button>
  );

  return (
    <>
      <style>{`
        .pp-overlay { position:fixed;inset:0;background:rgba(5,15,10,0.85);backdrop-filter:blur(8px);z-index:400;display:flex;align-items:stretch;justify-content:flex-end; }
        .pp-modal { display:flex;flex-direction:column;width:100%;max-width:900px;height:100vh;background:#F7F5F0;position:relative;box-shadow:-40px 0 120px rgba(0,0,0,0.4); }
        .pp-header { background:linear-gradient(135deg,#0A2818 0%,#1A5C2A 100%);padding:0;flex-shrink:0;position:relative;overflow:hidden; }
        .pp-header-bg { position:absolute;inset:0;background:radial-gradient(ellipse at 80% 50%,rgba(201,168,76,0.15) 0%,transparent 70%);pointer-events:none; }
        .pp-header-inner { position:relative;z-index:1;padding:1.4rem 1.8rem; }
        .pp-tabs { display:flex;background:rgba(0,0,0,0.25);border-top:1px solid rgba(255,255,255,0.06); }
        .pp-tab { flex:1;display:flex;align-items:center;justify-content:center;gap:7px;padding:0.75rem 1rem;border:none;background:transparent;color:rgba(255,255,255,0.45);font-size:0.78rem;font-weight:500;cursor:pointer;font-family:'DM Sans',sans-serif;border-bottom:2px solid transparent;transition:all 0.18s; }
        .pp-tab.active { color:#C9A84C;border-bottom-color:#C9A84C;background:rgba(201,168,76,0.08); }
        .pp-tab:hover:not(.active) { color:rgba(255,255,255,0.7);background:rgba(255,255,255,0.04); }
        .pp-body { flex:1;overflow-y:auto;padding:2rem 1.8rem;scroll-behavior:smooth; }
        .pp-body::-webkit-scrollbar { width:5px; }
        .pp-body::-webkit-scrollbar-thumb { background:rgba(26,92,42,0.2);border-radius:10px; }
        .pp-footer { background:white;border-top:1px solid rgba(26,92,42,0.1);padding:1rem 1.8rem;display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-shrink:0; }
        .pp-field { margin-bottom:1.4rem; }
        .pp-label { display:block;font-size:0.68rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#0A2818;margin-bottom:0.45rem;opacity:0.6; }
        .pp-input { width:100%;padding:0.78rem 1rem;border:1.5px solid rgba(26,92,42,0.15);border-radius:10px;font-size:0.92rem;font-family:'DM Sans',sans-serif;color:#0D3320;background:white;outline:none;box-sizing:border-box;transition:border-color 0.15s; }
        .pp-input:focus { border-color:rgba(26,92,42,0.4);box-shadow:0 0 0 3px rgba(26,92,42,0.06); }
        .pp-textarea { width:100%;padding:0.78rem 1rem;border:1.5px solid rgba(26,92,42,0.15);border-radius:10px;font-size:0.92rem;font-family:'DM Sans',sans-serif;color:#0D3320;background:white;outline:none;box-sizing:border-box;resize:vertical;line-height:1.75;transition:border-color 0.15s; }
        .pp-textarea:focus { border-color:rgba(26,92,42,0.4);box-shadow:0 0 0 3px rgba(26,92,42,0.06); }
        .pp-card { background:white;border-radius:14px;border:1px solid rgba(26,92,42,0.08);overflow:hidden;margin-bottom:1.4rem;box-shadow:0 2px 12px rgba(0,0,0,0.04); }
        .pp-card-header { padding:1rem 1.2rem;background:#F0EDE6;border-bottom:1px solid rgba(26,92,42,0.07);display:flex;align-items:center;gap:8px; }
        .pp-card-body { padding:1.2rem; }
        .pp-ai-panel { border:1.5px solid rgba(201,168,76,0.35);border-radius:14px;overflow:hidden;margin-bottom:1.6rem;background:white; }
        .pp-ai-header { display:flex;align-items:center;justify-content:space-between;padding:1rem 1.2rem;cursor:pointer;background:linear-gradient(135deg,rgba(201,168,76,0.08),rgba(201,168,76,0.04));border:none;width:100%;font-family:'DM Sans',sans-serif; }
        .pp-ai-badge { background:linear-gradient(135deg,#C9A84C,#E5C96A);color:#0A2818;font-size:0.6rem;font-weight:800;padding:2px 9px;border-radius:20px;letter-spacing:0.06em; }
        .pp-keyword { display:inline-flex;align-items:center;gap:5px;background:rgba(43,95,168,0.08);color:#2B5FA8;font-size:0.75rem;font-weight:600;padding:4px 12px;border-radius:20px;border:1px solid rgba(43,95,168,0.15); }
        .pp-word-bar { height:3px;background:rgba(26,92,42,0.08);border-radius:10px;margin-top:0.5rem;overflow:hidden; }
        .pp-word-fill { height:100%;background:linear-gradient(90deg,#C9A84C,#2E8B44);border-radius:10px;transition:width 0.3s; }
        .pp-feature-row { display:flex;justify-content:space-between;align-items:center;padding:0.9rem 1rem;background:white;border-radius:8px;border:1px solid rgba(26,92,42,0.08);margin-bottom:0.6rem; }
        @keyframes pp-spin { to{transform:rotate(360deg)} }
        .pp-spinner { animation:pp-spin 0.8s linear infinite; }
        @media(max-width:640px){.pp-modal{max-width:100%;}.pp-header-inner{padding:1rem 1.2rem;}.pp-body{padding:1.2rem 1rem;}.pp-footer{padding:0.8rem 1rem;}}
      `}</style>

      <div style={{ fontFamily:"'DM Sans',sans-serif" }}>

        {/* ── Top bar ── */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"1.2rem", flexWrap:"wrap", gap:"0.8rem" }}>
          <p style={{ fontSize:"0.72rem", color:"var(--muted)", maxWidth:600 }}>
            Pages you create here become real URLs (e.g. <code style={{ background:"rgba(26,92,42,0.07)", padding:"1px 5px", borderRadius:3 }}>/about</code>). Add content, configure SEO, then publish.
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
            <p style={{ fontSize:"0.82rem", color:"#2E8B44", fontWeight:600 }}>Page saved successfully!</p>
          </div>
        )}

        {/* ══ PAGE EDITOR OVERLAY ══ */}
        {showEditor && (
          <div className="pp-overlay" onClick={e => { if (e.target === e.currentTarget) closeEditor(); }}>
            <div className="pp-modal">

              {/* Header */}
              <div className="pp-header">
                <div className="pp-header-bg" />
                <div className="pp-header-inner">
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <div style={{ width:36, height:36, borderRadius:10, background:"rgba(201,168,76,0.2)", border:"1.5px solid rgba(201,168,76,0.4)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                        <Globe size={16} color="#C9A84C" />
                      </div>
                      <div>
                        <p style={{ fontSize:"0.6rem", color:"rgba(255,255,255,0.35)", letterSpacing:"0.14em", textTransform:"uppercase", marginBottom:2 }}>
                          {isNew ? "New Page" : "Editing Page"}
                        </p>
                        <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.05rem", color:"#C9A84C", lineHeight:1.2 }}>
                          {form.title || "Untitled Page"}
                        </h2>
                      </div>
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <div style={{ background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.12)", borderRadius:20, padding:"4px 12px", display:"flex", alignItems:"center", gap:6 }}>
                        <BookOpen size={11} color="rgba(255,255,255,0.5)" />
                        <span style={{ fontSize:"0.7rem", color:"rgba(255,255,255,0.6)", fontWeight:600 }}>{wordCount} words</span>
                      </div>
                      <div style={{ background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.12)", borderRadius:20, padding:"4px 12px", display:"flex", alignItems:"center", gap:6 }}>
                        <div style={{ width:8, height:8, borderRadius:"50%", background: form.status === "published" ? "#4ade80" : "#fbbf24", flexShrink:0 }} />
                        <span style={{ fontSize:"0.7rem", color:"rgba(255,255,255,0.6)", fontWeight:600, textTransform:"capitalize" }}>{form.status}</span>
                      </div>
                      <button onClick={closeEditor} style={{ width:32, height:32, borderRadius:"50%", background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.12)", color:"white", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Tabs */}
                <div className="pp-tabs">
                  {([
                    { id:"content",  label:"Content",  icon:FileText },
                    { id:"seo",      label:"SEO",       icon:Globe    },
                    { id:"settings", label:"Settings",  icon:Star     },
                    { id:"features", label:"Features",  icon:Zap      },
                  ] as { id:EditorTab; label:string; icon:any }[]).map(({ id, label, icon:Icon }) => (
                    <button key={id} className={`pp-tab${activeTab === id ? " active" : ""}`} onClick={() => setActiveTab(id)}>
                      <Icon size={13} />
                      {label}
                      {id === "seo" && !(form.seo_title && form.seo_description) && (
                        <span style={{ width:6, height:6, borderRadius:"50%", background:"#fbbf24", flexShrink:0 }} />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Body */}
              <div className="pp-body">

                {/* ══ CONTENT TAB ══ */}
                {activeTab === "content" && (
                  <div>

                    {/* ── AI Generator — ADMIN ONLY ─────────────────────────
                        isAdmin is true only when profiles.role === "admin".
                        Treasurer, secretary, and all other roles never see this block.
                    ────────────────────────────────────────────────────────── */}
                    {isAdmin ? (
                      <div className="pp-ai-panel">
                        <button className="pp-ai-header" onClick={() => setShowAI(v => !v)}>
                          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                            <div style={{ width:32, height:32, borderRadius:8, background:"linear-gradient(135deg,rgba(201,168,76,0.2),rgba(201,168,76,0.08))", border:"1px solid rgba(201,168,76,0.3)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                              <Sparkles size={15} color="#C9A84C" />
                            </div>
                            <div style={{ textAlign:"left" }}>
                              <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:2 }}>
                                <span style={{ fontSize:"0.88rem", fontWeight:700, color:"#0D3320" }}>Claude AI Generator</span>
                                <span className="pp-ai-badge">AI</span>
                              </div>
                              <p style={{ fontSize:"0.7rem", color:"#888" }}>Generate full page content + SEO in one click</p>
                            </div>
                          </div>
                          {showAI ? <ChevronUp size={16} color="#888" /> : <ChevronDown size={16} color="#888" />}
                        </button>
                        {showAI && (
                          <div style={{ padding:"1.2rem", borderTop:"1px solid rgba(201,168,76,0.15)" }}>
                            <div className="pp-field">
                              <label className="pp-label">Context / instructions (optional)</label>
                              <textarea className="pp-textarea" value={aiPrompt} onChange={e => setAiPrompt(e.target.value)}
                                placeholder="e.g. This is the About page for SUNCO. Include history since 2011, mission, vision, and how to join..." rows={3} />
                            </div>
                            {aiError && (
                              <div style={{ display:"flex", gap:8, padding:"0.75rem 1rem", background:"#FDECEA", borderRadius:10, marginBottom:"0.9rem", border:"1px solid rgba(192,57,43,0.2)" }}>
                                <AlertCircle size={14} color="#A8200D" style={{ marginTop:1, flexShrink:0 }} />
                                <p style={{ fontSize:"0.78rem", color:"#A8200D" }}>{aiError}</p>
                              </div>
                            )}
                            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                              <button onClick={handleAIGenerate} disabled={aiLoading || !form.title.trim()}
                                style={{ display:"flex", alignItems:"center", gap:8, background: aiLoading || !form.title.trim() ? "rgba(26,92,42,0.2)" : "linear-gradient(135deg,#0A2818,#1A5C2A)", color: aiLoading || !form.title.trim() ? "#888" : "white", border:"none", padding:"0.72rem 1.5rem", borderRadius:10, fontSize:"0.85rem", fontWeight:700, cursor: aiLoading || !form.title.trim() ? "not-allowed" : "pointer", fontFamily:"'DM Sans',sans-serif" }}>
                                {aiLoading ? <><span className="pp-spinner" style={{ display:"inline-block" }}><Zap size={15} /></span> Generating...</> : <><Sparkles size={15} /> Generate Content + SEO</>}
                              </button>
                              {!form.title.trim() && <p style={{ fontSize:"0.72rem", color:"#AAA" }}>Enter a title first ↑</p>}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Non-admin sees a subtle locked notice instead */
                      <div style={{ display:"flex", alignItems:"center", gap:10, padding:"0.9rem 1.1rem", background:"rgba(26,92,42,0.03)", border:"1.5px solid rgba(26,92,42,0.08)", borderRadius:12, marginBottom:"1.6rem" }}>
                        <span style={{ fontSize:"1rem" }}>🔒</span>
                        <div>
                          <p style={{ fontSize:"0.8rem", fontWeight:700, color:"#0D3320", marginBottom:2 }}>AI Generator — Admin Only</p>
                          <p style={{ fontSize:"0.7rem", color:"#888" }}>Contact your admin to generate content with AI.</p>
                        </div>
                      </div>
                    )}

                    {/* Title */}
                    <div className="pp-field">
                      <label className="pp-label">Page Title *</label>
                      <input type="text" className="pp-input" value={form.title} onChange={e => handleTitleChange(e.target.value)}
                        placeholder="e.g. About Us, Consumer Rights, Programs..." style={{ fontSize:"1.1rem", fontWeight:700 }} />
                    </div>

                    {/* Slug */}
                    <div className="pp-field">
                      <label className="pp-label">URL Slug *</label>
                      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                        <span style={{ fontSize:"0.78rem", color:"#888", whiteSpace:"nowrap" }}>yoursite.com/</span>
                        <input type="text" className="pp-input" value={form.slug}
                          onChange={e => setF("slug", slugify(e.target.value))} placeholder="about-us"
                          style={{ fontFamily:"monospace", fontSize:"0.88rem" }} />
                      </div>
                    </div>

                    {/* Cover image */}
                    <div className="pp-card">
                      <div className="pp-card-header">
                        <Camera size={14} color="#1A5C2A" />
                        <span style={{ fontSize:"0.78rem", fontWeight:700, color:"#0D3320" }}>Cover / Banner Image</span>
                      </div>
                      <div className="pp-card-body">
                        <input ref={coverRef} type="file" accept="image/*" onChange={handleCoverUpload} style={{ display:"none" }} />
                        {coverPreview ? (
                          <div style={{ position:"relative", borderRadius:8, overflow:"hidden", border:"1px solid rgba(26,92,42,0.12)" }}>
                            <img src={coverPreview} alt="Cover" style={{ width:"100%", height:160, objectFit:"cover" }} />
                            <div style={{ position:"absolute", top:8, right:8, display:"flex", gap:6 }}>
                              <button onClick={() => coverRef.current?.click()}
                                style={{ background:"rgba(0,0,0,0.6)", border:"none", borderRadius:6, padding:"0.35rem 0.7rem", color:"white", fontSize:"0.72rem", cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>
                                Change
                              </button>
                              <button onClick={() => { setCoverPreview(null); setF("cover_image_url", ""); }}
                                style={{ background:"rgba(192,57,43,0.8)", border:"none", borderRadius:6, padding:"0.35rem 0.7rem", color:"white", fontSize:"0.72rem", cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>
                                Remove
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button onClick={() => coverRef.current?.click()} disabled={coverUploading}
                            style={{ display:"flex", alignItems:"center", gap:8, padding:"1.2rem", border:"2px dashed rgba(26,92,42,0.2)", borderRadius:8, background:"rgba(26,92,42,0.02)", cursor:"pointer", fontFamily:"'DM Sans',sans-serif", width:"100%" }}>
                            {coverUploading ? <RefreshCw size={16} color="var(--muted)" className="pp-spinner" /> : <ImageIcon size={16} color="var(--muted)" />}
                            <span style={{ fontSize:"0.82rem", color:"var(--muted)" }}>{coverUploading ? "Uploading..." : "Click to upload cover image — auto-compressed to WebP"}</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Page intro / excerpt */}
                    <div className="pp-field">
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"0.45rem" }}>
                        <label className="pp-label" style={{ marginBottom:0 }}>Page Intro / Excerpt</label>
                        <span style={{ fontSize:"0.65rem", color: (form.meta_description || "").length > 160 ? "#C0392B" : "#BBB", fontWeight:600 }}>
                          {(form.meta_description || "").length}/160
                        </span>
                      </div>
                      <textarea className="pp-textarea" value={form.meta_description}
                        onChange={e => setF("meta_description", e.target.value)}
                        placeholder="Short intro shown in the italic pull-quote above the content. Also used as SEO description if not set separately..."
                        rows={2} style={{ lineHeight:1.6 }} />
                    </div>

                    {/* Insert image into content */}
                    <div style={{ display:"flex", gap:"0.5rem", marginBottom:"0.5rem" }}>
                      <input ref={contentImgRef} type="file" accept="image/*" onChange={handleContentImageUpload} style={{ display:"none" }} />
                      <button onClick={() => contentImgRef.current?.click()} disabled={contentImgUploading}
                        style={{ display:"inline-flex", alignItems:"center", gap:6, background:"rgba(26,92,42,0.07)", border:"1.5px solid rgba(26,92,42,0.15)", color:"#1A5C2A", padding:"0.45rem 0.9rem", borderRadius:8, fontSize:"0.78rem", fontWeight:600, cursor: contentImgUploading ? "not-allowed" : "pointer", fontFamily:"'DM Sans',sans-serif" }}>
                        <ImageIcon size={13} /> {contentImgUploading ? "Uploading..." : "Insert Image into Content"}
                      </button>
                      <p style={{ fontSize:"0.68rem", color:"#AAA", alignSelf:"center" }}>Inserts [img:...] tag at end of content</p>
                    </div>

                    {/* Content */}
                    <div className="pp-field">
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"0.45rem" }}>
                        <label className="pp-label" style={{ marginBottom:0 }}>Page Content *</label>
                        <span style={{ fontSize:"0.65rem", color:"#BBB", fontWeight:600 }}>~{readTime} min read</span>
                      </div>
                      <textarea className="pp-textarea" value={form.content}
                        onChange={e => setF("content", e.target.value)}
                        placeholder={`Write your page content here.\n\nFormatting tips:\n• Double line break = new paragraph\n• Line ending with colon: = auto-detected as subheading\n• Bullet lines starting with • or - = bullet list\n• [img:URL|caption] = insert image\n• Use AI above to generate content automatically`}
                        rows={20} style={{ lineHeight:1.85, fontSize:"0.93rem" }} />
                      <div className="pp-word-bar">
                        <div className="pp-word-fill" style={{ width:`${Math.min(100, (wordCount / 400) * 100)}%` }} />
                      </div>
                      <p style={{ fontSize:"0.65rem", color:"#BBB", marginTop:4 }}>
                        {wordCount} words · Target: 400+ for SEO
                        {wordCount >= 400 && <span style={{ color:"#2E8B44", fontWeight:700, marginLeft:6 }}>✓ Good length</span>}
                      </p>
                    </div>
                  </div>
                )}

                {/* ══ SEO TAB ══ */}
                {activeTab === "seo" && (
                  <div>
                    {/* Google preview */}
                    <div className="pp-card">
                      <div className="pp-card-header">
                        <Globe size={14} color="#2B5FA8" />
                        <span style={{ fontSize:"0.78rem", fontWeight:700, color:"#0D3320" }}>Google Search Preview</span>
                      </div>
                      <div className="pp-card-body">
                        <div style={{ background:"white", border:"1px solid #E8E8E8", borderRadius:10, padding:"1.1rem 1.3rem" }}>
                          <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:"0.4rem" }}>
                            <div style={{ width:16, height:16, background:"#0D3320", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center" }}>
                              <span style={{ color:"#C9A84C", fontSize:"0.5rem", fontWeight:800 }}>S</span>
                            </div>
                            <span style={{ fontSize:"0.72rem", color:"#202124" }}>sunco.gabrielsacro.com / {form.slug || "page"}</span>
                          </div>
                          <p style={{ fontSize:"1.05rem", color:"#1558D6", fontFamily:"Arial,sans-serif", marginBottom:"0.25rem", lineHeight:1.3 }}>
                            {form.seo_title || form.title || "Page Title — SUNCO"}
                          </p>
                          <p style={{ fontSize:"0.82rem", color:"#4D5156", lineHeight:1.55, fontFamily:"Arial,sans-serif" }}>
                            {form.seo_description || form.meta_description || "Page description will appear here in Google search results..."}
                          </p>
                        </div>
                        <div style={{ display:"flex", gap:8, marginTop:"0.8rem" }}>
                          <div style={{ flex:1, background: (form.seo_title || "").length > 0 && (form.seo_title || "").length <= 60 ? "#E6F9ED" : (form.seo_title || "").length > 60 ? "#FDECEA" : "#F5F5F5", borderRadius:8, padding:"0.5rem 0.8rem", textAlign:"center" }}>
                            <p style={{ fontSize:"0.6rem", color:"#888", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:2 }}>Title</p>
                            <p style={{ fontSize:"0.8rem", fontWeight:700, color: (form.seo_title || "").length > 60 ? "#C0392B" : (form.seo_title || "").length > 0 ? "#2E8B44" : "#888" }}>
                              {(form.seo_title || "").length}/60
                            </p>
                          </div>
                          <div style={{ flex:1, background: (form.seo_description || "").length > 0 && (form.seo_description || "").length <= 160 ? "#E6F9ED" : (form.seo_description || "").length > 160 ? "#FDECEA" : "#F5F5F5", borderRadius:8, padding:"0.5rem 0.8rem", textAlign:"center" }}>
                            <p style={{ fontSize:"0.6rem", color:"#888", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:2 }}>Description</p>
                            <p style={{ fontSize:"0.8rem", fontWeight:700, color: (form.seo_description || "").length > 160 ? "#C0392B" : (form.seo_description || "").length > 0 ? "#2E8B44" : "#888" }}>
                              {(form.seo_description || "").length}/160
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="pp-field">
                      <label className="pp-label">SEO Title <span style={{ fontWeight:400, textTransform:"none", letterSpacing:0 }}>(under 60 chars)</span></label>
                      <input type="text" className="pp-input" value={form.seo_title}
                        onChange={e => setF("seo_title", e.target.value)}
                        placeholder="Keyword-rich title for Google..."
                        style={{ borderColor: (form.seo_title || "").length > 60 ? "#C0392B" : undefined }} />
                    </div>

                    <div className="pp-field">
                      <label className="pp-label">SEO Description <span style={{ fontWeight:400, textTransform:"none", letterSpacing:0 }}>(150–160 chars)</span></label>
                      <textarea className="pp-textarea" value={form.seo_description}
                        onChange={e => setF("seo_description", e.target.value)}
                        rows={3} placeholder="Clear description with your main keyword and a call to action..."
                        style={{ lineHeight:1.6, borderColor: (form.seo_description || "").length > 160 ? "#C0392B" : undefined }} />
                    </div>

                    {/* SEO Keywords */}
                    <div className="pp-card">
                      <div className="pp-card-header">
                        <Hash size={14} color="#2B5FA8" />
                        <span style={{ fontSize:"0.78rem", fontWeight:700, color:"#0D3320" }}>SEO Keywords</span>
                        <span style={{ marginLeft:"auto", fontSize:"0.65rem", color: (form.seo_keywords || []).length >= 5 ? "#2E8B44" : "#D4A017", fontWeight:700 }}>
                          {(form.seo_keywords || []).length}/8
                        </span>
                      </div>
                      <div className="pp-card-body">
                        <div style={{ display:"flex", flexWrap:"wrap", gap:"0.4rem", marginBottom:"0.7rem" }}>
                          {(form.seo_keywords || []).map(kw => (
                            <span key={kw} className="pp-keyword">
                              {kw}
                              <button onClick={() => removeKeyword(kw)} style={{ background:"none", border:"none", cursor:"pointer", padding:0, display:"flex", alignItems:"center", marginLeft:2 }}>
                                <X size={10} color="#C0392B" />
                              </button>
                            </span>
                          ))}
                        </div>
                        <input type="text" className="pp-input"
                          placeholder="Type keyword and press Enter..."
                          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addKeyword((e.target as HTMLInputElement).value); (e.target as HTMLInputElement).value = ""; } }}
                          style={{ fontSize:"0.85rem" }} />
                        <p style={{ fontSize:"0.65rem", color:"#BBB", marginTop:4 }}>Target 5–8. Focus on Filipino consumer terms.</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* ══ SETTINGS TAB ══ */}
                {activeTab === "settings" && (
                  <div>
                    {/* Nav settings */}
                    <div className="pp-card">
                      <div className="pp-card-header">
                        <Globe size={14} color="#1A5C2A" />
                        <span style={{ fontSize:"0.78rem", fontWeight:700, color:"#0D3320" }}>Navigation</span>
                      </div>
                      <div className="pp-card-body" style={{ display:"flex", flexDirection:"column", gap:"1rem" }}>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"0.8rem 1rem", background:"#F7F5F0", borderRadius:10, border:"1px solid rgba(26,92,42,0.08)" }}>
                          <div>
                            <p style={{ fontSize:"0.88rem", fontWeight:700, color:"#0D3320", marginBottom:2 }}>Show in Navigation Bar</p>
                            <p style={{ fontSize:"0.72rem", color:"#888" }}>Page link appears in site header</p>
                          </div>
                          <Toggle on={form.show_in_nav} onToggle={() => setF("show_in_nav", !form.show_in_nav)} />
                        </div>
                        <div style={{ display:"grid", gridTemplateColumns:"1fr 100px", gap:"0.8rem" }}>
                          <div>
                            <label className="pp-label">Nav Label</label>
                            <input type="text" className="pp-input" value={form.nav_label}
                              onChange={e => setF("nav_label", e.target.value)} placeholder={form.title || "Page title"} />
                          </div>
                          <div>
                            <label className="pp-label">Order</label>
                            <input type="number" className="pp-input" value={form.nav_order}
                              onChange={e => setF("nav_order", Number(e.target.value))} />
                          </div>
                        </div>
                        <p style={{ fontSize:"0.7rem", color:"#888" }}>Lower order = appears earlier. Fixed nav links (About, Programs, etc.) are separate.</p>
                      </div>
                    </div>

                    {/* Page options */}
                    <div className="pp-card">
                      <div className="pp-card-header">
                        <Star size={14} color="#C9A84C" />
                        <span style={{ fontSize:"0.78rem", fontWeight:700, color:"#0D3320" }}>Page Options</span>
                      </div>
                      <div className="pp-card-body" style={{ display:"flex", flexDirection:"column", gap:"0.7rem" }}>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"0.8rem 1rem", background:"#F7F5F0", borderRadius:10, border:"1px solid rgba(26,92,42,0.08)" }}>
                          <div>
                            <p style={{ fontSize:"0.88rem", fontWeight:700, color:"#0D3320", marginBottom:2 }}>Show Published Date</p>
                            <p style={{ fontSize:"0.72rem", color:"#888" }}>Displays date below the title in the hero banner</p>
                          </div>
                          <Toggle on={form.show_date} onToggle={() => setF("show_date", !form.show_date)} />
                        </div>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"0.8rem 1rem", background:"#F7F5F0", borderRadius:10, border:"1px solid rgba(26,92,42,0.08)" }}>
                          <div>
                            <p style={{ fontSize:"0.88rem", fontWeight:700, color:"#0D3320", marginBottom:2 }}>Show Breadcrumb</p>
                            <p style={{ fontSize:"0.72rem", color:"#888" }}>Shows "Home › Page Title" in hero banner</p>
                          </div>
                          <Toggle on={form.show_breadcrumb} onToggle={() => setF("show_breadcrumb", !form.show_breadcrumb)} />
                        </div>
                        {/* Status */}
                        <div style={{ paddingTop:"0.5rem" }}>
                          <label className="pp-label">Page Status</label>
                          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0.5rem" }}>
                            {(["draft","published"] as const).map(s => (
                              <button key={s} onClick={() => setF("status", s)}
                                style={{ padding:"0.65rem", borderRadius:10, border:`1.5px solid ${form.status === s ? (s === "published" ? "#2E8B44" : "#D4A017") : "rgba(26,92,42,0.12)"}`, background: form.status === s ? (s === "published" ? "rgba(46,139,68,0.08)" : "rgba(212,160,23,0.08)") : "white", color: form.status === s ? (s === "published" ? "#2E8B44" : "#D4A017") : "#888", fontSize:"0.82rem", fontWeight: form.status === s ? 700 : 500, cursor:"pointer", textTransform:"capitalize", fontFamily:"'DM Sans',sans-serif" }}>
                                {s === "draft" ? "📝 Draft" : "🌐 Published"}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ══ FEATURES TAB ══ */}
                {activeTab === "features" && (
                  <div>
                    <div style={{ background:"rgba(26,92,42,0.03)", borderRadius:8, padding:"0.8rem 1rem", border:"1px solid rgba(26,92,42,0.08)", marginBottom:"1.2rem" }}>
                      <p style={{ fontSize:"0.78rem", color:"var(--green-dk)", fontWeight:600, marginBottom:3 }}>Website Feature Sections</p>
                      <p style={{ fontSize:"0.72rem", color:"var(--muted)" }}>Choose which sections from your main website appear at the bottom of this page.</p>
                    </div>

                    {[
                      { key:"show_recent_news",  label:"Recent News",               desc:"Shows your 3 latest published articles",       emoji:"📰" },
                      { key:"show_officers",     label:"Officers & Board",           desc:"Shows your executive officers and BOD",         emoji:"👥" },
                      { key:"show_programs",     label:"Programs Section",           desc:"Shows your consumer rights programs",           emoji:"📋" },
                      { key:"show_membership",   label:"Membership & Fees",          desc:"Shows membership fees and registration form",   emoji:"💳" },
                      { key:"show_senior_calc",  label:"Senior Citizen Calculator",  desc:"Shows the senior discount calculator",          emoji:"🧮" },
                      { key:"show_datetime",     label:"Live Date & Time",           desc:"Shows current Philippine date and time",        emoji:"🕐" },
                    ].map(({ key, label, desc, emoji }) => (
                      <div key={key} className="pp-feature-row">
                        <div style={{ display:"flex", alignItems:"flex-start", gap:10 }}>
                          <span style={{ fontSize:"1.2rem" }}>{emoji}</span>
                          <div>
                            <p style={{ fontSize:"0.85rem", fontWeight:600, color:"#0D3320", marginBottom:2 }}>{label}</p>
                            <p style={{ fontSize:"0.72rem", color:"#888" }}>{desc}</p>
                          </div>
                        </div>
                        <Toggle
                          on={!!form.features[key as keyof PageFeatures]}
                          onToggle={() => setFeature(key as keyof PageFeatures, !form.features[key as keyof PageFeatures])}
                        />
                      </div>
                    ))}
                  </div>
                )}

              </div>

              {/* Footer */}
              <div className="pp-footer">
                <button onClick={closeEditor} style={{ padding:"0.7rem 1.2rem", background:"white", border:"1.5px solid rgba(26,92,42,0.15)", color:"#888", borderRadius:8, fontSize:"0.82rem", cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>
                  Cancel
                </button>
                <div style={{ display:"flex", gap:"0.7rem" }}>
                  <button onClick={() => handleSave(false)} disabled={saving || !form.title.trim() || !form.slug.trim()}
                    style={{ padding:"0.7rem 1.4rem", background:"rgba(26,92,42,0.07)", border:"1.5px solid rgba(26,92,42,0.2)", color:"#1A5C2A", borderRadius:8, fontSize:"0.82rem", fontWeight:600, cursor: saving ? "not-allowed" : "pointer", fontFamily:"'DM Sans',sans-serif" }}>
                    {saving ? "Saving..." : "Save Draft"}
                  </button>
                  <button onClick={() => handleSave(true)} disabled={saving || !form.title.trim() || !form.slug.trim()}
                    style={{ padding:"0.7rem 1.6rem", background: saving ? "rgba(201,168,76,0.5)" : "linear-gradient(135deg,#C9A84C,#E5C96A)", border:"none", color:"#0A2818", borderRadius:8, fontSize:"0.82rem", fontWeight:800, cursor: saving ? "not-allowed" : "pointer", fontFamily:"'DM Sans',sans-serif", letterSpacing:"0.02em", boxShadow: saving ? "none" : "0 4px 16px rgba(201,168,76,0.4)" }}>
                    {saving ? "Publishing..." : "Publish Now →"}
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ══ PAGES LIST ══ */}
        {loading ? (
          <div style={{ textAlign:"center", padding:"3rem", color:"var(--muted)" }}>
            <RefreshCw size={18} style={{ opacity:0.4, marginBottom:8 }} /><p>Loading pages...</p>
          </div>
        ) : pages.length === 0 ? (
          <div style={{ textAlign:"center", padding:"3rem", background:"white", borderRadius:10, border:"1px solid rgba(26,92,42,0.08)", color:"var(--muted)" }}>
            <FileText size={32} style={{ opacity:0.2, marginBottom:8 }} />
            <p style={{ fontWeight:600 }}>No pages yet</p>
            <p style={{ fontSize:"0.82rem", marginTop:4 }}>Click "New Page" to create your first page.</p>
          </div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:"0.6rem" }}>
            {pages.map(p => (
              <div key={p.id} style={{ background:"white", borderRadius:10, border:"1px solid rgba(26,92,42,0.08)", overflow:"hidden" }}>
                {p.cover_image_url && (
                  <div style={{ height:60, overflow:"hidden" }}>
                    <img src={p.cover_image_url} alt="" style={{ width:"100%", height:"100%", objectFit:"cover", opacity:0.7 }} />
                  </div>
                )}
                <div style={{ display:"flex", alignItems:"center", padding:"0.9rem 1.2rem", gap:"1rem", flexWrap:"wrap" }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:3, flexWrap:"wrap" }}>
                      <p style={{ fontWeight:700, fontSize:"0.9rem", color:"var(--green-dk)" }}>{p.title}</p>
                      <span style={{ fontSize:"0.65rem", fontWeight:700, padding:"2px 8px", borderRadius:20, background: p.status==="published"?"rgba(46,139,68,0.1)":"rgba(100,100,100,0.1)", color: p.status==="published"?"#2E8B44":"#666" }}>
                        {p.status === "published" ? "Published" : "Draft"}
                      </span>
                      {p.show_in_nav && (
                        <span style={{ fontSize:"0.65rem", fontWeight:700, padding:"2px 8px", borderRadius:20, background:"rgba(43,95,168,0.1)", color:"#2B5FA8" }}>In Nav</span>
                      )}
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
    </>
  );
}
