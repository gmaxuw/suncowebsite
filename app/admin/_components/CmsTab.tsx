"use client";
// ─────────────────────────────────────────────
// CmsTab.tsx
// Handles: write, edit, publish/unpublish articles
//          thumbnail upload with WebP compression
//          excerpt for preview cards
// Accessible by: admin, president, treasurer, secretary
// ─────────────────────────────────────────────
import { useEffect, useState } from "react";
import { FileText, PlusCircle, Eye, EyeOff, Trash2, Upload, Image } from "lucide-react";

interface Props {
  canCRUD: boolean;
  supabase: any;
  userId: string;
}

export default function CmsTab({ canCRUD, supabase, userId }: Props) {
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    excerpt: "",
    body: "",
    category: "news",
    published: false,
    thumbnail_url: "",
  });

  const loadArticles = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("articles")
      .select("*")
      .order("created_at", { ascending: false });
    setArticles(data || []);
    setLoading(false);
  };

  useEffect(() => { loadArticles(); }, []);

  const openNew = () => {
    setEditing(null);
    setForm({ title: "", excerpt: "", body: "", category: "news", published: false, thumbnail_url: "" });
    setThumbnailPreview(null);
    setShowForm(true);
  };

  const openEdit = (article: any) => {
    setEditing(article);
    setForm({
      title: article.title,
      excerpt: article.excerpt || "",
      body: article.body,
      category: article.category,
      published: article.published,
      thumbnail_url: article.thumbnail_url || "",
    });
    setThumbnailPreview(article.thumbnail_url || null);
    setShowForm(true);
  };

  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);

    // Preview immediately
    const reader = new FileReader();
    reader.onload = ev => setThumbnailPreview(ev.target?.result as string);
    reader.readAsDataURL(file);

    try {
      const imageCompression = (await import("browser-image-compression")).default;
      const compressed = await imageCompression(file, {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 1200,
        fileType: "image/webp",
        useWebWorker: true,
      });

      const filename = `thumbnail-${Date.now()}.webp`;
      const { error } = await supabase.storage
        .from("articles")
        .upload(`thumbnails/${filename}`, compressed, {
          contentType: "image/webp",
          upsert: true,
        });

      if (!error) {
        const { data: urlData } = supabase.storage
          .from("articles")
          .getPublicUrl(`thumbnails/${filename}`);
        setForm(prev => ({ ...prev, thumbnail_url: urlData.publicUrl }));
      } else {
        alert("Upload failed: " + error.message);
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    }
    setUploading(false);
  };

  const handleSave = async () => {
    if (!form.title || !form.body) { alert("Title and content are required."); return; }
    setSaving(true);

    // Auto-generate excerpt if empty
    const excerpt = form.excerpt.trim() ||
      form.body.replace(/\n/g, " ").substring(0, 160) + "...";

    if (editing) {
      await supabase.from("articles").update({
        title: form.title,
        excerpt,
        body: form.body,
        category: form.category,
        published: form.published,
        thumbnail_url: form.thumbnail_url || null,
        updated_at: new Date().toISOString(),
      }).eq("id", editing.id);
    } else {
      await supabase.from("articles").insert({
        title: form.title,
        excerpt,
        body: form.body,
        category: form.category,
        published: form.published,
        thumbnail_url: form.thumbnail_url || null,
        author_id: userId,
      });
    }

    await loadArticles();
    setShowForm(false);
    setSaving(false);
  };

  const togglePublish = async (article: any) => {
    await supabase.from("articles")
      .update({ published: !article.published })
      .eq("id", article.id);
    await loadArticles();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this article? This cannot be undone.")) return;
    await supabase.from("articles").delete().eq("id", id);
    await loadArticles();
  };

  const categoryColor: any = {
    news: "#2B5FA8",
    "consumer-rights": "#2E8B44",
    announcements: "#D4A017",
    mas: "#9A2020",
    programs: "#6B3FA0",
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "0.7rem 1rem",
    border: "1.5px solid rgba(26,92,42,0.15)",
    borderRadius: 6, fontSize: "0.88rem",
    fontFamily: "'DM Sans', sans-serif",
    color: "var(--text)", background: "white", outline: "none",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "0.72rem", fontWeight: 500,
    letterSpacing: "0.08em", textTransform: "uppercase",
    color: "var(--muted)", marginBottom: "0.4rem",
  };

  return (
    <div>
      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div>
          <p style={{ fontSize: "0.72rem", color: "var(--muted)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.3rem" }}>Admin Panel</p>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.8rem", fontWeight: 700, color: "var(--green-dk)" }}>Content Management</h1>
        </div>
        {canCRUD && (
          <button onClick={openNew}
            style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--gold)", color: "var(--green-dk)", border: "none", padding: "0.7rem 1.4rem", borderRadius: 6, fontSize: "0.82rem", fontWeight: 500, cursor: "pointer", letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: "'DM Sans', sans-serif" }}>
            <PlusCircle size={15} /> New Article
          </button>
        )}
      </div>

      {/* ── Stats ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "1rem", marginBottom: "2rem" }}>
        {[
          { label: "Total Articles", value: articles.length, color: "var(--gold)" },
          { label: "Published", value: articles.filter(a => a.published).length, color: "#2E8B44" },
          { label: "Drafts", value: articles.filter(a => !a.published).length, color: "#D4A017" },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: "white", borderRadius: 10, padding: "1.2rem", border: "1px solid rgba(26,92,42,0.08)", borderTop: `4px solid ${color}` }}>
            <p style={{ fontSize: "0.68rem", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)", marginBottom: "0.4rem" }}>{label}</p>
            <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.6rem", fontWeight: 700, color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* ── Articles List ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
        {loading ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "var(--muted)", background: "white", borderRadius: 10 }}>Loading articles...</div>
        ) : articles.length === 0 ? (
          <div style={{ padding: "3rem", textAlign: "center", background: "white", borderRadius: 10, border: "1px solid rgba(26,92,42,0.08)" }}>
            <FileText size={36} color="rgba(26,92,42,0.15)" style={{ marginBottom: "0.8rem" }} />
            <p style={{ color: "var(--muted)", fontSize: "0.88rem", marginBottom: "0.5rem" }}>No articles yet.</p>
            {canCRUD && <button onClick={openNew} style={{ background: "var(--gold)", color: "var(--green-dk)", border: "none", padding: "0.6rem 1.2rem", borderRadius: 4, fontSize: "0.8rem", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Write your first article</button>}
          </div>
        ) : articles.map((a, i) => (
          <div key={a.id} style={{ background: "white", borderRadius: 10, border: "1px solid rgba(26,92,42,0.08)", overflow: "hidden", display: "grid", gridTemplateColumns: "120px 1fr auto", alignItems: "center" }}>

            {/* Thumbnail */}
            <div style={{ width: 120, height: 80, background: "var(--green-dk)", flexShrink: 0, position: "relative", overflow: "hidden" }}>
              {a.thumbnail_url ? (
                <img src={a.thumbnail_url} alt={a.title} loading="lazy"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Image size={20} color="rgba(212,160,23,0.3)" />
                </div>
              )}
            </div>

            {/* Info */}
            <div style={{ padding: "0.8rem 1.2rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "0.3rem" }}>
                <span style={{ background: `${categoryColor[a.category]}22`, color: categoryColor[a.category], fontSize: "0.65rem", fontWeight: 500, padding: "2px 8px", borderRadius: 20, textTransform: "capitalize" }}>
                  {a.category?.replace("-", " ")}
                </span>
                <span style={{ background: a.published ? "rgba(46,139,68,0.1)" : "rgba(212,160,23,0.1)", color: a.published ? "#2E8B44" : "#D4A017", fontSize: "0.65rem", fontWeight: 500, padding: "2px 8px", borderRadius: 20 }}>
                  {a.published ? "Published" : "Draft"}
                </span>
                <span style={{ fontSize: "0.7rem", color: "var(--muted)" }}>
                  {new Date(a.created_at).toLocaleDateString("en-PH")}
                </span>
              </div>
              <h3 style={{ fontSize: "0.92rem", fontWeight: 600, color: "var(--green-dk)", marginBottom: "0.2rem", lineHeight: 1.3 }}>{a.title}</h3>
              <p style={{ fontSize: "0.78rem", color: "var(--muted)", lineHeight: 1.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 500 }}>
                {a.excerpt || a.body?.substring(0, 120)}
              </p>
            </div>

            {/* Actions */}
            {canCRUD && (
              <div style={{ display: "flex", gap: "0.4rem", padding: "0 1rem", flexShrink: 0 }}>
                <button onClick={() => openEdit(a)}
                  style={{ background: "none", border: "1px solid rgba(26,92,42,0.2)", color: "var(--green-dk)", padding: "0.4rem 0.8rem", borderRadius: 4, fontSize: "0.75rem", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                  Edit
                </button>
                <button onClick={() => togglePublish(a)}
                  style={{ background: "none", border: `1px solid ${a.published ? "#D4A017" : "#2E8B44"}`, color: a.published ? "#D4A017" : "#2E8B44", padding: "0.4rem 0.5rem", borderRadius: 4, fontSize: "0.72rem", cursor: "pointer", display: "flex", alignItems: "center" }}>
                  {a.published ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
                <button onClick={() => handleDelete(a.id)}
                  style={{ background: "none", border: "1px solid rgba(192,57,43,0.3)", color: "#C0392B", padding: "0.4rem 0.5rem", borderRadius: 4, fontSize: "0.72rem", cursor: "pointer" }}>
                  <Trash2 size={13} />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── Article Editor Modal ── */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
          <div style={{ background: "white", borderRadius: 12, padding: "2rem", maxWidth: 720, width: "100%", maxHeight: "92vh", overflowY: "auto" }}>

            {/* Editor Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.2rem", fontWeight: 700, color: "var(--green-dk)" }}>
                {editing ? "Edit Article" : "New Article"}
              </h2>
              <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", fontSize: "1.5rem", cursor: "pointer", color: "var(--muted)" }}>✕</button>
            </div>

            {/* Thumbnail Upload */}
            <div style={{ marginBottom: "1.2rem" }}>
              <label style={labelStyle}>Thumbnail Image</label>
              <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: "1rem", alignItems: "center" }}>
                <div style={{ width: 160, height: 100, background: "var(--warm)", border: "1.5px dashed rgba(26,92,42,0.2)", borderRadius: 8, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {thumbnailPreview ? (
                    <img src={thumbnailPreview} alt="Preview" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <div style={{ textAlign: "center" }}>
                      <Image size={24} color="rgba(26,92,42,0.2)" />
                      <p style={{ fontSize: "0.65rem", color: "var(--muted)", marginTop: 4 }}>No image</p>
                    </div>
                  )}
                </div>
                <div>
                  <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleThumbnailUpload}
                    style={{ display: "none" }} id="article-thumbnail" />
                  <label htmlFor="article-thumbnail"
                    style={{ display: "inline-flex", alignItems: "center", gap: 6, background: uploading ? "var(--warm)" : "var(--warm)", border: "1.5px solid rgba(26,92,42,0.2)", color: "var(--green-dk)", padding: "0.6rem 1rem", borderRadius: 6, fontSize: "0.8rem", fontWeight: 500, cursor: uploading ? "not-allowed" : "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                    <Upload size={14} /> {uploading ? "Uploading..." : thumbnailPreview ? "Change Image" : "Upload Thumbnail"}
                  </label>
                  <p style={{ fontSize: "0.68rem", color: "var(--muted)", marginTop: "0.4rem", lineHeight: 1.5 }}>
                    PNG or JPG. Auto-compressed to WebP.<br />Recommended: 1200×630px (landscape).
                  </p>
                  {thumbnailPreview && (
                    <button onClick={() => { setThumbnailPreview(null); setForm(p => ({ ...p, thumbnail_url: "" })); }}
                      style={{ marginTop: "0.4rem", background: "none", border: "none", color: "#C0392B", fontSize: "0.75rem", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", padding: 0 }}>
                      Remove image
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Title */}
            <div style={{ marginBottom: "1rem" }}>
              <label style={labelStyle}>Title *</label>
              <input type="text" value={form.title} onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Article title..." style={inputStyle} />
            </div>

            {/* Category */}
            <div style={{ marginBottom: "1rem" }}>
              <label style={labelStyle}>Category *</label>
              <select value={form.category} onChange={e => setForm(prev => ({ ...prev, category: e.target.value }))} style={inputStyle}>
                <option value="news">News</option>
                <option value="consumer-rights">Consumer Rights</option>
                <option value="announcements">Announcements</option>
                <option value="mas">MAS Program</option>
                <option value="programs">Programs</option>
              </select>
            </div>

            {/* Excerpt */}
            <div style={{ marginBottom: "1rem" }}>
              <label style={labelStyle}>Excerpt / Preview Text <span style={{ fontSize: "0.65rem", textTransform: "none", letterSpacing: 0, fontWeight: 400, color: "var(--muted)" }}>(optional — auto-generated if empty)</span></label>
              <textarea value={form.excerpt} onChange={e => setForm(prev => ({ ...prev, excerpt: e.target.value }))}
                placeholder="Short description shown in news cards on the homepage..."
                rows={2}
                style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }} />
            </div>

            {/* Body */}
            <div style={{ marginBottom: "1.5rem" }}>
              <label style={labelStyle}>Full Article Content *</label>
              <textarea value={form.body} onChange={e => setForm(prev => ({ ...prev, body: e.target.value }))}
                placeholder="Write the full article content here..."
                rows={14}
                style={{ ...inputStyle, resize: "vertical", lineHeight: 1.7 }} />
            </div>

            {/* Publish toggle */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem", padding: "1rem", background: "var(--warm)", borderRadius: 8 }}>
              <div>
                <p style={{ fontSize: "0.85rem", fontWeight: 500, color: "var(--green-dk)" }}>
                  {form.published ? "Published — visible on the public website" : "Draft — not visible to the public yet"}
                </p>
                <p style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: 2 }}>Toggle to change visibility</p>
              </div>
              <button onClick={() => setForm(prev => ({ ...prev, published: !prev.published }))}
                style={{ background: form.published ? "var(--green-lt)" : "rgba(26,92,42,0.1)", border: "none", color: form.published ? "white" : "var(--green-dk)", padding: "0.5rem 1.2rem", borderRadius: 6, fontSize: "0.8rem", fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                {form.published ? "✓ Published" : "Set as Draft"}
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.8rem" }}>
              <button onClick={() => setShowForm(false)}
                style={{ padding: "0.85rem", background: "white", border: "1.5px solid rgba(26,92,42,0.15)", color: "var(--muted)", borderRadius: 6, fontSize: "0.85rem", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving}
                style={{ padding: "0.85rem", background: saving ? "var(--gold-dk)" : "var(--gold)", border: "none", color: "var(--green-dk)", borderRadius: 6, fontSize: "0.85rem", fontWeight: 500, cursor: saving ? "not-allowed" : "pointer", letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: "'DM Sans', sans-serif" }}>
                {saving ? "Saving..." : editing ? "Update Article" : "Save Article"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}