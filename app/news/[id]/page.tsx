// ─────────────────────────────────────────────
// app/news/[id]/page.tsx
// Full article page — server rendered for SEO
// Google can index the full article content
// ─────────────────────────────────────────────
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: article } = await supabase
    .from("articles")
    .select("title, excerpt, thumbnail_url")
    .eq("id", id)
    .single();

  if (!article) return { title: "Article Not Found | SUNCO" };

  return {
    title: `${article.title} | SUNCO`,
    description: article.excerpt || "",
    openGraph: {
      title: article.title,
      description: article.excerpt || "",
      images: article.thumbnail_url ? [{ url: article.thumbnail_url }] : [],
    },
  };
}

export default async function ArticlePage({ params }: Props) {
  const { id } = await params;
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: article } = await supabase
    .from("articles")
    .select("*")
    .eq("id", id)
    .eq("published", true)
    .single();

  if (!article) notFound();

  const { data: related } = await supabase
    .from("articles")
    .select("id, title, excerpt, thumbnail_url, category, created_at")
    .eq("published", true)
    .eq("category", article.category)
    .neq("id", id)
    .limit(3);

  const categoryColor: Record<string, string> = {
    news: "#2B5FA8",
    "consumer-rights": "#2E8B44",
    announcements: "#D4A017",
    mas: "#9A2020",
    programs: "#6B3FA0",
  };

  return (
    <main style={{ minHeight: "100vh", background: "var(--cream)" }}>

      {/* ── NAV ── */}
      <nav style={{ background: "var(--green-dk)", borderBottom: "3px solid var(--gold)", padding: "0 2.5rem", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 }}>
        <a href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <img src="/images/sunco-logo.png" alt="SUNCO" width={36} height={36}
            style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "contain" }} />
          <span style={{ fontFamily: "'Playfair Display', serif", fontSize: "1rem", fontWeight: 700, color: "var(--gold-lt)" }}>SUNCO</span>
        </a>
        <div style={{ display: "flex", alignItems: "center", gap: "0.2rem" }}>
          {["/#about","/#programs","/#membership","/#officers","/#news"].map((href, i) => (
            <a key={i} href={href} style={{ color: "rgba(255,255,255,0.75)", textDecoration: "none", fontSize: "0.78rem", fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", padding: "0 0.9rem", height: "64px", display: "flex", alignItems: "center" }}>
              {["About","Programs","Membership","Officers","News"][i]}
            </a>
          ))}
          <a href="/login" style={{ color: "rgba(255,255,255,0.75)", textDecoration: "none", fontSize: "0.78rem", fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", padding: "0 0.9rem", height: "64px", display: "flex", alignItems: "center" }}>Login</a>
        </div>
      </nav>

      {/* ── Breadcrumb ── */}
      <div style={{ background: "var(--warm)", borderBottom: "1px solid rgba(212,160,23,0.15)", padding: "0.7rem 2.5rem" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", alignItems: "center", gap: 6, fontSize: "0.78rem", color: "var(--muted)" }}>
          <a href="/" style={{ color: "var(--gold-dk)", textDecoration: "none" }}>Home</a>
          <ChevronRight size={12} />
          <a href="/#news" style={{ color: "var(--gold-dk)", textDecoration: "none" }}>News</a>
          <ChevronRight size={12} />
          <span style={{ color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 300 }}>{article.title}</span>
        </div>
      </div>

      {/* ── Article ── */}
      <article style={{ maxWidth: 900, margin: "0 auto", padding: "3rem 2.5rem" }}>

        {/* Category + Date */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "1.5rem" }}>
          <span style={{ background: `${categoryColor[article.category] || "#2B5FA8"}22`, color: categoryColor[article.category] || "#2B5FA8", fontSize: "0.75rem", fontWeight: 500, padding: "4px 12px", borderRadius: 20, textTransform: "capitalize" }}>
            {article.category?.replace("-", " ")}
          </span>
          <span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>
            {new Date(article.created_at).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}
          </span>
        </div>

        {/* Title */}
        <h1 className="playfair" style={{ fontSize: "clamp(1.8rem, 4vw, 2.8rem)", fontWeight: 700, color: "var(--green-dk)", lineHeight: 1.2, marginBottom: "1.2rem" }}>
          {article.title}
        </h1>

        {/* Excerpt */}
        {article.excerpt && (
          <p className="sourceserif" style={{ fontSize: "1.1rem", fontWeight: 300, fontStyle: "italic", color: "var(--muted)", lineHeight: 1.7, marginBottom: "2rem", borderLeft: "3px solid var(--gold)", paddingLeft: "1.2rem" }}>
            {article.excerpt}
          </p>
        )}

        {/* Thumbnail */}
        {article.thumbnail_url && (
          <div style={{ marginBottom: "2.5rem", borderRadius: 10, overflow: "hidden" }}>
            <img
              src={article.thumbnail_url}
              alt={article.title}
              loading="eager"
              style={{ width: "100%", maxHeight: 480, objectFit: "cover", display: "block" }}
            />
          </div>
        )}

        {/* Divider */}
        <div style={{ height: 1, background: "rgba(212,160,23,0.2)", marginBottom: "2.5rem" }} />

        {/* Body */}
        <div style={{ fontSize: "1rem", lineHeight: 1.9, color: "var(--text)", fontFamily: "'Source Serif 4', serif", fontWeight: 300 }}>
          {article.body.split("\n").map((paragraph: string, i: number) =>
            paragraph.trim() ? (
              <p key={i} style={{ marginBottom: "1.2rem" }}>{paragraph}</p>
            ) : (
              <br key={i} />
            )
          )}
        </div>

        {/* Back link */}
        <div style={{ marginTop: "3rem", paddingTop: "2rem", borderTop: "1px solid rgba(212,160,23,0.15)" }}>
          <a href="/#news" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--gold-dk)", textDecoration: "none", fontSize: "0.85rem", fontWeight: 500 }}>
            ← Back to News
          </a>
        </div>
      </article>

      {/* ── Related Articles ── */}
      {related && related.length > 0 && (
        <section style={{ background: "var(--green-dk)", padding: "4rem 0" }}>
          <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 2.5rem" }}>
            <h2 className="playfair" style={{ fontSize: "1.4rem", fontWeight: 700, color: "white", marginBottom: "1.5rem" }}>
              Related Articles
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(related.length, 3)}, 1fr)`, gap: "1.2rem" }}>
              {related.map(r => (
                <a key={r.id} href={`/news/${r.id}`} style={{ textDecoration: "none", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(212,160,23,0.15)", borderRadius: 8, overflow: "hidden", display: "block" }}>
                  <div style={{ height: 140, background: "var(--green)", overflow: "hidden" }}>
                    {r.thumbnail_url ? (
                      <img src={r.thumbnail_url} alt={r.title} loading="lazy"
                        style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg,#1A3C6E,#2E8B44)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ background: "var(--gold)", color: "var(--green-dk)", fontSize: "0.65rem", fontWeight: 500, padding: "3px 10px", borderRadius: 3, textTransform: "capitalize" }}>
                          {r.category?.replace("-", " ")}
                        </span>
                      </div>
                    )}
                  </div>
                  <div style={{ padding: "1rem" }}>
                    <h3 style={{ fontSize: "0.88rem", fontWeight: 600, color: "white", lineHeight: 1.4, marginBottom: "0.4rem" }}>{r.title}</h3>
                    <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.5)", lineHeight: 1.5, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                      {r.excerpt || r.title}
                    </p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Footer ── */}
      <footer style={{ background: "#080f0a", borderTop: "3px solid var(--gold)", padding: "2rem 2.5rem" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
          <p style={{ fontSize: "0.73rem", color: "rgba(255,255,255,0.25)" }}>
            © {new Date().getFullYear()} Surigao del Norte Consumers Organization, Inc.
          </p>
          <a href="/" style={{ fontSize: "0.73rem", color: "var(--gold)", textDecoration: "none" }}>← Back to Main Site</a>
        </div>
      </footer>

    </main>
  );
}