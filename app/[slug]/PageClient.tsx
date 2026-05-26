"use client";
import { useState, useEffect } from "react";
import { Clock, ChevronRight, ArrowLeft, Calendar } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

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

interface PageData {
  id: string;
  title: string;
  slug: string;
  content: string;
  meta_description?: string;
  template?: "centered" | "fullwidth" | "news" | "twocol" | "profile";
  cover_image_url?: string;
  bg_color?: string;
  content_blocks?: ContentBlock[];
  show_date?: boolean;
  show_breadcrumb?: boolean;
  features?: PageFeatures;
  created_at?: string;
}

interface Props {
  page: PageData;
  settings: Record<string, string>;
  navPages: { title: string; slug: string; nav_label: string; nav_order: number }[];
}

// ── Philippine Clock (identical to PostPageClient) ────────────
function PhilippineClock() {
  const [timeStr, setTimeStr] = useState("");
  const [dateStr, setDateStr] = useState("");
  useEffect(() => {
    const tick = () => {
      const now    = new Date();
      const phTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Manila" }));
      const hh     = phTime.getHours();
      const mm     = phTime.getMinutes().toString().padStart(2, "0");
      const ss     = phTime.getSeconds().toString().padStart(2, "0");
      const ampm   = hh >= 12 ? "PM" : "AM";
      const h12    = (hh % 12 || 12).toString().padStart(2, "0");
      setTimeStr(`${h12}:${mm}:${ss} ${ampm}`);
      setDateStr(phTime.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" }));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  if (!timeStr) return null;
  return (
    <div style={{ background: "#0D3320", borderRadius: 12, padding: "1.2rem 1.4rem", marginBottom: "1.5rem", textAlign: "center" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: "0.5rem" }}>
        <Clock size={13} color="rgba(201,168,76,0.6)" />
        <span style={{ fontSize: "0.6rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(201,168,76,0.6)", fontWeight: 600 }}>Philippine Standard Time</span>
      </div>
      <div suppressHydrationWarning style={{ fontFamily: "'DM Serif Display', serif", fontSize: "2rem", fontWeight: 700, color: "#C9A84C", letterSpacing: "0.05em", lineHeight: 1 }}>{timeStr}</div>
      <p suppressHydrationWarning style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.4)", marginTop: "0.4rem" }}>{dateStr}</p>
    </div>
  );
}

// ── Content Block Renderer ────────────────────────────────────
function RenderBlock({ block }: { block: ContentBlock }) {
  const align = (block.align || "left") as "left" | "center" | "right";

  if (block.type === "divider") return (
    <hr style={{ border: "none", borderTop: "2px solid #C9A84C", margin: "2rem 0", opacity: 0.4 }} />
  );

  if (block.type === "heading") return (
    <h3 style={{
      fontFamily: "'Playfair Display', serif",
      fontSize: "1.35rem", fontWeight: 700, color: "#0D3320",
      margin: "2rem 0 0.8rem", paddingBottom: "0.4rem",
      borderBottom: "2px solid #C9A84C", textAlign: align,
    }} dangerouslySetInnerHTML={{ __html: block.content }} />
  );

  if (block.type === "text") return (
    <p style={{
      fontFamily: "'Source Serif 4', Georgia, serif",
      fontSize: "1.08rem", lineHeight: 1.9,
      color: "#2A2A2A", marginBottom: "1.4rem",
      fontWeight: 300, textAlign: align,
    }} dangerouslySetInnerHTML={{ __html: block.content.replace(/\n/g, "<br/>") }} />
  );

  if (block.type === "image") return (
    <figure style={{ margin: "2rem 0", textAlign: align }}>
      {block.image_url && (
        <img src={block.image_url} alt={block.content || ""} loading="lazy" style={{
          maxWidth: "100%", borderRadius: 12,
          boxShadow: "0 6px 24px rgba(0,0,0,0.14)",
          display: "block", margin: align === "center" ? "0 auto" : undefined,
        }} />
      )}
      {block.content && (
        <figcaption style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.8rem", color: "#888", marginTop: "0.65rem", fontStyle: "italic" }}>
          {block.content}
        </figcaption>
      )}
    </figure>
  );

  if (block.type === "two-col") return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: "2rem", margin: "1.5rem 0" }}>
      <div style={{ fontFamily: "'Source Serif 4',Georgia,serif", fontSize: "1.05rem", color: "#2A2A2A", lineHeight: 1.9, fontWeight: 300 }}
        dangerouslySetInnerHTML={{ __html: (block.content || "").replace(/\n/g, "<br/>") }} />
      <div style={{ fontFamily: "'Source Serif 4',Georgia,serif", fontSize: "1.05rem", color: "#2A2A2A", lineHeight: 1.9, fontWeight: 300 }}
        dangerouslySetInnerHTML={{ __html: (block.content2 || "").replace(/\n/g, "<br/>") }} />
    </div>
  );

  return null;
}

// ── Main Component ────────────────────────────────────────────
export default function PageClient({ page, settings, navPages }: Props) {
  const s = (key: string, fallback = "") => settings[key] || fallback;
  const [menuOpen,    setMenuOpen]    = useState(false);
  const [authUser,    setAuthUser]    = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [recentPosts, setRecentPosts] = useState<any[]>([]);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setAuthUser(data.user);
      setAuthLoading(false);
    });
    supabase.from("posts")
      .select("id, title, slug, thumbnail_url, category, published_at, created_at")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(5)
      .then(({ data }) => setRecentPosts(data || []));
  }, []);

  const orgName       = s("org_short_name", "SUNCO");
  const coverImageUrl = page.cover_image_url || "";
  const contentBlocks = page.content_blocks  || [];
  const showDate      = page.show_date        ?? false;
  const showBreadcrumb = page.show_breadcrumb ?? true;
  const features      = page.features         || {};

  // Nav
  const STATIC_NAV = [
    [s("nav_link1_href","#about"),      s("nav_link1_label","")],
    [s("nav_link2_href","#programs"),   s("nav_link2_label","")],
    [s("nav_link3_href","#membership"), s("nav_link3_label","")],
    [s("nav_link4_href","#officers"),   s("nav_link4_label","")],
    [s("nav_link5_href","#news"),       s("nav_link5_label","")],
  ].filter(([,label]) => label.trim() !== "");
  const DYNAMIC_NAV = navPages.map(p => [`/${p.slug}`, p.nav_label || p.title]);
  const ALL_NAV = [...STATIC_NAV, ...DYNAMIC_NAV];

  // Body content
  const bodyContent = contentBlocks.length > 0
    ? contentBlocks.map(b => <RenderBlock key={b.id} block={b} />)
    : <div style={{ fontFamily: "'Source Serif 4',Georgia,serif", fontSize: "1.08rem", color: "#2A2A2A", lineHeight: 1.9, fontWeight: 300 }}
        dangerouslySetInnerHTML={{ __html: page.content.replace(/\n/g, "<br/>") }} />;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;0,900;1,400;1,700&family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600&family=Source+Serif+4:ital,wght@0,300;0,400;0,600;1,300;1,400&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        .pnav-links { display: flex; align-items: center; gap: 1.5rem; }
        .pnav-burger { display: none !important; background: none; border: none; cursor: pointer; }
        .p3col { display: grid; grid-template-columns: 200px 1fr 240px; gap: 2rem; max-width: 1280px; margin: 0 auto; padding: 2rem 1.5rem; }
        .p-recent:hover { background: #F9F8F5 !important; }
        .p-recent:hover .p-recent-title { color: #C9A84C !important; }
        @media (max-width: 1024px) { .p3col { grid-template-columns: 1fr 240px !important; } .p-left-col { display: none !important; } }
        @media (max-width: 768px) {
          .p3col { grid-template-columns: 1fr !important; }
          .p-right-col { display: none !important; }
          .pnav-links { display: none !important; }
          .pnav-burger { display: flex !important; flex-direction: column; gap: 5px; }
        }
      `}</style>

      <div style={{ background: "#F7F5F0", minHeight: "100vh", fontFamily: "'DM Sans',sans-serif" }}>

        {/* ── NAV — identical to PostPageClient ── */}
        <nav style={{ background: "#0D3320", borderBottom: "3px solid #C9A84C", padding: "0 1.5rem", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 }}>
          <a href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", flexShrink: 0 }}>
            <img src={s("hero_logo_url", "/images/sunco-logo.png")} alt={orgName} style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "contain" }} />
            <span style={{ fontFamily: "'Playfair Display',serif", fontSize: "1rem", fontWeight: 700, color: "#C9A84C", letterSpacing: "0.04em" }}>{orgName}</span>
          </a>
          <div className="pnav-links">
            {ALL_NAV.map(([href, label]) => (
              <a key={href} href={href} style={{ color: "rgba(255,255,255,0.6)", textDecoration: "none", fontSize: "0.75rem", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase" }}>{label}</a>
            ))}
            {!authLoading && (
              authUser
                ? <a href="/dashboard" style={{ background: "#C9A84C", color: "#0D3320", padding: "0.38rem 1rem", borderRadius: 4, fontSize: "0.75rem", fontWeight: 600, textDecoration: "none" }}>My Account</a>
                : <a href="/login" style={{ background: "#C9A84C", color: "#0D3320", padding: "0.38rem 1rem", borderRadius: 4, fontSize: "0.75rem", fontWeight: 600, textDecoration: "none" }}>Login</a>
            )}
          </div>
          <button className="pnav-burger" onClick={() => setMenuOpen(o => !o)}>
            <span style={{ display: "block", width: 22, height: 2, background: "white", transition: "all 0.2s", transform: menuOpen ? "rotate(45deg) translate(5px,3px)" : "none" }} />
            <span style={{ display: "block", width: 22, height: 2, background: menuOpen ? "transparent" : "white", transition: "all 0.2s" }} />
            <span style={{ display: "block", width: 22, height: 2, background: "white", transition: "all 0.2s", transform: menuOpen ? "rotate(-45deg) translate(5px,-3px)" : "none" }} />
          </button>
        </nav>

        {/* Mobile drawer */}
        {menuOpen && (
          <div style={{ background: "#0D3320", borderBottom: "2px solid #C9A84C", padding: "1rem 1.5rem", display: "flex", flexDirection: "column", gap: "0.8rem", position: "sticky", top: 60, zIndex: 99 }}>
            {ALL_NAV.map(([href, label]) => (
              <a key={href} href={href} onClick={() => setMenuOpen(false)} style={{ color: "rgba(255,255,255,0.7)", textDecoration: "none", fontSize: "0.85rem", fontWeight: 500, padding: "0.3rem 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>{label}</a>
            ))}
            {!authLoading && !authUser && (
              <a href="/login" style={{ background: "#C9A84C", color: "#0D3320", padding: "0.6rem 1rem", borderRadius: 4, fontSize: "0.85rem", fontWeight: 600, textDecoration: "none", textAlign: "center" }}>Login</a>
            )}
          </div>
        )}

        {/* ── HERO BANNER — identical look to PostPageClient ── */}
        <div style={{ position: "relative", width: "100%", height: "clamp(260px, 38vw, 460px)", overflow: "hidden", background: "#0D3320" }}>
          {coverImageUrl && (
            <img src={coverImageUrl} alt={page.title} loading="eager" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.45 }} />
          )}
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, #0D3320 0%, rgba(13,51,32,0.6) 50%, rgba(13,51,32,0.2) 100%)" }} />
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "2rem clamp(1rem,5vw,4rem) 2rem" }}>
            {showBreadcrumb && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: "0.8rem" }}>
                <a href="/" style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.5)", textDecoration: "none" }}>Home</a>
                <ChevronRight size={12} color="rgba(255,255,255,0.3)" />
                <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.35)" }}>{page.title}</span>
              </div>
            )}
            <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: "clamp(1.6rem,4vw,3rem)", fontWeight: 900, color: "white", lineHeight: 1.15, maxWidth: 820, marginBottom: "0.8rem" }}>
              {page.title}
            </h1>
            {showDate && page.created_at && (
              <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "0.78rem", color: "rgba(255,255,255,0.55)" }}>
                <Calendar size={13} />
                <span suppressHydrationWarning>
                  {new Date(page.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ── 3-COLUMN GRID — identical to PostPageClient ── */}
        <div className="p3col">

          {/* Left col */}
          <aside className="p-left-col" style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
            <a href="/" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.75rem", color: "#0D3320", textDecoration: "none", fontWeight: 600, padding: "0.5rem 0" }}>
              <ArrowLeft size={14} /> Home
            </a>
            {/* SUNCO card */}
            <div style={{ background: "#0D3320", borderRadius: 10, padding: "1.1rem", border: "1px solid rgba(201,168,76,0.2)" }}>
              <img src={s("hero_logo_url","/images/sunco-logo.png")} alt={orgName} style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "contain", display: "block", margin: "0 auto 0.7rem" }} />
              <p style={{ fontFamily: "'Playfair Display',serif", fontSize: "0.85rem", color: "#C9A84C", fontWeight: 700, textAlign: "center", marginBottom: "0.5rem" }}>{orgName}</p>
              <p style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.45)", lineHeight: 1.6, textAlign: "center", marginBottom: "0.8rem" }}>
                Protecting consumer rights since {s("org_established","2011")}.
              </p>
              <a href="/register" style={{ display: "block", background: "#C9A84C", color: "#0D3320", textDecoration: "none", textAlign: "center", padding: "0.5rem 0", borderRadius: 6, fontSize: "0.72rem", fontWeight: 700 }}>
                Become a Member →
              </a>
            </div>
          </aside>

          {/* Center — article */}
          <main style={{ minWidth: 0 }}>
            {page.meta_description && (
              <div style={{ borderLeft: "4px solid #C9A84C", paddingLeft: "1.2rem", marginBottom: "2rem" }}>
                <p style={{ fontFamily: "'Source Serif 4',Georgia,serif", fontSize: "1.15rem", fontStyle: "italic", color: "#0D3320", lineHeight: 1.7, fontWeight: 400 }}>
                  {page.meta_description}
                </p>
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "2rem" }}>
              <div style={{ flex: 1, height: 1, background: "rgba(0,0,0,0.1)" }} />
              <div style={{ width: 6, height: 6, background: "#C9A84C", borderRadius: "50%", flexShrink: 0 }} />
              <div style={{ flex: 1, height: 1, background: "rgba(0,0,0,0.1)" }} />
            </div>
            <article style={{ background: "white", borderRadius: 14, padding: "clamp(1.5rem,4vw,2.8rem)", boxShadow: "0 2px 16px rgba(0,0,0,0.06)", border: "1px solid rgba(0,0,0,0.06)" }}>
              {bodyContent}
            </article>
            <div style={{ marginTop: "2rem", textAlign: "center" }}>
              <a href="/" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#F0EDE6", border: "1.5px solid rgba(13,51,32,0.15)", color: "#0D3320", padding: "0.75rem 1.8rem", borderRadius: 8, textDecoration: "none", fontSize: "0.82rem", fontWeight: 600 }}>
                <ArrowLeft size={15} /> Back to Home
              </a>
            </div>
          </main>

          {/* Right col — identical to PostPageClient */}
          <aside className="p-right-col" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <PhilippineClock />
            {/* Recent articles */}
            {recentPosts.length > 0 && (
              <div style={{ background: "white", borderRadius: 12, border: "1px solid rgba(0,0,0,0.07)", overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
                <div style={{ padding: "0.9rem 1.1rem", background: "#0D3320", borderBottom: "2px solid #C9A84C" }}>
                  <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: "0.9rem", color: "#C9A84C", fontWeight: 700 }}>Recent Articles</h3>
                </div>
                <div style={{ padding: "0.4rem 0" }}>
                  {recentPosts.map((p, i) => (
                    <a key={p.id} href={`/news/${p.slug || p.id}`} className="p-recent"
                      style={{ display: "flex", gap: 10, padding: "0.75rem 1rem", borderBottom: i < recentPosts.length - 1 ? "1px solid rgba(0,0,0,0.05)" : "none", textDecoration: "none", background: "transparent", transition: "background 0.15s" }}>
                      {p.thumbnail_url
                        ? <img src={p.thumbnail_url} alt={p.title} loading="lazy" style={{ width: 52, height: 52, objectFit: "cover", borderRadius: 7, flexShrink: 0, border: "1px solid rgba(0,0,0,0.07)" }} />
                        : <div style={{ width: 52, height: 52, borderRadius: 7, background: "#0D3320", flexShrink: 0 }} />
                      }
                      <div style={{ minWidth: 0 }}>
                        <p className="p-recent-title" style={{ fontSize: "0.78rem", fontWeight: 600, color: "#0D3320", lineHeight: 1.4, marginBottom: 3, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", transition: "color 0.15s" }}>
                          {p.title}
                        </p>
                        <p suppressHydrationWarning style={{ fontSize: "0.65rem", color: "#AAA" }}>
                          {(p.published_at || p.created_at) ? new Date(p.published_at || p.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""}
                        </p>
                      </div>
                    </a>
                  ))}
                </div>
                <div style={{ padding: "0.7rem 1rem", borderTop: "1px solid rgba(0,0,0,0.06)" }}>
                  <a href="/news" style={{ fontSize: "0.72rem", color: "#C9A84C", textDecoration: "none", fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
                    View all articles <ChevronRight size={12} />
                  </a>
                </div>
              </div>
            )}
            {/* SUNCO promo card */}
            <div style={{ background: "#0D3320", borderRadius: 12, padding: "1.2rem 1.3rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "0.7rem" }}>
                <img src={s("hero_logo_url","/images/sunco-logo.png")} alt={orgName} style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "contain" }} />
                <span style={{ fontFamily: "'Playfair Display',serif", fontSize: "0.88rem", color: "#C9A84C", fontWeight: 700 }}>{orgName}</span>
              </div>
              <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.5)", lineHeight: 1.65, marginBottom: "0.8rem" }}>
                Protecting consumer rights and promoting welfare across Surigao del Norte since {s("org_established","2011")}.
              </p>
              <a href="/register" style={{ display: "block", background: "#C9A84C", color: "#0D3320", textDecoration: "none", textAlign: "center", padding: "0.55rem 0", borderRadius: 6, fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.06em" }}>
                Become a Member →
              </a>
            </div>
          </aside>
        </div>

        {/* ── FOOTER — identical to PostPageClient ── */}
        <footer style={{ background: "#080f0a", borderTop: "3px solid #C9A84C", padding: "2rem 2.5rem", textAlign: "center" }}>
          <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.25)" }}>
            <span suppressHydrationWarning>© {new Date().getFullYear()}</span> {s("org_name","Surigao del Norte Consumers Organization, Inc.")}. All rights reserved.
          </p>
        </footer>

      </div>
    </>
  );
}