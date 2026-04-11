"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { LogOut, User, CreditCard, FileText, Shield, Edit3 } from "lucide-react";

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [member, setMember] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [role, setRole] = useState<string>("member");
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUser(user);

      const { data: memberData } = await supabase
        .from("members")
        .select("*")
        .eq("user_id", user.id)
        .single();
      setMember(memberData);

      if (memberData) {
        const { data: paymentData } = await supabase
          .from("payments")
          .select("*")
          .eq("member_id", memberData.id)
          .order("year", { ascending: false });
        setPayments(paymentData || []);
      }

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();
      setRole(roleData?.role || "member");

      setLoading(false);
    };
    load();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const isBirthday = () => {
    if (!member?.birthdate) return false;
    const today = new Date();
    const bday = new Date(member.birthdate);
    return today.getMonth() === bday.getMonth() && today.getDate() === bday.getDate();
  };

  const statusColor: any = {
    active: "#2E8B44",
    "non-active": "#D4A017",
    dropped: "#C0392B",
    deceased: "#95A5A6",
  };

  const getInitials = () => {
    if (member?.first_name && member?.last_name)
      return `${member.first_name[0]}${member.last_name[0]}`.toUpperCase();
    return user?.email?.[0]?.toUpperCase() || "?";
  };

  const getFullName = () => {
    if (member?.first_name) return `${member.first_name} ${member.middle_name ? member.middle_name[0] + ". " : ""}${member.last_name}`;
    return user?.email;
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "var(--green-dk)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <img src="/images/sunco-logo.png" alt="SUNCO" style={{ width: 60, height: 60, borderRadius: "50%", marginBottom: "1rem", opacity: 0.7 }} />
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.85rem", letterSpacing: "0.1em", textTransform: "uppercase" }}>Loading your account...</p>
      </div>
    </div>
  );

  return (
    <main style={{ minHeight: "100vh", background: "var(--cream)" }}>

      {/* TOP NAV */}
      <nav style={{ background: "var(--green-dk)", borderBottom: "3px solid var(--gold)", padding: "0 2.5rem", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img src="/images/sunco-logo.png" alt="SUNCO" style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "contain" }} />
          <span style={{ fontFamily: "'Playfair Display', serif", fontSize: "1rem", fontWeight: 700, color: "var(--gold-lt)" }}>SUNCO</span>
          <span style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em", textTransform: "uppercase", marginLeft: 8 }}>Member Portal</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          {(role === "admin" || role === "officer") && (
            <a href="/admin" style={{ fontSize: "0.78rem", color: "var(--gold)", textDecoration: "none", fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 5 }}>
              <Shield size={14} /> Admin Panel
            </a>
          )}
          <a href="/" style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.5)", textDecoration: "none" }}>Main Site</a>
          <button onClick={handleLogout} style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)", padding: "0.4rem 1rem", borderRadius: 6, cursor: "pointer", fontSize: "0.78rem", fontFamily: "'DM Sans', sans-serif" }}>
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </nav>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "2.5rem 2.5rem" }}>

        {/* BIRTHDAY BANNER */}
        {isBirthday() && (
          <div style={{ background: "linear-gradient(135deg, var(--gold-dk), var(--gold))", borderRadius: 10, padding: "1rem 1.5rem", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "1rem" }}>
            <span style={{ fontSize: "1.8rem" }}>🎂</span>
            <div>
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.1rem", fontWeight: 700, color: "var(--green-dk)" }}>Happy Birthday, {member?.first_name}!</p>
              <p style={{ fontSize: "0.82rem", color: "var(--green-dk)", opacity: 0.8 }}>Wishing you a wonderful day from all of us at SUNCO.</p>
            </div>
          </div>
        )}

        {/* PROFILE HERO CARD */}
        <div style={{ background: "var(--green-dk)", borderRadius: 12, padding: "2rem 2.5rem", marginBottom: "2rem", border: "1px solid rgba(212,160,23,0.2)", display: "grid", gridTemplateColumns: "auto 1fr auto", gap: "2rem", alignItems: "center" }}>

          {/* Avatar */}
          <div style={{ position: "relative" }}>
            {member?.photo_url ? (
              <img src={member.photo_url} alt="Profile" style={{ width: 90, height: 90, borderRadius: "50%", objectFit: "cover", border: "3px solid var(--gold)" }} />
            ) : (
              <div style={{ width: 90, height: 90, borderRadius: "50%", background: "rgba(212,160,23,0.2)", border: "3px solid var(--gold)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Playfair Display', serif", fontSize: "2rem", fontWeight: 700, color: "var(--gold-lt)" }}>
                {getInitials()}
              </div>
            )}
            <div style={{ position: "absolute", bottom: 0, right: 0, width: 24, height: 24, borderRadius: "50%", background: "var(--gold)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <Edit3 size={12} color="var(--green-dk)" />
            </div>
          </div>

          {/* Info */}
          <div>
            <p style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.4)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.3rem" }}>Welcome back</p>
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.8rem", fontWeight: 700, color: "white", marginBottom: "0.8rem", lineHeight: 1.2 }}>{getFullName()}</h1>
            <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.8rem", color: "rgba(255,255,255,0.5)" }}>
                <User size={13} color="var(--gold)" />
                <span>ID: <strong style={{ color: "var(--gold-lt)" }}>#{member?.id_number || member?.membership_number || "—"}</strong></span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.8rem", color: "rgba(255,255,255,0.5)" }}>
                <CreditCard size={13} color="var(--gold)" />
                <span>Mobile: <strong style={{ color: "var(--gold-lt)" }}>{member?.mobile || member?.contact_number || "—"}</strong></span>
              </div>
              {member?.birthdate && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.8rem", color: "rgba(255,255,255,0.5)" }}>
                  <span>🎂</span>
                  <span>Birthday: <strong style={{ color: "var(--gold-lt)" }}>{new Date(member.birthdate).toLocaleDateString("en-PH", { month: "long", day: "numeric" })}</strong></span>
                </div>
              )}
              {member?.beneficiary_name && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.8rem", color: "rgba(255,255,255,0.5)" }}>
                  <FileText size={13} color="var(--gold)" />
                  <span>Beneficiary: <strong style={{ color: "var(--gold-lt)" }}>{member.beneficiary_name} ({member.beneficiary_relation})</strong></span>
                </div>
              )}
            </div>
          </div>

          {/* Status badge */}
          <div style={{ textAlign: "center" }}>
            <div style={{ background: `${statusColor[member?.status || "active"]}22`, border: `2px solid ${statusColor[member?.status || "active"]}`, borderRadius: 10, padding: "1rem 1.5rem", minWidth: 120 }}>
              <p style={{ fontSize: "0.65rem", fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.5)", marginBottom: "0.3rem" }}>Status</p>
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.2rem", fontWeight: 700, color: statusColor[member?.status || "active"], textTransform: "capitalize" }}>
                {member?.status || "Active"}
              </p>
            </div>
            <a href="/dashboard/profile" style={{ display: "block", marginTop: "0.6rem", fontSize: "0.72rem", color: "var(--gold)", textDecoration: "none", opacity: 0.8 }}>Edit Profile →</a>
          </div>
        </div>

        {/* STATS ROW */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1.2rem", marginBottom: "2rem" }}>
          <div style={{ background: "white", borderRadius: 10, padding: "1.3rem 1.5rem", border: "1px solid rgba(26,92,42,0.08)", borderLeft: "4px solid var(--gold)" }}>
            <p style={{ fontSize: "0.7rem", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)", marginBottom: "0.4rem" }}>Member No.</p>
            <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.5rem", fontWeight: 700, color: "var(--green-dk)" }}>#{member?.membership_number || "—"}</p>
          </div>
          <div style={{ background: "white", borderRadius: 10, padding: "1.3rem 1.5rem", border: "1px solid rgba(26,92,42,0.08)", borderLeft: "4px solid var(--blue-lt)" }}>
            <p style={{ fontSize: "0.7rem", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)", marginBottom: "0.4rem" }}>Date Joined</p>
            <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.5rem", fontWeight: 700, color: "var(--green-dk)" }}>
              {member?.date_joined ? new Date(member.date_joined).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" }) : "—"}
            </p>
          </div>
          <div style={{ background: "white", borderRadius: 10, padding: "1.3rem 1.5rem", border: "1px solid rgba(26,92,42,0.08)", borderLeft: "4px solid var(--green-lt)" }}>
            <p style={{ fontSize: "0.7rem", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)", marginBottom: "0.4rem" }}>Total Paid</p>
            <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.5rem", fontWeight: 700, color: "var(--green-dk)" }}>
              ₱{payments.reduce((sum, p) => sum + Number(p.amount), 0).toLocaleString()}
            </p>
          </div>
        </div>

        {/* PAYMENT HISTORY */}
        <div style={{ background: "white", borderRadius: 10, border: "1px solid rgba(26,92,42,0.08)", overflow: "hidden" }}>
          <div style={{ padding: "1.5rem", borderBottom: "1px solid rgba(26,92,42,0.08)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.1rem", fontWeight: 700, color: "var(--green-dk)" }}>Payment History</h2>
            <a href="/dashboard/pay" style={{ background: "var(--gold)", color: "var(--green-dk)", padding: "0.45rem 1.2rem", borderRadius: 4, fontSize: "0.75rem", fontWeight: 500, textDecoration: "none", letterSpacing: "0.06em", textTransform: "uppercase" }}>Pay Fees</a>
          </div>
          {payments.length === 0 ? (
            <div style={{ padding: "3rem", textAlign: "center" }}>
              <CreditCard size={32} color="rgba(26,92,42,0.2)" style={{ marginBottom: "1rem" }} />
              <p style={{ fontSize: "0.85rem", color: "var(--muted)" }}>No payment records yet.</p>
              <p style={{ fontSize: "0.78rem", color: "var(--muted)", opacity: 0.7, marginTop: "0.3rem" }}>Your payment history will appear here once recorded.</p>
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--warm)" }}>
                  {["Year", "Type", "Amount", "Date Paid"].map(h => (
                    <th key={h} style={{ padding: "0.8rem 1.5rem", textAlign: "left", fontSize: "0.7rem", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payments.map((p, i) => (
                  <tr key={p.id} style={{ borderBottom: "1px solid rgba(26,92,42,0.06)", background: i % 2 === 0 ? "white" : "var(--cream)" }}>
                    <td style={{ padding: "1rem 1.5rem", fontSize: "0.88rem", fontWeight: 500, color: "var(--green-dk)" }}>{p.year}</td>
                    <td style={{ padding: "1rem 1.5rem" }}>
                      <span style={{ background: p.type === "mas" ? "rgba(26,92,42,0.1)" : "rgba(212,160,23,0.1)", color: p.type === "mas" ? "var(--green)" : "var(--gold-dk)", fontSize: "0.72rem", fontWeight: 500, padding: "3px 10px", borderRadius: 20, textTransform: "uppercase" }}>{p.type}</span>
                    </td>
                    <td style={{ padding: "1rem 1.5rem", fontSize: "0.88rem", color: "var(--text)" }}>₱{Number(p.amount).toLocaleString()}</td>
                    <td style={{ padding: "1rem 1.5rem", fontSize: "0.82rem", color: "var(--muted)" }}>{new Date(p.date_paid).toLocaleDateString("en-PH")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>
    </main>
  );
}