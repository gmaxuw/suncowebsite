"use client";
// ─────────────────────────────────────────────
// CmsTab.tsx  —  Full CMS with AI Generator
//
// Features:
//   • Posts list with status filters
//   • Rich editor: title, content, thumbnail, category, tags
//   • Claude AI → generates full article + SEO fields
//   • SEO panel: meta title, description, keywords, Google preview
//   • Ads manager: upload, position, toggle active
//   • Site settings panel
//
// Uses: posts table (slug, seo_title, seo_description, seo_keywords, tags, featured)
//       ads table   (image_url, link_url, position, is_active)
// ─────────────────────────────────────────────
import { useEffect, useState, useRef } from "react";
import {
  FileText, PlusCircle, Eye, EyeOff, Trash2, Upload,
  Image, Sparkles, Search, Globe, Tag, Star, Settings,
  Megaphone, X, ChevronDown, ChevronUp, Check, Clock,
  BarChart2, RefreshCw, ExternalLink, AlertCircle,
} from "lucide-react";

interface Props {
  canCRUD: boolean;
  supabase: any;
  userId: string;
  currentMemberName?: string;
}

type Tab = "posts" | "ads" | "settings";
type PostStatus = "all" | "published" | "draft" | "archived";

const CATEGORIES = [
  { value: "news",            label: "News",            color: "#2B5FA8" },
  { value: "consumer-rights", label: "Consumer Rights", color: "#2E8B44" },
  { value: "announcements",   label: "Announcements",   color: "#D4A017" },
  { value: "mas",             label: "MAS Program",     color: "#9A2020" },
  { value: "programs",        label: "Programs",        color: "#6B3FA0" },
  { value: "success-stories", label: "Success Stories", color: "#1A7A8A" },
  { value: "milestones",      label: "Milestones",      color: "#C46B1A" },
];

const AD_POSITIONS = [
  { value: "left",   label: "Left Sidebar"  },
  { value: "right",  label: "Right Sidebar" },
  { value: "inline", label: "Inline / Body" },
  { value: "top",    label: "Top Banner"    },
];

function slugify(text: string) {
  return text.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

export default function CmsTab({ canCRUD, supabase, userId, currentMemberName }: Props) {
  const [activeTab, setActiveTab]   = useState<Tab>("posts");
  const [posts,     setPosts]       = useState<any[]>([]);
  const [ads,       setAds]         = useState<any[]>([]);
  const [settings,  setSettings]    = useState<any[]>([]);
  const [loading,   setLoading]     = useState(true);
  const [filter,    setFilter]      = useState<PostStatus>("all");
  const [searchQ,   setSearchQ]     = useState("");

  // Editor state
  const [showEditor,  setShowEditor]  = useState(false);
  const [editing,     setEditing]     = useState<any>(null);
  const [saving,      setSaving]      = useState(false);
  const [uploading,   setUploading]   = useState(false);
  const [thumbPrev,   setThumbPrev]   = useState<string | null>(null);
  const [showSEO,     setShowSEO]     = useState(false);
  const [aiLoading,   setAiLoading]   = useState(false);
  const [aiError,     setAiError]     = useState("");
  const [aiPrompt,    setAiPrompt]    = useState("");
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [tagInput,    setTagInput]    = useState("");

  const [form, setForm] = useState({
    title:           "",
    slug:            "",
    excerpt:         "",
    content:         "",
    category:        "news",
    tags:            [] as string[],
    status:          "draft",
    featured:        false,
    thumbnail_url:   "",
    author_name:     currentMemberName || "",
    reading_time:    5,
    seo_title:       "",
    seo_description: "",
    seo_keywords:    [] as string[],
  });

  // Ads editor
  const [showAdForm,  setShowAdForm]  = useState(false);
  const [editingAd,   setEditingAd]   = useState<any>(null);
  const [adUploading, setAdUploading] = useState(false);
  const [adForm, setAdForm] = useState({
    title:     "",
    image_url: "",
    link_url:  "",
    position:  "left",
    is_active: true,
  });
  const [adPreview, setAdPreview] = useState<string | null>(null);

  const fileRef    = useRef<HTMLInputElement>(null);
  const adFileRef  = useRef<HTMLInputElement>(null);

  // ── Load data ──
  const loadPosts = async () => {
    const { data } = await supabase
      .from("posts")
      .select("id,title,slug,excerpt,thumbnail_url,category,tags,status,featured,author_name,views,created_at,published_at,seo_title")
      .order("created_at", { ascending: false });
    setPosts(data || []);
  };

  const loadAds = async () => {
    const { data } = await supabase.from("ads").select("*").order("created_at", { ascending: false });
    setAds(data || []);
  };

  const loadSettings = async () => {
    const { data } = await supabase.from("site_settings").select("*").order("group_name");
    setSettings(data || []);
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([loadPosts(), loadAds(), loadSettings()]);
      setLoading(false);
    };
    init();
  }, []);

  // ── Auto-slug from title ──
  const handleTitleChange = (val: string) => {
    setForm(prev => ({
      ...prev,
      title: val,
      slug: prev.slug && prev.slug !== slugify(prev.title) ? prev.slug : slugify(val),
      seo_title: prev.seo_title || val,
    }));
  };

  // ── Thumbnail upload ──
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
      const { error: upErr } = await supabase.storage.from("articles").upload(filename, blob, { contentType: "image/webp", upsert: true });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("articles").getPublicUrl(filename);
      setForm(prev => ({ ...prev, thumbnail_url: urlData.publicUrl }));
    } catch (err: any) { alert("Upload failed: " + err.message); }
    setUploading(false);
  };

  // ── Ad image upload ──
  const handleAdUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAdUploading(true);
    const reader = new FileReader();
    reader.onload = ev => setAdPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    try {
      const blob = await compressToWebP(file, 800);
      const filename = `ads/ad-${Date.now()}.webp`;
      const { error } = await supabase.storage.from("articles").upload(filename, blob, { contentType: "image/webp", upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("articles").getPublicUrl(filename);
      setAdForm(prev => ({ ...prev, image_url: urlData.publicUrl }));
    } catch (err: any) { alert("Upload failed: " + err.message); }
    setAdUploading(false);
  };

  // ── Claude AI Generator ──
  const handleAIGenerate = async () => {
    if (!form.title.trim()) { setAiError("Please enter a title first before generating."); return; }
    setAiLoading(true);
    setAiError("");
    try {
      const prompt = `You are a content writer for SUNCO (Surigao del Norte Consumers Organization), a Filipino consumer cooperative based in Mindanao, Philippines. 

Write a complete, SEO-optimized article for the following:

Title: "${form.title}"
Category: ${form.category}
${aiPrompt ? `Additional context: ${aiPrompt}` : ""}

Respond ONLY with a valid JSON object (no markdown, no backticks) with exactly these fields:
{
  "content": "Full article body in plain text with natural paragraphs. Minimum 500 words. Include relevant Philippine consumer context, practical tips, and references to SUNCO's mission. Write naturally for Filipino readers.",
  "excerpt": "A compelling 150-160 character excerpt for preview cards and meta descriptions.",
  "seo_title": "SEO-optimized title under 60 characters",
  "seo_description": "Meta description 150-160 characters that includes primary keyword and call to action",
  "seo_keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "tags": ["tag1", "tag2", "tag3"],
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
      const raw = data.content?.find((b: any) => b.type === "text")?.text || "";
      const clean = raw.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);

      setForm(prev => ({
        ...prev,
        content:         parsed.content         || prev.content,
        excerpt:         parsed.excerpt         || prev.excerpt,
        seo_title:       parsed.seo_title       || prev.seo_title || prev.title,
        seo_description: parsed.seo_description || prev.seo_description,
        seo_keywords:    parsed.seo_keywords    || prev.seo_keywords,
        tags:            parsed.tags            || prev.tags,
        reading_time:    parsed.reading_time    || prev.reading_time,
      }));
      setShowAIPanel(false);
      setShowSEO(true);
    } catch (err: any) {
      setAiError("Generation failed. Check your API key or try again. " + err.message);
    }
    setAiLoading(false);
  };

  // ── Save post ──
  const handleSave = async (publishNow = false) => {
    if (!form.title.trim()) { alert("Title is required."); return; }
    if (!form.content.trim()) { alert("Content is required."); return; }
    if (!form.slug.trim()) { alert("Slug is required."); return; }
    setSaving(true);

    const excerpt = form.excerpt.trim() || form.content.replace(/\n/g, " ").substring(0, 155) + "...";
    const status = publishNow ? "published" : form.status;
    const published_at = (publishNow || form.status === "published") ? new Date().toISOString() : null;

    const payload = {
      title:           form.title.trim(),
      slug:            form.slug.trim(),
      excerpt,
      content:         form.content.trim(),
      category:        form.category,
      tags:            form.tags,
      status,
      featured:        form.featured,
      thumbnail_url:   form.thumbnail_url || null,
      author_name:     form.author_name || currentMemberName || "SUNCO Admin",
      reading_time:    form.reading_time || 5,
      seo_title:       form.seo_title.trim() || form.title.trim(),
      seo_description: form.seo_description.trim() || excerpt,
      seo_keywords:    form.seo_keywords,
      updated_at:      new Date().toISOString(),
      ...(published_at ? { published_at } : {}),
    };

    if (editing) {
      const { error } = await supabase.from("posts").update(payload).eq("id", editing.id);
      if (error) { alert("Error: " + error.message); setSaving(false); return; }
    } else {
      const { error } = await supabase.from("posts").insert(payload);
      if (error) { alert("Error: " + error.message); setSaving(false); return; }
    }

    await loadPosts();
    setShowEditor(false);
    setSaving(false);
  };

  // ── Save ad ──
  const handleSaveAd = async () => {
    if (!adForm.image_url) { alert("Please upload an ad image."); return; }
    if (editingAd) {
      await supabase.from("ads").update(adForm).eq("id", editingAd.id);
    } else {
      await supabase.from("ads").insert(adForm);
    }
    await loadAds();
    setShowAdForm(false);
  };

  // ── Open editor ──
  const openNew = () => {
    setEditing(null);
    setForm({ title: "", slug: "", excerpt: "", content: "", category: "news", tags: [], status: "draft", featured: false, thumbnail_url: "", author_name: currentMemberName || "", reading_time: 5, seo_title: "", seo_description: "", seo_keywords: [] });
    setThumbPrev(null);
    setShowSEO(false);
    setShowAIPanel(false);
    setAiPrompt("");
    setAiError("");
    setTagInput("");
    setShowEditor(true);
  };

  const openEdit = (post: any) => {
    setEditing(post);
    setForm({
      title:           post.title || "",
      slug:            post.slug  || "",
      excerpt:         post.excerpt || "",
      content:         post.content || "",
      category:        post.category || "news",
      tags:            post.tags || [],
      status:          post.status || "draft",
      featured:        post.featured || false,
      thumbnail_url:   post.thumbnail_url || "",
      author_name:     post.author_name || "",
      reading_time:    post.reading_time || 5,
      seo_title:       post.seo_title || "",
      seo_description: post.seo_description || "",
      seo_keywords:    post.seo_keywords || [],
    });
    setThumbPrev(post.thumbnail_url || null);
    setShowSEO(false);
    setShowAIPanel(false);
    setAiPrompt("");
    setAiError("");
    setTagInput("");
    setShowEditor(true);
  };

  const openNewAd = () => {
    setEditingAd(null);
    setAdForm({ title: "", image_url: "", link_url: "", position: "left", is_active: true });
    setAdPreview(null);
    setShowAdForm(true);
  };

  // ── Tag helpers ──
  const addTag = (tag: string) => {
    const t = tag.trim().toLowerCase();
    if (t && !form.tags.includes(t)) setForm(prev => ({ ...prev, tags: [...prev.tags, t] }));
    setTagInput("");
  };
  const removeTag = (tag: string) => setForm(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }));

  const addKeyword = (kw: string) => {
    const k = kw.trim().toLowerCase();
    if (k && !form.seo_keywords.includes(k)) setForm(prev => ({ ...prev, seo_keywords: [...prev.seo_keywords, k] }));
  };
  const removeKeyword = (kw: string) => setForm(prev => ({ ...prev, seo_keywords: prev.seo_keywords.filter(k => k !== kw) }));

  // ── Filtered posts ──
  const filtered = posts.filter(p => {
    const matchStatus = filter === "all" || p.status === filter;
    const matchSearch = !searchQ || p.title.toLowerCase().includes(searchQ.toLowerCase()) || p.category?.toLowerCase().includes(searchQ.toLowerCase());
    return matchStatus && matchSearch;
  });

  const getCatColor = (cat: string) => CATEGORIES.find(c => c.value === cat)?.color || "#888";

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

  // ────────────────────────────────────────────
  // RENDER
  // ────────────────────────────────────────────
  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif" }}>

      {/* ── Page Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "0.8rem" }}>
        <div>
          <p style={{ fontSize: "0.7rem", color: "var(--muted)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.3rem" }}>Admin Panel</p>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.8rem", fontWeight: 700, color: "var(--green-dk)" }}>Content Management</h1>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          {activeTab === "posts" && canCRUD && (
            <button onClick={openNew} style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--gold)", color: "var(--green-dk)", border: "none", padding: "0.7rem 1.4rem", borderRadius: 6, fontSize: "0.82rem", fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
              <PlusCircle size={15} /> New Post
            </button>
          )}
          {activeTab === "ads" && canCRUD && (
            <button onClick={openNewAd} style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--gold)", color: "var(--green-dk)", border: "none", padding: "0.7rem 1.4rem", borderRadius: 6, fontSize: "0.82rem", fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
              <PlusCircle size={15} /> New Ad
            </button>
          )}
        </div>
      </div>

      {/* ── Tab Switcher ── */}
      <div style={{ display: "flex", gap: "0.3rem", marginBottom: "1.5rem", background: "white", padding: "0.35rem", borderRadius: 10, border: "1px solid rgba(26,92,42,0.08)", width: "fit-content" }}>
        {([
          { id: "posts",    label: "Posts",    icon: FileText   },
          { id: "ads",      label: "Ads",      icon: Megaphone  },
          { id: "settings", label: "Settings", icon: Settings   },
        ] as const).map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setActiveTab(id)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "0.5rem 1.1rem", borderRadius: 7, border: "none", background: activeTab === id ? "var(--green-dk)" : "transparent", color: activeTab === id ? "white" : "var(--muted)", fontSize: "0.8rem", fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* ════════════════════════════════════════
          TAB: POSTS
      ════════════════════════════════════════ */}
      {activeTab === "posts" && (
        <div>
          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
            {[
              { label: "Total Posts",  value: posts.length,                                  color: "var(--gold)" },
              { label: "Published",    value: posts.filter(p => p.status === "published").length, color: "#2E8B44" },
              { label: "Drafts",       value: posts.filter(p => p.status === "draft").length,     color: "#D4A017" },
              { label: "Featured",     value: posts.filter(p => p.featured).length,               color: "#9A2020" },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ background: "white", borderRadius: 10, padding: "1.1rem 1.3rem", border: "1px solid rgba(26,92,42,0.08)", borderTop: `4px solid ${color}` }}>
                <p style={{ fontSize: "0.65rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)", marginBottom: "0.4rem" }}>{label}</p>
                <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.6rem", fontWeight: 700, color }}>{value}</p>
              </div>
            ))}
          </div>

          {/* Search + Filter */}
          <div style={{ display: "flex", gap: "0.8rem", marginBottom: "1.2rem", flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "white", border: "1.5px solid rgba(26,92,42,0.15)", borderRadius: 6, padding: "0 1rem", flex: 1, minWidth: 200 }}>
              <Search size={14} color="var(--muted)" />
              <input type="text" placeholder="Search posts..." value={searchQ} onChange={e => setSearchQ(e.target.value)}
                style={{ border: "none", outline: "none", fontSize: "0.88rem", fontFamily: "'DM Sans',sans-serif", color: "var(--text)", padding: "0.65rem 0", width: "100%", background: "transparent" }} />
              {searchQ && <button onClick={() => setSearchQ("")} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}><X size={13} color="var(--muted)" /></button>}
            </div>
            <div style={{ display: "flex", gap: "0.4rem" }}>
              {(["all","published","draft","archived"] as PostStatus[]).map(s => (
                <button key={s} onClick={() => setFilter(s)} style={{ padding: "0.45rem 0.9rem", borderRadius: 20, border: "1.5px solid", borderColor: filter === s ? "var(--gold)" : "rgba(26,92,42,0.15)", background: filter === s ? "var(--gold)" : "white", color: filter === s ? "var(--green-dk)" : "var(--muted)", fontSize: "0.73rem", fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", textTransform: "capitalize" }}>
                  {s} {s !== "all" ? `(${posts.filter(p => p.status === s).length})` : `(${posts.length})`}
                </button>
              ))}
            </div>
          </div>

          {/* Posts list */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.7rem" }}>
            {loading ? (
              <div style={{ padding: "3rem", textAlign: "center", color: "var(--muted)", background: "white", borderRadius: 10 }}>Loading posts...</div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: "3rem", textAlign: "center", background: "white", borderRadius: 10, border: "1px solid rgba(26,92,42,0.08)" }}>
                <FileText size={38} color="rgba(26,92,42,0.12)" style={{ marginBottom: "0.8rem" }} />
                <p style={{ color: "var(--muted)", fontSize: "0.92rem", marginBottom: "0.5rem" }}>No posts found.</p>
                {canCRUD && <button onClick={openNew} style={{ background: "var(--gold)", color: "var(--green-dk)", border: "none", padding: "0.6rem 1.3rem", borderRadius: 6, fontSize: "0.8rem", fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>Create your first post</button>}
              </div>
            ) : filtered.map(post => (
              <div key={post.id} style={{ background: "white", borderRadius: 10, border: "1px solid rgba(26,92,42,0.08)", overflow: "hidden", display: "grid", gridTemplateColumns: "130px 1fr auto", alignItems: "center" }}>
                {/* Thumb */}
                <div style={{ width: 130, height: 86, background: "#0D3320", flexShrink: 0, overflow: "hidden", position: "relative" }}>
                  {post.thumbnail_url ? (
                    <img src={post.thumbnail_url} alt={post.title} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Image size={22} color="rgba(201,168,76,0.25)" />
                    </div>
                  )}
                  {post.featured && (
                    <div style={{ position: "absolute", top: 6, left: 6, background: "#C9A84C", borderRadius: 4, width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Star size={11} color="#0D3320" fill="#0D3320" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div style={{ padding: "0.8rem 1.2rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: "0.35rem", flexWrap: "wrap" }}>
                    <span style={{ background: `${getCatColor(post.category)}18`, color: getCatColor(post.category), fontSize: "0.63rem", fontWeight: 600, padding: "2px 8px", borderRadius: 20, textTransform: "capitalize" }}>
                      {post.category?.replace(/-/g, " ")}
                    </span>
                    <span style={{ background: post.status === "published" ? "rgba(46,139,68,0.1)" : post.status === "archived" ? "rgba(0,0,0,0.06)" : "rgba(212,160,23,0.1)", color: post.status === "published" ? "#2E8B44" : post.status === "archived" ? "#888" : "#D4A017", fontSize: "0.63rem", fontWeight: 600, padding: "2px 8px", borderRadius: 20, textTransform: "capitalize" }}>
                      {post.status}
                    </span>
                    {post.views > 0 && (
                      <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: "0.63rem", color: "var(--muted)" }}>
                        <BarChart2 size={10} /> {post.views} views
                      </span>
                    )}
                    <span style={{ fontSize: "0.65rem", color: "var(--muted)" }}>
                      {new Date(post.created_at).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })}
                    </span>
                  </div>
                  <h3 style={{ fontSize: "0.92rem", fontWeight: 600, color: "var(--green-dk)", marginBottom: "0.2rem", lineHeight: 1.35 }}>{post.title}</h3>
                  <p style={{ fontSize: "0.75rem", color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 480 }}>
                    /{post.slug}
                  </p>
                </div>

                {/* Actions */}
                {canCRUD && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", padding: "0 1rem", flexShrink: 0 }}>
                    <button onClick={() => openEdit(post)} style={{ background: "none", border: "1px solid rgba(26,92,42,0.2)", color: "var(--green-dk)", padding: "0.35rem 0.8rem", borderRadius: 4, fontSize: "0.73rem", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", whiteSpace: "nowrap" }}>Edit</button>
                    <button
                      onClick={async () => {
                        const newStatus = post.status === "published" ? "draft" : "published";
                        await supabase.from("posts").update({ status: newStatus, ...(newStatus === "published" ? { published_at: new Date().toISOString() } : {}) }).eq("id", post.id);
                        await loadPosts();
                      }}
                      style={{ background: "none", border: `1px solid ${post.status === "published" ? "#D4A017" : "#2E8B44"}`, color: post.status === "published" ? "#D4A017" : "#2E8B44", padding: "0.35rem 0.5rem", borderRadius: 4, fontSize: "0.73rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {post.status === "published" ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                    <button onClick={async () => { if (!confirm("Delete this post permanently?")) return; await supabase.from("posts").delete().eq("id", post.id); await loadPosts(); }}
                      style={{ background: "none", border: "1px solid rgba(192,57,43,0.3)", color: "#C0392B", padding: "0.35rem 0.5rem", borderRadius: 4, fontSize: "0.73rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════
          TAB: ADS
      ════════════════════════════════════════ */}
      {activeTab === "ads" && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
            {[
              { label: "Total Ads",  value: ads.length,                          color: "#2B5FA8" },
              { label: "Active",     value: ads.filter(a => a.is_active).length, color: "#2E8B44" },
              { label: "Inactive",   value: ads.filter(a => !a.is_active).length,color: "#888"    },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ background: "white", borderRadius: 10, padding: "1.1rem 1.3rem", border: "1px solid rgba(26,92,42,0.08)", borderTop: `4px solid ${color}` }}>
                <p style={{ fontSize: "0.65rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)", marginBottom: "0.4rem" }}>{label}</p>
                <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.6rem", fontWeight: 700, color }}>{value}</p>
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "1rem" }}>
            {ads.map(ad => (
              <div key={ad.id} style={{ background: "white", borderRadius: 10, border: "1px solid rgba(26,92,42,0.08)", overflow: "hidden" }}>
                <div style={{ position: "relative", height: 140, background: "#F9F8F5" }}>
                  {ad.image_url ? (
                    <img src={ad.image_url} alt={ad.title || "Ad"} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Image size={28} color="rgba(0,0,0,0.1)" />
                    </div>
                  )}
                  <div style={{ position: "absolute", top: 8, right: 8, display: "flex", gap: 4 }}>
                    <span style={{ background: ad.is_active ? "rgba(46,139,68,0.9)" : "rgba(0,0,0,0.5)", color: "white", fontSize: "0.6rem", fontWeight: 700, padding: "2px 8px", borderRadius: 20 }}>
                      {ad.is_active ? "Active" : "Off"}
                    </span>
                  </div>
                </div>
                <div style={{ padding: "0.8rem 1rem" }}>
                  <p style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--green-dk)", marginBottom: 3 }}>{ad.title || "Untitled Ad"}</p>
                  <p style={{ fontSize: "0.7rem", color: "var(--muted)", marginBottom: "0.6rem" }}>
                    Position: <strong>{AD_POSITIONS.find(p => p.value === ad.position)?.label || ad.position}</strong>
                  </p>
                  {canCRUD && (
                    <div style={{ display: "flex", gap: "0.4rem" }}>
                      <button onClick={async () => { await supabase.from("ads").update({ is_active: !ad.is_active }).eq("id", ad.id); await loadAds(); }}
                        style={{ flex: 1, background: ad.is_active ? "rgba(212,160,23,0.1)" : "rgba(46,139,68,0.1)", border: `1px solid ${ad.is_active ? "#D4A017" : "#2E8B44"}`, color: ad.is_active ? "#D4A017" : "#2E8B44", padding: "0.35rem", borderRadius: 4, fontSize: "0.72rem", cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                        {ad.is_active ? "Deactivate" : "Activate"}
                      </button>
                      <button onClick={async () => { if (!confirm("Delete this ad?")) return; await supabase.from("ads").delete().eq("id", ad.id); await loadAds(); }}
                        style={{ background: "none", border: "1px solid rgba(192,57,43,0.3)", color: "#C0392B", padding: "0.35rem 0.6rem", borderRadius: 4, fontSize: "0.72rem", cursor: "pointer" }}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {ads.length === 0 && (
              <div style={{ gridColumn: "1/-1", padding: "3rem", textAlign: "center", background: "white", borderRadius: 10, border: "1px dashed rgba(26,92,42,0.15)" }}>
                <Megaphone size={32} color="rgba(26,92,42,0.12)" style={{ marginBottom: "0.8rem" }} />
                <p style={{ color: "var(--muted)", fontSize: "0.88rem" }}>No ads yet. Create your first ad placement.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════
          TAB: SETTINGS
      ════════════════════════════════════════ */}
      {activeTab === "settings" && (
        <div style={{ background: "white", borderRadius: 10, border: "1px solid rgba(26,92,42,0.08)", overflow: "hidden" }}>
          <div style={{ padding: "1.1rem 1.5rem", background: "var(--warm)", borderBottom: "1px solid rgba(26,92,42,0.08)" }}>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.1rem", fontWeight: 700, color: "var(--green-dk)" }}>Site Settings</h2>
            <p style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: 2 }}>Global configuration stored in site_settings table</p>
          </div>
          <div style={{ padding: "1.5rem" }}>
            {settings.length === 0 ? (
              <p style={{ color: "var(--muted)", fontSize: "0.88rem" }}>No settings configured yet.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {Object.entries(
                  settings.reduce((acc: any, s: any) => {
                    const g = s.group_name || "General";
                    if (!acc[g]) acc[g] = [];
                    acc[g].push(s);
                    return acc;
                  }, {})
                ).map(([group, items]: any) => (
                  <div key={group}>
                    <p style={{ fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)", marginBottom: "0.7rem" }}>{group}</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                      {items.map((s: any) => (
                        <div key={s.id} style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: "1rem", alignItems: "center", padding: "0.7rem 1rem", background: "var(--warm)", borderRadius: 8 }}>
                          <div>
                            <p style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--green-dk)" }}>{s.label || s.key}</p>
                            <p style={{ fontSize: "0.68rem", color: "var(--muted)", fontFamily: "monospace" }}>{s.key}</p>
                          </div>
                          <input
                            defaultValue={s.value || ""}
                            onBlur={async e => {
                              await supabase.from("site_settings").update({ value: e.target.value, updated_at: new Date().toISOString() }).eq("id", s.id);
                            }}
                            style={{ ...inputStyle, fontSize: "0.85rem" }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════
          AD FORM MODAL
      ════════════════════════════════════════ */}
      {showAdForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
          <div style={{ background: "white", borderRadius: 12, maxWidth: 480, width: "100%", overflow: "hidden", boxShadow: "0 24px 60px rgba(0,0,0,0.3)" }}>
            <div style={{ padding: "1.2rem 1.5rem", background: "var(--green-dk)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.1rem", color: "#C9A84C" }}>{editingAd ? "Edit Ad" : "New Ad"}</h3>
              <button onClick={() => setShowAdForm(false)} style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "white", width: 28, height: 28, borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><X size={13} /></button>
            </div>
            <div style={{ padding: "1.5rem" }}>
              {/* Ad image upload */}
              <div style={{ marginBottom: "1rem" }}>
                <label style={labelStyle}>Ad Image *</label>
                <div style={{ width: "100%", height: 160, background: "#F9F8F5", border: "2px dashed rgba(26,92,42,0.2)", borderRadius: 8, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "0.6rem", cursor: "pointer" }} onClick={() => adFileRef.current?.click()}>
                  {adPreview || adForm.image_url ? (
                    <img src={adPreview || adForm.image_url} alt="Preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <div style={{ textAlign: "center" }}>
                      <Upload size={24} color="rgba(26,92,42,0.2)" />
                      <p style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: 6 }}>Click to upload</p>
                    </div>
                  )}
                </div>
                <input ref={adFileRef} type="file" accept="image/*" onChange={handleAdUpload} style={{ display: "none" }} />
                {adUploading && <p style={{ fontSize: "0.75rem", color: "var(--muted)" }}>Uploading...</p>}
              </div>
              {[
                { key: "title", label: "Ad Title (optional)", placeholder: "e.g. Surigao Business Expo 2026" },
                { key: "link_url", label: "Link URL (optional)", placeholder: "https://..." },
              ].map(({ key, label, placeholder }) => (
                <div key={key} style={{ marginBottom: "1rem" }}>
                  <label style={labelStyle}>{label}</label>
                  <input type="text" value={(adForm as any)[key]} onChange={e => setAdForm(prev => ({ ...prev, [key]: e.target.value }))} placeholder={placeholder} style={inputStyle} />
                </div>
              ))}
              <div style={{ marginBottom: "1rem" }}>
                <label style={labelStyle}>Position</label>
                <select value={adForm.position} onChange={e => setAdForm(prev => ({ ...prev, position: e.target.value }))} style={inputStyle}>
                  {AD_POSITIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.8rem 1rem", background: "var(--warm)", borderRadius: 8, marginBottom: "1.2rem" }}>
                <p style={{ fontSize: "0.85rem", fontWeight: 500, color: "var(--green-dk)" }}>Active (visible on site)</p>
                <button onClick={() => setAdForm(prev => ({ ...prev, is_active: !prev.is_active }))} style={{ background: adForm.is_active ? "#2E8B44" : "rgba(26,92,42,0.1)", border: "none", color: adForm.is_active ? "white" : "var(--green-dk)", padding: "0.4rem 1rem", borderRadius: 6, fontSize: "0.8rem", fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                  {adForm.is_active ? "✓ Active" : "Inactive"}
                </button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.7rem" }}>
                <button onClick={() => setShowAdForm(false)} style={{ padding: "0.8rem", background: "white", border: "1.5px solid rgba(26,92,42,0.15)", color: "var(--muted)", borderRadius: 6, fontSize: "0.85rem", cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>Cancel</button>
                <button onClick={handleSaveAd} style={{ padding: "0.8rem", background: "var(--gold)", border: "none", color: "var(--green-dk)", borderRadius: 6, fontSize: "0.85rem", fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>Save Ad</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════
          POST EDITOR MODAL (full screen)
      ════════════════════════════════════════ */}
      {showEditor && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 400, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "1rem", overflowY: "auto" }}>
          <div style={{ background: "white", borderRadius: 14, maxWidth: 860, width: "100%", minHeight: "95vh", boxShadow: "0 32px 80px rgba(0,0,0,0.4)", marginBottom: "2rem" }}>

            {/* Editor Nav */}
            <div style={{ background: "var(--green-dk)", padding: "1.1rem 1.5rem", borderRadius: "14px 14px 0 0", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <FileText size={16} color="#C9A84C" />
                <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.1rem", color: "#C9A84C" }}>
                  {editing ? "Edit Post" : "New Post"}
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
                <button onClick={() => setShowEditor(false)} style={{ background: "rgba(255,255,255,0.08)", border: "none", color: "white", width: 30, height: 30, borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <X size={14} />
                </button>
              </div>
            </div>

            <div style={{ padding: "1.8rem 2rem" }}>

              {/* ── AI Generator Panel ── */}
              <div style={{ marginBottom: "1.5rem", border: "1.5px solid rgba(201,168,76,0.3)", borderRadius: 10, overflow: "hidden" }}>
                <button onClick={() => setShowAIPanel(v => !v)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.9rem 1.2rem", background: showAIPanel ? "rgba(201,168,76,0.12)" : "rgba(201,168,76,0.06)", border: "none", cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Sparkles size={16} color="#C9A84C" />
                    <span style={{ fontSize: "0.88rem", fontWeight: 600, color: "#0D3320" }}>Claude AI Content Generator</span>
                    <span style={{ fontSize: "0.68rem", background: "#C9A84C", color: "#0D3320", padding: "1px 8px", borderRadius: 20, fontWeight: 700 }}>AI</span>
                  </div>
                  {showAIPanel ? <ChevronUp size={16} color="#888" /> : <ChevronDown size={16} color="#888" />}
                </button>

                {showAIPanel && (
                  <div style={{ padding: "1.2rem 1.2rem", borderTop: "1px solid rgba(201,168,76,0.2)" }}>
                    <p style={{ fontSize: "0.8rem", color: "#666", marginBottom: "0.8rem", lineHeight: 1.6 }}>
                      Enter a title above first, then add optional context below. Claude will generate the full article body, excerpt, and all SEO fields automatically.
                    </p>
                    <div style={{ marginBottom: "0.8rem" }}>
                      <label style={labelStyle}>Additional Context / Description (optional)</label>
                      <textarea
                        value={aiPrompt}
                        onChange={e => setAiPrompt(e.target.value)}
                        placeholder="e.g. Focus on how SUNCO members in Surigao del Norte can benefit from this program. Include tips for senior citizens..."
                        rows={3}
                        style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }}
                      />
                    </div>
                    {aiError && (
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "0.7rem 1rem", background: "#FDECEA", borderRadius: 8, marginBottom: "0.8rem" }}>
                        <AlertCircle size={14} color="#A8200D" style={{ marginTop: 1 }} />
                        <p style={{ fontSize: "0.78rem", color: "#A8200D" }}>{aiError}</p>
                      </div>
                    )}
                    <button onClick={handleAIGenerate} disabled={aiLoading || !form.title.trim()}
                      style={{ display: "flex", alignItems: "center", gap: 8, background: aiLoading || !form.title.trim() ? "#CCC" : "var(--green-dk)", color: "white", border: "none", padding: "0.7rem 1.4rem", borderRadius: 8, fontSize: "0.85rem", fontWeight: 600, cursor: aiLoading || !form.title.trim() ? "not-allowed" : "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                      <Sparkles size={15} />
                      {aiLoading ? "Generating with Claude AI..." : "Generate Full Article + SEO"}
                    </button>
                    {!form.title.trim() && <p style={{ fontSize: "0.72rem", color: "#AAA", marginTop: "0.5rem" }}>⬆ Enter a title first to enable generation.</p>}
                  </div>
                )}
              </div>

              {/* ── Basic Fields ── */}
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
                <label style={labelStyle}>Thumbnail / Featured Image</label>
                <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: "1rem", alignItems: "center" }}>
                  <div style={{ width: 180, height: 110, background: "var(--warm)", border: "1.5px dashed rgba(26,92,42,0.2)", borderRadius: 8, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {thumbPrev ? (
                      <img src={thumbPrev} alt="Preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <div style={{ textAlign: "center" }}>
                        <Image size={26} color="rgba(26,92,42,0.15)" />
                        <p style={{ fontSize: "0.62rem", color: "var(--muted)", marginTop: 4 }}>No image</p>
                      </div>
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
                <label style={labelStyle}>Excerpt <span style={{ textTransform: "none", letterSpacing: 0, fontWeight: 400, color: "var(--muted)", fontSize: "0.68rem" }}>(auto-generated if empty)</span></label>
                <textarea value={form.excerpt} onChange={e => setForm(prev => ({ ...prev, excerpt: e.target.value }))} placeholder="Short summary shown in post cards and search results..." rows={2} style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }} />
                <p style={{ fontSize: "0.65rem", color: form.excerpt.length > 160 ? "#C0392B" : "var(--muted)", marginTop: 3 }}>{form.excerpt.length}/160 characters</p>
              </div>

              {/* Content */}
              <div style={{ marginBottom: "1.2rem" }}>
                <label style={labelStyle}>Full Article Content *</label>
                <textarea value={form.content} onChange={e => setForm(prev => ({ ...prev, content: e.target.value }))} placeholder="Write or paste the full article content here..." rows={16} style={{ ...inputStyle, resize: "vertical", lineHeight: 1.8, fontSize: "0.92rem" }} />
                <p style={{ fontSize: "0.65rem", color: "var(--muted)", marginTop: 3 }}>{form.content.split(/\s+/).filter(Boolean).length} words · ~{Math.max(1, Math.ceil(form.content.split(/\s+/).filter(Boolean).length / 200))} min read</p>
              </div>

              {/* Tags */}
              <div style={{ marginBottom: "1.2rem" }}>
                <label style={labelStyle}>Tags</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginBottom: "0.5rem" }}>
                  {form.tags.map(tag => (
                    <span key={tag} style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "rgba(26,92,42,0.08)", color: "var(--green-dk)", fontSize: "0.75rem", fontWeight: 500, padding: "3px 10px", borderRadius: 20 }}>
                      <Tag size={10} /> {tag}
                      <button onClick={() => removeTag(tag)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", marginLeft: 2 }}><X size={10} color="#C0392B" /></button>
                    </span>
                  ))}
                </div>
                <input
                  type="text"
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(tagInput); } }}
                  placeholder="Type a tag and press Enter..."
                  style={{ ...inputStyle, fontSize: "0.85rem" }}
                />
                <p style={{ fontSize: "0.65rem", color: "var(--muted)", marginTop: 3 }}>Press Enter or comma to add a tag</p>
              </div>

              {/* Options */}
              <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem", padding: "1rem", background: "var(--warm)", borderRadius: 8, flexWrap: "wrap" }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                  <input type="checkbox" checked={form.featured} onChange={e => setForm(prev => ({ ...prev, featured: e.target.checked }))} style={{ width: 16, height: 16, accentColor: "var(--gold)" }} />
                  <span style={{ fontSize: "0.85rem", fontWeight: 500, color: "var(--green-dk)", display: "flex", alignItems: "center", gap: 5 }}>
                    <Star size={13} color="#C9A84C" fill={form.featured ? "#C9A84C" : "none"} /> Featured post
                  </span>
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Clock size={13} color="var(--muted)" />
                  <label style={{ fontSize: "0.85rem", fontWeight: 500, color: "var(--green-dk)" }}>Reading time:</label>
                  <input type="number" min={1} max={60} value={form.reading_time} onChange={e => setForm(prev => ({ ...prev, reading_time: Number(e.target.value) }))} style={{ width: 60, padding: "0.3rem 0.5rem", border: "1.5px solid rgba(26,92,42,0.15)", borderRadius: 4, fontSize: "0.85rem", fontFamily: "'DM Sans',sans-serif", color: "var(--green-dk)", outline: "none" }} />
                  <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>min</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <label style={{ fontSize: "0.85rem", fontWeight: 500, color: "var(--green-dk)" }}>Status:</label>
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

                    {/* Google Preview */}
                    <div style={{ background: "white", border: "1px solid #E0E0E0", borderRadius: 8, padding: "1rem 1.2rem", marginBottom: "1.2rem" }}>
                      <p style={{ fontSize: "0.65rem", color: "#888", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "0.6rem" }}>Google Search Preview</p>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: "0.3rem" }}>
                        <div style={{ width: 18, height: 18, background: "#0D3320", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <span style={{ color: "#C9A84C", fontSize: "0.55rem", fontWeight: 700 }}>S</span>
                        </div>
                        <span style={{ fontSize: "0.72rem", color: "#202124" }}>sunco.org.ph</span>
                        <ChevronDown size={11} color="#202124" />
                      </div>
                      <p style={{ fontSize: "1rem", color: "#1558D6", fontFamily: "Arial, sans-serif", marginBottom: "0.2rem", lineHeight: 1.3, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as any }}>
                        {form.seo_title || form.title || "Post Title — SUNCO"}
                      </p>
                      <p style={{ fontSize: "0.8rem", color: "#4D5156", lineHeight: 1.5, fontFamily: "Arial, sans-serif", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as any }}>
                        {form.seo_description || form.excerpt || "Post description will appear here in search results..."}
                      </p>
                    </div>

                    <div style={{ marginBottom: "1rem" }}>
                      <label style={labelStyle}>SEO Title <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>({(form.seo_title || "").length}/60)</span></label>
                      <input type="text" value={form.seo_title} onChange={e => setForm(prev => ({ ...prev, seo_title: e.target.value }))} placeholder="e.g. SUNCO Consumer Rights Guide 2026 | Surigao del Norte" style={{ ...inputStyle, borderColor: form.seo_title.length > 60 ? "#C0392B" : "rgba(26,92,42,0.15)" }} />
                    </div>

                    <div style={{ marginBottom: "1rem" }}>
                      <label style={labelStyle}>SEO Description <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>({(form.seo_description || "").length}/160)</span></label>
                      <textarea value={form.seo_description} onChange={e => setForm(prev => ({ ...prev, seo_description: e.target.value }))} placeholder="150–160 chars: what this page is about, includes keyword + call to action" rows={3} style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6, borderColor: form.seo_description.length > 160 ? "#C0392B" : "rgba(26,92,42,0.15)" }} />
                    </div>

                    <div style={{ marginBottom: "0.5rem" }}>
                      <label style={labelStyle}>SEO Keywords</label>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginBottom: "0.5rem" }}>
                        {form.seo_keywords.map(kw => (
                          <span key={kw} style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "rgba(43,95,168,0.08)", color: "#2B5FA8", fontSize: "0.75rem", fontWeight: 500, padding: "3px 10px", borderRadius: 20 }}>
                            {kw}
                            <button onClick={() => removeKeyword(kw)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center" }}><X size={10} color="#C0392B" /></button>
                          </span>
                        ))}
                      </div>
                      <input
                        type="text"
                        placeholder="Type keyword and press Enter..."
                        onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addKeyword((e.target as HTMLInputElement).value); (e.target as HTMLInputElement).value = ""; } }}
                        style={{ ...inputStyle, fontSize: "0.85rem" }}
                      />
                      <p style={{ fontSize: "0.65rem", color: "var(--muted)", marginTop: 3 }}>Target: 5–8 keywords. Focus on Filipino consumer terms.</p>
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
                <button onClick={() => setShowEditor(false)} style={{ padding: "0.85rem", background: "white", border: "1.5px solid rgba(26,92,42,0.15)", color: "var(--muted)", borderRadius: 6, fontSize: "0.85rem", cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>Cancel</button>
                <button onClick={() => handleSave(false)} disabled={saving} style={{ padding: "0.85rem", background: "rgba(26,92,42,0.08)", border: "1.5px solid rgba(26,92,42,0.2)", color: "var(--green-dk)", borderRadius: 6, fontSize: "0.85rem", fontWeight: 500, cursor: saving ? "not-allowed" : "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                  {saving ? "Saving..." : "Save as Draft"}
                </button>
                <button onClick={() => handleSave(true)} disabled={saving} style={{ padding: "0.85rem", background: saving ? "var(--gold-dk)" : "var(--gold)", border: "none", color: "var(--green-dk)", borderRadius: 6, fontSize: "0.85rem", fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", letterSpacing: "0.04em", fontFamily: "'DM Sans',sans-serif" }}>
                  {saving ? "Publishing..." : "Publish Now →"}
                </button>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
