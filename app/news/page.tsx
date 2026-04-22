import { createClient } from "@/utils/supabase/client";

const CATEGORY_META: Record<string, { label: string; color: string; bg: string }> = {
  news:              { label: "News",            color: "#0D3320", bg: "#C9A84C" },
  "consumer-rights": { label: "Consumer Rights", color: "#fff",    bg: "#2B5FA8" },
  announcements:     { label: "Announcements",   color: "#0D3320", bg: "#D4A017" },
  mas:               { label: "MAS Program",     color: "#fff",    bg: "#9A2020" },
  programs:          { label: "Programs",        color: "#fff",    bg: "#6B3FA0" },
  "success-stories": { label: "Success Stories", color: "#fff",    bg: "#1A7A8A" },
  milestones:        { label: "Milestones",      color: "#fff",    bg: "#C46B1A" },
};

export default async function NewsPage() {
  const supabase = createClient();

  const [{ data: posts }, { data: ads }, { data: settings }] = await Promise.all([
    supabase
      .from("posts")
      .select("id, title, slug, excerpt, category, thumbnail_url, published_at, created_at, author_name, reading_time, featured")
      .eq("status", "published")
      .order("published_at", { ascending: false }),
    supabase
      .from("promotion")
      .select("*")
      .eq("is_active", true),
    supabase
      .from("site_settings")
      .select("key, value"),
  ]);

  const settingsMap: Record<string, string> = {};
  (settings || []).forEach((s: any) => { settingsMap[s.key] = s.value; });

  const allPosts = posts || [];
  const allAds   = (ads || []).filter(Boolean);
  const featured = allPosts.find(p => p.featured) || allPosts[0];
  const rest     = allPosts.filter(p => p.id !== featured?.id);

  const shuffledAds = [...allAds].filter(Boolean).sort(() => Math.random() - 0.5);

  const postsWithAds: any[] = [];
  rest.forEach((post, i) => {
    postsWithAds.push({ type: "post", data: post });
    if ((i + 1) % 4 === 0 && shuffledAds.length > 0) {
      const ad = shuffledAds[Math.floor(i / 4) % shuffledAds.length];
      if (ad) postsWithAds.push({ type: "ad", data: ad });
    }
  });

  const orgName = settingsMap["org_short_name"] || "SUNCO";
  const logoUrl = settingsMap["hero_logo_url"]  || "/images/sunco-logo.png";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;0,900;1,400;1,700&family=DM+Sans:wght@300;400;500;600&family=Source+Serif+4:ital,wght@0,300;0,400;1,400&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .news-card { transition: transform 0.2s, box-shadow 0.2s; }
        .cat-link:hover { background: #F7F4EF; }
        .news-card:hover { transform: translateY(-4px); box-shadow: 0 12px 32px rgba(0,0,0,0.12) !important; }
        .news-card:hover .news-card-title { color: #C9A84C !important; }
        .ad-banner { transition: transform 0.2s, opacity 0.2s; }
        .ad-banner:hover { transform: scale(1.01); opacity: 0.95; }
        .ticker-wrap { overflow: hidden; white-space: nowrap; }
        .ticker-move { display: inline-block; animation: ticker 30s linear infinite; }
        @keyframes ticker { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @media (max-width: 768px) {
          .news-grid { grid-template-columns: 1fr !important; }
          .news-sidebar { display: none !important; }
        }
      `}</style>

      <div style={{ background: "#F7F4EF", minHeight: "100vh", fontFamily: "'DM Sans', sans-serif" }}>

        {/* Masthead */}
        <div style={{ background: "#0D3320", borderBottom: "1px solid rgba(201,168,76,0.2)", padding: "0.45rem 2rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <p style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.35)", letterSpacing: "0.1em" }}>
            {new Date().toLocaleDateString("en-PH", { weekday: "long", year: "numeric", month: "long", day: "numeric" }).toUpperCase()}
          </p>
          <p style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.35)", letterSpacing: "0.1em" }}>
            SURIGAO DEL NORTE · EST. {settingsMap["org_established"] || "2011"}
          </p>
        </div>

        {/* Nav */}
        <nav style={{ background: "#0D3320", borderBottom: "3px solid #C9A84C", padding: "0 2rem", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 }}>
          <a href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
            <img src={logoUrl} alt={orgName} style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "contain" }} />
            <div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.1rem", fontWeight: 900, color: "#C9A84C", lineHeight: 1 }}>{orgName}</div>
              <div style={{ fontSize: "0.5rem", color: "rgba(255,255,255,0.35)", letterSpacing: "0.14em", textTransform: "uppercase" }}>News & Announcements</div>
            </div>
          </a>
          <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
            {["About","Programs","Membership","Officers"].map(label => (
              <a key={label} href={`/#${label.toLowerCase()}`} style={{ color: "rgba(255,255,255,0.6)", textDecoration: "none", fontSize: "0.72rem", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase" }}>{label}</a>
            ))}
            <a href="/login" style={{ background: "#C9A84C", color: "#0D3320", padding: "0.4rem 1rem", borderRadius: 4, fontSize: "0.72rem", fontWeight: 700, textDecoration: "none" }}>Login</a>
          </div>
        </nav>

        {/* News Ticker */}
        {allPosts.length > 0 && (
          <div style={{ background: "#C9A84C", padding: "0.45rem 0", display: "flex", alignItems: "center", overflow: "hidden" }}>
            <div style={{ background: "#0D3320", color: "#C9A84C", padding: "0 1rem", fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", whiteSpace: "nowrap", marginRight: "1rem" }}>
              LATEST
            </div>
            <div className="ticker-wrap" style={{ flex: 1 }}>
              <div className="ticker-move">
                {[...allPosts, ...allPosts].map((p, i) => (
                  <a key={i} href={`/news/${p.slug || p.id}`} style={{ textDecoration: "none", marginRight: "3rem", fontSize: "0.72rem", fontWeight: 600, color: "#0D3320" }}>
                    ◆ {p.title}
                  </a>
                ))}
              </div>
            </div>
          </div>
        )}

        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "2rem 1.5rem" }}>

          {/* Featured Hero */}
          {featured && (
            <div style={{ marginBottom: "2.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "1rem" }}>
                <div style={{ height: 2, width: 40, background: "#C9A84C" }} />
                <span style={{ fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "#C9A84C" }}>Featured Story</span>
                <div style={{ flex: 1, height: 1, background: "rgba(0,0,0,0.1)" }} />
              </div>
              <a href={`/news/${featured.slug || featured.id}`} style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 0, background: "#0D3320", borderRadius: 12, overflow: "hidden", border: "1px solid rgba(201,168,76,0.2)", textDecoration: "none" }}>
                <div style={{ position: "relative", height: 400, overflow: "hidden" }}>
                  {featured.thumbnail_url ? (
                    <img src={featured.thumbnail_url} alt={featured.title} style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.8 }} />
                  ) : (
                    <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg, #1A5C2A, #0D3320)" }} />
                  )}
                </div>
                <div style={{ padding: "2.5rem 2rem", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                  <span style={{ background: CATEGORY_META[featured.category]?.bg || "#555", color: CATEGORY_META[featured.category]?.color || "#fff", fontSize: "0.62rem", fontWeight: 700, padding: "3px 12px", borderRadius: 3, letterSpacing: "0.1em", textTransform: "uppercase", display: "inline-block", marginBottom: "1rem", alignSelf: "flex-start" }}>
                    {CATEGORY_META[featured.category]?.label || featured.category}
                  </span>
                  <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(1.4rem, 2.5vw, 2rem)", fontWeight: 900, color: "white", lineHeight: 1.2, marginBottom: "1rem" }}>{featured.title}</h2>
                  {featured.excerpt && (
                    <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.55)", lineHeight: 1.7, marginBottom: "1.5rem", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{featured.excerpt}</p>
                  )}
                  <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.4)" }}>
                    {new Date(featured.published_at || featured.created_at).toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" })}
                    {featured.reading_time && ` · ${featured.reading_time} min read`}
                  </div>
                  <div style={{ marginTop: "1.5rem", color: "#C9A84C", fontSize: "0.8rem", fontWeight: 700 }}>
                    Read Full Story →
                  </div>
                </div>
              </a>
            </div>
          )}

          {/* Top Banner Ad */}
          {shuffledAds.length > 0 && shuffledAds[0] && (
            <a href={shuffledAds[0]?.link_url || "#"} target="_blank" rel="noopener noreferrer" className="ad-banner" style={{ display: "block", textDecoration: "none", marginBottom: "2rem", borderRadius: 10, overflow: "hidden", border: "1px solid rgba(0,0,0,0.08)" }}>
              {shuffledAds[0]?.image_url && (
                <img src={shuffledAds[0].image_url} alt={shuffledAds[0]?.title || "Advertisement"} style={{ width: "100%", maxHeight: 120, objectFit: "cover", display: "block" }} />
              )}
              {shuffledAds[0]?.title && (
                <div style={{ background: "#0D3320", padding: "0.4rem 1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <p style={{ fontSize: "0.65rem", color: "#C9A84C", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>{shuffledAds[0].title}</p>
                  <span style={{ fontSize: "0.55rem", color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em" }}>ADVERTISEMENT</span>
                </div>
              )}
            </a>
          )}

          {/* Section Header */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "1.5rem" }}>
            <div style={{ height: 2, width: 40, background: "#C9A84C" }} />
            <span style={{ fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "#888" }}>
              All Stories · {allPosts.length} Articles
            </span>
            <div style={{ flex: 1, height: 1, background: "rgba(0,0,0,0.1)" }} />
          </div>

          {/* Main Grid + Sidebar */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: "2rem" }}>

            {/* Posts Grid */}
            <div>
              <div className="news-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "1.2rem" }}>
                {postsWithAds.map((item, i) => {
                  if (item.type === "ad") {
                    const ad = item.data;
                    if (!ad) return null;
                    return (
                      <div key={`ad-${i}`} style={{ gridColumn: "1 / -1" }}>
                        <a href={ad?.link_url || "#"} target="_blank" rel="noopener noreferrer" className="ad-banner" style={{ display: "block", textDecoration: "none", borderRadius: 10, overflow: "hidden", border: "1px solid rgba(201,168,76,0.2)" }}>
                          {ad?.image_url && (
                            <img src={ad.image_url} alt={ad?.title || "Ad"} style={{ width: "100%", maxHeight: 100, objectFit: "cover", display: "block" }} />
                          )}
                          {ad?.title && (
                            <div style={{ background: "#0D3320", padding: "0.4rem 1rem", display: "flex", justifyContent: "space-between" }}>
                              <p style={{ fontSize: "0.65rem", color: "#C9A84C", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>{ad.title}</p>
                              <span style={{ fontSize: "0.55rem", color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em" }}>ADVERTISEMENT</span>
                            </div>
                          )}
                        </a>
                      </div>
                    );
                  }
                  const post = item.data;
                  const cat  = CATEGORY_META[post.category] || { label: post.category, color: "#fff", bg: "#555" };
                  return (
                    <a key={post.id} href={`/news/${post.slug || post.id}`} className="news-card" style={{ textDecoration: "none", background: "white", borderRadius: 10, overflow: "hidden", border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 2px 8px rgba(0,0,0,0.04)", display: "flex", flexDirection: "column" }}>
                      {post.thumbnail_url ? (
                        <img src={post.thumbnail_url} alt={post.title} loading="lazy" style={{ width: "100%", height: 200, objectFit: "cover", display: "block" }} />
                      ) : (
                        <div style={{ width: "100%", height: 200, background: `linear-gradient(135deg, #0D3320, #2E8B44)` }} />
                      )}
                      <div style={{ padding: "1.2rem", flex: 1, display: "flex", flexDirection: "column" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "0.6rem" }}>
                          <span style={{ background: cat.bg, color: cat.color, fontSize: "0.58rem", fontWeight: 700, padding: "2px 10px", borderRadius: 3, textTransform: "uppercase", letterSpacing: "0.08em" }}>{cat.label}</span>
                          <span style={{ fontSize: "0.65rem", color: "#BBB" }}>
                            {new Date(post.published_at || post.created_at).toLocaleDateString("en-PH", { month: "short", day: "numeric" })}
                          </span>
                        </div>
                        <h3 className="news-card-title" style={{ fontFamily: "'Playfair Display', serif", fontSize: "1rem", fontWeight: 700, color: "#0D3320", lineHeight: 1.4, marginBottom: "0.5rem", flex: 1, transition: "color 0.15s" }}>
                          {post.title}
                        </h3>
                        {post.excerpt && (
                          <p style={{ fontSize: "0.78rem", color: "#777", lineHeight: 1.6, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", marginBottom: "0.8rem" }}>
                            {post.excerpt}
                          </p>
                        )}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.68rem", color: "#AAA", borderTop: "1px solid rgba(0,0,0,0.06)", paddingTop: "0.7rem", marginTop: "auto" }}>
                          <span>{post.author_name || "SUNCO Editorial"}</span>
                          {post.reading_time && <span>{post.reading_time} min read</span>}
                        </div>
                      </div>
                    </a>
                  );
                })}
              </div>
            </div>

            {/* Sidebar */}
            <aside className="news-sidebar" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

              {/* About widget */}
              <div style={{ background: "#0D3320", borderRadius: 12, padding: "1.4rem", border: "1px solid rgba(201,168,76,0.2)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "0.8rem" }}>
                  <img src={logoUrl} alt={orgName} style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "contain" }} />
                  <span style={{ fontFamily: "'Playfair Display',serif", fontSize: "0.95rem", color: "#C9A84C", fontWeight: 700 }}>{orgName}</span>
                </div>
                <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.45)", lineHeight: 1.7, marginBottom: "1rem" }}>
                  Protecting consumer rights and promoting welfare across Surigao del Norte since {settingsMap["org_established"] || "2011"}.
                </p>
                <a href="/register" style={{ display: "block", background: "#C9A84C", color: "#0D3320", textDecoration: "none", textAlign: "center", padding: "0.6rem", borderRadius: 6, fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.06em" }}>
                  Become a Member →
                </a>
              </div>

              {/* Sidebar Ads */}
              {shuffledAds.slice(1).filter(Boolean).map((ad) => (
                <a key={ad.id} href={ad?.link_url || "#"} target="_blank" rel="noopener noreferrer" className="ad-banner" style={{ display: "block", textDecoration: "none", borderRadius: 10, overflow: "hidden", border: "1px solid rgba(0,0,0,0.08)", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
                  {ad?.image_url && (
                    <img src={ad.image_url} alt={ad?.title || "Ad"} loading="lazy" style={{ width: "100%", objectFit: "cover", display: "block", maxHeight: 280 }} />
                  )}
                  {ad?.title && (
                    <div style={{ background: "#0D3320", padding: "0.5rem 0.8rem" }}>
                      <p style={{ fontSize: "0.62rem", color: "#C9A84C", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>{ad.title}</p>
                    </div>
                  )}
                </a>
              ))}

              {/* Categories */}
              <div style={{ background: "white", borderRadius: 12, border: "1px solid rgba(0,0,0,0.07)", overflow: "hidden" }}>
                <div style={{ background: "#0D3320", padding: "0.8rem 1rem", borderBottom: "2px solid #C9A84C" }}>
                  <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: "0.85rem", color: "#C9A84C", fontWeight: 700 }}>Browse by Category</h3>
                </div>
                <div style={{ padding: "0.5rem" }}>
                  {Object.entries(CATEGORY_META).map(([key, val]) => {
                    const count = allPosts.filter(p => p.category === key).length;
                    if (count === 0) return null;
                    return (
                      <a key={key} href={`/news?category=${key}`} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.6rem 0.8rem", borderRadius: 6, textDecoration: "none" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ width: 8, height: 8, borderRadius: "50%", background: val.bg, flexShrink: 0 }} />
                          <span style={{ fontSize: "0.78rem", color: "#0D3320", fontWeight: 500 }}>{val.label}</span>
                        </div>
                        <span style={{ fontSize: "0.68rem", color: "#AAA", background: "#F0EDE6", padding: "1px 8px", borderRadius: 10 }}>{count}</span>
                      </a>
                    );
                  })}
                </div>
              </div>

            </aside>
          </div>
        </div>

        {/* Footer */}
        <footer style={{ background: "#080f0a", borderTop: "3px solid #C9A84C", padding: "2rem 2.5rem", textAlign: "center", marginTop: "4rem" }}>
          <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.25)" }}>
            © {new Date().getFullYear()} {settingsMap["org_name"] || "Surigao del Norte Consumers Organization, Inc."}. All rights reserved.
          </p>
        </footer>

      </div>
    </>
  );
}