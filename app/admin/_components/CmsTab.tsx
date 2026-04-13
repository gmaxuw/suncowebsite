"use client";
// ─────────────────────────────────────────────
// CmsTab.tsx
// Handles: write, edit, publish/unpublish articles
//          news, announcements to public site
// Accessible by: admin, president, treasurer, secretary
// ─────────────────────────────────────────────
import { useEffect, useState } from "react";
import { FileText, PlusCircle, Eye, EyeOff, Trash2 } from "lucide-react";

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
  const [form, setForm] = useState({
    title: "",
    body: "",
    category: "news",
    published: false,
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
    setForm({ title: "", body: "", category: "news", published: false });
    setShowForm(true);
  };

  const openEdit = (article: any) => {
    setEditing(article);
    setForm({ title: article.title, body: article.body, category: article.category, published: article.published });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.title || !form.body) { alert("Title and body are required."); return; }
    setSaving(true);

    if (editing) {
      await supabase.from("articles").update({
        ...form,
        updated_at: new Date().toISOString(),
      }).eq("id", editing.id);
    } else {
      await supabase.from("articles").insert({
        ...form,
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
    news: "#2B5FA8", "consumer-rights": "#2E8B44",
    announcements: "#D4A017", mas: "#9A2020", programs: "#6B3FA0",
  };

  const inputStyle = {
    width: "100%", padding: "0.7rem 1rem",
    border: "1.5px solid rgba(26,92,42,0.15)",
    borderRadius: 6, fontSize: "0.88rem",
    fontFamily: "'DM Sans', sans-serif",
    color: "var(--text)", background: "white", outline: "none",
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
      <div style={{ background: "white", borderRadius: 10, border: "1px solid rgba(26,92,42,0.08)", overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "var(--muted)" }}>Loading articles...</div>
        ) : articles.length === 0 ? (
          <div style={{ padding: "3rem", textAlign: "center" }}>
            <FileText size={36} color="rgba(26,92,42,0.15)" style={{ marginBottom: "0.8rem" }} />
            <p style={{ color: "var(--muted)", fontSize: "0.88rem", marginBottom: "0.5rem" }}>No articles yet.</p>
            {canCRUD && <button onClick={openNew} style={{ background: "var(--gold)", color: "var(--green-dk)", border: "none", padding: "0.6rem 1.2rem", borderRadius: 4, fontSize: "0.8rem", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Write your first article</button>}
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--warm)" }}>
                {["Title", "Category", "Status", "Date", "Actions"].map(h => (
                  <th key={h} style={{ padding: "0.8rem 1rem", textAlign: "left", fontSize: "0.68rem", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {articles.map((a, i) => (
                <tr key={a.id} style={{ borderBottom: "1px solid rgba(26,92,42,0.06)", background: i % 2 === 0 ? "white" : "var(--cream)" }}>
                  <td style={{ padding: "0.9rem 1rem", fontSize: "0.88rem", fontWeight: 500, color: "var(--green-dk)", maxWidth: 300 }}>
                    <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.title}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {a.body?.substring(0, 80)}...
                    </div>
                  </td>
                  <td style={{ padding: "0.9rem 1rem" }}>
                    <span style={{ background: `${categoryColor[a.category]}22`, color: categoryColor[a.category], fontSize: "0.7rem", fontWeight: 500, padding: "3px 10px", borderRadius: 20, textTransform: "capitalize" }}>
                      {a.category?.replace("-", " ")}
                    </span>
                  </td>
                  <td style={{ padding: "0.9rem 1rem" }}>
                    <span style={{ background: a.published ? "rgba(46,139,68,0.1)" : "rgba(212,160,23,0.1)", color: a.published ? "#2E8B44" : "#D4A017", fontSize: "0.7rem", fontWeight: 500, padding: "3px 10px", borderRadius: 20 }}>
                      {a.published ? "Published" : "Draft"}
                    </span>
                  </td>
                  <td style={{ padding: "0.9rem 1rem", fontSize: "0.8rem", color: "var(--muted)", whiteSpace: "nowrap" }}>
                    {new Date(a.created_at).toLocaleDateString("en-PH")}
                  </td>
                  <td style={{ padding: "0.9rem 1rem" }}>
                    {canCRUD && (
                      <div style={{ display: "flex", gap: "0.4rem" }}>
                        <button onClick={() => openEdit(a)}
                          style={{ background: "none", border: "1px solid rgba(26,92,42,0.2)", color: "var(--green-dk)", padding: "0.3rem 0.7rem", borderRadius: 4, fontSize: "0.72rem", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                          Edit
                        </button>
                        <button onClick={() => togglePublish(a)}
                          style={{ background: "none", border: `1px solid ${a.published ? "#D4A017" : "#2E8B44"}`, color: a.published ? "#D4A017" : "#2E8B44", padding: "0.3rem 0.7rem", borderRadius: 4, fontSize: "0.72rem", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", display: "flex", alignItems: "center", gap: 3 }}>
                          {a.published ? <><EyeOff size={11} /> Unpublish</> : <><Eye size={11} /> Publish</>}
                        </button>
                        <button onClick={() => handleDelete(a.id)}
                          style={{ background: "none", border: "1px solid rgba(192,57,43,0.3)", color: "#C0392B", padding: "0.3rem 0.5rem", borderRadius: 4, fontSize: "0.72rem", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Article Editor Modal ── */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
          <div style={{ background: "white", borderRadius: 12, padding: "2rem", maxWidth: 680, width: "100%", maxHeight: "90vh", overflowY: "auto" }}>

            {/* Editor Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.2rem", fontWeight: 700, color: "var(--green-dk)" }}>
                {editing ? "Edit Article" : "New Article"}
              </h2>
              <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", fontSize: "1.5rem", cursor: "pointer", color: "var(--muted)" }}>✕</button>
            </div>

            {/* Title */}
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)", marginBottom: "0.4rem" }}>Title *</label>
              <input type="text" value={form.title} onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Article title..." style={inputStyle} />
            </div>

            {/* Category */}
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)", marginBottom: "0.4rem" }}>Category *</label>
              <select value={form.category} onChange={e => setForm(prev => ({ ...prev, category: e.target.value }))} style={inputStyle}>
                <option value="news">News</option>
                <option value="consumer-rights">Consumer Rights</option>
                <option value="announcements">Announcements</option>
                <option value="mas">MAS Program</option>
                <option value="programs">Programs</option>
              </select>
            </div>

            {/* Body */}
            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)", marginBottom: "0.4rem" }}>Content *</label>
              <textarea value={form.body} onChange={e => setForm(prev => ({ ...prev, body: e.target.value }))}
                placeholder="Write your article content here..."
                rows={12}
                style={{ ...inputStyle, resize: "vertical", lineHeight: 1.7 }} />
            </div>

            {/* Publish toggle */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem", padding: "1rem", background: "var(--warm)", borderRadius: 8 }}>
              <div>
                <p style={{ fontSize: "0.85rem", fontWeight: 500, color: "var(--green-dk)" }}>
                  {form.published ? "Published — visible on the public site" : "Draft — not visible to the public yet"}
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