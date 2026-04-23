"use client";
import { useState, useEffect } from "react";
import {
  Clock, Calendar, Eye, BookOpen, Tag,
  ChevronRight, ArrowLeft, Share2, Link2
} from "lucide-react";

interface Props {
  post:        any;
  recentPosts: any[];
  ads:         any[];
  settings:    Record<string, string>;
}

const CATEGORY_META: Record<string, { label: string; color: string; bg: string }> = {
  news:              { label: "News",            color: "#0D3320", bg: "#C9A84C" },
  "consumer-rights": { label: "Consumer Rights", color: "#fff",    bg: "#2B5FA8" },
  announcements:     { label: "Announcements",   color: "#0D3320", bg: "#D4A017" },
  mas:               { label: "MAS Program",     color: "#fff",    bg: "#9A2020" },
  programs:          { label: "Programs",        color: "#fff",    bg: "#6B3FA0" },
  "success-stories": { label: "Success Stories", color: "#fff",    bg: "#1A7A8A" },
  milestones:        { label: "Milestones",      color: "#fff",    bg: "#C46B1A" },
};

function formatBody(content: string): string {
  if (!content) return "";
  return content
    .split(/\n\n+/)
    .map(para => para.trim())
    .filter(Boolean)
    .map((para, i) => {
      if (para.endsWith(":") && para.length < 100 && !para.includes("\n"))
        return `<h3 class="article-subheading">${para}</h3>`;
      if (i === 0)
        return `<p class="article-paragraph drop-cap">${para}</p>`;
      if (para.match(/^[•\-]/)) {
        const items = para.split("\n").map(l => `<li>${l.replace(/^[•\-]\s*/, "")}</li>`).join("");
        return `<ul class="article-list">${items}</ul>`;
      }
      return `<p class="article-paragraph">${para}</p>`;
    })
    .join("\n");
}

function PhilippineClock() {
  const [time, setTime] = useState<Date | null>(null);
  useEffect(() => {
    const tick = () => setTime(new Date());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  if (!time) return null;
  const phTime = new Date(time.toLocaleString("en-US", { timeZone: "Asia/Manila" }));
  const hh = phTime.getHours();
  const mm = phTime.getMinutes().toString().padStart(2, "0");
  const ss = phTime.getSeconds().toString().padStart(2, "0");
  const ampm = hh >= 12 ? "PM" : "AM";
  const h12 = (hh % 12 || 12).toString().padStart(2, "0");
  const dateStr = phTime.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  return (
    <div suppressHydrationWarning style={{ background: "#0D3320", borderRadius: 12, padding: "1.2rem 1.4rem", marginBottom: "1.5rem", textAlign: "center" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: "0.5rem" }}>
        <Clock size={13} color="rgba(201,168,76,0.6)" />
        <span style={{ fontSize: "0.6rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(201,168,76,0.6)", fontWeight: 600 }}>Philippine Standard Time</span>
      </div>
 <div suppressHydrationWarning style={{ fontFamily: "'DM Serif Display', serif", fontSize: "2rem", fontWeight: 700, color: "#C9A84C", letterSpacing: "0.05em", lineHeight: 1 }}>
        {h12}:{mm}<span style={{ fontSize: "1.2rem", opacity: 0.7 }}>{ss}</span>
        <span style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.5)", marginLeft: 6, fontFamily: "'DM Sans',sans-serif", fontWeight: 400 }}>{ampm}</span>
      </div>
      <p suppressHydrationWarning style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.4)", marginTop: "0.4rem" }}>{dateStr}</p>
      <p style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.4)", marginTop: "0.4rem" }}>{dateStr}</p>
    </div>
  );
}

export default function PostPageClient({ post, recentPosts, ads, settings }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const cat      = CATEGORY_META[post.category] || { label: post.category, color: "#fff", bg: "#555" };
  const pubDate  = post.published_at || post.created_at;
  const bodyHtml = formatBody(post.content || post.body || "");
  const leftAds  = ads.filter(a => a.position === "left"  || a.position === "top");
  const rightAds = ads.filter(a => a.position === "right" || a.position === "inline");
  const shareUrl = typeof window !== "undefined" ? window.location.href : "";
  const orgName  = settings["org_short_name"] || "SUNCO";

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <>
    <style>{`
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;0,900;1,400;1,700&family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600&family=Source+Serif+4:ital,wght@0,300;0,400;0,600;1,300;1,400&display=swap');

  .article-paragraph { font-family: 'Source Serif 4', Georgia, serif; font-size: 1.08rem; line-height: 1.9; color: #2A2A2A; margin-bottom: 1.4rem; font-weight: 300; }
  .article-paragraph.drop-cap::first-letter { font-family: 'Playfair Display', serif; font-size: 4.2rem; font-weight: 900; float: left; line-height: 0.78; margin-right: 0.12em; margin-top: 0.08em; color: #0D3320; }
  .article-subheading { font-family: 'Playfair Display', serif; font-size: 1.35rem; font-weight: 700; color: #0D3320; margin: 2rem 0 0.8rem; padding-bottom: 0.4rem; border-bottom: 2px solid #C9A84C; }
  .article-list { font-family: 'Source Serif 4', Georgia, serif; font-size: 1.05rem; line-height: 1.8; color: #333; padding-left: 1.4rem; margin-bottom: 1.4rem; font-weight: 300; }
  .article-list li { margin-bottom: 0.4rem; }
  .recent-card:hover .recent-title { color: #C9A84C !important; }
  .ad-link:hover { opacity: 0.9; transform: translateY(-2px); }

  /* ── MOBILE NAV FIX ── */
  .post-nav-links { display: flex; align-items: center; gap: 1.5rem; }
  @media (max-width: 768px) {
  .post-nav-links { display: none !important; }
  .post-nav-hamburger { display: flex !important; }
  .magazine-grid { grid-template-columns: 1fr !important; }
  .left-col, .right-col { display: none !important; }
  .article-paragraph { font-size: 0.98rem !important; }
  .article-paragraph.drop-cap::first-letter { font-size: 3rem !important; }
}
  @media (max-width: 600px) {
    .article-paragraph { font-size: 0.95rem !important; line-height: 1.8 !important; }
  }
`}</style>

      <div suppressHydrationWarning style={{ background: "#F7F5F0", minHeight: "100vh", fontFamily: "'DM Sans', sans-serif" }}>

        {/* Nav */}
        <nav style={{ background: "#0D3320", borderBottom: "3px solid #C9A84C", padding: "0 2rem", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 }}>
  <a href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
    <img src={settings["hero_logo_url"] || "/images/sunco-logo.png"} alt={orgName} style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "contain" }} />
    <span style={{ fontFamily: "'Playfair Display', serif", fontSize: "1rem", fontWeight: 700, color: "#C9A84C", letterSpacing: "0.04em" }}>{orgName}</span>
  </a>
  <div className="post-nav-links" style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
    {["About","Programs","Membership","Officers"].map((label, i) => (
      <a key={i} href={`/#${label.toLowerCase()}`} style={{ color: "rgba(255,255,255,0.6)", textDecoration: "none", fontSize: "0.75rem", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase" }}>{label}</a>
    ))}
    <a href="/news" style={{ color: "rgba(255,255,255,0.6)", textDecoration: "none", fontSize: "0.75rem", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase" }}>News</a>
    <a href="/login" style={{ background: "#C9A84C", color: "#0D3320", padding: "0.38rem 1rem", borderRadius: 4, fontSize: "0.75rem", fontWeight: 600, textDecoration: "none" }}>Login</a>
  </div>
  <button className="post-nav-hamburger" onClick={() => setMenuOpen(o => !o)} style={{ display: "none", background: "none", border: "none", cursor: "pointer", padding: "0.5rem", flexDirection: "column", gap: 5 }}>
    <span style={{ display: "block", width: 22, height: 2, background: menuOpen ? "transparent" : "white", transition: "all 0.2s" }} />
    <span style={{ display: "block", width: 22, height: 2, background: "white", transform: menuOpen ? "rotate(45deg) translate(5px, -5px)" : "none", transition: "all 0.2s" }} />
    <span style={{ display: "block", width: 22, height: 2, background: menuOpen ? "transparent" : "white", transition: "all 0.2s" }} />
  </button>
</nav>

{/* Mobile drawer */}
{menuOpen && (
  <div style={{ background: "#0D3320", borderBottom: "2px solid #C9A84C", padding: "1rem 2rem", display: "flex", flexDirection: "column", gap: "0.8rem", position: "sticky", top: 60, zIndex: 99 }}>
    {["About","Programs","Membership","Officers"].map((label, i) => (
      <a key={i} href={`/#${label.toLowerCase()}`} onClick={() => setMenuOpen(false)} style={{ color: "rgba(255,255,255,0.7)", textDecoration: "none", fontSize: "0.85rem", fontWeight: 500, padding: "0.3rem 0" }}>{label}</a>
    ))}
    <a href="/news" onClick={() => setMenuOpen(false)} style={{ color: "rgba(255,255,255,0.7)", textDecoration: "none", fontSize: "0.85rem", fontWeight: 500, padding: "0.3rem 0" }}>News</a>
    <a href="/login" style={{ background: "#C9A84C", color: "#0D3320", padding: "0.6rem 1rem", borderRadius: 4, fontSize: "0.85rem", fontWeight: 600, textDecoration: "none", textAlign: "center" }}>Login</a>
  </div>
)}
        {/* 3-Column Grid */}
        <div className="magazine-grid" style={{ display: "grid", gridTemplateColumns: "200px 1fr 240px", gap: "2rem", maxWidth: 1280, margin: "0 auto", padding: "2rem 1.5rem" }}>

          {/* Left */}
          <aside className="left-col" style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
            <a href="/news" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.75rem", color: "#0D3320", textDecoration: "none", fontWeight: 600, padding: "0.5rem 0" }}>
              <ArrowLeft size={14} /> All Articles
            </a>
            {leftAds.length > 0 ? leftAds.map(ad => (
              <a key={ad.id} href={ad.link_url || "#"} target="_blank" rel="noopener noreferrer" className="ad-link" style={{ display: "block", textDecoration: "none", transition: "transform 0.2s, opacity 0.2s" }}>
                <div style={{ background: "white", borderRadius: 10, overflow: "hidden", border: "1px solid rgba(0,0,0,0.08)", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
                  {ad.image_url && <img src={ad.image_url} alt={ad.title || "Ad"} loading="lazy" style={{ width: "100%", aspectRatio: "2/3", objectFit: "cover", display: "block" }} />}
                  {ad.title && <div style={{ padding: "0.6rem 0.8rem", background: "#0D3320" }}><p style={{ fontSize: "0.65rem", color: "#C9A84C", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>{ad.title}</p></div>}
                </div>
              </a>
            )) : (
              <div style={{ background: "white", borderRadius: 10, border: "2px dashed rgba(0,0,0,0.08)", padding: "2rem 1rem", textAlign: "center" }}>
                <p style={{ fontSize: "0.7rem", color: "rgba(0,0,0,0.25)", lineHeight: 1.5 }}>Ad Space<br />Available</p>
              </div>
            )}
            <div style={{ background: "white", borderRadius: 10, border: "1px solid rgba(0,0,0,0.07)", padding: "1rem", marginTop: "0.5rem" }}>
              <p style={{ fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#888", marginBottom: "0.7rem" }}>Share</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 8, padding: "0.5rem 0.7rem", background: "#1877F2", borderRadius: 6, textDecoration: "none" }}>
                  <span style={{ fontSize: "0.72rem", color: "white", fontWeight: 600 }}>Facebook</span>
                </a>
                <a href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(post.title)}`} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 8, padding: "0.5rem 0.7rem", background: "#1DA1F2", borderRadius: 6, textDecoration: "none" }}>
                  <span style={{ fontSize: "0.72rem", color: "white", fontWeight: 600 }}>X (Twitter)</span>
                </a>
                <button onClick={handleCopyLink} style={{ display: "flex", alignItems: "center", gap: 8, padding: "0.5rem 0.7rem", background: copied ? "#2E8B44" : "#F0EDE6", borderRadius: 6, border: "none", cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                  <Link2 size={13} color={copied ? "white" : "#555"} />
                  <span style={{ fontSize: "0.72rem", color: copied ? "white" : "#555", fontWeight: 600 }}>{copied ? "Copied!" : "Copy Link"}</span>
                </button>
              </div>
            </div>
          </aside>

          {/* Center */}
          <main style={{ minWidth: 0 }}>
            {post.excerpt && (
              <div style={{ borderLeft: "4px solid #C9A84C", paddingLeft: "1.2rem", marginBottom: "2rem" }}>
                <p style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: "1.15rem", fontStyle: "italic", color: "#0D3320", lineHeight: 1.7, fontWeight: 400 }}>{post.excerpt}</p>
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "2rem" }}>
              <div style={{ flex: 1, height: 1, background: "rgba(0,0,0,0.1)" }} />
              <div style={{ width: 6, height: 6, background: "#C9A84C", borderRadius: "50%", flexShrink: 0 }} />
              <div style={{ flex: 1, height: 1, background: "rgba(0,0,0,0.1)" }} />
            </div>
            <article style={{ background: "white", borderRadius: 14, padding: "clamp(1.5rem, 4vw, 2.8rem)", boxShadow: "0 2px 16px rgba(0,0,0,0.06)", border: "1px solid rgba(0,0,0,0.06)" }}>
              <div dangerouslySetInnerHTML={{ __html: bodyHtml }} />
            </article>
            {Array.isArray(post.tags) && post.tags.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", marginTop: "1.5rem" }}>
                <Tag size={14} color="#888" />
                {post.tags.map((tag: string) => (
                  <span key={tag} style={{ background: "rgba(13,51,32,0.07)", color: "#0D3320", fontSize: "0.72rem", fontWeight: 600, padding: "3px 12px", borderRadius: 20, textTransform: "capitalize" }}>{tag}</span>
                ))}
              </div>
            )}
            <div style={{ background: "#0D3320", borderRadius: 12, padding: "1.4rem 1.6rem", marginTop: "2rem", display: "flex", alignItems: "center", gap: "1.2rem" }}>
              <div style={{ width: 54, height: 54, borderRadius: "50%", background: "rgba(201,168,76,0.2)", border: "2px solid #C9A84C", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <img src={settings["hero_logo_url"] || "/images/sunco-logo.png"} alt="SUNCO" style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "contain" }} />
              </div>
              <div>
                <p style={{ fontSize: "0.65rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 3 }}>Written by</p>
                <p style={{ fontFamily: "'Playfair Display',serif", fontSize: "1rem", fontWeight: 700, color: "#C9A84C" }}>{post.author_name || "SUNCO Editorial Team"}</p>
                <p style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.45)", marginTop: 2 }}>Surigao del Norte Consumers Organization, Inc.</p>
              </div>
            </div>
            <div style={{ marginTop: "2rem", textAlign: "center" }}>
              <a href="/news" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#F0EDE6", border: "1.5px solid rgba(13,51,32,0.15)", color: "#0D3320", padding: "0.75rem 1.8rem", borderRadius: 8, textDecoration: "none", fontSize: "0.82rem", fontWeight: 600 }}>
                <ArrowLeft size={15} /> Back to All Articles
              </a>
            </div>
          </main>

          {/* Right */}
          <aside className="right-col" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <PhilippineClock />
            <div style={{ background: "white", borderRadius: 12, border: "1px solid rgba(0,0,0,0.07)", overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
              <div style={{ padding: "0.9rem 1.1rem", background: "#0D3320", borderBottom: "2px solid #C9A84C" }}>
                <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: "0.9rem", color: "#C9A84C", fontWeight: 700 }}>Recent Articles</h3>
              </div>
              <div style={{ padding: "0.4rem 0" }}>
                {recentPosts.slice(0, 5).map((p, i) => {
                  const rc = CATEGORY_META[p.category] || { label: p.category, color: "#fff", bg: "#555" };
                  return (
                    <a key={p.id} href={`/news/${p.slug || p.id}`} className="recent-card"
                      style={{ display: "flex", gap: 10, padding: "0.75rem 1rem", borderBottom: i < 4 ? "1px solid rgba(0,0,0,0.05)" : "none", textDecoration: "none" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "#F9F8F5")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                      {p.thumbnail_url ? (
                        <img src={p.thumbnail_url} alt={p.title} loading="lazy" style={{ width: 52, height: 52, objectFit: "cover", borderRadius: 7, flexShrink: 0, border: "1px solid rgba(0,0,0,0.07)" }} />
                      ) : (
                        <div style={{ width: 52, height: 52, borderRadius: 7, background: rc.bg, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <span style={{ fontSize: "0.55rem", color: rc.color, fontWeight: 700, textTransform: "uppercase", textAlign: "center" }}>{rc.label}</span>
                        </div>
                      )}
                      <div style={{ minWidth: 0 }}>
                        <p className="recent-title" style={{ fontSize: "0.78rem", fontWeight: 600, color: "#0D3320", lineHeight: 1.4, marginBottom: 3, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", transition: "color 0.15s" }}>{p.title}</p>
                        <p style={{ fontSize: "0.65rem", color: "#AAA" }}>
                          {(p.published_at || p.created_at) ? new Date(p.published_at || p.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""}
                        </p>
                      </div>
                    </a>
                  );
                })}
              </div>
              <div style={{ padding: "0.7rem 1rem", borderTop: "1px solid rgba(0,0,0,0.06)" }}>
                <a href="/news" style={{ fontSize: "0.72rem", color: "#C9A84C", textDecoration: "none", fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
                  View all articles <ChevronRight size={12} />
                </a>
              </div>
            </div>
            {rightAds.map(ad => (
              <a key={ad.id} href={ad.link_url || "#"} target="_blank" rel="noopener noreferrer" className="ad-link" style={{ display: "block", textDecoration: "none", transition: "transform 0.2s, opacity 0.2s" }}>
                <div style={{ background: "white", borderRadius: 10, overflow: "hidden", border: "1px solid rgba(0,0,0,0.08)", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
                  {ad.image_url && <img src={ad.image_url} alt={ad.title || "Ad"} loading="lazy" style={{ width: "100%", objectFit: "cover", display: "block", maxHeight: 200 }} />}
                  {ad.title && <div style={{ padding: "0.6rem 0.8rem", background: "#0D3320" }}><p style={{ fontSize: "0.65rem", color: "#C9A84C", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>{ad.title}</p></div>}
                </div>
              </a>
            ))}
            <div style={{ background: "#0D3320", borderRadius: 12, padding: "1.2rem 1.3rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "0.7rem" }}>
                <img src={settings["hero_logo_url"] || "/images/sunco-logo.png"} alt="SUNCO" style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "contain" }} />
                <span style={{ fontFamily: "'Playfair Display',serif", fontSize: "0.88rem", color: "#C9A84C", fontWeight: 700 }}>{settings["org_short_name"] || "SUNCO"}</span>
              </div>
              <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.5)", lineHeight: 1.65, marginBottom: "0.8rem" }}>
                Protecting consumer rights and promoting welfare across Surigao del Norte since {settings["org_established"] || "2011"}.
              </p>
              <a href="/register" style={{ display: "block", background: "#C9A84C", color: "#0D3320", textDecoration: "none", textAlign: "center", padding: "0.55rem 0", borderRadius: 6, fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.06em" }}>
                Become a Member →
              </a>
            </div>
          </aside>
        </div>

        <footer style={{ background: "#080f0a", borderTop: "3px solid #C9A84C", padding: "2rem 2.5rem", textAlign: "center" }}>
          <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.25)" }}>
            <span suppressHydrationWarning>© {new Date().getFullYear()}</span> {settings["org_name"] || "Surigao del Norte Consumers Organization, Inc."}. All rights reserved.
          </p>
        </footer>
      </div>
    </>
  );
}