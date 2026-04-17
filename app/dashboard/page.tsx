"use client";
import { useEffect, useState, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import {
  LogOut, User, CreditCard, Edit3, Phone, MapPin,
  Calendar, Heart, Shield, BookOpen, Star, TrendingUp,
  Upload, Camera, X, CheckCircle, Info, Bell, Clock,
} from "lucide-react";

// ── Officers — update as needed ──
const OFFICERS = [
  { role: "President",       name: "Roberto C. Santos",  icon: "★" },
  { role: "Vice President",  name: "Maria L. Reyes",     icon: "◆" },
  { role: "Secretary",       name: "Jose A. Cruz",       icon: "✦" },
  { role: "Treasurer",       name: "Ana B. Flores",      icon: "◈" },
  { role: "Auditor",         name: "Pedro M. Garcia",    icon: "◉" },
  { role: "PRO",             name: "Elena S. Torres",    icon: "◎" },
];

const MEMBER_RIGHTS = [
  { icon: Shield,   title: "Mortuary Assistance",  desc: "Eligible for MAS benefit upon the death of a member or immediate family." },
  { icon: User,     title: "Voting Rights",         desc: "Active members may vote and run for office in general assemblies." },
  { icon: BookOpen, title: "Grievance Filing",      desc: "Right to file grievances with the Board of Officers for resolution." },
  { icon: Star,     title: "Benefits Access",       desc: "Access to all organizational programs and welfare benefits." },
];

const ORG_RULES = [
  "Annual dues (MAS ₱740 + AOF ₱100) must be settled by December 31 of each year.",
  "Members with 2 consecutive unpaid years are classified as Non-Active.",
  "Members with 3 or more consecutive unpaid years are automatically Dropped.",
  "Dropped members may apply for reinstatement subject to Board approval.",
  "Deceased members are honored with a ₱1,500 MAS benefit upon notification.",
  "All members must keep contact information and beneficiary details updated.",
];

export default function DashboardPage() {
  const [user,       setUser]       = useState<any>(null);
  const [member,     setMember]     = useState<any>(null);
  const [payments,   setPayments]   = useState<any[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [activeTab,  setActiveTab]  = useState<"overview"|"payments"|"rights"|"officers">("overview");
  const [editOpen,   setEditOpen]   = useState(false);
  const [uploading,  setUploading]  = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [saveMsg,    setSaveMsg]    = useState("");
  const [editForm,   setEditForm]   = useState({ mobile: "", address: "", beneficiary_name: "", beneficiary_relation: "" });
  const fileRef = useRef<HTMLInputElement>(null);
  const router  = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUser(user);

      const { data: roleData } = await supabase
        .from("user_roles").select("role").eq("user_id", user.id).single();
      const userRole = roleData?.role || "member";
      if (["admin","president","treasurer","secretary","vice_president","auditor","pio","bod"].includes(userRole)) {
        router.push("/admin"); return;
      }

      const { data: memberData } = await supabase
        .from("members").select("*").eq("user_id", user.id).single();
      setMember(memberData);
      setEditForm({
        mobile:               memberData?.mobile               || "",
        address:              memberData?.address              || "",
        beneficiary_name:     memberData?.beneficiary_name     || "",
        beneficiary_relation: memberData?.beneficiary_relation || "",
      });

      if (memberData?.approval_status === "approved") {
        const { data: paymentData } = await supabase
          .from("payments").select("*")
          .eq("member_id", memberData.id)
          .order("year", { ascending: false });
        setPayments(paymentData || []);
      }
      setLoading(false);
    };
    load();
  }, []);

  // ── Compress & convert to WebP ──
  const compressToWebP = (file: File, maxPx = 800): Promise<Blob> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        let { width, height } = img;
        if (width > maxPx || height > maxPx) {
          if (width > height) { height = (height / width) * maxPx; width = maxPx; }
          else { width = (width / height) * maxPx; height = maxPx; }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width; canvas.height = height;
        canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
        canvas.toBlob(b => b ? resolve(b) : reject(new Error("Conversion failed")), "image/webp", 0.82);
      };
      img.onerror = reject;
      img.src = url;
    });

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !member) return;
    setUploading(true);
    try {
      const webpBlob = await compressToWebP(file);
      const filename = `${member.id}/avatar.webp`;
      const { error: upErr } = await supabase.storage
        .from("avatars").upload(filename, webpBlob, { contentType: "image/webp", upsert: true });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filename);
      const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      await supabase.from("members").update({ avatar_url: avatarUrl }).eq("id", member.id);
      setMember((prev: any) => ({ ...prev, avatar_url: avatarUrl }));
    } catch (err: any) { alert("Upload failed: " + err.message); }
    setUploading(false);
  };

  const handleSaveProfile = async () => {
    if (!member) return;
    setSaving(true);
    const { error } = await supabase.from("members").update(editForm).eq("id", member.id);
    if (!error) {
      setMember((prev: any) => ({ ...prev, ...editForm }));
      setSaveMsg("Profile updated successfully.");
      setTimeout(() => { setSaveMsg(""); setEditOpen(false); }, 1800);
    }
    setSaving(false);
  };

  const handleLogout = async () => { await supabase.auth.signOut(); router.push("/"); };

  const getInitials = () =>
    member?.first_name && member?.last_name
      ? `${member.first_name[0]}${member.last_name[0]}`.toUpperCase()
      : user?.email?.[0]?.toUpperCase() || "?";

  const getFullName = () => {
    if (!member?.first_name) return user?.email;
    return `${member.first_name}${member.middle_name ? " " + member.middle_name[0] + "." : ""} ${member.last_name}`;
  };

  const isBirthday = () => {
    if (!member?.birthdate) return false;
    const today = new Date(), bday = new Date(member.birthdate);
    return today.getMonth() === bday.getMonth() && today.getDate() === bday.getDate();
  };

  const totalPaid = payments.reduce((s, p) => s + Number(p.amount), 0);

  const STATUS_STYLE: any = {
    active:       { bg: "#E6F9ED", text: "#1A6B35", border: "#A8E6BC" },
    "non-active": { bg: "#FFF8E1", text: "#A66C00", border: "#FFD97A" },
    dropped:      { bg: "#FDECEA", text: "#A8200D", border: "#F5A49A" },
    deceased:     { bg: "#F2F2F2", text: "#666",    border: "#CCC"    },
  };
  const TYPE_COLOR: any = {
    mas:      { bg: "#E8F5E9", text: "#2E7D32" },
    aof:      { bg: "#E3F2FD", text: "#1565C0" },
    lifetime: { bg: "#F3E5F5", text: "#6A1B9A" },
  };

  const sc = STATUS_STYLE[member?.status] || STATUS_STYLE["active"];

  const TABS = [
    { id: "overview",  label: "Overview",      icon: User      },
    { id: "payments",  label: "Payments",      icon: CreditCard },
    { id: "rights",    label: "Rights & Rules", icon: BookOpen  },
    { id: "officers",  label: "Officers",      icon: Star      },
  ] as const;

  // ─────────────── LOADING ───────────────
  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#0D3320", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <img src="/images/sunco-logo.png" alt="SUNCO" style={{ width: 60, height: 60, borderRadius: "50%", marginBottom: "1rem", opacity: 0.6 }} />
        <p style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.8rem", letterSpacing: "0.12em", textTransform: "uppercase" }}>Loading your account...</p>
      </div>
    </div>
  );

  // ─────────────── PENDING ───────────────
  if (member?.approval_status === "pending") return (
    <main style={{ minHeight: "100vh", background: "#0D3320", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
      <div style={{ maxWidth: 480, width: "100%", textAlign: "center" }}>
        <img src="/images/sunco-logo.png" alt="SUNCO" style={{ width: 80, height: 80, borderRadius: "50%", border: "2px solid rgba(201,168,76,0.3)", marginBottom: "1.5rem" }} />
        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(201,168,76,0.2)", borderRadius: 14, padding: "2.5rem" }}>
          <div style={{ width: 60, height: 60, borderRadius: "50%", background: "rgba(201,168,76,0.15)", border: "2px solid #C9A84C", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.2rem" }}>
            <Clock size={24} color="#C9A84C" />
          </div>
          <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1.4rem", color: "white", marginBottom: "0.5rem" }}>Application Pending</h2>
          <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.5)", lineHeight: 1.8, marginBottom: "1.5rem" }}>
            Hi <strong style={{ color: "#C9A84C" }}>{member?.first_name}</strong>, your application is being reviewed. You'll have full access once approved.
          </p>
          <div style={{ background: "rgba(0,0,0,0.2)", borderRadius: 8, padding: "1rem", marginBottom: "1.5rem", textAlign: "left" }}>
            {[["Name", `${member?.first_name} ${member?.last_name}`], ["Email", user?.email], ["Status", "Pending Review"]].map(([label, value]) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", padding: "0.3rem 0" }}>
                <span style={{ color: "rgba(255,255,255,0.4)" }}>{label}</span>
                <span style={{ color: label === "Status" ? "#C9A84C" : "white", fontWeight: 500 }}>{value}</span>
              </div>
            ))}
          </div>
          <button onClick={handleLogout} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.5)", padding: "0.6rem 1.5rem", borderRadius: 6, cursor: "pointer", fontSize: "0.78rem", fontFamily: "'DM Sans', sans-serif" }}>Sign Out</button>
        </div>
      </div>
    </main>
  );

  // ─────────────── REJECTED ───────────────
  if (member?.approval_status === "rejected") return (
    <main style={{ minHeight: "100vh", background: "#0D3320", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
      <div style={{ maxWidth: 480, width: "100%", textAlign: "center" }}>
        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(192,57,43,0.3)", borderRadius: 14, padding: "2.5rem" }}>
          <div style={{ width: 60, height: 60, borderRadius: "50%", background: "rgba(192,57,43,0.15)", border: "2px solid #C0392B", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.2rem" }}>
            <X size={24} color="#C0392B" />
          </div>
          <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1.4rem", color: "white", marginBottom: "0.5rem" }}>Application Not Approved</h2>
          <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.5)", lineHeight: 1.8, marginBottom: "1rem" }}>Unfortunately your application was not approved at this time.</p>
          {member?.rejection_reason && (
            <div style={{ background: "rgba(192,57,43,0.1)", border: "1px solid rgba(192,57,43,0.2)", borderRadius: 8, padding: "1rem", marginBottom: "1.5rem" }}>
              <p style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.6)", lineHeight: 1.6 }}><strong style={{ color: "#ff6b6b" }}>Reason: </strong>{member.rejection_reason}</p>
            </div>
          )}
          <p style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.3)", lineHeight: 1.6, marginBottom: "1.5rem" }}>Please contact SUNCO officers for more information.</p>
          <button onClick={handleLogout} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.5)", padding: "0.6rem 1.5rem", borderRadius: 6, cursor: "pointer", fontSize: "0.78rem", fontFamily: "'DM Sans', sans-serif" }}>Sign Out</button>
        </div>
      </div>
    </main>
  );

  // ─────────────── MAIN DASHBOARD ───────────────
  return (
    <main style={{ minHeight: "100vh", background: "#F7F5F0", fontFamily: "'DM Sans', sans-serif" }}>

      {/* ── NAV ── */}
      <nav style={{ background: "#0D3320", borderBottom: "2px solid #C9A84C", padding: "0 2rem", height: 62, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img src="/images/sunco-logo.png" alt="SUNCO" style={{ width: 34, height: 34, borderRadius: "50%", objectFit: "contain" }} />
          <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1rem", color: "#C9A84C", letterSpacing: "0.04em" }}>SUNCO</span>
          <span style={{ color: "rgba(255,255,255,0.2)", margin: "0 6px" }}>|</span>
          <span style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em", textTransform: "uppercase" }}>Member Portal</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <a href="/" style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.45)", textDecoration: "none" }}>Main Site</a>
          <button onClick={handleLogout} style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.65)", padding: "0.38rem 1rem", borderRadius: 6, cursor: "pointer", fontSize: "0.78rem", fontFamily: "'DM Sans', sans-serif" }}>
            <LogOut size={13} /> Sign Out
          </button>
        </div>
      </nav>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "2rem 1.5rem" }}>

        {/* ── BIRTHDAY BANNER ── */}
        {isBirthday() && (
          <div style={{ background: "linear-gradient(135deg, #8B6914, #C9A84C)", borderRadius: 10, padding: "1rem 1.5rem", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "1rem" }}>
            <span style={{ fontSize: "1.6rem" }}>🎂</span>
            <div>
              <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1.05rem", color: "#0D3320" }}>Happy Birthday, {member?.first_name}!</p>
              <p style={{ fontSize: "0.8rem", color: "#0D3320", opacity: 0.75 }}>Wishing you a wonderful day from all of us at SUNCO.</p>
            </div>
          </div>
        )}

        {/* ── HERO CARD ── */}
        <div style={{
          background: "linear-gradient(135deg, #0D3320 0%, #1A5C2A 65%, #0D3320 100%)",
          borderRadius: 16, padding: "2rem", marginBottom: "1.5rem",
          border: "1px solid rgba(255,255,255,0.06)", position: "relative", overflow: "hidden",
        }}>
          <div style={{ position: "absolute", top: -40, right: -40, width: 200, height: 200, borderRadius: "50%", background: "rgba(201,168,76,0.06)", pointerEvents: "none" }} />

          <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", flexWrap: "wrap", position: "relative" }}>
            {/* Avatar */}
            <div style={{ position: "relative", flexShrink: 0 }}>
              <div style={{ width: 88, height: 88, borderRadius: "50%", border: "3px solid #C9A84C", overflow: "hidden", background: "rgba(201,168,76,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {member?.avatar_url ? (
                  <img src={member.avatar_url} alt="Profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : member?.photo_url ? (
                  <img src={member.photo_url} alt="Profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1.8rem", color: "#C9A84C" }}>{getInitials()}</span>
                )}
              </div>
              <button onClick={() => fileRef.current?.click()} disabled={uploading} title="Change photo"
                style={{ position: "absolute", bottom: 0, right: 0, width: 26, height: 26, borderRadius: "50%", background: "#C9A84C", border: "2px solid #0D3320", display: "flex", alignItems: "center", justifyContent: "center", cursor: uploading ? "wait" : "pointer" }}>
                {uploading ? <Clock size={11} color="#0D3320" /> : <Camera size={11} color="#0D3320" />}
              </button>
              <input ref={fileRef} type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: "none" }} />
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 200 }}>
              <p style={{ fontSize: "0.62rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.38)", marginBottom: 4 }}>Welcome back</p>
              <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1.65rem", color: "white", fontWeight: 400, lineHeight: 1.15, marginBottom: 10 }}>{getFullName()}</h1>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem" }}>
                {member?.membership_number && (
                  <span style={{ display: "flex", alignItems: "center", gap: 5, color: "rgba(255,255,255,0.45)", fontSize: "0.78rem" }}>
                    <CreditCard size={12} color="#C9A84C" /> <span style={{ color: "#C9A84C" }}>#{member.membership_number}</span>
                  </span>
                )}
                {(member?.mobile || member?.contact_number) && (
                  <span style={{ display: "flex", alignItems: "center", gap: 5, color: "rgba(255,255,255,0.45)", fontSize: "0.78rem" }}>
                    <Phone size={12} /> {member.mobile || member.contact_number}
                  </span>
                )}
                {member?.birthdate && (
                  <span style={{ display: "flex", alignItems: "center", gap: 5, color: "rgba(255,255,255,0.45)", fontSize: "0.78rem" }}>
                    <Calendar size={12} /> {new Date(member.birthdate).toLocaleDateString("en-PH", { month: "long", day: "numeric" })}
                  </span>
                )}
                {member?.beneficiary_name && (
                  <span style={{ display: "flex", alignItems: "center", gap: 5, color: "rgba(255,255,255,0.45)", fontSize: "0.78rem" }}>
                    <Heart size={12} /> {member.beneficiary_name}
                  </span>
                )}
              </div>
            </div>

            {/* Status + Edit */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10 }}>
              <div style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`, padding: "0.38rem 1.1rem", borderRadius: 20, fontSize: "0.78rem", fontWeight: 600, textTransform: "capitalize" }}>
                {member?.status || "Active"}
              </div>
              <button onClick={() => setEditOpen(true)} style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(201,168,76,0.13)", border: "1px solid rgba(201,168,76,0.28)", color: "#C9A84C", padding: "0.38rem 1rem", borderRadius: 6, fontSize: "0.75rem", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                <Edit3 size={12} /> Edit Profile
              </button>
            </div>
          </div>
        </div>

        {/* ── STAT CARDS ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
          {[
            { label: "Member Since", value: member?.date_joined ? new Date(member.date_joined).getFullYear().toString() : "—", sub: member?.date_joined ? new Date(member.date_joined).toLocaleDateString("en-PH", { month: "short", year: "numeric" }) : "Not set", icon: Calendar, color: "#1A5C2A" },
            { label: "Total Paid",   value: `₱${totalPaid.toLocaleString()}`, sub: `${payments.length} payment${payments.length !== 1 ? "s" : ""} recorded`, icon: TrendingUp, color: "#C9A84C" },
            { label: "Member No.",  value: member?.membership_number ? `#${member.membership_number}` : "—", sub: member?.member_id_code || "Member ID", icon: Shield, color: "#2B5FA8" },
          ].map(({ label, value, sub, icon: Icon, color }) => (
            <div key={label} style={{ background: "white", borderRadius: 12, padding: "1.2rem 1.3rem", border: "1px solid rgba(0,0,0,0.06)", borderLeft: `4px solid ${color}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <p style={{ fontSize: "0.64rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "#999", marginBottom: 4 }}>{label}</p>
                  <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1.4rem", color: "#0D3320" }}>{value}</p>
                  <p style={{ fontSize: "0.7rem", color: "#BBB", marginTop: 2 }}>{sub}</p>
                </div>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: `${color}15`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon size={17} color={color} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── TABS ── */}
        <div style={{ display: "flex", gap: "0.3rem", marginBottom: "1.2rem", background: "white", padding: "0.35rem", borderRadius: 10, border: "1px solid rgba(0,0,0,0.06)" }}>
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setActiveTab(id)} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "0.55rem 0.4rem", borderRadius: 7, border: "none", background: activeTab === id ? "#0D3320" : "transparent", color: activeTab === id ? "white" : "#999", fontSize: "0.77rem", fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", transition: "all 0.15s" }}>
              <Icon size={13} /> {label}
            </button>
          ))}
        </div>

        {/* ── TAB: OVERVIEW ── */}
        {activeTab === "overview" && (
          <div style={{ background: "white", borderRadius: 12, border: "1px solid rgba(0,0,0,0.06)", overflow: "hidden" }}>
            <div style={{ padding: "1.1rem 1.5rem", borderBottom: "1px solid rgba(0,0,0,0.05)", background: "#F9F8F5" }}>
              <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1rem", color: "#0D3320", fontWeight: 400 }}>Member Information</h2>
            </div>
            <div style={{ padding: "1.5rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.8rem" }}>
              {[
                ["Full Name",     `${member?.first_name || ""} ${member?.middle_name || ""} ${member?.last_name || ""}`.trim()],
                ["Mobile",        member?.mobile || member?.contact_number || "—"],
                ["Address",       member?.address || "—"],
                ["Date of Birth", member?.birthdate ? new Date(member.birthdate).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" }) : "—"],
                ["Beneficiary",   member?.beneficiary_name || "—"],
                ["Relationship",  member?.beneficiary_relation || "—"],
                ["Date Joined",   member?.date_joined ? new Date(member.date_joined).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" }) : "—"],
                ["Approval",      member?.approval_status || "—"],
              ].map(([label, value]) => (
                <div key={label} style={{ padding: "0.8rem", background: "#F9F8F5", borderRadius: 8 }}>
                  <p style={{ fontSize: "0.62rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "#BBB", marginBottom: 3 }}>{label}</p>
                  <p style={{ fontSize: "0.86rem", color: "#0D3320", fontWeight: 500, textTransform: label === "Address" ? "none" : "capitalize" }}>{value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── TAB: PAYMENTS ── */}
        {activeTab === "payments" && (
          <div style={{ background: "white", borderRadius: 12, border: "1px solid rgba(0,0,0,0.06)", overflow: "hidden" }}>
            <div style={{ padding: "1.1rem 1.5rem", borderBottom: "1px solid rgba(0,0,0,0.05)", background: "#F9F8F5", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1rem", color: "#0D3320", fontWeight: 400 }}>Payment History</h2>
              <span style={{ fontSize: "0.72rem", color: "#AAA" }}>Annual fees: AOF ₱100 + MAS ₱740</span>
            </div>
            {payments.length === 0 ? (
              <div style={{ padding: "3rem", textAlign: "center" }}>
                <CreditCard size={34} color="rgba(0,0,0,0.1)" style={{ marginBottom: 8 }} />
                <p style={{ color: "#BBB", fontSize: "0.85rem" }}>No payments recorded yet.</p>
                <p style={{ color: "#CCC", fontSize: "0.78rem", marginTop: 4 }}>Your history will appear here once recorded by SUNCO officers.</p>
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#F9F8F5" }}>
                    {["Year", "Type", "Amount", "Date Paid", "Receipt"].map(h => (
                      <th key={h} style={{ padding: "0.7rem 1.2rem", textAlign: "left", fontSize: "0.63rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "#BBB", fontWeight: 500 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p, i) => {
                    const tc = TYPE_COLOR[p.type] || { bg: "#F5F5F5", text: "#666" };
                    return (
                      <tr key={p.id} style={{ borderTop: "1px solid rgba(0,0,0,0.05)", background: i % 2 === 0 ? "white" : "#FAFAF8" }}>
                        <td style={{ padding: "0.9rem 1.2rem", fontSize: "0.88rem", fontWeight: 600, color: "#0D3320" }}>{p.year}</td>
                        <td style={{ padding: "0.9rem 1.2rem" }}>
                          <span style={{ background: tc.bg, color: tc.text, fontSize: "0.66rem", fontWeight: 600, padding: "3px 10px", borderRadius: 20, textTransform: "uppercase", letterSpacing: "0.05em" }}>{p.type}</span>
                        </td>
                        <td style={{ padding: "0.9rem 1.2rem", fontFamily: "'DM Serif Display', serif", fontSize: "0.95rem", color: "#1A5C2A" }}>₱{Number(p.amount).toLocaleString()}</td>
                        <td style={{ padding: "0.9rem 1.2rem", fontSize: "0.8rem", color: "#AAA" }}>
                          {p.date_paid ? new Date(p.date_paid).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" }) : "—"}
                        </td>
                        <td style={{ padding: "0.9rem 1.2rem", fontSize: "0.77rem", color: "#BBB", fontFamily: "monospace" }}>{p.receipt_number || "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ background: "#F9F8F5", borderTop: "2px solid #C9A84C" }}>
                    <td colSpan={2} style={{ padding: "0.9rem 1.2rem", fontSize: "0.7rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "#AAA" }}>Total Paid</td>
                    <td colSpan={3} style={{ padding: "0.9rem 1.2rem", fontFamily: "'DM Serif Display', serif", fontSize: "1.15rem", color: "#0D3320" }}>₱{totalPaid.toLocaleString()}</td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        )}

        {/* ── TAB: RIGHTS & RULES ── */}
        {activeTab === "rights" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {/* Rights */}
            <div style={{ background: "white", borderRadius: 12, border: "1px solid rgba(0,0,0,0.06)", overflow: "hidden" }}>
              <div style={{ padding: "1.1rem 1.5rem", borderBottom: "1px solid rgba(0,0,0,0.05)", background: "#F9F8F5" }}>
                <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1rem", color: "#0D3320", fontWeight: 400 }}>Member Rights & Benefits</h2>
              </div>
              <div style={{ padding: "1.2rem 1.5rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.8rem" }}>
                {MEMBER_RIGHTS.map(({ icon: Icon, title, desc }) => (
                  <div key={title} style={{ display: "flex", gap: 12, padding: "1rem", background: "#F9F8F5", borderRadius: 10, border: "1px solid rgba(0,0,0,0.04)" }}>
                    <div style={{ width: 38, height: 38, borderRadius: 8, background: "#E4EFE7", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Icon size={17} color="#1A5C2A" />
                    </div>
                    <div>
                      <p style={{ fontSize: "0.82rem", fontWeight: 600, color: "#0D3320", marginBottom: 3 }}>{title}</p>
                      <p style={{ fontSize: "0.74rem", color: "#888", lineHeight: 1.55 }}>{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Rules */}
            <div style={{ background: "white", borderRadius: 12, border: "1px solid rgba(0,0,0,0.06)", overflow: "hidden" }}>
              <div style={{ padding: "1.1rem 1.5rem", borderBottom: "1px solid rgba(0,0,0,0.05)", background: "#F9F8F5", display: "flex", alignItems: "center", gap: 8 }}>
                <Info size={15} color="#888" />
                <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1rem", color: "#0D3320", fontWeight: 400 }}>Organizational Rules</h2>
              </div>
              <div style={{ padding: "1.2rem 1.5rem" }}>
                {ORG_RULES.map((rule, i) => (
                  <div key={i} style={{ display: "flex", gap: 12, padding: "0.65rem 0", borderBottom: i < ORG_RULES.length - 1 ? "1px solid rgba(0,0,0,0.05)" : "none" }}>
                    <div style={{ width: 22, height: 22, borderRadius: "50%", background: "#0D3320", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                      <span style={{ fontSize: "0.58rem", color: "#C9A84C", fontWeight: 700 }}>{i + 1}</span>
                    </div>
                    <p style={{ fontSize: "0.82rem", color: "#555", lineHeight: 1.6 }}>{rule}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Status Guide */}
            <div style={{ background: "white", borderRadius: 12, border: "1px solid rgba(0,0,0,0.06)", overflow: "hidden" }}>
              <div style={{ padding: "1.1rem 1.5rem", borderBottom: "1px solid rgba(0,0,0,0.05)", background: "#F9F8F5" }}>
                <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1rem", color: "#0D3320", fontWeight: 400 }}>Membership Status Guide</h2>
              </div>
              <div style={{ padding: "1.2rem 1.5rem", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                {[
                  { status: "Active",     color: "#1A6B35", bg: "#E6F9ED", desc: "Current with payments. Full benefits and voting rights." },
                  { status: "Non-Active", color: "#A66C00", bg: "#FFF8E1", desc: "2 consecutive unpaid years. Limited benefits." },
                  { status: "Dropped",    color: "#A8200D", bg: "#FDECEA", desc: "3+ consecutive unpaid years. Removed from active rolls." },
                  { status: "Deceased",   color: "#555",    bg: "#F2F2F2", desc: "Manually updated by the organization upon notification." },
                ].map(({ status, color, bg, desc }) => (
                  <div key={status} style={{ display: "flex", alignItems: "center", gap: 12, padding: "0.75rem 1rem", background: bg, borderRadius: 8 }}>
                    <span style={{ background: color, color: "white", fontSize: "0.63rem", fontWeight: 700, padding: "3px 10px", borderRadius: 20, minWidth: 80, textAlign: "center", flexShrink: 0 }}>{status}</span>
                    <p style={{ fontSize: "0.82rem", color: "#555" }}>{desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── TAB: OFFICERS ── */}
        {activeTab === "officers" && (
          <div style={{ background: "white", borderRadius: 12, border: "1px solid rgba(0,0,0,0.06)", overflow: "hidden" }}>
            <div style={{ padding: "1.1rem 1.5rem", borderBottom: "1px solid rgba(0,0,0,0.05)", background: "#F9F8F5" }}>
              <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1rem", color: "#0D3320", fontWeight: 400 }}>Current Officers</h2>
              <p style={{ fontSize: "0.73rem", color: "#BBB", marginTop: 3 }}>Board of Officers — {new Date().getFullYear()}</p>
            </div>
            <div style={{ padding: "1.5rem", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem" }}>
              {OFFICERS.map(({ role, name, icon }, i) => (
                <div key={role} style={{ padding: "1.2rem", borderRadius: 10, background: i === 0 ? "#0D3320" : "#F9F8F5", border: i === 0 ? "none" : "1px solid rgba(0,0,0,0.06)", position: "relative", overflow: "hidden" }}>
                  {i === 0 && <div style={{ position: "absolute", top: -20, right: -20, width: 80, height: 80, borderRadius: "50%", background: "rgba(201,168,76,0.15)", pointerEvents: "none" }} />}
                  <div style={{ fontSize: "1.1rem", marginBottom: 6, color: i === 0 ? "#C9A84C" : "#0D3320" }}>{icon}</div>
                  <p style={{ fontSize: "0.62rem", letterSpacing: "0.1em", textTransform: "uppercase", color: i === 0 ? "rgba(255,255,255,0.38)" : "#BBB", marginBottom: 4 }}>{role}</p>
                  <p style={{ fontSize: "0.86rem", fontWeight: 600, color: i === 0 ? "white" : "#0D3320", fontFamily: "'DM Serif Display', serif" }}>{name}</p>
                </div>
              ))}
            </div>
            <div style={{ margin: "0 1.5rem 1.5rem", padding: "0.9rem 1.1rem", background: "#EEF6F1", borderRadius: 10, border: "1px solid #C0D9C6", display: "flex", gap: 8, alignItems: "flex-start" }}>
              <Info size={14} color="#1A5C2A" style={{ marginTop: 2, flexShrink: 0 }} />
              <div>
                <p style={{ fontSize: "0.75rem", fontWeight: 600, color: "#1A5C2A", marginBottom: 3 }}>For inquiries and concerns</p>
                <p style={{ fontSize: "0.77rem", color: "#555", lineHeight: 1.55 }}>Contact any officer directly or submit a written request to the Secretary. General assemblies are held quarterly.</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── EDIT PROFILE MODAL ── */}
      {editOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}>
          <div style={{ background: "white", borderRadius: 14, width: "100%", maxWidth: 460, overflow: "hidden", boxShadow: "0 24px 60px rgba(0,0,0,0.25)" }}>

            {/* Modal header */}
            <div style={{ padding: "1.2rem 1.5rem", background: "#0D3320", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <p style={{ fontSize: "0.58rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 2 }}>My Account</p>
                <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1rem", color: "#C9A84C", fontWeight: 400 }}>Edit Profile</h3>
              </div>
              <button onClick={() => setEditOpen(false)} style={{ background: "rgba(255,255,255,0.08)", border: "none", color: "white", width: 28, height: 28, borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <X size={13} />
              </button>
            </div>

            <div style={{ padding: "1.4rem 1.5rem" }}>
              {/* Photo section */}
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: "1.3rem", padding: "1rem", background: "#F9F8F5", borderRadius: 10 }}>
                <div style={{ width: 58, height: 58, borderRadius: "50%", border: "2px solid #C9A84C", overflow: "hidden", background: "#EAF0EB", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {member?.avatar_url ? (
                    <img src={member.avatar_url} alt="Profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1.2rem", color: "#0D3320" }}>{getInitials()}</span>
                  )}
                </div>
                <div>
                  <p style={{ fontSize: "0.82rem", fontWeight: 600, color: "#0D3320", marginBottom: 3 }}>Profile Photo</p>
                  <p style={{ fontSize: "0.7rem", color: "#BBB", marginBottom: 6 }}>Auto-compressed & saved as WebP</p>
                  <button onClick={() => fileRef.current?.click()} disabled={uploading} style={{ display: "flex", alignItems: "center", gap: 5, background: "#0D3320", color: "white", border: "none", padding: "0.3rem 0.8rem", borderRadius: 5, fontSize: "0.72rem", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                    <Upload size={11} /> {uploading ? "Uploading..." : "Change Photo"}
                  </button>
                </div>
              </div>

              {/* Fields */}
              {[
                { key: "mobile",               label: "Mobile Number",              placeholder: "e.g. 0917-000-0000" },
                { key: "address",              label: "Home Address",               placeholder: "Full address" },
                { key: "beneficiary_name",     label: "Beneficiary Name",           placeholder: "Full name" },
                { key: "beneficiary_relation", label: "Relationship to Beneficiary", placeholder: "e.g. Spouse, Child" },
              ].map(({ key, label, placeholder }) => (
                <div key={key} style={{ marginBottom: "0.95rem" }}>
                  <label style={{ display: "block", fontSize: "0.65rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "#BBB", marginBottom: 5 }}>{label}</label>
                  <input
                    value={(editForm as any)[key]}
                    onChange={e => setEditForm(prev => ({ ...prev, [key]: e.target.value }))}
                    placeholder={placeholder}
                    style={{ width: "100%", padding: "0.62rem 0.9rem", border: "1.5px solid rgba(0,0,0,0.1)", borderRadius: 7, fontSize: "0.85rem", fontFamily: "'DM Sans', sans-serif", outline: "none", color: "#0D3320", boxSizing: "border-box" }}
                  />
                </div>
              ))}

              {saveMsg && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0.65rem 0.9rem", background: "#E6F9ED", borderRadius: 7, marginBottom: "1rem" }}>
                  <CheckCircle size={14} color="#1A6B35" />
                  <p style={{ fontSize: "0.8rem", color: "#1A6B35" }}>{saveMsg}</p>
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.7rem" }}>
                <button onClick={() => setEditOpen(false)} style={{ padding: "0.72rem", background: "#F5F5F5", border: "none", borderRadius: 8, fontSize: "0.82rem", color: "#777", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Cancel</button>
                <button onClick={handleSaveProfile} disabled={saving} style={{ padding: "0.72rem", background: "#0D3320", border: "none", borderRadius: 8, fontSize: "0.82rem", color: "white", cursor: saving ? "not-allowed" : "pointer", fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}>
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
