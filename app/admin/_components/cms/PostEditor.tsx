"use client";
// ─────────────────────────────────────────────
// cms/PostEditor.tsx
// Full-screen post editor modal.
// Features: thumbnail upload, AI generator,
//           SEO panel with Google preview,
//           tags, reading time, publish flow.
// ─────────────────────────────────────────────
import { useState, useRef } from "react";
import {
  X, Upload, Image, Sparkles, Globe, Tag, Star,
  Clock, ChevronDown, ChevronUp, AlertCircle, FileText,
} from "lucide-react";
import { CATEGORIES, EMPTY_POST, type Post } from "../CmsTab";

interface Props {
  supabase:           any;
  post:               Post;
  currentMemberName?: string;
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

export default function PostEditor({ supabase, post, currentMemberName, onSaved, onClose }: Props) {
  const isEditing = !!post.id;
  const [form,       setForm]       = useState<Post>({ ...post, author_name: post.author_name || currentMemberName || "" });
  const [saving,     setSaving]     = useState(false);
  const [uploading,  setUploading]  = useState(false);
  const [thumbPrev,  setThumbPrev]  = useState<string | null>(post.thumbnail_url || null);
  const [showSEO,    setShowSEO]    = useState(false);
  const [showAI,     setShowAI]     = useState(false);
  const [aiLoading,  setAiLoading]  = useState(false);
  const [aiError,    setAiError]    = useState("");
  const [aiPrompt,   setAiPrompt]   = useState("");
  const [tagInput,   setTagInput]   = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Title → slug sync ──
  const handleTitleChange = (val: string) => {
    setForm(prev => ({
      ...prev,
      title:     val,
      slug:      prev.slug && prev.slug !== slugify(prev.title) ? prev.slug : slugify(val),
      seo_title: prev.seo_title || val,
    }));
  };

  // ── Thumbnail ──
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

  // ── AI Generator ──
  const handleAIGenerate = async () => {
    if (!form.title.trim()) { setAiError("Please enter a title first."); return; }
    setAiLoading(true);
    setAiError("");
    try {
      const prompt = `You are a content writer for SUNCO (Surigao del Norte Consumers Organization), a Filipino consumer cooperative in Mindanao, Philippines.

Write a complete SEO-optimized article for:
Title: "${form.title}"
Category: ${form.category}
${aiPrompt ? `Context: ${aiPrompt}` : ""}

Respond ONLY with valid JSON (no markdown, no backticks):
{
  "content": "Full article body, minimum 500 words, natural paragraphs, Filipino consumer context, practical tips.",
  "excerpt": "Compelling 150-160 character excerpt.",
  "seo_title": "SEO title under 60 characters",
  "seo_description": "Meta description 150-160 characters with keyword and CTA",
  "seo_keywords": ["keyword1","keyword2","keyword3","keyword4","keyword5"],
  "tags": ["tag1","tag2","tag3"],
  "reading_time": 5
}`;

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const data = await response.json();
      const raw  = data.content?.find((b: any) => b.type === "text")?.text || "";
      const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());

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
      setShowAI(false);
      setShowSEO(true);
    } catch (err: any) {
      setAiError("Generation failed: " + err.message);
    }
    setAiLoading(false);
  };

  // ── Save ──
  const handleSave = async (publishNow = false) => {
    if (!form.title.trim())   { alert("Title is required.");   return; }
    if (!form.content.trim()) { alert("Content is required."); return; }
    if (!form.slug.trim())    { alert("Slug is required.");    return; }
    setSaving(true);

    const excerpt     = form.excerpt.trim() || form.content.replace(/\n/g, " ").substring(0, 155) + "...";
    const status      = publishNow ? "published" : form.status;
    const published_at = (publishNow || form.status === "published") ? new Date().toISOString() : null;

    const payload: any = {
      title: form.title.trim(), slug: form.slug.trim(), excerpt,
      content: form.content.trim(), category: form.category,
      tags: form.tags, status, featured: form.featured,
      thumbnail_url:   form.thumbnail_url   || null,
      author_name:     form.author_name     || currentMemberName || "SUNCO Admin",
      reading_time:    form.reading_time    || 5,
      seo_title:       form.seo_title.trim()       || form.title.trim(),
      seo_description: form.seo_description.trim() || excerpt,
      seo_keywords:    form.seo_keywords,
      updated_at:      new Date().toISOString(),
    };
    if (published_at) payload.published_at = published_at;

    const { error } = isEditing
      ? await supabase.from("posts").update(payload).eq("id", post.id)
      : await supabase.from("posts").insert(payload);

    if (error) { alert("Error: " + error.message); setSaving(false); return; }
    onSaved();
    setSaving(false);
  };

  // ── Tag helpers ──
  const addTag = (t: string) => {
    const tag = t.trim().toLowerCase();
    if (tag && !form.tags.includes(tag)) setForm(prev => ({ ...prev, tags: [...prev.tags, tag] }));
    setTagInput("");
  };
  const removeTag = (t: string) => setForm(prev => ({ ...prev, tags: prev.tags.filter(x => x !== t) }));
  const addKeyword = (k: string) => {
    const kw = k.trim().toLowerCase();
    if (kw && !form.seo_keywords.includes(kw)) setForm(prev => ({ ...prev, seo_keywords: [...prev.seo_keywords, kw] }));
  };
  const removeKeyword = (k: string) => setForm(prev => ({ ...prev, seo_keywords: prev.seo_keywords.filter(x => x !== k) }));

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "0.72rem 1rem",
    border: "1.5px solid rgba(26,92,42,0.15)",
    borderRadius: 8, fontSize: "0.9rem",
    fontFamily: "'DM Sans', sans-serif",
    color: "#0D3320", background: "white", outline: "none",
    boxSizing: "border-box",
  };
  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: "0.68rem", fontWeight: 600,
    letterSpacing: "0.1em", textTransform: "uppercase",
    color: "#888", marginBottom: "0.45rem",
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 400, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "1rem", overflowY: "auto" }}>
      <div style={{ background: "white", borderRadius: 14, maxWidth: 860, width: "100%", minHeight: "95vh", boxShadow: "0 32px 80px rgba(0,0,0,0.4)", marginBottom: "2rem" }}>

        {/* Sticky header */}
        <div style={{ background: "var(--green-dk)", padding: "1.1rem 1.5rem", borderRadius: "14px 14px 0 0", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <FileText size={16} color="#C9A84C" />
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.1rem", color: "#C9A84C" }}>
              {isEditing ? "Edit Post" : "New Post"}
            </h2>
            <span style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.35)", background: "rgba(255,255,255,0.08)", padding: "2px 8px", borderRadius: 20, textTransform: "capitalize" }}>
              {form.status}
            </span>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <button onClick={() => handleSave(false)} disabled={saving} style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", color: "white", padding: "0.45rem 1rem", borderRadius: 6, fontSize: "0.8rem", cursor: saving ? "not-allowed" : "pointer", fontFamily: "'DM Sans',sans-serif" }}>
              {saving ? "Saving..." : "Save Draft"}
            </button>
            <button onClick={() => handleSave(true)} disabled={saving} style={{ background: "var(--gold)", border: "none", color: "var(--green-dk)", padding: "0.45rem 1rem", borderRadius: 6, fontSize: "0.8rem", fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", fontFamily: "'DM Sans',sans-serif" }}>
              Publish →
            </button>
            <button onClick={onClose} style={{ background: "rgba(255,255,255,0.08)", border: "none", color: "white", width: 30, height: 30, borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <X size={14} />
            </button>
          </div>
        </div>

        <div style={{ padding: "1.8rem 2rem" }}>

          {/* ── AI Panel ── */}
          <div style={{ marginBottom: "1.5rem", border: "1.5px solid rgba(201,168,76,0.3)", borderRadius: 10, overflow: "hidden" }}>
            <button onClick={() => setShowAI(v => !v)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.9rem 1.2rem", background: showAI ? "rgba(201,168,76,0.12)" : "rgba(201,168,76,0.06)", border: "none", cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Sparkles size={16} color="#C9A84C" />
                <span style={{ fontSize: "0.88rem", fontWeight: 600, color: "#0D3320" }}>Claude AI Content Generator</span>
                <span style={{ fontSize: "0.65rem", background: "#C9A84C", color: "#0D3320", padding: "1px 8px", borderRadius: 20, fontWeight: 700 }}>AI</span>
              </div>
              {showAI ? <ChevronUp size={16} color="#888" /> : <ChevronDown size={16} color="#888" />}
            </button>
            {showAI && (
              <div style={{ padding: "1.2rem", borderTop: "1px solid rgba(201,168,76,0.2)" }}>
                <p style={{ fontSize: "0.8rem", color: "#666", marginBottom: "0.8rem", lineHeight: 1.6 }}>Enter a title first, then optional context below. Claude generates full article + SEO fields.</p>
                <div style={{ marginBottom: "0.8rem" }}>
                  <label style={labelStyle}>Additional context (optional)</label>
                  <textarea value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} placeholder="Focus on senior citizens, include practical tips for Surigao del Norte members..." rows={3} style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }} />
                </div>
                {aiError && (
                  <div style={{ display: "flex", gap: 8, padding: "0.7rem 1rem", background: "#FDECEA", borderRadius: 8, marginBottom: "0.8rem" }}>
                    <AlertCircle size={14} color="#A8200D" style={{ marginTop: 1, flexShrink: 0 }} />
                    <p style={{ fontSize: "0.78rem", color: "#A8200D" }}>{aiError}</p>
                  </div>
                )}
                <button onClick={handleAIGenerate} disabled={aiLoading || !form.title.trim()}
                  style={{ display: "flex", alignItems: "center", gap: 8, background: aiLoading || !form.title.trim() ? "#CCC" : "var(--green-dk)", color: "white", border: "none", padding: "0.7rem 1.4rem", borderRadius: 8, fontSize: "0.85rem", fontWeight: 600, cursor: aiLoading || !form.title.trim() ? "not-allowed" : "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                  <Sparkles size={15} />
                  {aiLoading ? "Generating with Claude AI..." : "Generate Full Article + SEO"}
                </button>
                {!form.title.trim() && <p style={{ fontSize: "0.72rem", color: "#AAA", marginTop: "0.5rem" }}>⬆ Enter a title first.</p>}
              </div>
            )}
          </div>

          {/* Title + Slug + Category */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
            <div style={{ gridColumn: "1/-1" }}>
              <label style={labelStyle}>Post Title *</label>
              <input type="text" value={form.title} onChange={e => handleTitleChange(e.target.value)} placeholder="Enter a compelling title..." style={{ ...inputStyle, fontSize: "1.05rem", fontWeight: 600 }} />
            </div>
            <div>
              <label style={labelStyle}>URL Slug *</label>
              <input type="text" value={form.slug} onChange={e => setForm(prev => ({ ...prev, slug: slugify(e.target.value) }))} placeholder="auto-generated-from-title" style={{ ...inputStyle, fontFamily: "monospace", fontSize: "0.85rem" }} />
              <p style={{ fontSize: "0.65rem", color: "var(--muted)", marginTop: 3 }}>yoursite.com/news/{form.slug || "post-slug"}</p>
            </div>
            <div>
              <label style={labelStyle}>Category *</label>
              <select value={form.category} onChange={e => setForm(prev => ({ ...prev, category: e.target.value }))} style={inputStyle}>
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
          </div>

          {/* Thumbnail */}
          <div style={{ marginBottom: "1.2rem" }}>
            <label style={labelStyle}>Featured Image / Thumbnail</label>
            <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: "1rem", alignItems: "center" }}>
              <div style={{ width: 180, height: 110, background: "var(--warm)", border: "1.5px dashed rgba(26,92,42,0.2)", borderRadius: 8, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {thumbPrev ? <img src={thumbPrev} alt="Preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : (
                  <div style={{ textAlign: "center" }}><Image size={26} color="rgba(26,92,42,0.15)" /><p style={{ fontSize: "0.62rem", color: "var(--muted)", marginTop: 4 }}>No image</p></div>
                )}
              </div>
              <div>
                <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={handleThumbUpload} style={{ display: "none" }} />
                <button onClick={() => fileRef.current?.click()} disabled={uploading} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "var(--warm)", border: "1.5px solid rgba(26,92,42,0.2)", color: "var(--green-dk)", padding: "0.6rem 1rem", borderRadius: 6, fontSize: "0.8rem", fontWeight: 500, cursor: uploading ? "not-allowed" : "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                  <Upload size={13} /> {uploading ? "Uploading..." : thumbPrev ? "Change Image" : "Upload Image"}
                </button>
                <p style={{ fontSize: "0.65rem", color: "var(--muted)", marginTop: "0.4rem", lineHeight: 1.5 }}>Auto-compressed to WebP. Best: 1200×630px</p>
                {thumbPrev && <button onClick={() => { setThumbPrev(null); setForm(p => ({ ...p, thumbnail_url: "" })); }} style={{ marginTop: "0.3rem", background: "none", border: "none", color: "#C0392B", fontSize: "0.72rem", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", padding: 0 }}>Remove image</button>}
              </div>
            </div>
          </div>

          {/* Excerpt */}
          <div style={{ marginBottom: "1rem" }}>
            <label style={labelStyle}>Excerpt <span style={{ textTransform: "none", letterSpacing: 0, fontWeight: 400, fontSize: "0.68rem" }}>(auto-generated if empty)</span></label>
            <textarea value={form.excerpt} onChange={e => setForm(prev => ({ ...prev, excerpt: e.target.value }))} placeholder="Short summary shown in post cards..." rows={2} style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }} />
            <p style={{ fontSize: "0.65rem", color: form.excerpt.length > 160 ? "#C0392B" : "var(--muted)", marginTop: 3 }}>{form.excerpt.length}/160</p>
          </div>

          {/* Content */}
          <div style={{ marginBottom: "1.2rem" }}>
            <label style={labelStyle}>Full Article Content *</label>
            <textarea value={form.content} onChange={e => setForm(prev => ({ ...prev, content: e.target.value }))} placeholder="Write or paste the full article here..." rows={16} style={{ ...inputStyle, resize: "vertical", lineHeight: 1.8, fontSize: "0.92rem" }} />
            <p style={{ fontSize: "0.65rem", color: "var(--muted)", marginTop: 3 }}>
              {form.content.split(/\s+/).filter(Boolean).length} words · ~{Math.max(1, Math.ceil(form.content.split(/\s+/).filter(Boolean).length / 200))} min read
            </p>
          </div>

          {/* Tags */}
          <div style={{ marginBottom: "1.2rem" }}>
            <label style={labelStyle}>Tags</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginBottom: "0.5rem" }}>
              {form.tags.map(tag => (
                <span key={tag} style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "rgba(26,92,42,0.08)", color: "var(--green-dk)", fontSize: "0.75rem", fontWeight: 500, padding: "3px 10px", borderRadius: 20 }}>
                  <Tag size={10} /> {tag}
                  <button onClick={() => removeTag(tag)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center" }}><X size={10} color="#C0392B" /></button>
                </span>
              ))}
            </div>
            <input type="text" value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(tagInput); } }} placeholder="Type tag and press Enter..." style={{ ...inputStyle, fontSize: "0.85rem" }} />
            <p style={{ fontSize: "0.65rem", color: "var(--muted)", marginTop: 3 }}>Press Enter to add</p>
          </div>

          {/* Options row */}
          <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem", padding: "1rem", background: "var(--warm)", borderRadius: 8, flexWrap: "wrap" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input type="checkbox" checked={form.featured} onChange={e => setForm(prev => ({ ...prev, featured: e.target.checked }))} style={{ width: 16, height: 16, accentColor: "var(--gold)" }} />
              <span style={{ fontSize: "0.85rem", fontWeight: 500, color: "var(--green-dk)", display: "flex", alignItems: "center", gap: 5 }}>
                <Star size={13} color="#C9A84C" fill={form.featured ? "#C9A84C" : "none"} /> Featured
              </span>
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Clock size={13} color="var(--muted)" />
              <span style={{ fontSize: "0.85rem", color: "var(--green-dk)" }}>Read time:</span>
              <input type="number" min={1} max={60} value={form.reading_time} onChange={e => setForm(prev => ({ ...prev, reading_time: Number(e.target.value) }))} style={{ width: 60, padding: "0.3rem 0.5rem", border: "1.5px solid rgba(26,92,42,0.15)", borderRadius: 4, fontSize: "0.85rem", fontFamily: "'DM Sans',sans-serif", color: "var(--green-dk)", outline: "none" }} />
              <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>min</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: "0.85rem", color: "var(--green-dk)" }}>Status:</span>
              <select value={form.status} onChange={e => setForm(prev => ({ ...prev, status: e.target.value }))} style={{ padding: "0.3rem 0.6rem", border: "1.5px solid rgba(26,92,42,0.15)", borderRadius: 4, fontSize: "0.83rem", fontFamily: "'DM Sans',sans-serif", color: "var(--green-dk)", outline: "none" }}>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          {/* ── SEO Panel ── */}
          <div style={{ border: "1.5px solid rgba(43,95,168,0.25)", borderRadius: 10, overflow: "hidden", marginBottom: "1.5rem" }}>
            <button onClick={() => setShowSEO(v => !v)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.9rem 1.2rem", background: showSEO ? "rgba(43,95,168,0.06)" : "rgba(43,95,168,0.03)", border: "none", cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Globe size={15} color="#2B5FA8" />
                <span style={{ fontSize: "0.88rem", fontWeight: 600, color: "#0D3320" }}>SEO & Search Engine Settings</span>
                <span style={{ fontSize: "0.65rem", color: form.seo_title && form.seo_description ? "#2E8B44" : "#D4A017", fontWeight: 700 }}>
                  {form.seo_title && form.seo_description ? "✓ Complete" : "⚠ Incomplete"}
                </span>
              </div>
              {showSEO ? <ChevronUp size={16} color="#888" /> : <ChevronDown size={16} color="#888" />}
            </button>
            {showSEO && (
              <div style={{ padding: "1.2rem", borderTop: "1px solid rgba(43,95,168,0.15)" }}>
                {/* Google preview */}
                <div style={{ background: "white", border: "1px solid #E0E0E0", borderRadius: 8, padding: "1rem 1.2rem", marginBottom: "1.2rem" }}>
                  <p style={{ fontSize: "0.65rem", color: "#888", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "0.6rem" }}>Google Search Preview</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: "0.3rem" }}>
                    <div style={{ width: 18, height: 18, background: "#0D3320", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ color: "#C9A84C", fontSize: "0.55rem", fontWeight: 700 }}>S</span></div>
                    <span style={{ fontSize: "0.72rem", color: "#202124" }}>sunco.org.ph</span>
                  </div>
                  <p style={{ fontSize: "1rem", color: "#1558D6", fontFamily: "Arial, sans-serif", marginBottom: "0.2rem", lineHeight: 1.3 }}>
                    {form.seo_title || form.title || "Post Title — SUNCO"}
                  </p>
                  <p style={{ fontSize: "0.8rem", color: "#4D5156", lineHeight: 1.5, fontFamily: "Arial, sans-serif" }}>
                    {form.seo_description || form.excerpt || "Post description will appear here..."}
                  </p>
                </div>
                <div style={{ marginBottom: "1rem" }}>
                  <label style={labelStyle}>SEO Title ({(form.seo_title || "").length}/60)</label>
                  <input type="text" value={form.seo_title} onChange={e => setForm(prev => ({ ...prev, seo_title: e.target.value }))} placeholder="e.g. SUNCO Consumer Rights 2026 | Surigao del Norte" style={{ ...inputStyle, borderColor: form.seo_title.length > 60 ? "#C0392B" : undefined }} />
                </div>
                <div style={{ marginBottom: "1rem" }}>
                  <label style={labelStyle}>SEO Description ({(form.seo_description || "").length}/160)</label>
                  <textarea value={form.seo_description} onChange={e => setForm(prev => ({ ...prev, seo_description: e.target.value }))} rows={3} placeholder="150–160 chars with keyword + call to action" style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6, borderColor: form.seo_description.length > 160 ? "#C0392B" : undefined }} />
                </div>
                <div>
                  <label style={labelStyle}>SEO Keywords</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginBottom: "0.5rem" }}>
                    {form.seo_keywords.map(kw => (
                      <span key={kw} style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "rgba(43,95,168,0.08)", color: "#2B5FA8", fontSize: "0.75rem", fontWeight: 500, padding: "3px 10px", borderRadius: 20 }}>
                        {kw}<button onClick={() => removeKeyword(kw)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center" }}><X size={10} color="#C0392B" /></button>
                      </span>
                    ))}
                  </div>
                  <input type="text" placeholder="Type keyword and press Enter..." onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addKeyword((e.target as HTMLInputElement).value); (e.target as HTMLInputElement).value = ""; } }} style={{ ...inputStyle, fontSize: "0.85rem" }} />
                  <p style={{ fontSize: "0.65rem", color: "var(--muted)", marginTop: 3 }}>Target 5–8 keywords. Focus on Filipino consumer terms.</p>
                </div>
              </div>
            )}
          </div>

          {/* Author */}
          <div style={{ marginBottom: "1.5rem" }}>
            <label style={labelStyle}>Author Name</label>
            <input type="text" value={form.author_name} onChange={e => setForm(prev => ({ ...prev, author_name: e.target.value }))} placeholder="e.g. SUNCO Editorial Team" style={inputStyle} />
          </div>

          {/* Bottom actions */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.8rem", paddingTop: "1rem", borderTop: "1px solid rgba(0,0,0,0.07)" }}>
            <button onClick={onClose} style={{ padding: "0.85rem", background: "white", border: "1.5px solid rgba(26,92,42,0.15)", color: "var(--muted)", borderRadius: 6, fontSize: "0.85rem", cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>Cancel</button>
            <button onClick={() => handleSave(false)} disabled={saving} style={{ padding: "0.85rem", background: "rgba(26,92,42,0.08)", border: "1.5px solid rgba(26,92,42,0.2)", color: "var(--green-dk)", borderRadius: 6, fontSize: "0.85rem", fontWeight: 500, cursor: saving ? "not-allowed" : "pointer", fontFamily: "'DM Sans',sans-serif" }}>
              {saving ? "Saving..." : "Save as Draft"}
            </button>
            <button onClick={() => handleSave(true)} disabled={saving} style={{ padding: "0.85rem", background: saving ? "var(--gold-dk)" : "var(--gold)", border: "none", color: "var(--green-dk)", borderRadius: 6, fontSize: "0.85rem", fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", fontFamily: "'DM Sans',sans-serif" }}>
              {saving ? "Publishing..." : "Publish Now →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
