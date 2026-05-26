"use client";
import { useState, useEffect } from "react";
import { Shield, Users, BookOpen, Heart, Megaphone, ChevronRight, MapPin, Mail, Menu, X } from "lucide-react";
import SeniorCitizenCalculator from "@/app/components/SeniorCitizenCalculator";
import MembershipForm from "@/app/components/MembershipForm";
import { createClient } from "@/utils/supabase/client";

interface Props {
  settings: Record<string, string>;
  officers: any[];
  programs: any[];
  articles: any[];
  navPages?: { title: string; slug: string; nav_label: string; nav_order: number }[];
}

export default function HomeClient({ settings, officers, programs, articles, navPages = [] }: Props) {
  const s = (key: string, fallback = "") => settings[key] || fallback;
  const [menuOpen, setMenuOpen] = useState(false);
  const [authUser, setAuthUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setAuthUser(data.user);
      setAuthLoading(false);
    });
  }, []);

  const executives = officers.filter(o => o.role_type === "executive");
  const pios = officers.filter(o => o.role_type === "pio");
  const bod = officers.filter(o => o.role_type === "bod");

  const getInitials = (name: string) => {
    const parts = (name || "").split(" ").filter((p: string) => p.length > 0 && !p.includes("."));
    return parts.slice(0, 2).map((p: string) => p[0]).join("").toUpperCase();
  };

  const feeLifetime = s("fee_lifetime", "0");
  const feeAof = s("fee_aof", "0");
  const feeMas = s("fee_mas", "0");

  const NAV_LINKS = [
    [s("nav_link1_href", "#about"),      s("nav_link1_label", "")],
    [s("nav_link2_href", "#programs"),   s("nav_link2_label", "")],
    [s("nav_link3_href", "#membership"), s("nav_link3_label", "")],
    [s("nav_link4_href", "#officers"),   s("nav_link4_label", "")],
    [s("nav_link5_href", "#news"),       s("nav_link5_label", "")],
    // ── Dynamic pages from CMS ──
    ...navPages.map(p => [`/${p.slug}`, p.nav_label || p.title]),
  ].filter(([, label]) => label.trim() !== "");

  const FOOTER_LINKS = [
    [s("footer_link1_href", "#about"),      s("footer_link1_label", "About")],
    [s("footer_link2_href", "#programs"),   s("footer_link2_label", "Programs & Rights")],
    [s("footer_link3_href", "#membership"), s("footer_link3_label", "Membership")],
    [s("footer_link4_href", "#officers"),   s("footer_link4_label", "Officers & BOD")],
    [s("footer_link5_href", "#news"),       s("footer_link5_label", "News & Updates")],
  ];

  const GOLD_BAND = [
    s("gold_band1", "Consumer Protection"),
    s("gold_band2", "Welfare Advocacy"),
    s("gold_band3", "DTI Partnership"),
    s("gold_band4", "Mortuary Assistance"),
    s("gold_band5", "Our Region"),
  ].filter(Boolean);

  const ABOUT_CARDS = [
    { icon: <BookOpen size={16}/>, title: s("about_card1_title","Rights Education"),  desc: s("about_card1_desc","Informing members of their basic rights and legal protections.") },
    { icon: <Users size={16}/>,    title: s("about_card2_title","DTI Partnership"),   desc: s("about_card2_desc","Coordinating with DTI on consumer affairs programs and policy implementation.") },
    { icon: <Megaphone size={16}/>,title: s("about_card3_title","Advocacy"),          desc: s("about_card3_desc","Representing consumer interests in local government and trade consultations.") },
    { icon: <Heart size={16}/>,    title: s("about_card4_title","Welfare Services"),  desc: s("about_card4_desc","Providing mutual aid and welfare assistance to members and their families.") },
  ];

  const HISTORY = [
    { year: s("history1_year","2011"),          color: "var(--gold)",     title: s("history1_title","Foundation"),           text: s("history1_text","Formally established and registered with the SEC.") },
    { year: s("history2_year","Early Years"),   color: "var(--green-lt)", title: s("history2_title","DTI Accreditation"),    text: s("history2_text","Secured accreditation as an official DTI partner organization.") },
    { year: s("history3_year","Growth Period"), color: "var(--blue-lt)",  title: s("history3_title","Expanding Membership"), text: s("history3_text","Expanded membership and introduced the mutual assistance program.") },
    { year: s("org_established","2025"),        color: "var(--gold)",     title: s("history4_title","Election of New Officers"), text: s("history4_text","New officers elected at the General Assembly, bringing fresh direction to the organization.") },
  ];

  const currentYear = new Date().getFullYear();

  return (
    <div style={{ position: "relative" }}>
    <main suppressHydrationWarning>

    {/* NAV */}
    <nav style={{ position: "sticky", top: 0, zIndex: 100, background: "var(--green-dk)", borderBottom: "3px solid var(--gold)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 1.2rem", height: "64px" }}>
      <a href="/" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none" }}>
        <img src={s("hero_logo_url", "/images/sunco-logo.png")} alt={s("org_short_name","ORG")} width={40} height={40} style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "contain" }} />
        <span style={{ fontFamily: "'Playfair Display', serif", fontSize: "1rem", fontWeight: 700, color: "var(--gold-lt)", letterSpacing: "0.04em" }}>{s("org_short_name", "ORG")}</span>
      </a>

      {/* Desktop nav */}
      <div className="resp-nav-links">
        {NAV_LINKS.map(([href, label]) => (
          <a key={href} href={href} style={{ color: "rgba(255,255,255,0.75)", textDecoration: "none", fontSize: "0.78rem", fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", padding: "0 0.9rem", height: "64px", display: "flex", alignItems: "center" }}>{label}</a>
        ))}
        {!authLoading && authUser
          ? <a href="/dashboard" style={{ background: "rgba(212,160,23,0.15)", color: "var(--gold-lt)", border: "1px solid rgba(212,160,23,0.3)", padding: "0.45rem 1.2rem", borderRadius: 4, fontSize: "0.78rem", fontWeight: 500, textTransform: "uppercase", textDecoration: "none", marginLeft: "0.5rem" }}>My Account</a>
          : !authLoading && <a href="/login" style={{ color: "rgba(255,255,255,0.75)", textDecoration: "none", fontSize: "0.78rem", fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", padding: "0 0.9rem", height: "64px", display: "flex", alignItems: "center" }}>{s("nav_login_label", "Login")}</a>
        }
        {!authLoading && !authUser && (
          <a href={s("nav_join_href", "/register")} style={{ background: "var(--gold)", color: "var(--green-dk)", padding: "0.45rem 1.2rem", borderRadius: 4, fontSize: "0.78rem", fontWeight: 500, textTransform: "uppercase", textDecoration: "none", marginLeft: "0.5rem" }}>{s("nav_join_label", "Join Now")}</a>
        )}
      </div>

      <button className="nav-hamburger" onClick={() => setMenuOpen(o => !o)} aria-label="Toggle menu">
        {menuOpen ? <X size={24} color="white" /> : <Menu size={24} color="white" />}
      </button>
    </nav>

    {/* Mobile drawer */}
    {menuOpen && (
      <div style={{ position: "absolute", top: "64px", left: 0, right: 0, background: "var(--green-dk)", borderBottom: "3px solid var(--gold)", zIndex: 99, display: "flex", flexDirection: "column", padding: "1rem 1.5rem 1.5rem" }}>
        {NAV_LINKS.map(([href, label]) => (
          <a key={href} href={href} onClick={() => setMenuOpen(false)} style={{ color: "rgba(255,255,255,0.8)", textDecoration: "none", fontSize: "0.88rem", fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", padding: "0.85rem 0", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "block" }}>{label}</a>
        ))}
        {!authLoading && authUser
          ? <a href="/dashboard" onClick={() => setMenuOpen(false)} style={{ color: "var(--gold-lt)", textDecoration: "none", fontSize: "0.88rem", fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", padding: "0.85rem 0", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "block" }}>My Account</a>
          : !authLoading && <a href="/login" onClick={() => setMenuOpen(false)} style={{ color: "rgba(255,255,255,0.8)", textDecoration: "none", fontSize: "0.88rem", fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", padding: "0.85rem 0", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "block" }}>{s("nav_login_label", "Login")}</a>
        }
        {!authLoading && !authUser && (
          <a href={s("nav_join_href", "/register")} onClick={() => setMenuOpen(false)} style={{ marginTop: "0.8rem", background: "var(--gold)", color: "var(--green-dk)", textAlign: "center", padding: "0.75rem", borderRadius: 4, fontWeight: 600, textDecoration: "none", display: "block" }}>{s("nav_join_label", "Join Now")}</a>
        )}
      </div>
    )}

    {/* HERO */}
    <section style={{ minHeight: "92vh", display: "flex", alignItems: "center", background: "var(--green-dk)", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", width: 680, height: 680, borderRadius: "50%", border: "1px solid rgba(212,160,23,0.12)", right: -160, top: -80 }} />
      <div style={{ position: "absolute", width: 440, height: 440, borderRadius: "50%", border: "1px solid rgba(212,160,23,0.08)", right: -60, top: 20 }} />
      <div className="resp-grid-hero resp-hero-pad" style={{ maxWidth: 1200, margin: "0 auto", padding: "5rem 2.5rem", width: "100%", position: "relative", zIndex: 2 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "1.5rem" }}>
            <div style={{ width: 28, height: 1.5, background: "var(--gold)" }} />
            <span style={{ fontSize: "0.7rem", fontWeight: 500, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--gold)" }}>{s("hero_eyebrow", "Est. 2011")}</span>
          </div>
          <h1 className="playfair" style={{ fontSize: "clamp(2.2rem, 5vw, 4.2rem)", fontWeight: 900, lineHeight: 1.08, color: "white", marginBottom: "0.5rem" }}>
            {s("hero_title_line1", "Protecting")} <em style={{ fontStyle: "italic", color: "var(--gold-lt)" }}>{s("hero_title_highlight", "Consumers,")}</em><br />
            {s("hero_title_line2", "Empowering")}<br />
            {s("hero_title_line3", "Communities.")}
          </h1>
          <p className="sourceserif" style={{ fontSize: "1.05rem", fontWeight: 300, fontStyle: "italic", color: "rgba(255,255,255,0.55)", marginBottom: "1.5rem" }}>
            {s("hero_subtitle", "SEC Registered · DTI Partner Organization")}
          </p>
          <p style={{ fontSize: "0.95rem", color: "rgba(255,255,255,0.7)", lineHeight: 1.8, maxWidth: 520, marginBottom: "2.5rem" }}>
            {s("hero_description")}
          </p>
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: "2.5rem" }}>
            <a href="#membership" style={{ background: "var(--gold)", color: "var(--green-dk)", border: "none", padding: "0.85rem 2rem", fontSize: "0.85rem", fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", borderRadius: 4, textDecoration: "none" }}>{s("hero_btn1_text", "Become a Member")}</a>
            <a href="#about" style={{ background: "transparent", color: "rgba(255,255,255,0.85)", border: "1.5px solid rgba(255,255,255,0.3)", padding: "0.85rem 2rem", fontSize: "0.85rem", fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", borderRadius: 4, textDecoration: "none" }}>{s("hero_btn2_text", "Our Mission")}</a>
          </div>
          <div style={{ display: "flex", gap: "2.5rem", paddingTop: "2rem", borderTop: "1px solid rgba(212,160,23,0.2)", flexWrap: "wrap" }}>
            {[
              [s("hero_stat1_num", "2011"), s("hero_stat1_label", "Year Founded")],
              [s("hero_stat2_num", "SEC"),  s("hero_stat2_label", "Registered Org.")],
              [s("hero_stat3_num", "DTI"),  s("hero_stat3_label", "Accredited Partner")],
            ].map(([num, label]) => (
              <div key={label}>
                <div className="playfair" style={{ fontSize: "1.8rem", fontWeight: 700, color: "var(--gold-lt)", lineHeight: 1 }}>{num}</div>
                <div style={{ fontSize: "0.7rem", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", marginTop: 4 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="resp-logo-col">
          <img src={s("hero_logo_url", "/images/sunco-logo.png")} alt={`${s("org_short_name","ORG")} Official Seal`} width={220} height={220} loading="eager" style={{ width: 220, height: 220, borderRadius: "50%", objectFit: "contain", border: "3px solid rgba(212,160,23,0.3)", padding: 8 }} />
          <div style={{ background: "rgba(212,160,23,0.15)", border: "1px solid rgba(212,160,23,0.3)", borderRadius: 20, padding: "5px 14px", fontSize: "0.72rem", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--gold-lt)" }}>
            Official Seal · {s("org_short_name","ORG")} Inc.
          </div>
        </div>
      </div>
    </section>

    {/* GOLD BAND */}
    <div style={{ background: "var(--gold)", padding: "1rem 2.5rem", display: "flex", justifyContent: "center", alignItems: "center", gap: "2rem", flexWrap: "wrap" }}>
      {GOLD_BAND.map((item, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <span style={{ fontSize: "0.75rem", fontWeight: 500, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--green-dk)" }}>{item}</span>
          {i < GOLD_BAND.length - 1 && <div style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--green-dk)", opacity: 0.4 }} />}
        </div>
      ))}
    </div>

    {/* ABOUT */}
    <section id="about" className="resp-section-pad" style={{ padding: "6rem 0", background: "var(--cream)" }}>
      <div className="resp-inner-pad" style={{ maxWidth: 1200, margin: "0 auto", padding: "0 2.5rem" }}>
        <div className="resp-grid-2">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "0.8rem" }}>
              <div style={{ width: 20, height: 1.5, background: "var(--gold)" }} />
              <span style={{ fontSize: "0.68rem", fontWeight: 500, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--gold-dk)" }}>Who We Are</span>
            </div>
            <h2 className="playfair" style={{ fontSize: "clamp(1.8rem,3vw,2.6rem)", fontWeight: 700, color: "var(--green-dk)", lineHeight: 1.15, marginBottom: "1.5rem" }}>
              {s("about_title", "A trusted organization built for every consumer.")}
            </h2>
            <p className="sourceserif" style={{ fontSize: "1rem", lineHeight: 1.85, color: "var(--muted)", marginBottom: "1.1rem", fontWeight: 300 }}>{s("about_p1")}</p>
            <p className="sourceserif" style={{ fontSize: "1rem", lineHeight: 1.85, color: "var(--muted)", marginBottom: "1.1rem", fontWeight: 300 }}>{s("about_p2")}</p>
            <p className="sourceserif" style={{ fontSize: "1rem", lineHeight: 1.85, color: "var(--muted)", marginBottom: "1.1rem", fontWeight: 300 }}>{s("about_p3")}</p>
            <div className="resp-grid-2-sm" style={{ marginTop: "2rem" }}>
              {ABOUT_CARDS.map(({ icon, title, desc }) => (
                <div key={title} style={{ background: "white", border: "1px solid rgba(212,160,23,0.2)", borderTop: "3px solid var(--gold)", borderRadius: 6, padding: "1.2rem" }}>
                  <div style={{ width: 32, height: 32, background: "var(--gold)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "0.6rem", color: "var(--green-dk)" }}>{icon}</div>
                  <h4 style={{ fontSize: "0.82rem", fontWeight: 500, color: "var(--green-dk)", marginBottom: "0.3rem" }}>{title}</h4>
                  <p style={{ fontSize: "0.78rem", color: "var(--muted)", lineHeight: 1.5 }}>{desc}</p>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "1.5rem" }}>
              <div style={{ width: 20, height: 1.5, background: "var(--gold)" }} />
              <span style={{ fontSize: "0.68rem", fontWeight: 500, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--gold-dk)" }}>Our History</span>
            </div>
            <div style={{ position: "relative", paddingLeft: "1.8rem" }}>
              <div style={{ position: "absolute", left: 0, top: 8, bottom: 0, width: 2, background: "linear-gradient(to bottom, var(--gold), var(--green-lt), var(--blue-lt))" }} />
              {HISTORY.map(({ year, color, title, text }) => (
                <div key={year + title} style={{ position: "relative", marginBottom: "2rem", paddingBottom: "2rem", borderBottom: "1px solid rgba(212,160,23,0.1)" }}>
                  <div style={{ position: "absolute", left: "-2.2rem", top: 4, width: 12, height: 12, borderRadius: "50%", background: color, border: "2px solid var(--cream)" }} />
                  <div className="playfair" style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--gold-dk)", letterSpacing: "0.1em", marginBottom: "0.3rem" }}>{year}</div>
                  <h4 style={{ fontSize: "0.95rem", fontWeight: 500, color: "var(--green-dk)", marginBottom: "0.3rem" }}>{title}</h4>
                  <p style={{ fontSize: "0.83rem", color: "var(--muted)", lineHeight: 1.6 }}>{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>

    {/* PROGRAMS */}
    <section id="programs" className="resp-section-pad" style={{ padding: "6rem 0", background: "var(--green-dk)", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", width: 500, height: 500, borderRadius: "50%", border: "1px solid rgba(212,160,23,0.08)", right: -100, bottom: -100 }} />
      <div className="resp-inner-pad" style={{ maxWidth: 1200, margin: "0 auto", padding: "0 2.5rem", position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "0.8rem" }}>
          <div style={{ width: 20, height: 1.5, background: "var(--gold)" }} />
          <span style={{ fontSize: "0.68rem", fontWeight: 500, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(212,160,23,0.7)" }}>What We Do</span>
        </div>
        <h2 className="playfair" style={{ fontSize: "clamp(1.8rem,3vw,2.6rem)", fontWeight: 700, color: "white", lineHeight: 1.15, marginBottom: "1rem" }}>
          Programs & <em style={{ fontStyle: "italic", color: "var(--gold-lt)" }}>Consumer Rights</em>
        </h2>
        <p className="sourceserif" style={{ fontSize: "1rem", fontWeight: 300, fontStyle: "italic", color: "rgba(255,255,255,0.6)", maxWidth: 560, lineHeight: 1.7, marginBottom: "3rem" }}>
          {s("programs_subtitle", "Every member has rights protected by law. We actively educate, advocate, and assist our members in exercising these rights.")}
        </p>
        <div className="resp-grid-3">
          {programs.map(p => (
            <div key={p.id} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(212,160,23,0.18)", borderRadius: 8, padding: "1.8rem 1.5rem" }}>
              <div className="playfair" style={{ fontSize: "2.4rem", fontWeight: 900, color: "rgba(212,160,23,0.15)", lineHeight: 1, marginBottom: "0.5rem" }}>{p.number}</div>
              <h3 style={{ fontSize: "0.9rem", fontWeight: 500, color: "var(--gold-lt)", marginBottom: "0.6rem" }}>{p.title}</h3>
              <p style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.55)", lineHeight: 1.7 }}>{p.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* MEMBERSHIP */}
    <section id="membership" className="resp-section-pad" style={{ padding: "6rem 0", background: "var(--warm)" }}>
      <div className="resp-inner-pad" style={{ maxWidth: 1200, margin: "0 auto", padding: "0 2.5rem" }}>
        <div className="resp-grid-membership">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "0.8rem" }}>
              <div style={{ width: 20, height: 1.5, background: "var(--gold)" }} />
              <span style={{ fontSize: "0.68rem", fontWeight: 500, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--gold-dk)" }}>{s("membership_section_label","Join Now")}</span>
            </div>
            <h2 className="playfair" style={{ fontSize: "clamp(1.8rem,3vw,2.6rem)", fontWeight: 700, color: "var(--green-dk)", lineHeight: 1.15, marginBottom: "1rem" }}>
              Membership &<br /><em style={{ fontStyle: "italic", color: "var(--green-lt)" }}>Annual Fees</em>
            </h2>
            <p className="sourceserif" style={{ fontSize: "1rem", fontWeight: 300, fontStyle: "italic", color: "var(--muted)", lineHeight: 1.7, marginBottom: "1.5rem" }}>
              Become part of a growing community of empowered consumers.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "2rem" }}>
              {[
                { label: "Lifetime Membership Fee", desc: "One-time payment upon joining. Never expires.", amount: `₱${feeLifetime}`, sub: "once", border: "var(--gold)" },
                { label: "Annual Operating Fee (AOF)", desc: "Paid yearly. Covers organizational operations.", amount: `₱${feeAof}`, sub: "/year", border: "var(--blue-lt)" },
                { label: "Mortuary Assistance Service (MAS)", desc: "Annual mutual aid contribution for member families.", amount: `₱${feeMas}`, sub: "/year", border: "var(--green-lt)" },
              ].map(({ label, desc, amount, sub, border }) => (
                <div key={label} style={{ background: "white", borderRadius: 8, padding: "1.4rem 1.6rem", display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid rgba(26,92,42,0.12)", borderLeft: `4px solid ${border}`, flexWrap: "wrap", gap: "0.5rem" }}>
                  <div>
                    <div style={{ fontSize: "0.85rem", fontWeight: 500, color: "var(--green-dk)", marginBottom: "0.2rem" }}>{label}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>{desc}</div>
                  </div>
                  <div className="playfair" style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--green-dk)", whiteSpace: "nowrap" }}>
                    {amount} <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.75rem", fontWeight: 400, color: "var(--muted)" }}>{sub}</span>
                  </div>
                </div>
              ))}
            </div>
            <h4 style={{ fontSize: "0.8rem", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)", marginBottom: "1rem" }}>Membership Status Guide</h4>
            {[
              { color: "#2E8B44", label: "Active",     desc: "Member is current with payments. No 3 consecutive years of non-payment." },
              { color: "#D4A017", label: "Non-active", desc: "2 consecutive years delinquent. Benefits may be limited." },
              { color: "#C0392B", label: "Dropped",    desc: "Automatically removed after 3 consecutive years of non-payment." },
              { color: "#95A5A6", label: "Deceased",   desc: "Status updated by the organization upon notification." },
            ].map(({ color, label, desc }) => (
              <div key={label} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: "0.6rem", fontSize: "0.83rem", color: "var(--muted)", lineHeight: 1.5 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: color, flexShrink: 0, marginTop: 4 }} />
                <span><strong style={{ color }}>{label}</strong> -- {desc}</span>
              </div>
            ))}
          </div>
          {s("registration_open","true") === "true" ? (
            <MembershipForm feeLifetime={Number(feeLifetime)} feeAof={Number(feeAof)} feeMas={Number(feeMas)} />
          ) : (
            <div style={{ background:"white", borderRadius:12, padding:"2.5rem", border:"1px solid rgba(26,92,42,0.12)", textAlign:"center", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
              <div style={{ width:56, height:56, borderRadius:"50%", background:"rgba(192,57,43,0.08)", border:"2px solid rgba(192,57,43,0.2)", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:"1rem" }}>
                <span style={{ fontSize:"1.5rem" }}>🔒</span>
              </div>
              <h3 style={{ fontFamily:"'Playfair Display', serif", fontSize:"1.1rem", color:"var(--green-dk)", marginBottom:"0.5rem" }}>Registration Closed</h3>
              <p style={{ fontSize:"0.85rem", color:"var(--muted)", lineHeight:1.7 }}>Membership registration is currently closed. Please check back later or contact our officers directly.</p>
            </div>
          )}
        </div>
      </div>
    </section>

    {/* Senior Citizen Calculator */}
    <SeniorCitizenCalculator />

    {/* OFFICERS */}
    <section id="officers" className="resp-section-pad" style={{ padding: "6rem 0", background: "var(--cream)" }}>
      <div className="resp-inner-pad" style={{ maxWidth: 1200, margin: "0 auto", padding: "0 2.5rem" }}>
        <div className="resp-officers-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "3rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "0.8rem" }}>
              <div style={{ width: 20, height: 1.5, background: "var(--gold)" }} />
              <span style={{ fontSize: "0.68rem", fontWeight: 500, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--gold-dk)" }}>Leadership</span>
            </div>
            <h2 className="playfair" style={{ fontSize: "clamp(1.8rem,3vw,2.6rem)", fontWeight: 700, color: "var(--green-dk)", lineHeight: 1.15 }}>
              Officers & <em style={{ fontStyle: "italic", color: "var(--green-lt)" }}>Board of Directors</em>
            </h2>
          </div>
          <div style={{ fontSize: "0.78rem", color: "var(--muted)", background: "var(--warm)", border: "1px solid rgba(212,160,23,0.3)", padding: "0.5rem 1rem", borderRadius: 20, whiteSpace: "nowrap" }}>
            {s("officers_election_label","Election of Officers")}
          </div>
        </div>

        <div className="resp-grid-exec" style={{ gridTemplateColumns: `repeat(${Math.min(executives.length, 5)},1fr)` }}>
          {executives.map(officer => (
            <div key={officer.id} style={{ background: "white", borderRadius: 8, padding: "1.4rem 1rem", textAlign: "center", border: "1px solid rgba(26,92,42,0.08)", borderBottom: "3px solid var(--gold)" }}>
              {officer.photo_url ? (
                <img src={officer.photo_url} alt={officer.name} loading="lazy" width={56} height={56} style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover", margin: "0 auto 0.8rem", border: "2px solid rgba(212,160,23,0.3)", display: "block" }} />
              ) : (
                <div style={{ width: 56, height: 56, borderRadius: "50%", background: "var(--green-dk)", color: "var(--gold-lt)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Playfair Display',serif", fontSize: "1.2rem", fontWeight: 700, margin: "0 auto 0.8rem", border: "2px solid rgba(212,160,23,0.3)" }}>
                  {getInitials(officer.name)}
                </div>
              )}
              <div style={{ fontSize: "0.65rem", fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--gold-dk)", marginBottom: "0.3rem" }}>{officer.role}</div>
              <div style={{ fontSize: "0.85rem", fontWeight: 500, color: "var(--green-dk)", lineHeight: 1.3 }}>{officer.name}</div>
            </div>
          ))}
        </div>

        {pios.length > 0 && (
          <>
            <h3 className="playfair" style={{ fontSize: "1rem", fontWeight: 700, color: "var(--green-dk)", marginBottom: "1.2rem", paddingBottom: "0.6rem", borderBottom: "1px solid rgba(212,160,23,0.2)" }}>Public Information Officers (P.I.O.)</h3>
            <div className="resp-grid-2-sm" style={{ maxWidth: 520, marginBottom: "2.5rem" }}>
              {pios.map((officer, idx) => (
                <div key={officer.id} style={{ background: "var(--warm)", borderRadius: 6, padding: "1rem", display: "flex", alignItems: "center", gap: "0.8rem", border: "1px solid rgba(212,160,23,0.15)" }}>
                  {officer.photo_url ? (
                    <img src={officer.photo_url} alt={officer.name} loading="lazy" width={36} height={36} style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", border: "1.5px solid var(--gold)", flexShrink: 0 }} />
                  ) : (
                    <div className="playfair" style={{ fontSize: "1.1rem", fontWeight: 700, color: "rgba(212,160,23,0.4)", minWidth: 24 }}>{idx + 1}</div>
                  )}
                  <div>
                    <div style={{ fontSize: "0.82rem", fontWeight: 500, color: "var(--green-dk)" }}>{officer.name}</div>
                    <div style={{ fontSize: "0.68rem", color: "var(--muted)", marginTop: 2 }}>PIO</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {bod.length > 0 && (
          <>
            <h3 className="playfair" style={{ fontSize: "1rem", fontWeight: 700, color: "var(--green-dk)", marginBottom: "1.2rem", paddingBottom: "0.6rem", borderBottom: "1px solid rgba(212,160,23,0.2)" }}>Board of Directors (B.O.D.)</h3>
            <div className="resp-grid-4">
              {bod.map((officer, idx) => (
                <div key={officer.id} style={{ background: "var(--warm)", borderRadius: 6, padding: "1rem", display: "flex", alignItems: "center", gap: "0.8rem", border: "1px solid rgba(212,160,23,0.15)" }}>
                  {officer.photo_url ? (
                    <img src={officer.photo_url} alt={officer.name} loading="lazy" width={36} height={36} style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", border: "1.5px solid var(--gold)", flexShrink: 0 }} />
                  ) : (
                    <div className="playfair" style={{ fontSize: "1.1rem", fontWeight: 700, color: "rgba(212,160,23,0.4)", minWidth: 24 }}>{idx + 1}</div>
                  )}
                  <div>
                    <div style={{ fontSize: "0.82rem", fontWeight: 500, color: "var(--green-dk)" }}>{officer.name}</div>
                    <div style={{ fontSize: "0.68rem", color: "var(--muted)", marginTop: 2 }}>Board Member</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </section>

    {/* NEWS */}
    <section id="news" className="resp-section-pad" style={{ padding: "6rem 0", background: "var(--green-dk)" }}>
      <div className="resp-inner-pad" style={{ maxWidth: 1200, margin: "0 auto", padding: "0 2.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "0.8rem" }}>
          <div style={{ width: 20, height: 1.5, background: "var(--gold)" }} />
          <span style={{ fontSize: "0.68rem", fontWeight: 500, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(212,160,23,0.7)" }}>Latest Updates</span>
        </div>
        <h2 className="playfair" style={{ fontSize: "clamp(1.8rem,3vw,2.6rem)", fontWeight: 700, color: "white", lineHeight: 1.15, marginBottom: "2.5rem" }}>
          News & <em style={{ fontStyle: "italic", color: "var(--gold-lt)" }}>Announcements</em>
        </h2>
        {articles.length > 0 ? (
          <div className="resp-grid-articles" style={{ gridTemplateColumns: articles.length === 1 ? "1fr" : articles.length === 2 ? "1fr 1fr" : "1.4fr 1fr 1fr" }}>
            {articles.map((article, i) => (
              <a key={article.id} href={`/news/${article.slug || article.id}`} style={{ textDecoration: "none", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(212,160,23,0.15)", borderRadius: 8, overflow: "hidden", display: "block", transition: "border-color 0.2s" }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(212,160,23,0.5)")}
                onMouseLeave={e => (e.currentTarget.style.borderColor = "rgba(212,160,23,0.15)")}>
                <div style={{ height: i === 0 ? 260 : 180, position: "relative", overflow: "hidden" }}>
                  {article.thumbnail_url ? (
                    <img src={article.thumbnail_url} alt={article.title} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.3s" }}
                      onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.03)")}
                      onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")} />
                  ) : (
                    <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg,#1A3C6E,#2E8B44)" }} />
                  )}
                  <div style={{ position: "absolute", bottom: 10, left: 10 }}>
                    <span style={{ background: "var(--gold)", color: "var(--green-dk)", fontSize: "0.65rem", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", padding: "3px 10px", borderRadius: 3 }}>
                      {article.category?.replace("-", " ")}
                    </span>
                  </div>
                </div>
                <div style={{ padding: "1.3rem" }}>
                  <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.35)", marginBottom: "0.5rem", letterSpacing: "0.06em" }}>
                    {(() => {
                      const d = new Date(article.created_at);
                      const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
                      return `${months[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
                    })()}
                  </div>
                  <h3 className="sourceserif" style={{ fontSize: i === 0 ? "1.1rem" : "0.95rem", fontWeight: 400, color: "white", lineHeight: 1.4, marginBottom: "0.5rem" }}>{article.title}</h3>
                  <p style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.5)", lineHeight: 1.6, display: "-webkit-box", WebkitLineClamp: i === 0 ? 4 : 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {article.excerpt || article.body?.substring(0, 150)}
                  </p>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: "0.75rem", color: "var(--gold)", marginTop: "0.8rem", fontWeight: 500 }}>
                    Read more <ChevronRight size={12} />
                  </div>
                </div>
              </a>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "3rem", color: "rgba(255,255,255,0.4)" }}>
            <p style={{ fontSize: "0.9rem" }}>No articles published yet. Check back soon.</p>
          </div>
        )}
      </div>
    </section>

    {/* FOOTER */}
    <footer style={{ background: "#080f0a", borderTop: "3px solid var(--gold)", padding: "4rem 0 2rem" }}>
      <div className="resp-inner-pad" style={{ maxWidth: 1200, margin: "0 auto", padding: "0 2.5rem" }}>
        <div className="resp-grid-footer">
          <div>
            <h2 className="playfair" style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--gold-lt)", marginBottom: "0.4rem" }}>{s("org_short_name","ORG")} Inc.</h2>
            <p style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.35)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "0.6rem" }}>{s("org_name","Organization Name")}</p>
            <p style={{ fontSize: "0.83rem", color: "rgba(255,255,255,0.45)", lineHeight: 1.7 }}>
              {s("footer_tagline","Protecting the rights and welfare of our members.")}
            </p>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: "1rem", background: "rgba(212,160,23,0.1)", border: "1px solid rgba(212,160,23,0.25)", padding: "4px 12px", borderRadius: 4, fontSize: "0.7rem", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--gold)" }}>
              {s("footer_badge_text","Accredited Partner")}
            </div>
          </div>
          <div>
            <h4 style={{ fontSize: "0.72rem", fontWeight: 500, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--gold)", marginBottom: "1rem" }}>{s("footer_links_title","Quick Links")}</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem" }}>
              {FOOTER_LINKS.map(([href, label]) => (
                <a key={href} href={href} style={{ fontSize: "0.83rem", color: "rgba(255,255,255,0.5)", textDecoration: "none" }}>{label}</a>
              ))}
            </div>
          </div>
          <div>
            <h4 style={{ fontSize: "0.72rem", fontWeight: 500, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--gold)", marginBottom: "1rem" }}>{s("footer_contact_title","Contact")}</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.7rem" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: "0.83rem", color: "rgba(255,255,255,0.5)" }}>
                <MapPin size={14} style={{ marginTop: 2, flexShrink: 0, color: "var(--gold)" }} />
                <span>{s("org_address","Philippines")}</span>
              </div>
              {s("org_email") && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.83rem", color: "rgba(255,255,255,0.5)" }}>
                  <Mail size={14} style={{ color: "var(--gold)", flexShrink: 0 }} />
                  <span>{s("org_email")}</span>
                </div>
              )}
            </div>
          </div>
        </div>
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
          <p style={{ fontSize: "0.73rem", color: "rgba(255,255,255,0.25)" }}>© {currentYear} {s("footer_copyright_text","Organization Name. All rights reserved.")}</p>
          <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.3)", border: "1px solid rgba(255,255,255,0.1)", padding: "3px 10px", borderRadius: 3 }}>{s("footer_sec_badge","SEC Registered")}</div>
        </div>
      </div>
    </footer>

    </main>
    </div>
  );
}
