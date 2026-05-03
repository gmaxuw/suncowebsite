"use client";
// ─────────────────────────────────────────────
// cms/PostEditor.tsx — Redesigned 2026 Edition
// ─────────────────────────────────────────────
import { useState, useRef } from "react";
import {
  X, Upload, Image, Sparkles, Globe, Tag, Star,
  Clock, ChevronDown, ChevronUp, AlertCircle, FileText,
  Eye, EyeOff, Zap, BookOpen, Hash, Camera,
} from "lucide-react";
import { CATEGORIES, type Post } from "../CmsTab";
import PhotoManager, { type ArticlePhoto } from "./PhotoManager";

interface Props {
  supabase:           any;
  post:               Post;
  currentMemberName?: string;
  currentRole?:       string;
  onSaved:            () => void;
  onClose:            () => void;
}

function slugify(text: string) {
  return text.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

type EditorTab = "content" | "seo" | "settings";

export default function PostEditor({ supabase, post, currentMemberName, currentRole, onSaved, onClose }: Props) {
  const isEditing = !!post.id;
  const [form, setForm] = useState<Post>({
    ...post,
    author_name:     post.author_name     || currentMemberName || "",
    content:         post.content         || "",
    excerpt:         post.excerpt         || "",
    seo_title:       post.seo_title       || "",
    seo_description: post.seo_description || "",
    tags:            post.tags            || [],
    seo_keywords:    post.seo_keywords    || [],
  });
  const [saving,     setSaving]     = useState(false);
  const [uploading,  setUploading]  = useState(false);
  const [thumbPrev,  setThumbPrev]  = useState<string | null>(post.thumbnail_url || null);
  const [showAI,     setShowAI]     = useState(false);
  const [aiLoading,  setAiLoading]  = useState(false);
  const [aiError,    setAiError]    = useState("");
  const [aiPrompt,   setAiPrompt]   = useState("");
  const [tagInput,   setTagInput]   = useState("");
  const [activeTab,  setActiveTab]  = useState<EditorTab>("content");
  const [photos,     setPhotos]     = useState<ArticlePhoto[]>([]);
  const fileRef    = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  const contentImgRef = useRef<HTMLInputElement>(null);
  const [contentImgUploading, setContentImgUploading] = useState(false);

  const handleInsertIntoContent = (tag: string) => {
    setForm(prev => ({ ...prev, content: (prev.content || "") + tag }));
  };

  const handleContentImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setContentImgUploading(true);
    try {
      const blob = await compressToWebP(file);
      const filename = `content/img-${Date.now()}.webp`;
      const { error } = await supabase.storage.from("articles").upload(filename, blob, { contentType: "image/webp", upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("articles").getPublicUrl(filename);
      const altText = prompt("Enter alt text / caption for this image (optional):") || "";
      const tag = `\n\n[img:${urlData.publicUrl}|${altText}]\n\n`;
      setForm(prev => ({ ...prev, content: (prev.content || "") + tag }));
    } catch (err: any) { alert("Image upload failed: " + err.message); }
    setContentImgUploading(false);
  };

  const wordCount = (form.content || "").split(/\s+/).filter(Boolean).length;
  const readTime  = Math.max(1, Math.ceil(wordCount / 200));

  const handleTitleChange = (val: string) => {
    setForm(prev => ({
      ...prev,
      title:     val,
      slug:      prev.slug && prev.slug !== slugify(prev.title) ? prev.slug : slugify(val),
      seo_title: prev.seo_title || val,
    }));
  };

  const compressToWebP = (file: File, maxPx = 1200): Promise<Blob> =>
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
        canvas.toBlob(b => b ? resolve(b) : reject(new Error("Conversion failed")), "image/webp", 0.85);
      };
      img.onerror = reject;
      img.src = url;
    });

  const handleThumbUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const reader = new FileReader();
    reader.onload = ev => setThumbPrev(ev.target?.result as string);
    reader.readAsDataURL(file);
    try {
      const blob = await compressToWebP(file);
      const filename = `thumbnails/post-${Date.now()}.webp`;
      const { error } = await supabase.storage.from("articles").upload(filename, blob, { contentType: "image/webp", upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("articles").getPublicUrl(filename);
      setForm(prev => ({ ...prev, thumbnail_url: urlData.publicUrl }));
    } catch (err: any) { alert("Upload failed: " + err.message); }
    setUploading(false);
  };

  const handleAIGenerate = async () => {
    if (!form.title.trim()) { setAiError("Please enter a title first."); return; }
    setAiLoading(true);
    setAiError("");
    try {
      const res = await fetch("/api/generate-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title:       form.title.trim(),
          category:    form.category,
          context:     aiPrompt.trim(),
          photo_count: photos.length,
        }),
      });
      const parsed = await res.json();
      if (!res.ok) throw new Error(parsed.error || "Generation failed");
      setForm(prev => ({
        ...prev,
        content:         parsed.content         || prev.content,
        excerpt:         parsed.excerpt         || prev.excerpt,
        seo_title:       parsed.seo_title       || prev.seo_title,
        seo_description: parsed.seo_description || prev.seo_description,
        seo_keywords:    parsed.seo_keywords    || prev.seo_keywords,
        tags:            parsed.tags            || prev.tags,
        reading_time:    parsed.reading_time    || prev.reading_time,
      }));
      // Update photo alt texts if AI returned them
      if (parsed.photo_alts && Array.isArray(parsed.photo_alts)) {
        setPhotos(prev => prev.map((p, i) => ({
          ...p,
          alt: parsed.photo_alts[i] || p.alt,
        })));
      }
      setShowAI(false);
      setActiveTab("seo");
    } catch (err: any) { setAiError("Generation failed: " + err.message); }
    setAiLoading(false);
  };

  const handleSave = async (publishNow = false) => {
    if (!form.title.trim())   { alert("Title is required.");   return; }
    if (!form.content.trim()) { alert("Content is required."); return; }
    if (!form.slug.trim())    { alert("Slug is required.");    return; }
    setSaving(true);
    const excerpt      = form.excerpt.trim() || form.content.replace(/\n/g, " ").substring(0, 155) + "...";
    const status       = publishNow ? "published" : form.status;
    const published_at = (publishNow || form.status === "published") ? new Date().toISOString() : null;
    const payload: any = {
      title: form.title.trim(), slug: form.slug.trim(), excerpt,
      content: form.content.trim(), category: form.category,
      tags: form.tags, status, featured: form.featured,
      thumbnail_url:    form.thumbnail_url   || null,
      author_name:      form.author_name     || currentMemberName || "SUNCO Admin",
      reading_time:     form.reading_time    || readTime,
      seo_title:        (form.seo_title || "").trim()       || form.title.trim(),
      seo_description:  (form.seo_description || "").trim() || excerpt,
      seo_keywords:     form.seo_keywords,
      article_photos:   JSON.stringify(photos),
      updated_at:       new Date().toISOString(),
    };
    if (published_at) payload.published_at = published_at;
    const { error } = isEditing
      ? await supabase.from("posts").update(payload).eq("id", post.id)
      : await supabase.from("posts").insert(payload);
    if (error) { alert("Error: " + error.message); setSaving(false); return; }
    onSaved();
    setSaving(false);
  };

  const addTag = (t: string) => {
    const tag = t.trim().toLowerCase();
    if (tag && !(form.tags || []).includes(tag)) setForm(prev => ({ ...prev, tags: [...(prev.tags || []), tag] }));
    setTagInput("");
  };
  const removeTag = (t: string) => setForm(prev => ({ ...prev, tags: (prev.tags || []).filter(x => x !== t) }));
  const addKeyword = (k: string) => {
    const kw = k.trim().toLowerCase();
    if (kw && !(form.seo_keywords || []).includes(kw)) setForm(prev => ({ ...prev, seo_keywords: [...(prev.seo_keywords || []), kw] }));
  };
  const removeKeyword = (k: string) => setForm(prev => ({ ...prev, seo_keywords: (prev.seo_keywords || []).filter(x => x !== k) }));

  const catColor = CATEGORIES.find(c => c.value === form.category)?.color || "#888";

  return (
    <>
      <style>{`
        .pe-overlay { position:fixed;inset:0;background:rgba(5,15,10,0.85);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);z-index:400;display:flex;align-items:stretch;justify-content:flex-end; }
        .pe-modal { display:flex;flex-direction:column;width:100%;max-width:900px;height:100vh;background:#F7F5F0;position:relative;box-shadow:-40px 0 120px rgba(0,0,0,0.4); }
        .pe-header { background:linear-gradient(135deg,#0A2818 0%,#1A5C2A 100%);padding:0;flex-shrink:0;position:relative;overflow:hidden; }
        .pe-header-bg { position:absolute;inset:0;background:radial-gradient(ellipse at 80% 50%,rgba(201,168,76,0.15) 0%,transparent 70%);pointer-events:none; }
        .pe-header-inner { position:relative;z-index:1;padding:1.4rem 1.8rem; }
        .pe-tabs { display:flex;background:rgba(0,0,0,0.25);border-top:1px solid rgba(255,255,255,0.06); }
        .pe-tab { flex:1;display:flex;align-items:center;justify-content:center;gap:7px;padding:0.75rem 1rem;border:none;background:transparent;color:rgba(255,255,255,0.45);font-size:0.78rem;font-weight:500;cursor:pointer;font-family:'DM Sans',sans-serif;border-bottom:2px solid transparent;transition:all 0.18s; }
        .pe-tab.active { color:#C9A84C;border-bottom-color:#C9A84C;background:rgba(201,168,76,0.08); }
        .pe-tab:hover:not(.active) { color:rgba(255,255,255,0.7);background:rgba(255,255,255,0.04); }
        .pe-body { flex:1;overflow-y:auto;padding:2rem 1.8rem;scroll-behavior:smooth; }
        .pe-body::-webkit-scrollbar { width:5px; }
        .pe-body::-webkit-scrollbar-track { background:transparent; }
        .pe-body::-webkit-scrollbar-thumb { background:rgba(26,92,42,0.2);border-radius:10px; }
        .pe-body::-webkit-scrollbar-thumb:hover { background:rgba(26,92,42,0.4); }
        .pe-footer { background:white;border-top:1px solid rgba(26,92,42,0.1);padding:1rem 1.8rem;display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-shrink:0; }
        .pe-field { margin-bottom:1.4rem; }
        .pe-label { display:block;font-size:0.68rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#0A2818;margin-bottom:0.45rem;opacity:0.6; }
        .pe-input { width:100%;padding:0.78rem 1rem;border:1.5px solid rgba(26,92,42,0.15);border-radius:10px;font-size:0.92rem;font-family:'DM Sans',sans-serif;color:#0D3320;background:white;outline:none;box-sizing:border-box;transition:border-color 0.15s; }
        .pe-input:focus { border-color:rgba(26,92,42,0.4);box-shadow:0 0 0 3px rgba(26,92,42,0.06); }
        .pe-textarea { width:100%;padding:0.78rem 1rem;border:1.5px solid rgba(26,92,42,0.15);border-radius:10px;font-size:0.92rem;font-family:'DM Sans',sans-serif;color:#0D3320;background:white;outline:none;box-sizing:border-box;resize:vertical;line-height:1.75;transition:border-color 0.15s; }
        .pe-textarea:focus { border-color:rgba(26,92,42,0.4);box-shadow:0 0 0 3px rgba(26,92,42,0.06); }
        .pe-select { width:100%;padding:0.78rem 1rem;border:1.5px solid rgba(26,92,42,0.15);border-radius:10px;font-size:0.92rem;font-family:'DM Sans',sans-serif;color:#0D3320;background:white;outline:none;box-sizing:border-box;cursor:pointer; }
        .pe-card { background:white;border-radius:14px;border:1px solid rgba(26,92,42,0.08);overflow:hidden;margin-bottom:1.4rem;box-shadow:0 2px 12px rgba(0,0,0,0.04); }
        .pe-card-header { padding:1rem 1.2rem;background:#F0EDE6;border-bottom:1px solid rgba(26,92,42,0.07);display:flex;align-items:center;gap:8px; }
        .pe-card-body { padding:1.2rem; }
        .pe-ai-panel { border:1.5px solid rgba(201,168,76,0.35);border-radius:14px;overflow:hidden;margin-bottom:1.6rem;background:white; }
        .pe-ai-header { display:flex;align-items:center;justify-content:space-between;padding:1rem 1.2rem;cursor:pointer;background:linear-gradient(135deg,rgba(201,168,76,0.08),rgba(201,168,76,0.04));border:none;width:100%;font-family:'DM Sans',sans-serif; }
        .pe-ai-badge { background:linear-gradient(135deg,#C9A84C,#E5C96A);color:#0A2818;font-size:0.6rem;font-weight:800;padding:2px 9px;border-radius:20px;letter-spacing:0.06em; }
        .pe-tag { display:inline-flex;align-items:center;gap:5px;background:rgba(26,92,42,0.08);color:#1A5C2A;font-size:0.75rem;font-weight:600;padding:4px 12px;border-radius:20px;border:1px solid rgba(26,92,42,0.15); }
        .pe-keyword { display:inline-flex;align-items:center;gap:5px;background:rgba(43,95,168,0.08);color:#2B5FA8;font-size:0.75rem;font-weight:600;padding:4px 12px;border-radius:20px;border:1px solid rgba(43,95,168,0.15); }
        .pe-status-dot { width:8px;height:8px;border-radius:50%;flex-shrink:0; }
        .pe-word-bar { height:3px;background:rgba(26,92,42,0.08);border-radius:10px;margin-top:0.5rem;overflow:hidden; }
        .pe-word-fill { height:100%;background:linear-gradient(90deg,#C9A84C,#2E8B44);border-radius:10px;transition:width 0.3s; }
        @keyframes pe-spin { to{transform:rotate(360deg)} }
        .pe-spinner { animation:pe-spin 0.8s linear infinite; }
        @media(max-width:640px){.pe-modal{max-width:100%;}.pe-header-inner{padding:1rem 1.2rem;}.pe-body{padding:1.2rem 1rem;}.pe-footer{padding:0.8rem 1rem;}}
      `}</style>

      <div className="pe-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
        <div className="pe-modal">

          {/* ── Header ── */}
          <div className="pe-header">
            <div className="pe-header-bg" />
            <div className="pe-header-inner">
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <div style={{ width:36, height:36, borderRadius:10, background:"rgba(201,168,76,0.2)", border:"1.5px solid rgba(201,168,76,0.4)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <FileText size={16} color="#C9A84C" />
                  </div>
                  <div>
                    <p style={{ fontSize:"0.6rem", color:"rgba(255,255,255,0.35)", letterSpacing:"0.14em", textTransform:"uppercase", marginBottom:2 }}>
                      {isEditing ? "Editing Post" : "New Post"}
                    </p>
                    <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.05rem", color:"#C9A84C", lineHeight:1.2 }}>
                      {form.title || "Untitled Post"}
                    </h2>
                  </div>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  {/* Word count pill */}
                  <div style={{ background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.12)", borderRadius:20, padding:"4px 12px", display:"flex", alignItems:"center", gap:6 }}>
                    <BookOpen size={11} color="rgba(255,255,255,0.5)" />
                    <span style={{ fontSize:"0.7rem", color:"rgba(255,255,255,0.6)", fontWeight:600 }}>{wordCount} words</span>
                  </div>
                  {/* Status badge */}
                  <div style={{ background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.12)", borderRadius:20, padding:"4px 12px", display:"flex", alignItems:"center", gap:6 }}>
                    <div className="pe-status-dot" style={{ background: form.status === "published" ? "#4ade80" : form.status === "draft" ? "#fbbf24" : "#94a3b8" }} />
                    <span style={{ fontSize:"0.7rem", color:"rgba(255,255,255,0.6)", fontWeight:600, textTransform:"capitalize" }}>{form.status}</span>
                  </div>
                  <button onClick={onClose} style={{ width:32, height:32, borderRadius:"50%", background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.12)", color:"white", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <X size={14} />
                  </button>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="pe-tabs">
              {([
                { id:"content",  label:"Content",  icon:FileText },
                { id:"seo",      label:"SEO",       icon:Globe    },
                { id:"settings", label:"Settings",  icon:Star     },
              ] as { id:EditorTab; label:string; icon:any }[]).map(({ id, label, icon:Icon }) => (
                <button key={id} className={`pe-tab${activeTab === id ? " active" : ""}`} onClick={() => setActiveTab(id)}>
                  <Icon size={13} />
                  {label}
                  {id === "seo" && !(form.seo_title && form.seo_description) && (
                    <span style={{ width:6, height:6, borderRadius:"50%", background:"#fbbf24", flexShrink:0 }} />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* ── Body ── */}
          <div className="pe-body">

            {/* ══ CONTENT TAB ══ */}
            {activeTab === "content" && (
              <div>

                {/* AI Generator */}
                {currentRole === "admin" && (
                  <div className="pe-ai-panel">
                  <button className="pe-ai-header" onClick={() => setShowAI(v => !v)}>
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <div style={{ width:32, height:32, borderRadius:8, background:"linear-gradient(135deg,rgba(201,168,76,0.2),rgba(201,168,76,0.08))", border:"1px solid rgba(201,168,76,0.3)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                        <Sparkles size={15} color="#C9A84C" />
                      </div>
                      <div style={{ textAlign:"left" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:2 }}>
                          <span style={{ fontSize:"0.88rem", fontWeight:700, color:"#0D3320" }}>Claude AI Generator</span>
                          <span className="pe-ai-badge">AI</span>
                        </div>
                        <p style={{ fontSize:"0.7rem", color:"#888" }}>Generate full article, excerpt & SEO in one click</p>
                      </div>
                    </div>
                    {showAI ? <ChevronUp size={16} color="#888" /> : <ChevronDown size={16} color="#888" />}
                  </button>

                  {showAI && (
                    <div style={{ padding:"1.2rem", borderTop:"1px solid rgba(201,168,76,0.15)" }}>
                      <div className="pe-field">
                        <label className="pe-label">Additional context (optional)</label>
                        <textarea
                          className="pe-textarea"
                          value={aiPrompt}
                          onChange={e => setAiPrompt(e.target.value)}
                          placeholder="e.g. Focus on senior citizens, mention DTI partnership, include tips for Surigao del Norte members..."
                          rows={3}
                        />
                      </div>

                      
                      {aiError && (
                        <div style={{ display:"flex", gap:8, padding:"0.75rem 1rem", background:"#FDECEA", borderRadius:10, marginBottom:"0.9rem", border:"1px solid rgba(192,57,43,0.2)" }}>
                          <AlertCircle size={14} color="#A8200D" style={{ marginTop:1, flexShrink:0 }} />
                          <p style={{ fontSize:"0.78rem", color:"#A8200D" }}>{aiError}</p>
                        </div>
                      )}
                      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                        <button
                          onClick={handleAIGenerate}
                          disabled={aiLoading || !form.title.trim()}
                          style={{ display:"flex", alignItems:"center", gap:8, background: aiLoading || !form.title.trim() ? "rgba(26,92,42,0.2)" : "linear-gradient(135deg,#0A2818,#1A5C2A)", color: aiLoading || !form.title.trim() ? "#888" : "white", border:"none", padding:"0.72rem 1.5rem", borderRadius:10, fontSize:"0.85rem", fontWeight:700, cursor: aiLoading || !form.title.trim() ? "not-allowed" : "pointer", fontFamily:"'DM Sans',sans-serif", transition:"all 0.15s" }}>
                          {aiLoading ? <><span className="pe-spinner" style={{ display:"inline-block" }}><Zap size={15} /></span> Generating...</> : <><Sparkles size={15} /> Generate Full Article + SEO</>}
                        </button>
                        {!form.title.trim() && <p style={{ fontSize:"0.72rem", color:"#AAA" }}>Enter a title first ↑</p>}
                      </div>
                    </div>
                  )}
                </div>
                )}

                {/* Title */}
                <div className="pe-field">
                  <label className="pe-label">Post Title *</label>
                  <input
                    type="text"
                    className="pe-input"
                    value={form.title}
                    onChange={e => handleTitleChange(e.target.value)}
                    placeholder="Write a compelling headline..."
                    style={{ fontSize:"1.1rem", fontWeight:700 }}
                  />
                </div>

                {/* Slug + Category */}
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1rem", marginBottom:"1.4rem" }}>
                  <div>
                    <label className="pe-label">URL Slug *</label>
                    <input
                      type="text"
                      className="pe-input"
                      value={form.slug}
                      onChange={e => setForm(prev => ({ ...prev, slug: slugify(e.target.value) }))}
                      placeholder="url-slug"
                      style={{ fontFamily:"monospace", fontSize:"0.85rem" }}
                    />
                    <p style={{ fontSize:"0.65rem", color:"#AAA", marginTop:4 }}>sunco.org/news/{form.slug || "your-slug"}</p>
                  </div>
                  <div>
                    <label className="pe-label">Category *</label>
                    <select className="pe-select" value={form.category} onChange={e => setForm(prev => ({ ...prev, category: e.target.value }))}>
                      {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                    <p style={{ fontSize:"0.65rem", marginTop:4, display:"flex", alignItems:"center", gap:4 }}>
                      <span style={{ display:"inline-block", width:8, height:8, borderRadius:"50%", background:catColor }} />
                      <span style={{ color:catColor, fontWeight:600 }}>{CATEGORIES.find(c => c.value === form.category)?.label}</span>
                    </p>
                  </div>
                </div>

                {/* Thumbnail */}
                <div className="pe-card">
                  <div className="pe-card-header">
                    <Camera size={14} color="#1A5C2A" />
                    <span style={{ fontSize:"0.78rem", fontWeight:700, color:"#0D3320" }}>Featured Image</span>
                  </div>
                  <div className="pe-card-body">
                    <div style={{ display:"grid", gridTemplateColumns:"160px 1fr", gap:"1.2rem", alignItems:"center" }}>
                      <div style={{ width:160, height:100, background:"#F0EDE6", border:"2px dashed rgba(26,92,42,0.18)", borderRadius:10, overflow:"hidden", display:"flex", alignItems:"center", justifyContent:"center", position:"relative" }}>
                        {thumbPrev ? (
                          <img src={thumbPrev} alt="Preview" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                        ) : (
                          <div style={{ textAlign:"center" }}>
                            <Image size={24} color="rgba(26,92,42,0.2)" />
                            <p style={{ fontSize:"0.62rem", color:"#BBB", marginTop:4 }}>No image</p>
                          </div>
                        )}
                      </div>
                      <div>
                        <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={handleThumbUpload} style={{ display:"none" }} />
                        <button
                          onClick={() => fileRef.current?.click()}
                          disabled={uploading}
                          style={{ display:"inline-flex", alignItems:"center", gap:6, background:"#0D3320", color:"white", border:"none", padding:"0.6rem 1.2rem", borderRadius:8, fontSize:"0.8rem", fontWeight:600, cursor: uploading ? "not-allowed" : "pointer", fontFamily:"'DM Sans',sans-serif", marginBottom:"0.5rem" }}>
                          <Upload size={13} /> {uploading ? "Uploading..." : thumbPrev ? "Change Image" : "Upload Image"}
                        </button>
                        <p style={{ fontSize:"0.68rem", color:"#BBB", lineHeight:1.6 }}>Auto-compressed to WebP. Best: 1200×630px</p>
                        {thumbPrev && (
                          <button onClick={() => { setThumbPrev(null); setForm(p => ({ ...p, thumbnail_url: "" })); }} style={{ background:"none", border:"none", color:"#C0392B", fontSize:"0.72rem", cursor:"pointer", fontFamily:"'DM Sans',sans-serif", padding:0, marginTop:4 }}>
                            Remove image
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Excerpt */}
                <div className="pe-field">
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"0.45rem" }}>
                    <label className="pe-label" style={{ marginBottom:0 }}>Excerpt</label>
                    <span style={{ fontSize:"0.65rem", color: (form.excerpt || "").length > 160 ? "#C0392B" : "#BBB", fontWeight:600 }}>
                      {(form.excerpt || "").length}/160
                    </span>
                  </div>
                  <textarea
                    className="pe-textarea"
                    value={form.excerpt}
                    onChange={e => setForm(prev => ({ ...prev, excerpt: e.target.value }))}
                    placeholder="Short preview shown in post cards — auto-generated if empty..."
                    rows={2}
                    style={{ lineHeight:1.6 }}
                  />
                </div>

                {/* ── PhotoManager ── */}
                <PhotoManager
                  supabase={supabase}
                  photos={photos}
                  onChange={setPhotos}
                  onInsert={handleInsertIntoContent}
                />

                {/* Image insert button (quick single upload) */}
                <div style={{ display:"flex", gap:"0.5rem", marginBottom:"0.5rem" }}>
                  <input
                    ref={contentImgRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleContentImageUpload}
                    style={{ display:"none" }}
                  />
                  <button
                    onClick={() => contentImgRef.current?.click()}
                    disabled={contentImgUploading}
                    style={{ display:"inline-flex", alignItems:"center", gap:6, background:"rgba(26,92,42,0.07)", border:"1.5px solid rgba(26,92,42,0.15)", color:"#1A5C2A", padding:"0.45rem 0.9rem", borderRadius:8, fontSize:"0.78rem", fontWeight:600, cursor: contentImgUploading ? "not-allowed" : "pointer", fontFamily:"'DM Sans',sans-serif" }}>
                    <Image size={13} /> {contentImgUploading ? "Uploading..." : "Insert Image"}
                  </button>
                  <p style={{ fontSize:"0.68rem", color:"#AAA", alignSelf:"center" }}>Inserts at end of content — move it where needed</p>
                </div>

                {/* Content */}
                <div className="pe-field">
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"0.45rem" }}>
                    <label className="pe-label" style={{ marginBottom:0 }}>Full Article Content *</label>
                    <span style={{ fontSize:"0.65rem", color:"#BBB", fontWeight:600 }}>~{readTime} min read</span>
                  </div>
                  <textarea
                    ref={contentRef}
                    className="pe-textarea"
                    value={form.content}
                    onChange={e => setForm(prev => ({ ...prev, content: e.target.value }))}
                    placeholder="Write or paste your full article here. Use double line breaks for paragraphs. Write subheadings as lines ending with a colon."
                    rows={18}
                    style={{ lineHeight:1.85, fontSize:"0.93rem" }}
                  />
                  <div className="pe-word-bar">
                    <div className="pe-word-fill" style={{ width:`${Math.min(100, (wordCount/600)*100)}%` }} />
                  </div>
                  <p style={{ fontSize:"0.65rem", color:"#BBB", marginTop:4 }}>
                    {wordCount} words · Target: 600+ for SEO
                    {wordCount >= 600 && <span style={{ color:"#2E8B44", fontWeight:700, marginLeft:6 }}>✓ Good length</span>}
                  </p>
                </div>

                {/* Tags */}
                <div className="pe-card">
                  <div className="pe-card-header">
                    <Hash size={14} color="#1A5C2A" />
                    <span style={{ fontSize:"0.78rem", fontWeight:700, color:"#0D3320" }}>Tags</span>
                  </div>
                  <div className="pe-card-body">
                    <div style={{ display:"flex", flexWrap:"wrap", gap:"0.4rem", marginBottom:"0.7rem" }}>
                      {(form.tags || []).map(tag => (
                        <span key={tag} className="pe-tag">
                          <Tag size={10} /> {tag}
                          <button onClick={() => removeTag(tag)} style={{ background:"none", border:"none", cursor:"pointer", padding:0, display:"flex", alignItems:"center", marginLeft:2 }}>
                            <X size={10} color="#C0392B" />
                          </button>
                        </span>
                      ))}
                    </div>
                    <input
                      type="text"
                      className="pe-input"
                      value={tagInput}
                      onChange={e => setTagInput(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(tagInput); } }}
                      placeholder="Type tag and press Enter..."
                      style={{ fontSize:"0.85rem" }}
                    />
                    <p style={{ fontSize:"0.65rem", color:"#BBB", marginTop:4 }}>Press Enter or comma to add</p>
                  </div>
                </div>

              </div>
            )}

            {/* ══ SEO TAB ══ */}
            {activeTab === "seo" && (
              <div>
                {/* Google Preview */}
                <div className="pe-card" style={{ marginBottom:"1.4rem" }}>
                  <div className="pe-card-header">
                    <Globe size={14} color="#2B5FA8" />
                    <span style={{ fontSize:"0.78rem", fontWeight:700, color:"#0D3320" }}>Google Search Preview</span>
                  </div>
                  <div className="pe-card-body">
                    <div style={{ background:"white", border:"1px solid #E8E8E8", borderRadius:10, padding:"1.1rem 1.3rem" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:"0.4rem" }}>
                        <div style={{ width:16, height:16, background:"#0D3320", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center" }}>
                          <span style={{ color:"#C9A84C", fontSize:"0.5rem", fontWeight:800 }}>S</span>
                        </div>
                        <span style={{ fontSize:"0.72rem", color:"#202124" }}>sunco.gabrielsacro.com</span>
                      </div>
                      <p style={{ fontSize:"1.05rem", color:"#1558D6", fontFamily:"Arial,sans-serif", marginBottom:"0.25rem", lineHeight:1.3, fontWeight:400 }}>
                        {form.seo_title || form.title || "Post Title — SUNCO"}
                      </p>
                      <p style={{ fontSize:"0.82rem", color:"#4D5156", lineHeight:1.55, fontFamily:"Arial,sans-serif" }}>
                        {form.seo_description || form.excerpt || "Post description will appear here in Google search results..."}
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

                <div className="pe-field">
                  <label className="pe-label">SEO Title</label>
                  <input type="text" className="pe-input" value={form.seo_title || ""} onChange={e => setForm(prev => ({ ...prev, seo_title: e.target.value }))} placeholder="Keyword-rich title under 60 characters" style={{ borderColor: (form.seo_title || "").length > 60 ? "#C0392B" : undefined }} />
                </div>

                <div className="pe-field">
                  <label className="pe-label">SEO Description</label>
                  <textarea className="pe-textarea" value={form.seo_description || ""} onChange={e => setForm(prev => ({ ...prev, seo_description: e.target.value }))} rows={3} placeholder="150–160 chars with primary keyword and a clear call to action" style={{ lineHeight:1.6, borderColor: (form.seo_description || "").length > 160 ? "#C0392B" : undefined }} />
                </div>

                {/* Keywords */}
                <div className="pe-card">
                  <div className="pe-card-header">
                    <Hash size={14} color="#2B5FA8" />
                    <span style={{ fontSize:"0.78rem", fontWeight:700, color:"#0D3320" }}>SEO Keywords</span>
                    <span style={{ marginLeft:"auto", fontSize:"0.65rem", color: (form.seo_keywords || []).length >= 5 ? "#2E8B44" : "#D4A017", fontWeight:700 }}>
                      {(form.seo_keywords || []).length}/8 keywords
                    </span>
                  </div>
                  <div className="pe-card-body">
                    <div style={{ display:"flex", flexWrap:"wrap", gap:"0.4rem", marginBottom:"0.7rem" }}>
                      {(form.seo_keywords || []).map(kw => (
                        <span key={kw} className="pe-keyword">
                          {kw}
                          <button onClick={() => removeKeyword(kw)} style={{ background:"none", border:"none", cursor:"pointer", padding:0, display:"flex", alignItems:"center", marginLeft:2 }}>
                            <X size={10} color="#C0392B" />
                          </button>
                        </span>
                      ))}
                    </div>
                    <input
                      type="text"
                      className="pe-input"
                      placeholder="Type keyword and press Enter..."
                      onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addKeyword((e.target as HTMLInputElement).value); (e.target as HTMLInputElement).value = ""; } }}
                      style={{ fontSize:"0.85rem" }}
                    />
                    <p style={{ fontSize:"0.65rem", color:"#BBB", marginTop:4 }}>Target 5–8. Focus on Filipino consumer terms.</p>
                  </div>
                </div>
              </div>
            )}

            {/* ══ SETTINGS TAB ══ */}
            {activeTab === "settings" && (
              <div>
                <div className="pe-card">
                  <div className="pe-card-header">
                    <Star size={14} color="#C9A84C" />
                    <span style={{ fontSize:"0.78rem", fontWeight:700, color:"#0D3320" }}>Publishing Options</span>
                  </div>
                  <div className="pe-card-body" style={{ display:"flex", flexDirection:"column", gap:"1rem" }}>

                    {/* Featured toggle */}
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0.8rem 1rem", background:"#F7F5F0", borderRadius:10, border:"1px solid rgba(26,92,42,0.08)" }}>
                      <div>
                        <p style={{ fontSize:"0.88rem", fontWeight:700, color:"#0D3320", marginBottom:2 }}>Featured Post</p>
                        <p style={{ fontSize:"0.72rem", color:"#888" }}>Shown prominently on the homepage</p>
                      </div>
                      <button
                        onClick={() => setForm(prev => ({ ...prev, featured: !prev.featured }))}
                        style={{ width:44, height:24, borderRadius:12, background: form.featured ? "#C9A84C" : "rgba(0,0,0,0.12)", border:"none", cursor:"pointer", position:"relative", transition:"background 0.2s", flexShrink:0 }}>
                        <div style={{ position:"absolute", top:3, left: form.featured ? 23 : 3, width:18, height:18, borderRadius:"50%", background:"white", transition:"left 0.2s", boxShadow:"0 1px 4px rgba(0,0,0,0.2)" }} />
                      </button>
                    </div>

                    {/* Status */}
                    <div>
                      <label className="pe-label">Status</label>
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"0.5rem" }}>
                        {["draft","published","archived"].map(s => (
                          <button key={s}
                            onClick={() => setForm(prev => ({ ...prev, status: s }))}
                            style={{ padding:"0.65rem", borderRadius:10, border:`1.5px solid ${form.status === s ? (s === "published" ? "#2E8B44" : s === "draft" ? "#D4A017" : "#888") : "rgba(26,92,42,0.12)"}`, background: form.status === s ? (s === "published" ? "rgba(46,139,68,0.08)" : s === "draft" ? "rgba(212,160,23,0.08)" : "rgba(0,0,0,0.04)") : "white", color: form.status === s ? (s === "published" ? "#2E8B44" : s === "draft" ? "#D4A017" : "#555") : "#888", fontSize:"0.8rem", fontWeight: form.status === s ? 700 : 500, cursor:"pointer", textTransform:"capitalize", fontFamily:"'DM Sans',sans-serif", transition:"all 0.15s" }}>
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Reading time + Author */}
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0.8rem" }}>
                      <div>
                        <label className="pe-label">Reading Time (min)</label>
                        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                          <Clock size={14} color="#888" />
                          <input
                            type="number" min={1} max={60}
                            value={form.reading_time}
                            onChange={e => setForm(prev => ({ ...prev, reading_time: Number(e.target.value) }))}
                            className="pe-input"
                            style={{ flex:1 }}
                          />
                        </div>
                        <p style={{ fontSize:"0.65rem", color:"#BBB", marginTop:4 }}>Auto: ~{readTime} min</p>
                      </div>
                      <div>
                        <label className="pe-label">Author</label>
                        <input
                          type="text"
                          className="pe-input"
                          value={form.author_name}
                          onChange={e => setForm(prev => ({ ...prev, author_name: e.target.value }))}
                          placeholder="SUNCO Editorial Team"
                        />
                      </div>
                    </div>

                  </div>
                </div>

                {/* Danger zone */}
                {isEditing && (
                  <div style={{ background:"rgba(192,57,43,0.04)", border:"1px solid rgba(192,57,43,0.15)", borderRadius:14, padding:"1.1rem 1.2rem" }}>
                    <p style={{ fontSize:"0.75rem", fontWeight:700, color:"#C0392B", marginBottom:4 }}>Danger Zone</p>
                    <p style={{ fontSize:"0.72rem", color:"#888", marginBottom:"0.8rem" }}>Archiving will hide this post from the public website.</p>
                    <button
                      onClick={() => setForm(prev => ({ ...prev, status:"archived" }))}
                      style={{ fontSize:"0.78rem", color:"#C0392B", background:"none", border:"1px solid rgba(192,57,43,0.3)", padding:"0.4rem 1rem", borderRadius:6, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>
                      Archive this post
                    </button>
                  </div>
                )}
              </div>
            )}

          </div>

          {/* ── Footer ── */}
          <div className="pe-footer">
            <button onClick={onClose} style={{ padding:"0.7rem 1.2rem", background:"white", border:"1.5px solid rgba(26,92,42,0.15)", color:"#888", borderRadius:8, fontSize:"0.82rem", cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>
              Cancel
            </button>
            <div style={{ display:"flex", gap:"0.7rem" }}>
              <button
                onClick={() => handleSave(false)}
                disabled={saving}
                style={{ padding:"0.7rem 1.4rem", background:"rgba(26,92,42,0.07)", border:"1.5px solid rgba(26,92,42,0.2)", color:"#1A5C2A", borderRadius:8, fontSize:"0.82rem", fontWeight:600, cursor: saving ? "not-allowed" : "pointer", fontFamily:"'DM Sans',sans-serif" }}>
                {saving ? "Saving..." : "Save Draft"}
              </button>
              <button
                onClick={() => handleSave(true)}
                disabled={saving}
                style={{ padding:"0.7rem 1.6rem", background: saving ? "rgba(201,168,76,0.5)" : "linear-gradient(135deg,#C9A84C,#E5C96A)", border:"none", color:"#0A2818", borderRadius:8, fontSize:"0.82rem", fontWeight:800, cursor: saving ? "not-allowed" : "pointer", fontFamily:"'DM Sans',sans-serif", letterSpacing:"0.02em", boxShadow: saving ? "none" : "0 4px 16px rgba(201,168,76,0.4)" }}>
                {saving ? "Publishing..." : "Publish Now →"}
              </button>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}