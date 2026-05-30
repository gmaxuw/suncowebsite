"use client";
// app/components/GlobalFooter.tsx
// ─────────────────────────────────────────────────────────────
// Shared footer — reads everything from site_settings.
// Usage:
//   <GlobalFooter settings={settingsMap} />
// ─────────────────────────────────────────────────────────────

interface Props {
  settings: Record<string, string>;
}

export default function GlobalFooter({ settings }: Props) {
  const s = (key: string, fallback = "") => settings[key] || fallback;
  const currentYear = new Date().getFullYear();

  const FOOTER_LINKS = [
    [s("footer_link1_href", "#about"),      s("footer_link1_label", "About")],
    [s("footer_link2_href", "#programs"),   s("footer_link2_label", "Programs & Rights")],
    [s("footer_link3_href", "#membership"), s("footer_link3_label", "Membership")],
    [s("footer_link4_href", "#officers"),   s("footer_link4_label", "Officers & BOD")],
    [s("footer_link5_href", "#news"),       s("footer_link5_label", "News & Updates")],
  ].filter(([, label]) => label.trim() !== "");

  return (
    <footer style={{ background: "#080f0a", borderTop: "3px solid #C9A84C", padding: "3rem 0 1.5rem" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 2rem" }}>

        {/* 3-column grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr", gap: "2.5rem", marginBottom: "2rem" }}>

          {/* Col 1 — About */}
          <div>
            <p style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.1rem", fontWeight: 700, color: "#C9A84C", marginBottom: "0.3rem" }}>
              {s("org_short_name", "GOLDEN MENTORS")} Inc.
            </p>
            <p style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.3)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "0.6rem" }}>
              {s("org_name", "Organization Name")}
            </p>
            <p style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.45)", lineHeight: 1.7, marginBottom: "0.8rem" }}>
              {s("footer_tagline", "Protecting the rights and welfare of our members.")}
            </p>
            <div style={{ display: "inline-flex", alignItems: "center", background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.25)", padding: "3px 12px", borderRadius: 4, fontSize: "0.65rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#C9A84C" }}>
              {s("footer_badge_text", "Accredited Partner")}
            </div>
          </div>

          {/* Col 2 — Links */}
          <div>
            <h4 style={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#C9A84C", marginBottom: "1rem" }}>
              {s("footer_links_title", "Quick Links")}
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {FOOTER_LINKS.map(([href, label]) => (
                <a key={href} href={href} style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.5)", textDecoration: "none" }}>
                  {label}
                </a>
              ))}
            </div>
          </div>

          {/* Col 3 — Contact */}
          <div>
            <h4 style={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#C9A84C", marginBottom: "1rem" }}>
              {s("footer_contact_title", "Contact")}
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {s("org_address") && (
                <p style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.5)", lineHeight: 1.6 }}>{s("org_address")}</p>
              )}
              {s("org_email") && (
                <a href={`mailto:${s("org_email")}`} style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.5)", textDecoration: "none" }}>{s("org_email")}</a>
              )}
              {s("org_phone") && (
                <p style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.5)" }}>{s("org_phone")}</p>
              )}
            </div>
          </div>
        </div>

        {/* Copyright bar */}
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "1.2rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
          <p style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.25)" }}>
            © {currentYear} {s("footer_copyright_text", `${s("org_name","Organization")}. All rights reserved.`)}
          </p>
          <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.3)", border: "1px solid rgba(255,255,255,0.1)", padding: "3px 10px", borderRadius: 3 }}>
            {s("footer_sec_badge", "SEC Registered")}
          </div>
        </div>

      </div>
    </footer>
  );
}
