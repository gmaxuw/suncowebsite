"use client";
// ─────────────────────────────────────────────
// cms/PostsList.tsx
// Displays the posts table with stats, search,
// filter tabs, and row actions.
// ─────────────────────────────────────────────
import { useEffect, useState } from "react";
import { FileText, Search, X, Eye, EyeOff, Trash2, BarChart2, Star, Image } from "lucide-react";
import { CATEGORIES } from "../CmsTab";

interface Props {
  canCRUD:  boolean;
  supabase: any;
  onEdit:   (post: any) => void;
  onNew:    () => void;
}

type PostStatus = "all" | "published" | "draft" | "archived";

export default function PostsList({ canCRUD, supabase, onEdit, onNew }: Props) {
  const [posts,   setPosts]   = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState<PostStatus>("all");
  const [searchQ, setSearchQ] = useState("");

  const loadPosts = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("posts")
      .select("id,title,slug,excerpt,content,thumbnail_url,category,tags,status,featured,author_name,views,created_at,published_at,seo_title,seo_description,seo_keywords,reading_time")
      .order("created_at", { ascending: false });
    setPosts(data || []);
    setLoading(false);
  };

  useEffect(() => { loadPosts(); }, []);

  const filtered = posts.filter(p => {
    const matchStatus = filter === "all" || p.status === filter;
    const matchSearch = !searchQ || p.title.toLowerCase().includes(searchQ.toLowerCase());
    return matchStatus && matchSearch;
  });

  const getCatColor = (cat: string) => CATEGORIES.find(c => c.value === cat)?.color || "#888";

  const toggleStatus = async (post: any) => {
    const newStatus = post.status === "published" ? "draft" : "published";
    await supabase.from("posts").update({
      status: newStatus,
      ...(newStatus === "published" ? { published_at: new Date().toISOString() } : {}),
    }).eq("id", post.id);
    await loadPosts();
  };

  const deletePost = async (id: string) => {
    if (!confirm("Delete this post permanently?")) return;
    await supabase.from("posts").delete().eq("id", id);
    await loadPosts();
  };

  return (
    <div>
      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
        {[
          { label: "Total Posts", value: posts.length,                                     color: "var(--gold)"  },
          { label: "Published",   value: posts.filter(p => p.status === "published").length, color: "#2E8B44"    },
          { label: "Drafts",      value: posts.filter(p => p.status === "draft").length,     color: "#D4A017"    },
          { label: "Featured",    value: posts.filter(p => p.featured).length,               color: "#9A2020"    },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: "white", borderRadius: 10, padding: "1.1rem 1.3rem", border: "1px solid rgba(26,92,42,0.08)", borderTop: `4px solid ${color}` }}>
            <p style={{ fontSize: "0.65rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)", marginBottom: "0.4rem" }}>{label}</p>
            <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.6rem", fontWeight: 700, color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Search + filter */}
      <div style={{ display: "flex", gap: "0.8rem", marginBottom: "1.2rem", flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "white", border: "1.5px solid rgba(26,92,42,0.15)", borderRadius: 6, padding: "0 1rem", flex: 1, minWidth: 200 }}>
          <Search size={14} color="var(--muted)" />
          <input type="text" placeholder="Search posts..." value={searchQ} onChange={e => setSearchQ(e.target.value)}
            style={{ border: "none", outline: "none", fontSize: "0.88rem", fontFamily: "'DM Sans',sans-serif", color: "var(--text)", padding: "0.65rem 0", width: "100%", background: "transparent" }} />
          {searchQ && <button onClick={() => setSearchQ("")} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}><X size={13} color="var(--muted)" /></button>}
        </div>
        <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
          {(["all","published","draft","archived"] as PostStatus[]).map(s => (
            <button key={s} onClick={() => setFilter(s)}
              style={{ padding: "0.45rem 0.9rem", borderRadius: 20, border: "1.5px solid", borderColor: filter === s ? "var(--gold)" : "rgba(26,92,42,0.15)", background: filter === s ? "var(--gold)" : "white", color: filter === s ? "var(--green-dk)" : "var(--muted)", fontSize: "0.73rem", fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", textTransform: "capitalize" }}>
              {s} ({s === "all" ? posts.length : posts.filter(p => p.status === s).length})
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
            {canCRUD && <button onClick={onNew} style={{ background: "var(--gold)", color: "var(--green-dk)", border: "none", padding: "0.6rem 1.3rem", borderRadius: 6, fontSize: "0.8rem", fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>Create your first post</button>}
          </div>
        ) : filtered.map(post => (
          <div key={post.id} style={{ background: "white", borderRadius: 10, border: "1px solid rgba(26,92,42,0.08)", overflow: "hidden", display: "grid", gridTemplateColumns: "130px 1fr auto", alignItems: "center" }}>

            {/* Thumbnail */}
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
              <p style={{ fontSize: "0.75rem", color: "var(--muted)", fontFamily: "monospace" }}>/{post.slug}</p>
            </div>

            {/* Actions */}
            {canCRUD && (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", padding: "0 1rem", flexShrink: 0 }}>
                <button onClick={() => onEdit(post)} style={{ background: "none", border: "1px solid rgba(26,92,42,0.2)", color: "var(--green-dk)", padding: "0.35rem 0.8rem", borderRadius: 4, fontSize: "0.73rem", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", whiteSpace: "nowrap" }}>Edit</button>
                <button onClick={() => toggleStatus(post)} style={{ background: "none", border: `1px solid ${post.status === "published" ? "#D4A017" : "#2E8B44"}`, color: post.status === "published" ? "#D4A017" : "#2E8B44", padding: "0.35rem 0.5rem", borderRadius: 4, fontSize: "0.73rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {post.status === "published" ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
                <button onClick={() => deletePost(post.id)} style={{ background: "none", border: "1px solid rgba(192,57,43,0.3)", color: "#C0392B", padding: "0.35rem 0.5rem", borderRadius: 4, fontSize: "0.73rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Trash2 size={13} />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
