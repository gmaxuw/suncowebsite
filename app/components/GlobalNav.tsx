"use client";
// app/components/GlobalNav.tsx
// ─────────────────────────────────────────────────────────────
// Shared navigation bar — reads nav links from site_settings.
// Drop this into any page to get a consistent, settings-driven nav.
// Usage:
//   <GlobalNav settings={settingsMap} />
// ─────────────────────────────────────────────────────────────
import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";

interface Props {
  settings: Record<string, string>;
  /** Optional extra pages from CMS (navPages from DB) */
  navPages?: { title: string; slug: string; nav_label: string; nav_order: number }[];
}

function NavAuthButton() {
  const [user,    setUser]    = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }: any) => {
      setUser(data?.user ?? null);
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_: any, session: any) => {
      setUser(session?.user ?? null);
    });
    return () => listener?.subscription?.unsubscribe();
  }, []);

  if (loading) return null;

  if (user) {
    const name = user.user_metadata?.full_name || user.email?.split("@")[0] || "Account";
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <a href="/dashboard" style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.7)", textDecoration: "none", fontWeight: 500 }}>
          👤 {name}
        </a>
        <button
          onClick={() => createClient().auth.signOut().then(() => window.location.reload())}
          style={{ background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.15)", padding: "0.38rem 0.9rem", borderRadius: 4, fontSize: "0.72rem", fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
          Sign Out
        </button>
      </div>
    );
  }

  return (
    <a href="/login" style={{ background: "#C9A84C", color: "#0D3320", padding: "0.38rem 1rem", borderRadius: 4, fontSize: "0.75rem", fontWeight: 600, textDecoration: "none" }}>
      Login
    </a>
  );
}

export default function GlobalNav({ settings, navPages = [] }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);

  const s = (key: string, fallback = "") => settings[key] || fallback;

  // Build nav links from settings — only include links with non-empty labels
  const STATIC_NAV = [
    [s("nav_link1_href", "#about"),      s("nav_link1_label", "")],
    [s("nav_link2_href", "#programs"),   s("nav_link2_label", "")],
    [s("nav_link3_href", "#membership"), s("nav_link3_label", "")],
    [s("nav_link4_href", "#officers"),   s("nav_link4_label", "")],
    [s("nav_link5_href", "#news"),       s("nav_link5_label", "")],
  ].filter(([, label]) => label.trim() !== "");

  const DYNAMIC_NAV = navPages.map(p => [`/${p.slug}`, p.nav_label || p.title]);
  const ALL_NAV = [...STATIC_NAV, ...DYNAMIC_NAV];

  const orgName = s("org_short_name", "GOLDEN MENTORS");
  const logoUrl = s("hero_logo_url", "/images/sunco-logo.png");

  return (
    <>
      <style>{`
        .gnav-links { display: flex; align-items: center; gap: 1.5rem; }
        .gnav-burger { display: none !important; background: none; border: none; cursor: pointer; padding: 0.5rem; flex-direction: column; gap: 5px; }
        @media (max-width: 768px) {
          .gnav-links  { display: none !important; }
          .gnav-burger { display: flex !important; }
        }
      `}</style>

      {/* ── Main Nav Bar ── */}
      <nav style={{ background: "#0D3320", borderBottom: "3px solid #C9A84C", padding: "0 1.5rem", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 }}>

        {/* Logo + Name */}
        <a href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", flexShrink: 0 }}>
          <img src={logoUrl} alt={orgName} style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "contain" }} />
          <span style={{ fontFamily: "'Playfair Display', serif", fontSize: "1rem", fontWeight: 900, color: "#C9A84C", letterSpacing: "0.04em" }}>{orgName}</span>
        </a>

        {/* Desktop Links */}
        <div className="gnav-links">
          {ALL_NAV.map(([href, label]) => (
            <a key={href} href={href} style={{ color: "rgba(255,255,255,0.7)", textDecoration: "none", fontSize: "0.75rem", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase" }}>
              {label}
            </a>
          ))}
          <NavAuthButton />
        </div>

        {/* Hamburger */}
        <button className="gnav-burger" onClick={() => setMenuOpen(o => !o)} aria-label="Toggle menu">
          <span style={{ display: "block", width: 22, height: 2, background: "white", transition: "all 0.2s", transform: menuOpen ? "rotate(45deg) translate(5px, 3px)" : "none" }} />
          <span style={{ display: "block", width: 22, height: 2, background: menuOpen ? "transparent" : "white", transition: "all 0.2s" }} />
          <span style={{ display: "block", width: 22, height: 2, background: "white", transition: "all 0.2s", transform: menuOpen ? "rotate(-45deg) translate(5px, -3px)" : "none" }} />
        </button>
      </nav>

      {/* ── Mobile Drawer ── */}
      {menuOpen && (
        <div style={{ background: "#0D3320", borderBottom: "2px solid #C9A84C", padding: "1rem 1.5rem", display: "flex", flexDirection: "column", gap: "0.8rem", position: "sticky", top: 64, zIndex: 99 }}>
          {ALL_NAV.map(([href, label]) => (
            <a key={href} href={href} onClick={() => setMenuOpen(false)} style={{ color: "rgba(255,255,255,0.7)", textDecoration: "none", fontSize: "0.88rem", fontWeight: 500, padding: "0.4rem 0", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "block" }}>
              {label}
            </a>
          ))}
          <a href="/login" onClick={() => setMenuOpen(false)} style={{ background: "#C9A84C", color: "#0D3320", padding: "0.7rem 1rem", borderRadius: 4, fontSize: "0.85rem", fontWeight: 700, textDecoration: "none", textAlign: "center", marginTop: "0.4rem" }}>
            Login
          </a>
        </div>
      )}
    </>
  );
}
