"use client";
import { Shield, Users, BookOpen, Heart, Megaphone, ChevronRight, MapPin, Phone, Mail } from "lucide-react";

export default function Home() {
  return (
    <main>

      {/* NAV */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "var(--green-dk)",
        borderBottom: "3px solid var(--gold)",
        display: "flex", alignItems: "center",
        justifyContent: "space-between",
        padding: "0 2.5rem", height: "64px"
      }}>
        <a href="#" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none" }}>
          <div style={{
            width: 36, height: 36, borderRadius: "50%",
            border: "2.5px solid var(--gold)", background: "var(--green)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "'Playfair Display', serif", fontSize: 13,
            fontWeight: 900, color: "var(--gold-lt)"
          }}>SC</div>
          <span style={{ fontFamily: "'Playfair Display', serif", fontSize: "1rem", fontWeight: 700, color: "var(--gold-lt)", letterSpacing: "0.04em" }}>SUNCO</span>
        </a>
        <div style={{ display: "flex", alignItems: "center", gap: "0.2rem" }}>
          {["#about","#programs","#membership","#officers","#news"].map((href, i) => (
            <a key={i} href={href} style={{
              color: "rgba(255,255,255,0.75)", textDecoration: "none",
              fontSize: "0.78rem", fontWeight: 500, letterSpacing: "0.06em",
              textTransform: "uppercase", padding: "0 0.9rem", height: "64px",
              display: "flex", alignItems: "center", transition: "color 0.2s"
            }}>
              {["About","Programs","Membership","Officers","News"][i]}
            </a>
          ))}
          <a href="#contact" style={{
            background: "var(--gold)", color: "var(--green-dk)",
            padding: "0.45rem 1.2rem", borderRadius: 4,
            fontSize: "0.78rem", fontWeight: 500,
            letterSpacing: "0.06em", textTransform: "uppercase",
            textDecoration: "none", marginLeft: "0.5rem"
          }}>Join Now</a>
        </div>
      </nav>

      {/* HERO */}
      <section style={{
        minHeight: "92vh", display: "flex", alignItems: "center",
        background: "var(--green-dk)", position: "relative", overflow: "hidden"
      }}>
        <div style={{
          position: "absolute", width: 680, height: 680, borderRadius: "50%",
          border: "1px solid rgba(212,160,23,0.12)", right: -160, top: -80
        }} />
        <div style={{
          position: "absolute", width: 440, height: 440, borderRadius: "50%",
          border: "1px solid rgba(212,160,23,0.08)", right: -60, top: 20
        }} />
        <div style={{
          maxWidth: 1200, margin: "0 auto", padding: "5rem 2.5rem",
          display: "grid", gridTemplateColumns: "1fr 320px",
          gap: "4rem", alignItems: "center", width: "100%", position: "relative", zIndex: 2
        }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "1.5rem" }}>
              <div style={{ width: 28, height: 1.5, background: "var(--gold)" }} />
              <span style={{ fontSize: "0.7rem", fontWeight: 500, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--gold)" }}>
                Surigao del Norte · Est. 2011
              </span>
            </div>
<h1 className="playfair" style={{
  fontSize: "clamp(2.8rem, 5vw, 4.2rem)", fontWeight: 900,
  lineHeight: 1.08, color: "white", marginBottom: "0.5rem"
}}>
  Protecting <em style={{ fontStyle: "italic", color: "var(--gold-lt)" }}>Consumers,</em><br />
  Empowering<br />
  Communities.
</h1>
            <p className="sourceserif" style={{ fontSize: "1.05rem", fontWeight: 300, fontStyle: "italic", color: "rgba(255,255,255,0.55)", marginBottom: "1.5rem" }}>
              SEC Registered · DTI Partner Organization
            </p>
            <p style={{ fontSize: "0.95rem", color: "rgba(255,255,255,0.7)", lineHeight: 1.8, maxWidth: 520, marginBottom: "2.5rem" }}>
              SUNCO is the voice of consumers in Surigao del Norte — advocating for your rights, safeguarding your welfare, and connecting communities to programs and information they deserve.
            </p>
            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: "2.5rem" }}>
              <a href="#membership" style={{
                background: "var(--gold)", color: "var(--green-dk)", border: "none",
                padding: "0.85rem 2rem", fontSize: "0.85rem", fontWeight: 500,
                letterSpacing: "0.06em", textTransform: "uppercase", borderRadius: 4,
                textDecoration: "none", display: "inline-block"
              }}>Become a Member</a>
              <a href="#about" style={{
                background: "transparent", color: "rgba(255,255,255,0.85)",
                border: "1.5px solid rgba(255,255,255,0.3)",
                padding: "0.85rem 2rem", fontSize: "0.85rem", fontWeight: 500,
                letterSpacing: "0.06em", textTransform: "uppercase", borderRadius: 4,
                textDecoration: "none", display: "inline-block"
              }}>Our Mission</a>
            </div>
            <div style={{ display: "flex", gap: "2.5rem", paddingTop: "2rem", borderTop: "1px solid rgba(212,160,23,0.2)" }}>
              {[["2011","Year Founded"],["SEC","Registered Org."],["DTI","Accredited Partner"]].map(([num, label]) => (
                <div key={label}>
                  <div className="playfair" style={{ fontSize: "1.8rem", fontWeight: 700, color: "var(--gold-lt)", lineHeight: 1 }}>{num}</div>
                  <div style={{ fontSize: "0.7rem", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", marginTop: 4 }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
          {/* Logo */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1.2rem" }}>
            <img
              src="/images/sunco-logo.png"
              alt="SUNCO Official Seal"
              style={{ width: 220, height: 220, borderRadius: "50%", objectFit: "contain", border: "3px solid rgba(212,160,23,0.3)", padding: 8 }}
            />
            <div style={{
              background: "rgba(212,160,23,0.15)", border: "1px solid rgba(212,160,23,0.3)",
              borderRadius: 20, padding: "5px 14px", fontSize: "0.72rem", fontWeight: 500,
              letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--gold-lt)"
            }}>Official Seal · SUNCO Inc.</div>
          </div>
        </div>
      </section>

      {/* GOLD BAND */}
      <div style={{ background: "var(--gold)", padding: "1rem 2.5rem", display: "flex", justifyContent: "center", alignItems: "center", gap: "2rem", flexWrap: "wrap" }}>
        {["Consumer Protection","Welfare Advocacy","DTI Partnership","Mortuary Assistance","Surigao del Norte"].map((item, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 500, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--green-dk)" }}>{item}</span>
            {i < 4 && <div style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--green-dk)", opacity: 0.4 }} />}
          </div>
        ))}
      </div>

      {/* ABOUT */}
      <section id="about" style={{ padding: "6rem 0", background: "var(--cream)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 2.5rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "5rem", alignItems: "start" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "0.8rem" }}>
                <div style={{ width: 20, height: 1.5, background: "var(--gold)" }} />
                <span style={{ fontSize: "0.68rem", fontWeight: 500, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--gold-dk)" }}>Who We Are</span>
              </div>
              <h2 className="playfair" style={{ fontSize: "clamp(1.8rem,3vw,2.6rem)", fontWeight: 700, color: "var(--green-dk)", lineHeight: 1.15, marginBottom: "1.5rem" }}>
                A trusted organization<br />built for <em style={{ fontStyle: "italic", color: "var(--green-lt)" }}>every consumer.</em>
              </h2>
              {[
                <>The <strong style={{color:"var(--green)"}}>Surigao del Norte Consumers Organization, Inc. (SUNCO)</strong> was established in 2011 as the collective voice for consumers across Surigao del Norte — a duly registered organization under the Securities and Exchange Commission (SEC) of the Philippines.</>,
                <>As an accredited partner of the <strong style={{color:"var(--green)"}}>Department of Trade and Industry (DTI)</strong>, SUNCO works alongside government agencies to promote fair trade, consumer rights, and community welfare throughout the Caraga Region.</>,
                <>Our membership is composed of local consumers from across Surigao del Norte — fishermen, farmers, workers, and entrepreneurs — all united in the shared goal of consumer protection and mutual aid.</>
              ].map((text, i) => (
                <p key={i} className="sourceserif" style={{ fontSize: "1rem", lineHeight: 1.85, color: "var(--muted)", marginBottom: "1.1rem", fontWeight: 300 }}>{text}</p>
              ))}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginTop: "2rem" }}>
                {[
                  { icon: <BookOpen size={16}/>, title: "Rights Education", desc: "Informing consumers of their basic rights and legal protections under Philippine law." },
                  { icon: <Users size={16}/>, title: "DTI Partnership", desc: "Coordinating with DTI on consumer affairs programs and policy implementation." },
                  { icon: <Megaphone size={16}/>, title: "Advocacy", desc: "Representing consumer interests in local government and trade consultations." },
                  { icon: <Heart size={16}/>, title: "Welfare Services", desc: "Providing mortuary assistance and mutual aid to members and their families." },
                ].map(({ icon, title, desc }) => (
                  <div key={title} style={{ background: "white", border: "1px solid rgba(212,160,23,0.2)", borderTop: "3px solid var(--gold)", borderRadius: 6, padding: "1.2rem" }}>
                    <div style={{ width: 32, height: 32, background: "var(--gold)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "0.6rem", color: "var(--green-dk)" }}>{icon}</div>
                    <h4 style={{ fontSize: "0.82rem", fontWeight: 500, color: "var(--green-dk)", marginBottom: "0.3rem" }}>{title}</h4>
                    <p style={{ fontSize: "0.78rem", color: "var(--muted)", lineHeight: 1.5 }}>{desc}</p>
                  </div>
                ))}
              </div>
            </div>
            {/* Timeline */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "1.5rem" }}>
                <div style={{ width: 20, height: 1.5, background: "var(--gold)" }} />
                <span style={{ fontSize: "0.68rem", fontWeight: 500, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--gold-dk)" }}>Our History</span>
              </div>
              <div style={{ position: "relative", paddingLeft: "1.8rem" }}>
                <div style={{ position: "absolute", left: 0, top: 8, bottom: 0, width: 2, background: "linear-gradient(to bottom, var(--gold), var(--green-lt), var(--blue-lt))" }} />
                {[
                  { year: "2011", color: "var(--gold)", title: "Foundation of SUNCO", text: "Formally established and registered with the SEC, bringing together local consumers of Surigao del Norte under one unified organization with a clear mandate for consumer protection." },
                  { year: "Early Years", color: "var(--green-lt)", title: "DTI Accreditation", text: "SUNCO secured accreditation as an official partner of the Department of Trade and Industry, Region XIII (Caraga), strengthening its mandate to advocate for consumers in Northern Mindanao." },
                  { year: "Growth Period", color: "var(--blue-lt)", title: "Expanding Membership & MAS", text: "Expanded membership across multiple municipalities in Surigao del Norte, introducing the Mortuary Assistance Service (MAS) program to provide financial support to bereaved member families." },
                  { year: "2025", color: "var(--gold)", title: "Election of New Officers", text: "New officers elected at the 2025 General Assembly, with Engr. Jaime Conales leading as President, bringing fresh direction to SUNCO's consumer protection programs." },
                ].map(({ year, color, title, text }) => (
                  <div key={year} style={{ position: "relative", marginBottom: "2rem", paddingBottom: "2rem", borderBottom: "1px solid rgba(212,160,23,0.1)" }}>
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
      <section id="programs" style={{ padding: "6rem 0", background: "var(--green-dk)", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", width: 500, height: 500, borderRadius: "50%", border: "1px solid rgba(212,160,23,0.08)", right: -100, bottom: -100 }} />
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 2.5rem", position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "0.8rem" }}>
            <div style={{ width: 20, height: 1.5, background: "var(--gold)" }} />
            <span style={{ fontSize: "0.68rem", fontWeight: 500, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(212,160,23,0.7)" }}>What We Do</span>
          </div>
          <h2 className="playfair" style={{ fontSize: "clamp(1.8rem,3vw,2.6rem)", fontWeight: 700, color: "white", lineHeight: 1.15, marginBottom: "1rem" }}>
            Programs & <em style={{ fontStyle: "italic", color: "var(--gold-lt)" }}>Consumer Rights</em>
          </h2>
          <p className="sourceserif" style={{ fontSize: "1rem", fontWeight: 300, fontStyle: "italic", color: "rgba(255,255,255,0.6)", maxWidth: 560, lineHeight: 1.7, marginBottom: "3rem" }}>
            Every Filipino consumer has rights protected by law. SUNCO actively educates, advocates, and assists our members in exercising these rights.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "1.5rem" }}>
            {[
              { n:"01", title:"Right to Basic Needs", text:"Advocacy for access to adequate food, clothing, shelter, healthcare, and education — the fundamental entitlements of every Filipino consumer." },
              { n:"02", title:"Right to Safety", text:"Monitoring and reporting of unsafe products. SUNCO coordinates with DTI and local authorities to remove hazardous goods from circulation in Surigao del Norte." },
              { n:"03", title:"Right to Information", text:"Providing accurate, unbiased information about products, prices, and legal rights under the Consumer Act of the Philippines (R.A. 7394)." },
              { n:"04", title:"Right to Choose", text:"Promoting healthy market competition and fair trade practices so consumers in Surigao del Norte have real, quality choices in the marketplace." },
              { n:"05", title:"Mortuary Assistance (MAS)", text:"A mutual aid program providing financial assistance to member families during bereavement. Members contribute ₱740 annually to sustain this vital safety net." },
              { n:"06", title:"Consumer Education", text:"Seminars and information drives conducted with DTI to raise awareness of consumer rights, fraud prevention, and responsible purchasing habits." },
            ].map(({ n, title, text }) => (
              <div key={n} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(212,160,23,0.18)", borderRadius: 8, padding: "1.8rem 1.5rem", transition: "background 0.2s" }}>
                <div className="playfair" style={{ fontSize: "2.4rem", fontWeight: 900, color: "rgba(212,160,23,0.15)", lineHeight: 1, marginBottom: "0.5rem" }}>{n}</div>
                <h3 style={{ fontSize: "0.9rem", fontWeight: 500, color: "var(--gold-lt)", marginBottom: "0.6rem" }}>{title}</h3>
                <p style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.55)", lineHeight: 1.7 }}>{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MEMBERSHIP */}
      <section id="membership" style={{ padding: "6rem 0", background: "var(--warm)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 2.5rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 440px", gap: "4rem", alignItems: "start" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "0.8rem" }}>
                <div style={{ width: 20, height: 1.5, background: "var(--gold)" }} />
                <span style={{ fontSize: "0.68rem", fontWeight: 500, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--gold-dk)" }}>Join SUNCO</span>
              </div>
              <h2 className="playfair" style={{ fontSize: "clamp(1.8rem,3vw,2.6rem)", fontWeight: 700, color: "var(--green-dk)", lineHeight: 1.15, marginBottom: "1rem" }}>
                Membership &<br /><em style={{ fontStyle: "italic", color: "var(--green-lt)" }}>Annual Fees</em>
              </h2>
              <p className="sourceserif" style={{ fontSize: "1rem", fontWeight: 300, fontStyle: "italic", color: "var(--muted)", lineHeight: 1.7, marginBottom: "1.5rem" }}>
                Become part of a growing community of empowered consumers. Your membership directly funds advocacy, education, and mutual aid programs across Surigao del Norte.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "2rem" }}>
                {[
                  { label: "Lifetime Membership Fee", desc: "One-time payment upon joining. Never expires.", amount: "₱200", sub: "once", border: "var(--gold)" },
                  { label: "Annual Operating Fee (AOF)", desc: "Paid yearly. Covers organizational operations.", amount: "₱100", sub: "/year", border: "var(--blue-lt)" },
                  { label: "Mortuary Assistance Service (MAS)", desc: "Annual mutual aid contribution for member families.", amount: "₱740", sub: "/year", border: "var(--green-lt)" },
                ].map(({ label, desc, amount, sub, border }) => (
                  <div key={label} style={{ background: "white", borderRadius: 8, padding: "1.4rem 1.6rem", display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid rgba(26,92,42,0.12)", borderLeft: `4px solid ${border}` }}>
                    <div>
                      <div style={{ fontSize: "0.85rem", fontWeight: 500, color: "var(--green-dk)", marginBottom: "0.2rem" }}>{label}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>{desc}</div>
                    </div>
                    <div className="playfair" style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--green-dk)", whiteSpace: "nowrap", marginLeft: "1rem" }}>
                      {amount} <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.75rem", fontWeight: 400, color: "var(--muted)" }}>{sub}</span>
                    </div>
                  </div>
                ))}
              </div>
              <h4 style={{ fontSize: "0.8rem", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)", marginBottom: "1rem" }}>Membership Status Guide</h4>
              {[
                { color: "#2E8B44", label: "Active", desc: "Member is current with payments. No 3 consecutive years of non-payment." },
                { color: "#D4A017", label: "Non-active", desc: "2 consecutive years delinquent. Benefits may be limited." },
                { color: "#C0392B", label: "Dropped", desc: "Automatically removed after 3 consecutive years of non-payment." },
                { color: "#95A5A6", label: "Deceased", desc: "Status updated by the organization upon notification." },
              ].map(({ color, label, desc }) => (
                <div key={label} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: "0.6rem", fontSize: "0.83rem", color: "var(--muted)", lineHeight: 1.5 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: color, flexShrink: 0, marginTop: 4 }} />
                  <span><strong style={{ color }}>{label}</strong> — {desc}</span>
                </div>
              ))}
            </div>

            {/* Join Form */}
            <div id="contact" style={{ background: "white", borderRadius: 10, padding: "2.2rem", border: "1px solid rgba(212,160,23,0.2)", boxShadow: "0 4px 30px rgba(26,92,42,0.08)", position: "sticky", top: 80 }}>
              <h3 className="playfair" style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--green-dk)", marginBottom: "0.3rem" }}>Join SUNCO Today</h3>
              <p style={{ fontSize: "0.8rem", color: "var(--muted)", marginBottom: "1.6rem", lineHeight: 1.5 }}>Fill in your details and our officers will contact you to complete your registration.</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.8rem" }}>
                {[["First Name","Juan"],["Last Name","dela Cruz"]].map(([label, ph]) => (
                  <div key={label}>
                    <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--green-dk)", marginBottom: "0.4rem" }}>{label}</label>
                    <input type="text" placeholder={ph} style={{ width: "100%", padding: "0.7rem 0.9rem", border: "1.5px solid rgba(26,92,42,0.15)", borderRadius: 5, fontFamily: "'DM Sans',sans-serif", fontSize: "0.88rem", color: "var(--text)", background: "var(--cream)", outline: "none" }} />
                  </div>
                ))}
              </div>
              {[
                { label: "Complete Address", type: "text", ph: "Barangay, Municipality, Surigao del Norte" },
                { label: "Contact Number", type: "tel", ph: "09XX XXX XXXX" },
                { label: "Email Address", type: "email", ph: "juan@email.com" },
              ].map(({ label, type, ph }) => (
                <div key={label} style={{ marginTop: "0.8rem" }}>
                  <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--green-dk)", marginBottom: "0.4rem" }}>{label}</label>
                  <input type={type} placeholder={ph} style={{ width: "100%", padding: "0.7rem 0.9rem", border: "1.5px solid rgba(26,92,42,0.15)", borderRadius: 5, fontFamily: "'DM Sans',sans-serif", fontSize: "0.88rem", color: "var(--text)", background: "var(--cream)", outline: "none" }} />
                </div>
              ))}
              <div style={{ background: "var(--green-dk)", color: "white", borderRadius: 6, padding: "1rem 1.2rem", display: "flex", justifyContent: "space-between", alignItems: "center", margin: "1.2rem 0" }}>
                <span style={{ fontSize: "0.82rem", opacity: 0.7 }}>First Year Total</span>
                <span className="playfair" style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--gold-lt)" }}>₱1,040</span>
              </div>
              <button style={{ width: "100%", background: "var(--gold)", color: "var(--green-dk)", border: "none", padding: "0.9rem", fontSize: "0.85rem", fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", borderRadius: 4, cursor: "pointer" }}>
                Submit Application
              </button>
              <p style={{ textAlign: "center", fontSize: "0.72rem", color: "var(--muted)", marginTop: "0.8rem" }}>Our officers will follow up within 3–5 business days.</p>
            </div>
          </div>
        </div>
      </section>

      {/* OFFICERS */}
      <section id="officers" style={{ padding: "6rem 0", background: "var(--cream)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 2.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "3rem" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "0.8rem" }}>
                <div style={{ width: 20, height: 1.5, background: "var(--gold)" }} />
                <span style={{ fontSize: "0.68rem", fontWeight: 500, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--gold-dk)" }}>Leadership</span>
              </div>
              <h2 className="playfair" style={{ fontSize: "clamp(1.8rem,3vw,2.6rem)", fontWeight: 700, color: "var(--green-dk)", lineHeight: 1.15 }}>
                Officers & <em style={{ fontStyle: "italic", color: "var(--green-lt)" }}>Board of Directors</em>
              </h2>
            </div>
            <div style={{ fontSize: "0.78rem", color: "var(--muted)", background: "var(--warm)", border: "1px solid rgba(212,160,23,0.3)", padding: "0.5rem 1rem", borderRadius: 20 }}>Election of Officers · 2025</div>
          </div>

          {/* Executive Officers */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: "1.2rem", marginBottom: "3rem" }}>
            {[
              { initials:"JC", role:"President", name:"Engr. Jaime Conales" },
              { initials:"AJ", role:"Vice President", name:"Avelino Jarabe" },
              { initials:"NC", role:"Secretary", name:"Nalesita Centnral" },
              { initials:"AP", role:"Treasurer", name:"Anrora Puertas" },
              { initials:"TL", role:"Auditor", name:"Teresita Lipang" },
            ].map(({ initials, role, name }) => (
              <div key={role} style={{ background: "white", borderRadius: 8, padding: "1.4rem 1rem", textAlign: "center", border: "1px solid rgba(26,92,42,0.08)", borderBottom: "3px solid var(--gold)" }}>
                <div style={{ width: 56, height: 56, borderRadius: "50%", background: "var(--green-dk)", color: "var(--gold-lt)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Playfair Display',serif", fontSize: "1.2rem", fontWeight: 700, margin: "0 auto 0.8rem", border: "2px solid rgba(212,160,23,0.3)" }}>{initials}</div>
                <div style={{ fontSize: "0.65rem", fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--gold-dk)", marginBottom: "0.3rem" }}>{role}</div>
                <div style={{ fontSize: "0.85rem", fontWeight: 500, color: "var(--green-dk)", lineHeight: 1.3 }}>{name}</div>
              </div>
            ))}
          </div>

          {/* PIO */}
          <h3 className="playfair" style={{ fontSize: "1rem", fontWeight: 700, color: "var(--green-dk)", marginBottom: "1.2rem", paddingBottom: "0.6rem", borderBottom: "1px solid rgba(212,160,23,0.2)" }}>Public Information Officers (P.I.O.)</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: "1rem", maxWidth: 520, marginBottom: "2.5rem" }}>
            {[["1","Gabriel Sacro"],["2","Joehermis Lipang"]].map(([num, name]) => (
              <div key={name} style={{ background: "var(--warm)", borderRadius: 6, padding: "1rem", display: "flex", alignItems: "center", gap: "0.8rem", border: "1px solid rgba(212,160,23,0.15)" }}>
                <div className="playfair" style={{ fontSize: "1.1rem", fontWeight: 700, color: "rgba(212,160,23,0.4)", minWidth: 24 }}>{num}</div>
                <div>
                  <div style={{ fontSize: "0.82rem", fontWeight: 500, color: "var(--green-dk)" }}>{name}</div>
                  <div style={{ fontSize: "0.68rem", color: "var(--muted)", marginTop: 2 }}>PIO</div>
                </div>
              </div>
            ))}
          </div>

          {/* BOD */}
          <h3 className="playfair" style={{ fontSize: "1rem", fontWeight: 700, color: "var(--green-dk)", marginBottom: "1.2rem", paddingBottom: "0.6rem", borderBottom: "1px solid rgba(212,160,23,0.2)" }}>Board of Directors (B.O.D.)</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "1rem" }}>
            {[
              ["1","Elizabeth Ibañez"],["2","Edigna Libricas"],["3","Miguelina Cortes"],["4","Veronica Felecio"],
              ["5","Segundina Saguica"],["6","Letty Cagas"],["7","Naneth Puertas"],["8","Nestor Mindaña"],
            ].map(([num, name]) => (
              <div key={name} style={{ background: "var(--warm)", borderRadius: 6, padding: "1rem", display: "flex", alignItems: "center", gap: "0.8rem", border: "1px solid rgba(212,160,23,0.15)" }}>
                <div className="playfair" style={{ fontSize: "1.1rem", fontWeight: 700, color: "rgba(212,160,23,0.4)", minWidth: 24 }}>{num}</div>
                <div>
                  <div style={{ fontSize: "0.82rem", fontWeight: 500, color: "var(--green-dk)" }}>{name}</div>
                  <div style={{ fontSize: "0.68rem", color: "var(--muted)", marginTop: 2 }}>Board Member</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* NEWS */}
      <section id="news" style={{ padding: "6rem 0", background: "var(--green-dk)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 2.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "0.8rem" }}>
            <div style={{ width: 20, height: 1.5, background: "var(--gold)" }} />
            <span style={{ fontSize: "0.68rem", fontWeight: 500, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(212,160,23,0.7)" }}>Latest Updates</span>
          </div>
          <h2 className="playfair" style={{ fontSize: "clamp(1.8rem,3vw,2.6rem)", fontWeight: 700, color: "white", lineHeight: 1.15, marginBottom: "2.5rem" }}>
            News & <em style={{ fontStyle: "italic", color: "var(--gold-lt)" }}>Announcements</em>
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr", gap: "1.5rem" }}>
            {[
              { tag:"Featured", date:"April 2025", title:"SUNCO Holds 2025 General Assembly and Election of Officers", text:"Members gathered for the annual general assembly, culminating in the election of new officers led by Engr. Jaime Conales as President for the upcoming term.", bg:"linear-gradient(135deg,#1A3C6E,#2E8B44)", featured: true },
              { tag:"Consumer Rights", date:"March 2025", title:"Know Your Rights: Price Tagging and Fair Trade in Local Markets", text:"SUNCO and DTI Surigao del Norte conducted a joint information drive on mandatory price tagging compliance among local traders.", bg:"linear-gradient(135deg,#9A7010,#1A5C2A)", featured: false },
              { tag:"MAS Program", date:"February 2025", title:"Mortuary Assistance Released to Bereaved Member Family", text:"SUNCO's MAS fund was successfully released to the family of a long-time member, demonstrating the organization's commitment to welfare.", bg:"linear-gradient(135deg,#0D3318,#1A3C6E)", featured: false },
            ].map(({ tag, date, title, text, bg, featured }) => (
              <div key={title} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(212,160,23,0.15)", borderRadius: 8, overflow: "hidden" }}>
                <div style={{ height: featured ? 240 : 180, background: bg, display: "flex", alignItems: "flex-end", padding: "1rem" }}>
                  <span style={{ background: "var(--gold)", color: "var(--green-dk)", fontSize: "0.65rem", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", padding: "3px 10px", borderRadius: 3 }}>{tag}</span>
                </div>
                <div style={{ padding: "1.3rem" }}>
                  <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.35)", marginBottom: "0.4rem", letterSpacing: "0.06em" }}>{date}</div>
                  <h3 className="sourceserif" style={{ fontSize: "1rem", fontWeight: 400, color: "white", lineHeight: 1.4, marginBottom: "0.5rem" }}>{title}</h3>
                  <p style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.5)", lineHeight: 1.6 }}>{text}</p>
                  <a href="#" style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: "0.75rem", color: "var(--gold)", textDecoration: "none", marginTop: "0.8rem", fontWeight: 500 }}>
                    Read more <ChevronRight size={12} />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ background: "#080f0a", borderTop: "3px solid var(--gold)", padding: "4rem 0 2rem" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 2.5rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr", gap: "3rem", marginBottom: "3rem" }}>
            <div>
              <h2 className="playfair" style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--gold-lt)", marginBottom: "0.4rem" }}>SUNCO Inc.</h2>
              <p style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.35)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "0.6rem" }}>Surigao del Norte Consumers Organization</p>
              <p style={{ fontSize: "0.83rem", color: "rgba(255,255,255,0.45)", lineHeight: 1.7 }}>Protecting the rights and welfare of consumers across Surigao del Norte since 2011. A SEC-registered, DTI-accredited consumer organization.</p>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: "1rem", background: "rgba(212,160,23,0.1)", border: "1px solid rgba(212,160,23,0.25)", padding: "4px 12px", borderRadius: 4, fontSize: "0.7rem", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--gold)" }}>DTI Accredited Partner</div>
            </div>
            <div>
              <h4 style={{ fontSize: "0.72rem", fontWeight: 500, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--gold)", marginBottom: "1rem" }}>Quick Links</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem" }}>
                {[["#about","About SUNCO"],["#programs","Programs & Rights"],["#membership","Membership"],["#officers","Officers & BOD"],["#news","News & Updates"]].map(([href, label]) => (
                  <a key={label} href={href} style={{ fontSize: "0.83rem", color: "rgba(255,255,255,0.5)", textDecoration: "none" }}>{label}</a>
                ))}
              </div>
            </div>
            <div>
              <h4 style={{ fontSize: "0.72rem", fontWeight: 500, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--gold)", marginBottom: "1rem" }}>Contact</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.7rem" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: "0.83rem", color: "rgba(255,255,255,0.5)" }}>
                  <MapPin size={14} style={{ marginTop: 2, flexShrink: 0, color: "var(--gold)" }} />
                  <span>Surigao del Norte,<br />Caraga Region (Region XIII),<br />Philippines</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.83rem", color: "rgba(255,255,255,0.5)" }}>
                  <Mail size={14} style={{ color: "var(--gold)", flexShrink: 0 }} />
                  <span>Contact via membership form above</span>
                </div>
              </div>
            </div>
          </div>
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
            <p style={{ fontSize: "0.73rem", color: "rgba(255,255,255,0.25)" }}>© 2025 Surigao del Norte Consumers Organization, Inc. All rights reserved.</p>
            <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.3)", border: "1px solid rgba(255,255,255,0.1)", padding: "3px 10px", borderRadius: 3 }}>SEC Registered · Est. 2011</div>
          </div>
        </div>
      </footer>

    </main>
  );
}