"use client";
import { useEffect, useState, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import GCashPayment from "@/app/components/GCashPayment";
import MemberDelinquencyTable from "@/app/components/MemberDelinquencyTable";
import {
  LogOut, User, CreditCard, Edit3, Phone,
  Calendar, Heart, Shield, BookOpen, Star, TrendingUp,
  Upload, Camera, X, CheckCircle, Info, Clock,
  Bell, AlertTriangle, BanknoteIcon, ChevronRight,
  MapPin, Users, Gavel, Award, FileText, RefreshCw,
  CircleCheck, CircleX, CircleDot,
} from "lucide-react";

const MEMBER_RIGHTS = [
  { icon: Shield,   title: "Mortuary Assistance",  desc: "Eligible for MAS benefit upon the death of a member or immediate family." },
  { icon: User,     title: "Voting Rights",         desc: "Active members may vote and run for office in general assemblies." },
  { icon: BookOpen, title: "Grievance Filing",      desc: "Right to file grievances with the Board of Officers for resolution." },
  { icon: Star,     title: "Benefits Access",       desc: "Access to all organizational programs and welfare benefits." },
];

const ORG_RULES = [
  "Annual dues (MAS ₱500 + Annual Operational Expenses ₱240 + AOF ₱100) must be settled by December of each year.",
  "Members with 2 consecutive unpaid years are classified as Non-Active.",
  "Members with 3 or more consecutive unpaid years are automatically Dropped.",
  "Dropped members may apply for reinstatement subject to Board approval.",
  "Deceased members are honored with a ₱9,000 MAS benefit upon notification.",
  "All members must keep contact information and beneficiary details updated.",
];

export default function DashboardPage() {
  const [user,         setUser]         = useState<any>(null);
  const [member,       setMember]       = useState<any>(null);
  const [payments,     setPayments]     = useState<any[]>([]);
  const [officers,     setOfficers]     = useState<any[]>([]);
  const [submissions,  setSubmissions]  = useState<any[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [activeTab,    setActiveTab]    = useState<"overview"|"payments"|"rights"|"officers">("overview");
  const [editOpen,     setEditOpen]     = useState(false);
const [showPayment, setShowPayment] = useState(false);
const [hasLifetimePaid, setHasLifetimePaid] = useState(false);
  const [paymentItems, setPaymentItems] = useState<any[]>([]);
  const [uploading,    setUploading]    = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [saveMsg,      setSaveMsg]      = useState("");
  const [dismissing,   setDismissing]   = useState(false);
  const [editForm,     setEditForm]     = useState({
    mobile: "", address: "", beneficiary_name: "", beneficiary_relation: "",
  });
  const fileRef  = useRef<HTMLInputElement>(null);
  const router   = useRouter();
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

        // Load payment submissions for notifications
        const { data: subData } = await supabase
          .from("payment_submissions")
          .select("*")
          .eq("member_id", memberData.id)
          .order("created_at", { ascending: false });
        setSubmissions(subData || []);
      }

      const { data: officerData } = await supabase
        .from("officers").select("*").eq("is_active", true).order("order_num");
      setOfficers(officerData || []);

      setLoading(false);
    };
    load();
  }, []);

  // ── Which submission to show as notification ──
  // Show the latest one that is not dismissed AND is within 5 days
  const activeNotification = (() => {
    if (!submissions.length) return null;
    const fiveDaysMs = 5 * 24 * 60 * 60 * 1000;
    for (const sub of submissions) {
      if (sub.dismissed_by_member_at) continue;
      // For pending: show if created within 5 days
      // For approved/rejected: show if reviewed_at is within 5 days
      const referenceDate = sub.status === "pending"
        ? new Date(sub.created_at)
        : sub.reviewed_at ? new Date(sub.reviewed_at) : new Date(sub.created_at);
      const age = Date.now() - referenceDate.getTime();
      if (age <= fiveDaysMs) return sub;
    }
    return null;
  })();

  const handleDismissNotification = async (subId: string) => {
    setDismissing(true);
    await supabase
      .from("payment_submissions")
      .update({ dismissed_by_member_at: new Date().toISOString() })
      .eq("id", subId);
    setSubmissions(prev => prev.map(s =>
      s.id === subId ? { ...s, dismissed_by_member_at: new Date().toISOString() } : s
    ));
    setDismissing(false);
  };

  const parseNotes = (sub: any) => {
    try { if (sub.notes) return JSON.parse(sub.notes); } catch {}
    return null;
  };

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
    return `${member.first_name}${member.middle_name?.trim() ? " " + member.middle_name.trim()[0] + "." : ""} ${member.last_name}`;
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
    { id: "overview",  label: "Overview",       icon: User       },
    { id: "payments",  label: "Payments",       icon: CreditCard },
    { id: "rights",    label: "Rights & Rules", icon: BookOpen   },
    { id: "officers",  label: "Officers",       icon: Star       },
  ] as const;

  const formatDate = (ts: string) => new Date(ts).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit",
  });

  // ── LOADING ──
  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#0D3320", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <img src="/images/sunco-logo.png" alt="SUNCO" style={{ width: 60, height: 60, borderRadius: "50%", marginBottom: "1rem", opacity: 0.6 }} />
        <p style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.9rem", letterSpacing: "0.12em", textTransform: "uppercase" }}>Loading your account...</p>
      </div>
    </div>
  );

  // ── PENDING ──
  if (member?.approval_status === "pending") return (
    <main style={{ minHeight: "100vh", background: "#0D3320", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
      <div style={{ maxWidth: 480, width: "100%", textAlign: "center" }}>
        <img src="/images/sunco-logo.png" alt="SUNCO" style={{ width: 80, height: 80, borderRadius: "50%", border: "2px solid rgba(201,168,76,0.3)", marginBottom: "1.5rem" }} />
        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(201,168,76,0.2)", borderRadius: 14, padding: "2.5rem" }}>
          <div style={{ width: 70, height: 70, borderRadius: "50%", background: "rgba(201,168,76,0.15)", border: "2px solid #C9A84C", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.2rem" }}>
            <Clock size={30} color="#C9A84C" />
          </div>
          <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1.6rem", color: "white", marginBottom: "0.5rem" }}>Application Pending</h2>
          <p style={{ fontSize: "1rem", color: "rgba(255,255,255,0.6)", lineHeight: 1.8, marginBottom: "1.5rem" }}>
            Hi <strong style={{ color: "#C9A84C" }}>{member?.first_name}</strong>, your application is being reviewed. You'll have full access once approved.
          </p>
          <div style={{ background: "rgba(0,0,0,0.2)", borderRadius: 8, padding: "1rem", marginBottom: "1.5rem", textAlign: "left" }}>
            {[["Name", `${member?.first_name} ${member?.last_name}`], ["Email", user?.email], ["Status", "Pending Review"]].map(([label, value]) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.95rem", padding: "0.4rem 0" }}>
                <span style={{ color: "rgba(255,255,255,0.4)" }}>{label}</span>
                <span style={{ color: label === "Status" ? "#C9A84C" : "white", fontWeight: 600 }}>{value}</span>
              </div>
            ))}
          </div>
          <button onClick={handleLogout} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.6)", padding: "0.75rem 2rem", borderRadius: 6, cursor: "pointer", fontSize: "0.9rem", fontFamily: "'DM Sans', sans-serif" }}>Sign Out</button>
        </div>
      </div>
    </main>
  );

  // ── REJECTED ──
  if (member?.approval_status === "rejected") return (
    <main style={{ minHeight: "100vh", background: "#0D3320", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
      <div style={{ maxWidth: 480, width: "100%", textAlign: "center" }}>
        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(192,57,43,0.3)", borderRadius: 14, padding: "2.5rem" }}>
          <div style={{ width: 70, height: 70, borderRadius: "50%", background: "rgba(192,57,43,0.15)", border: "2px solid #C0392B", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.2rem" }}>
            <X size={30} color="#C0392B" />
          </div>
          <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1.6rem", color: "white", marginBottom: "0.5rem" }}>Application Not Approved</h2>
          <p style={{ fontSize: "1rem", color: "rgba(255,255,255,0.6)", lineHeight: 1.8, marginBottom: "1rem" }}>Unfortunately your application was not approved at this time.</p>
          {member?.rejection_reason && (
            <div style={{ background: "rgba(192,57,43,0.1)", border: "1px solid rgba(192,57,43,0.2)", borderRadius: 8, padding: "1rem", marginBottom: "1.5rem" }}>
              <p style={{ fontSize: "0.95rem", color: "rgba(255,255,255,0.7)", lineHeight: 1.6 }}><strong style={{ color: "#ff6b6b" }}>Reason: </strong>{member.rejection_reason}</p>
            </div>
          )}
          <p style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.35)", lineHeight: 1.6, marginBottom: "1.5rem" }}>Please contact SUNCO officers for more information.</p>
          <button onClick={handleLogout} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.6)", padding: "0.75rem 2rem", borderRadius: 6, cursor: "pointer", fontSize: "0.9rem", fontFamily: "'DM Sans', sans-serif" }}>Sign Out</button>
        </div>
      </div>
    </main>
  );

  // ── PAYMENT NOTIFICATION BANNER ──
  const PaymentNotificationBanner = () => {
    if (!activeNotification) return null;
    const sub = activeNotification;
    const notes = parseNotes(sub);

    const configs = {
      pending: {
        bg: "linear-gradient(135deg, #1a3a6b 0%, #1e4d8c 100%)",
        border: "rgba(0,119,255,0.4)",
        iconBg: "rgba(0,119,255,0.25)",
        icon: <CircleDot size={26} color="#5BA8FF" />,
        badgeBg: "rgba(0,119,255,0.3)",
        badgeColor: "#A8D4FF",
        badgeText: "⏳ UNDER REVIEW",
        titleColor: "#A8D4FF",
        title: "Payment Submitted — Awaiting Review",
        msgColor: "rgba(255,255,255,0.85)",
      },
      approved: {
        bg: "linear-gradient(135deg, #0f3d1f 0%, #155228 100%)",
        border: "rgba(46,139,68,0.5)",
        iconBg: "rgba(46,139,68,0.25)",
        icon: <CircleCheck size={26} color="#5DD98A" />,
        badgeBg: "rgba(46,139,68,0.35)",
        badgeColor: "#8FEBB0",
        badgeText: "✅ APPROVED",
        titleColor: "#8FEBB0",
        title: "Payment Approved & Recorded!",
        msgColor: "rgba(255,255,255,0.85)",
      },
      rejected: {
        bg: "linear-gradient(135deg, #3d0f0f 0%, #521515 100%)",
        border: "rgba(192,57,43,0.5)",
        iconBg: "rgba(192,57,43,0.25)",
        icon: <CircleX size={26} color="#FF7B6B" />,
        badgeBg: "rgba(192,57,43,0.3)",
        badgeColor: "#FFAA9F",
        badgeText: "❌ NOT APPROVED",
        titleColor: "#FFAA9F",
        title: "Payment Was Not Approved",
        msgColor: "rgba(255,255,255,0.85)",
      },
    };

    const cfg = configs[sub.status as keyof typeof configs] || configs.pending;
    const coversSummary = (() => {
      if (notes?.year_breakdown?.length > 0) {
        return notes.year_breakdown.map((y: any) => {
          const parts = [y.aof && "AOF", y.mas && "MAS"].filter(Boolean).join("+");
          return `${y.year} (${parts})`;
        }).join(", ");
      }
      return sub.year ? `${sub.year}` : "—";
    })();

    return (
      <div style={{
        background: cfg.bg,
        border: `1.5px solid ${cfg.border}`,
        borderRadius: 14,
        padding: "1.3rem 1.5rem",
        marginBottom: "1.5rem",
        position: "relative",
        boxShadow: "0 4px 24px rgba(0,0,0,0.2)",
      }}>
        {/* Dismiss button */}
        <button
          onClick={() => handleDismissNotification(sub.id)}
          disabled={dismissing}
          title="Dismiss this notification"
          style={{
            position: "absolute", top: 12, right: 12,
            background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)",
            color: "rgba(255,255,255,0.6)", width: 30, height: 30,
            borderRadius: "50%", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          <X size={14} />
        </button>

        <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem", paddingRight: "2rem" }}>
          {/* Icon */}
          <div style={{
            width: 50, height: 50, borderRadius: 12,
            background: cfg.iconBg,
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            {cfg.icon}
          </div>

          <div style={{ flex: 1 }}>
            {/* Badge + Title */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "0.4rem", flexWrap: "wrap" }}>
              <span style={{
                background: cfg.badgeBg, color: cfg.badgeColor,
                fontSize: "0.65rem", fontWeight: 700,
                letterSpacing: "0.1em", padding: "3px 10px",
                borderRadius: 20,
              }}>
                {cfg.badgeText}
              </span>
              <span style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.35)" }}>
                {sub.status === "pending"
                  ? `Submitted ${formatDate(sub.created_at)}`
                  : sub.reviewed_at ? `Reviewed ${formatDate(sub.reviewed_at)}` : ""}
              </span>
            </div>

            <p style={{
              fontFamily: "'DM Serif Display', serif",
              fontSize: "1.05rem", fontWeight: 700,
              color: cfg.titleColor, marginBottom: "0.5rem",
            }}>
              {cfg.title}
            </p>

            {/* Details */}
            {sub.status === "pending" && (
              <p style={{ fontSize: "0.88rem", color: cfg.msgColor, lineHeight: 1.6 }}>
                Your GCash payment of{" "}
                <strong style={{ color: "white" }}>₱{Number(sub.total_amount).toLocaleString()}</strong>
                {" "}covering <strong style={{ color: "white" }}>{coversSummary}</strong> has been submitted and is being verified by our officers. This usually takes 1–3 business days.
              </p>
            )}

            {sub.status === "approved" && (
              <div>
                <p style={{ fontSize: "0.88rem", color: cfg.msgColor, lineHeight: 1.6, marginBottom: "0.6rem" }}>
                  Your payment of{" "}
                  <strong style={{ color: "white" }}>₱{Number(sub.total_amount).toLocaleString()}</strong>
                  {" "}for <strong style={{ color: "white" }}>{coversSummary}</strong> has been approved and recorded in your payment history.
                </p>
                <div style={{
                  background: "rgba(0,0,0,0.2)", borderRadius: 8,
                  padding: "0.6rem 1rem",
                  display: "flex", alignItems: "center", gap: 8,
                }}>
                  <FileText size={14} color="#8FEBB0" />
                  <p style={{ fontSize: "0.82rem", color: "#8FEBB0", fontWeight: 600 }}>
                    Payment is now reflected in your Payments tab.
                  </p>
                </div>
              </div>
            )}

            {sub.status === "rejected" && (
              <div>
                <p style={{ fontSize: "0.88rem", color: cfg.msgColor, lineHeight: 1.6, marginBottom: "0.6rem" }}>
                  Your GCash payment submission of{" "}
                  <strong style={{ color: "white" }}>₱{Number(sub.total_amount).toLocaleString()}</strong>
                  {" "}was not approved by our officers.
                </p>
                {sub.rejection_reason && (
                  <div style={{
                    background: "rgba(192,57,43,0.2)", border: "1px solid rgba(192,57,43,0.3)",
                    borderRadius: 8, padding: "0.7rem 1rem", marginBottom: "0.6rem",
                  }}>
                    <p style={{ fontSize: "0.8rem", color: "#FFAA9F", fontWeight: 700, marginBottom: 2 }}>Reason:</p>
                    <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.8)", lineHeight: 1.5 }}>{sub.rejection_reason}</p>
                  </div>
                )}
                <p style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.5)" }}>
                  Please contact our officers or resubmit with the correct details.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Progress dots for pending */}
        {sub.status === "pending" && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: "1rem", paddingLeft: "4rem" }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#5BA8FF" }} />
            <div style={{ flex: 1, height: 2, background: "rgba(255,255,255,0.1)", borderRadius: 2 }}>
              <div style={{ width: "40%", height: "100%", background: "#5BA8FF", borderRadius: 2 }} />
            </div>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "rgba(255,255,255,0.2)" }} />
            <div style={{ flex: 1, height: 2, background: "rgba(255,255,255,0.1)", borderRadius: 2 }} />
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "rgba(255,255,255,0.2)" }} />
            <span style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.35)", marginLeft: 6 }}>Submitted → Review → Recorded</span>
          </div>
        )}
      </div>
    );
  };

  // ── MAIN DASHBOARD ──
  return (
    <main style={{ minHeight: "100vh", background: "#F0EDE6", fontFamily: "'DM Sans', sans-serif" }}>

      {/* NAV */}
      <nav style={{
        background: "#0D3320",
        borderBottom: "2px solid #C9A84C",
        padding: "0 2rem",
        height: 66,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        position: "sticky", top: 0, zIndex: 100,
        boxShadow: "0 2px 20px rgba(0,0,0,0.3)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <img src="/images/sunco-logo.png" alt="SUNCO" style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "contain" }} />
          <div>
            <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1.1rem", color: "#C9A84C", letterSpacing: "0.04em" }}>SUNCO</span>
            <span style={{ display: "block", fontSize: "0.58rem", color: "rgba(255,255,255,0.35)", letterSpacing: "0.12em", textTransform: "uppercase", marginTop: -2 }}>Member Portal</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* Notification bell indicator */}
          {activeNotification && (
            <div style={{ position: "relative" }}>
              <Bell size={20} color={activeNotification.status === "pending" ? "#5BA8FF" : activeNotification.status === "approved" ? "#5DD98A" : "#FF7B6B"} />
              <div style={{ position: "absolute", top: -3, right: -3, width: 8, height: 8, borderRadius: "50%", background: activeNotification.status === "pending" ? "#5BA8FF" : activeNotification.status === "approved" ? "#5DD98A" : "#FF7B6B", border: "1.5px solid #0D3320" }} />
            </div>
          )}
          <a href="/" target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.5)", textDecoration: "none" }}>Main Site</a>
          <button onClick={handleLogout} style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.7)", padding: "0.45rem 1.1rem", borderRadius: 6, cursor: "pointer", fontSize: "0.82rem", fontFamily: "'DM Sans', sans-serif" }}>
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </nav>

      <div style={{ maxWidth: 920, margin: "0 auto", padding: "2rem 1.5rem" }}>

        {/* ── PAYMENT NOTIFICATION BANNER ── */}
        <PaymentNotificationBanner />

        {/* BIRTHDAY BANNER */}
        {isBirthday() && (
          <div style={{ background: "linear-gradient(135deg, #8B6914, #C9A84C)", borderRadius: 12, padding: "1.2rem 1.6rem", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "1.2rem", boxShadow: "0 4px 16px rgba(201,168,76,0.3)" }}>
            <span style={{ fontSize: "2rem" }}>🎂</span>
            <div>
              <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1.2rem", color: "#0D3320", fontWeight: 700 }}>Happy Birthday, {member?.first_name}!</p>
              <p style={{ fontSize: "0.88rem", color: "#0D3320", opacity: 0.75 }}>Wishing you a wonderful day from all of us at SUNCO.</p>
            </div>
          </div>
        )}

        {/* HERO CARD */}
        <div style={{
          background: "linear-gradient(135deg, #0D3320 0%, #1A5C2A 65%, #0D3320 100%)",
          borderRadius: 16, padding: "2rem", marginBottom: "1.5rem",
          border: "1px solid rgba(255,255,255,0.06)",
          position: "relative", overflow: "hidden",
          boxShadow: "0 8px 32px rgba(13,51,32,0.25)",
        }}>
          <div style={{ position: "absolute", top: -40, right: -40, width: 220, height: 220, borderRadius: "50%", background: "rgba(201,168,76,0.06)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", bottom: -60, left: -20, width: 160, height: 160, borderRadius: "50%", background: "rgba(255,255,255,0.03)", pointerEvents: "none" }} />

          <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", flexWrap: "wrap", position: "relative" }}>
            {/* Avatar */}
            <div style={{ position: "relative", flexShrink: 0 }}>
              <div style={{ width: 96, height: 96, borderRadius: "50%", border: "3px solid #C9A84C", overflow: "hidden", background: "rgba(201,168,76,0.15)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 0 6px rgba(201,168,76,0.12)" }}>
                {member?.avatar_url ? (
                  <img src={member.avatar_url} alt="Profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : member?.photo_url ? (
                  <img src={member.photo_url} alt="Profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: "2rem", color: "#C9A84C" }}>{getInitials()}</span>
                )}
              </div>
              <button onClick={() => fileRef.current?.click()} disabled={uploading} title="Change photo"
                style={{ position: "absolute", bottom: 2, right: 2, width: 30, height: 30, borderRadius: "50%", background: "#C9A84C", border: "2.5px solid #0D3320", display: "flex", alignItems: "center", justifyContent: "center", cursor: uploading ? "wait" : "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.3)" }}>
                {uploading ? <Clock size={13} color="#0D3320" /> : <Camera size={13} color="#0D3320" />}
              </button>
              <input ref={fileRef} type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: "none" }} />
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 200 }}>
              <p style={{ fontSize: "0.65rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.38)", marginBottom: 4 }}>Welcome back</p>
              <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1.8rem", color: "white", fontWeight: 400, lineHeight: 1.15, marginBottom: 12 }}>{getFullName()}</h1>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem" }}>
                {member?.membership_number && (
                  <span style={{ display: "flex", alignItems: "center", gap: 6, color: "#C9A84C", fontSize: "0.85rem", fontWeight: 600 }}>
                    <CreditCard size={14} color="#C9A84C" /> #{member.membership_number}
                  </span>
                )}
                {(member?.mobile || member?.contact_number) && (
                  <span style={{ display: "flex", alignItems: "center", gap: 6, color: "rgba(255,255,255,0.55)", fontSize: "0.85rem" }}>
                    <Phone size={14} color="rgba(255,255,255,0.4)" /> {member.mobile || member.contact_number}
                  </span>
                )}
                {member?.birthdate && (
                  <span style={{ display: "flex", alignItems: "center", gap: 6, color: "rgba(255,255,255,0.55)", fontSize: "0.85rem" }}>
                    <Calendar size={14} color="rgba(255,255,255,0.4)" /> {new Date(member.birthdate).toLocaleDateString("en-US", { month: "long", day: "numeric" })}
                  </span>
                )}
                {member?.beneficiary_name && (
                  <span style={{ display: "flex", alignItems: "center", gap: 6, color: "rgba(255,255,255,0.55)", fontSize: "0.85rem" }}>
                    <Heart size={14} color="rgba(255,255,255,0.4)" /> {member.beneficiary_name}
                  </span>
                )}
              </div>
            </div>

            {/* Status + Edit */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 12 }}>
              <div style={{ background: sc.bg, color: sc.text, border: `1.5px solid ${sc.border}`, padding: "0.45rem 1.2rem", borderRadius: 20, fontSize: "0.85rem", fontWeight: 700, textTransform: "capitalize", letterSpacing: "0.04em" }}>
                {member?.status || "Active"}
              </div>
              <button onClick={() => setEditOpen(true)} style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(201,168,76,0.13)", border: "1px solid rgba(201,168,76,0.35)", color: "#C9A84C", padding: "0.45rem 1.1rem", borderRadius: 6, fontSize: "0.82rem", fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                <Edit3 size={13} /> Edit Profile
              </button>
            </div>
          </div>
        </div>

        {/* STAT CARDS */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
          {[
            { label: "Member Since", value: member?.date_joined ? new Date(member.date_joined).getFullYear().toString() : "—", sub: member?.date_joined ? new Date(member.date_joined).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "Not set", icon: Calendar, color: "#1A5C2A" },
            { label: "Total Paid",   value: `₱${totalPaid.toLocaleString()}`, sub: `${payments.length} payment${payments.length !== 1 ? "s" : ""} recorded`, icon: TrendingUp, color: "#C9A84C" },
            { label: "Member No.",  value: member?.membership_number ? `#${member.membership_number}` : "—", sub: member?.member_id_code || "Member ID", icon: Shield, color: "#2B5FA8" },
          ].map(({ label, value, sub, icon: Icon, color }) => (
            <div key={label} style={{ background: "white", borderRadius: 12, padding: "1.3rem 1.4rem", border: "1px solid rgba(0,0,0,0.07)", borderLeft: `5px solid ${color}`, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <p style={{ fontSize: "0.7rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "#999", marginBottom: 6, fontWeight: 600 }}>{label}</p>
                  <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1.6rem", color: "#0D3320", lineHeight: 1 }}>{value}</p>
                  <p style={{ fontSize: "0.78rem", color: "#BBB", marginTop: 4 }}>{sub}</p>
                </div>
                <div style={{ width: 42, height: 42, borderRadius: 10, background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon size={20} color={color} />
                </div>
              </div>
            </div>
          ))}
        </div>



        {/* TABS */}
        <div style={{ display: "flex", gap: "0.3rem", marginBottom: "1.2rem", background: "white", padding: "0.4rem", borderRadius: 12, border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setActiveTab(id)} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "0.65rem 0.5rem", borderRadius: 8, border: "none", background: activeTab === id ? "#0D3320" : "transparent", color: activeTab === id ? "white" : "#888", fontSize: "0.82rem", fontWeight: activeTab === id ? 600 : 500, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", transition: "all 0.15s" }}>
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>

        {/* TAB: OVERVIEW */}
        {activeTab === "overview" && (
          <div style={{ background: "white", borderRadius: 12, border: "1px solid rgba(0,0,0,0.07)", overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
            <div style={{ padding: "1.2rem 1.5rem", borderBottom: "1px solid rgba(0,0,0,0.06)", background: "#F9F8F5", display: "flex", alignItems: "center", gap: 10 }}>
              <User size={18} color="#1A5C2A" />
              <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1.15rem", color: "#0D3320", fontWeight: 400 }}>Member Information</h2>
            </div>
            <div style={{ padding: "1.5rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.9rem" }}>
              {[
                ["Full Name",     `${member?.first_name || ""} ${member?.middle_name || ""} ${member?.last_name || ""}`.trim()],
                ["Mobile",        member?.mobile || member?.contact_number || "—"],
                ["Address",       member?.address || "—"],
                ["Date of Birth", member?.birthdate ? new Date(member.birthdate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "—"],
                ["Beneficiary",   member?.beneficiary_name || "—"],
                ["Relationship",  member?.beneficiary_relation || "—"],
                ["Date Joined",   member?.date_joined ? new Date(member.date_joined).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "—"],
                ["Approval",      member?.approval_status || "—"],
              ].map(([label, value]) => (
                <div key={label} style={{ padding: "1rem 1.1rem", background: "#F9F8F5", borderRadius: 10, border: "1px solid rgba(0,0,0,0.04)" }}>
                  <p style={{ fontSize: "0.7rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "#AAA", marginBottom: 5, fontWeight: 600 }}>{label}</p>
                  <p style={{ fontSize: "0.95rem", color: "#0D3320", fontWeight: 600, textTransform: label === "Address" ? "none" : "capitalize" }}>{value}</p>
                </div>
              ))}
            </div>
          </div>
        )}



{/* TAB: PAYMENTS */}
{activeTab === "payments" && (
  <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>

    {/* ── Pay Dues CTA (shown only when there are delinquent years) ── */}
    {(() => {
      const currentYear = 2026;
      const joinYear = member?.date_joined ? new Date(member.date_joined).getFullYear() : currentYear;
      const unpaidYears = [];
      for (let y = joinYear; y <= currentYear; y++) {
        const hasAof = payments.some(p => p.year === y && p.type === "aof");
        const hasMas = payments.some(p => p.year === y && p.type === "mas");
        if (!hasAof || !hasMas) unpaidYears.push(y);
      }
      if (unpaidYears.length === 0) return null;

      const isDropped = member?.status === "dropped";
      const isNonActive = member?.status === "non-active";
      const accentColor = isDropped ? "#A8200D" : isNonActive ? "#A66C00" : "#0077FF";
      const accentBg    = isDropped ? "#FDECEA"  : isNonActive ? "#FFF8E1"  : "#EEF4FF";
      const accentBorder= isDropped ? "#F5A49A"  : isNonActive ? "#FFD97A"  : "#BBCFFF";

      return (
        <div style={{
          background: accentBg,
          border: `1.5px solid ${accentBorder}`,
          borderRadius: 12, padding: "1.2rem 1.4rem",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexWrap: "wrap", gap: "0.8rem",
          boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: `${accentColor}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <AlertTriangle size={20} color={accentColor} />
            </div>
            <div>
              <p style={{ fontSize: "0.92rem", fontWeight: 700, color: accentColor, marginBottom: 2 }}>
                {unpaidYears.length} delinquent year{unpaidYears.length > 1 ? "s" : ""} — ₱{(unpaidYears.length * 840).toLocaleString()} outstanding
              </p>
              <p style={{ fontSize: "0.8rem", color: "#666" }}>
                Unpaid: {unpaidYears.join(", ")} · ₱840/yr (MAS ₱740 + AOF ₱100)
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              const allYears = [];
              for (let y = joinYear; y <= currentYear; y++) {
                allYears.push({
                  year: y,
                  hasAof: payments.some(p => p.year === y && p.type === "aof"),
                  hasMas: payments.some(p => p.year === y && p.type === "mas"),
                });
              }
              setPaymentItems(allYears);
              setHasLifetimePaid(payments.some(p => p.type === "lifetime"));
              setShowPayment(true);
            }}
            style={{
              background: "#0077FF", color: "white", border: "none",
              padding: "0.6rem 1.4rem", borderRadius: 8, fontSize: "0.88rem",
              fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
              display: "flex", alignItems: "center", gap: 8,
              boxShadow: "0 4px 12px rgba(0,119,255,0.3)", whiteSpace: "nowrap",
            }}
          >
            <BanknoteIcon size={16} /> Pay Now via GCash
          </button>
        </div>
      );
    })()}

    {/* ── Delinquency Table ── */}
    {payments.length > 0 && (
      <div style={{ width: "100%", minWidth: 0 }}>
        <MemberDelinquencyTable member={member} payments={payments} />
      </div>
    )}

    {/* ── Payment History Table ── */}
    <div style={{ background: "white", borderRadius: 12, border: "1px solid rgba(0,0,0,0.07)", overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
      <div style={{ padding: "1.2rem 1.5rem", borderBottom: "1px solid rgba(0,0,0,0.06)", background: "#F9F8F5", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <CreditCard size={18} color="#1A5C2A" />
          <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1.15rem", color: "#0D3320", fontWeight: 400 }}>Payment History</h2>
        </div>
        <span style={{ fontSize: "0.8rem", color: "#AAA", fontWeight: 500 }}>AOF ₱100 · MAS ₱740 per year</span>
      </div>

      {payments.length === 0 ? (
        <div style={{ padding: "3rem", textAlign: "center" }}>
          <CreditCard size={40} color="rgba(0,0,0,0.1)" style={{ marginBottom: 12 }} />
          <p style={{ color: "#999", fontSize: "1rem", fontWeight: 600 }}>No payments recorded yet.</p>
          <p style={{ color: "#CCC", fontSize: "0.88rem", marginTop: 6 }}>Your history will appear here once recorded by SUNCO officers.</p>
        </div>
      ) : (
        <div style={{ overflowX: "auto", width: "100%" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 480 }}>
            <thead>
              <tr style={{ background: "#F9F8F5" }}>
                {["Year", "Type", "Amount", "Date Paid", "Receipt No."].map(h => (
                  <th key={h} style={{ padding: "0.85rem 1.2rem", textAlign: "left", fontSize: "0.7rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "#999", fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {payments.map((p, i) => {
                const tc = TYPE_COLOR[p.type] || { bg: "#F5F5F5", text: "#666" };
                return (
                  <tr key={p.id} style={{ borderTop: "1px solid rgba(0,0,0,0.05)", background: i % 2 === 0 ? "white" : "#FAFAF8" }}>
                    <td style={{ padding: "1rem 1.2rem", fontSize: "1rem", fontWeight: 700, color: "#0D3320" }}>{p.year}</td>
                    <td style={{ padding: "1rem 1.2rem" }}>
                      <span style={{ background: tc.bg, color: tc.text, fontSize: "0.75rem", fontWeight: 700, padding: "4px 12px", borderRadius: 20, textTransform: "uppercase", letterSpacing: "0.05em" }}>{p.type}</span>
                    </td>
                    <td style={{ padding: "1rem 1.2rem", fontFamily: "'DM Serif Display', serif", fontSize: "1.1rem", color: "#1A5C2A", fontWeight: 700 }}>₱{Number(p.amount).toLocaleString()}</td>
                    <td style={{ padding: "1rem 1.2rem", fontSize: "0.88rem", color: "#777", fontWeight: 500 }}>
                      {p.date_paid ? new Date(p.date_paid).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "—"}
                    </td>
                    <td style={{ padding: "1rem 1.2rem", fontSize: "0.82rem", color: "#999", fontFamily: "monospace" }}>{p.receipt_number || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ background: "#F9F8F5", borderTop: "2px solid #C9A84C" }}>
                <td colSpan={2} style={{ padding: "1rem 1.2rem", fontSize: "0.78rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "#AAA", fontWeight: 600 }}>Total Paid</td>
                <td colSpan={3} style={{ padding: "1rem 1.2rem", fontFamily: "'DM Serif Display', serif", fontSize: "1.3rem", color: "#0D3320", fontWeight: 700 }}>₱{totalPaid.toLocaleString()}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>

  </div>
)}

        {/* TAB: RIGHTS & RULES */}
        {activeTab === "rights" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ background: "white", borderRadius: 12, border: "1px solid rgba(0,0,0,0.07)", overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
              <div style={{ padding: "1.2rem 1.5rem", borderBottom: "1px solid rgba(0,0,0,0.06)", background: "#F9F8F5", display: "flex", alignItems: "center", gap: 10 }}>
                <Award size={18} color="#1A5C2A" />
                <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1.15rem", color: "#0D3320", fontWeight: 400 }}>Member Rights & Benefits</h2>
              </div>
              <div style={{ padding: "1.3rem 1.5rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.9rem" }}>
                {MEMBER_RIGHTS.map(({ icon: Icon, title, desc }) => (
                  <div key={title} style={{ display: "flex", gap: 14, padding: "1.1rem", background: "#F9F8F5", borderRadius: 12, border: "1px solid rgba(0,0,0,0.05)" }}>
                    <div style={{ width: 44, height: 44, borderRadius: 10, background: "#E4EFE7", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Icon size={20} color="#1A5C2A" />
                    </div>
                    <div>
                      <p style={{ fontSize: "0.92rem", fontWeight: 700, color: "#0D3320", marginBottom: 4 }}>{title}</p>
                      <p style={{ fontSize: "0.82rem", color: "#666", lineHeight: 1.6 }}>{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: "white", borderRadius: 12, border: "1px solid rgba(0,0,0,0.07)", overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
              <div style={{ padding: "1.2rem 1.5rem", borderBottom: "1px solid rgba(0,0,0,0.06)", background: "#F9F8F5", display: "flex", alignItems: "center", gap: 10 }}>
                <Gavel size={18} color="#1A5C2A" />
                <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1.15rem", color: "#0D3320", fontWeight: 400 }}>Organizational Rules</h2>
              </div>
              <div style={{ padding: "1.3rem 1.5rem" }}>
                {ORG_RULES.map((rule, i) => (
                  <div key={i} style={{ display: "flex", gap: 14, padding: "0.8rem 0", borderBottom: i < ORG_RULES.length - 1 ? "1px solid rgba(0,0,0,0.05)" : "none" }}>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#0D3320", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                      <span style={{ fontSize: "0.65rem", color: "#C9A84C", fontWeight: 700 }}>{i + 1}</span>
                    </div>
                    <p style={{ fontSize: "0.9rem", color: "#444", lineHeight: 1.65, fontWeight: 500 }}>{rule}</p>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: "white", borderRadius: 12, border: "1px solid rgba(0,0,0,0.07)", overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
              <div style={{ padding: "1.2rem 1.5rem", borderBottom: "1px solid rgba(0,0,0,0.06)", background: "#F9F8F5", display: "flex", alignItems: "center", gap: 10 }}>
                <Info size={18} color="#1A5C2A" />
                <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1.15rem", color: "#0D3320", fontWeight: 400 }}>Membership Status Guide</h2>
              </div>
              <div style={{ padding: "1.3rem 1.5rem", display: "flex", flexDirection: "column", gap: "0.7rem" }}>
                {[
                  { status: "Active",     color: "#1A6B35", bg: "#E6F9ED", border: "#A8E6BC", desc: "Current with payments. Full benefits and voting rights.", icon: "✅" },
                  { status: "Non-Active", color: "#A66C00", bg: "#FFF8E1", border: "#FFD97A", desc: "2 consecutive unpaid years. Limited benefits.", icon: "⚠️" },
                  { status: "Dropped",    color: "#A8200D", bg: "#FDECEA", border: "#F5A49A", desc: "3+ consecutive unpaid years. Removed from active rolls.", icon: "⛔" },
                  { status: "Deceased",   color: "#555",    bg: "#F2F2F2", border: "#CCC",    desc: "Manually updated by the organization upon notification.", icon: "🕊️" },
                ].map(({ status, color, bg, border, desc, icon }) => (
                  <div key={status} style={{ display: "flex", alignItems: "center", gap: 14, padding: "0.9rem 1.1rem", background: bg, borderRadius: 10, border: `1px solid ${border}` }}>
                    <span style={{ fontSize: "1.3rem" }}>{icon}</span>
                    <span style={{ background: color, color: "white", fontSize: "0.72rem", fontWeight: 700, padding: "4px 12px", borderRadius: 20, minWidth: 90, textAlign: "center", flexShrink: 0 }}>{status}</span>
                    <p style={{ fontSize: "0.9rem", color: "#444", fontWeight: 500 }}>{desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB: OFFICERS */}
        {activeTab === "officers" && (
          <div style={{ background: "white", borderRadius: 12, border: "1px solid rgba(0,0,0,0.07)", overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
            <div style={{ padding: "1.2rem 1.5rem", borderBottom: "1px solid rgba(0,0,0,0.06)", background: "#F9F8F5", display: "flex", alignItems: "center", gap: 10 }}>
              <Users size={18} color="#1A5C2A" />
              <div>
                <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1.15rem", color: "#0D3320", fontWeight: 400 }}>Current Officers</h2>
                <p style={{ fontSize: "0.78rem", color: "#BBB", marginTop: 2 }}>Board of Officers — 2026</p>
              </div>
            </div>

            {officers.filter(o => o.role_type === "executive").length > 0 && (
              <div style={{ padding: "1.5rem" }}>
                <p style={{ fontSize: "0.7rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "#BBB", marginBottom: "1rem", fontWeight: 600 }}>Executive Officers</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "0.5rem" }}>
                  {officers.filter(o => o.role_type === "executive").map((officer, i) => (
                    <div key={officer.id} style={{ padding: "1.3rem", borderRadius: 12, background: i === 0 ? "#0D3320" : "#F9F8F5", border: i === 0 ? "none" : "1px solid rgba(0,0,0,0.06)", textAlign: "center", position: "relative", overflow: "hidden", boxShadow: i === 0 ? "0 4px 16px rgba(13,51,32,0.2)" : "none" }}>
                      {officer.photo_url ? (
                        <img src={officer.photo_url} alt={officer.name} style={{ width: 60, height: 60, borderRadius: "50%", objectFit: "cover", border: `2.5px solid ${i === 0 ? "#C9A84C" : "rgba(0,0,0,0.1)"}`, margin: "0 auto 0.7rem", display: "block" }} />
                      ) : (
                        <div style={{ width: 60, height: 60, borderRadius: "50%", background: i === 0 ? "rgba(201,168,76,0.2)" : "#E4EFE7", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 0.7rem", fontFamily: "'DM Serif Display', serif", fontSize: "1.3rem", color: i === 0 ? "#C9A84C" : "#0D3320" }}>
                          {(officer.name || "").trim() ? officer.name.trim().split(" ").filter((p: string) => p.length > 0).slice(0, 2).map((p: string) => p[0]).join("").toUpperCase() : "?"}
                        </div>
                      )}
                      <p style={{ fontSize: "0.65rem", letterSpacing: "0.1em", textTransform: "uppercase", color: i === 0 ? "rgba(255,255,255,0.45)" : "#BBB", marginBottom: 4, fontWeight: 600 }}>{officer.role}</p>
                      <p style={{ fontSize: "0.9rem", fontWeight: 700, color: i === 0 ? "white" : "#0D3320", fontFamily: "'DM Serif Display', serif" }}>{officer.name}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {officers.filter(o => o.role_type === "pio").length > 0 && (
              <div style={{ padding: "0 1.5rem 1.5rem" }}>
                <p style={{ fontSize: "0.7rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "#BBB", marginBottom: "1rem", fontWeight: 600 }}>Public Information Officers</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0.8rem" }}>
                  {officers.filter(o => o.role_type === "pio").map(officer => (
                    <div key={officer.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "0.9rem 1rem", background: "#F9F8F5", borderRadius: 10, border: "1px solid rgba(0,0,0,0.05)" }}>
                      {officer.photo_url ? (
                        <img src={officer.photo_url} alt={officer.name} style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                      ) : (
                        <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#E4EFE7", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: "0.9rem", fontWeight: 700, color: "#0D3320" }}>
                          {(officer.name || "").trim() ? officer.name.trim().split(" ").filter((p: string) => p.length > 0).slice(0, 2).map((p: string) => p[0]).join("").toUpperCase() : "?"}
                        </div>
                      )}
                      <div>
                        <p style={{ fontSize: "0.9rem", fontWeight: 700, color: "#0D3320" }}>{officer.name}</p>
                        <p style={{ fontSize: "0.75rem", color: "#BBB", fontWeight: 500 }}>PIO</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {officers.filter(o => o.role_type === "bod").length > 0 && (
              <div style={{ padding: "0 1.5rem 1.5rem" }}>
                <p style={{ fontSize: "0.7rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "#BBB", marginBottom: "1rem", fontWeight: 600 }}>Board of Directors</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0.8rem" }}>
                  {officers.filter(o => o.role_type === "bod").map(officer => (
                    <div key={officer.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "0.9rem 1rem", background: "#F9F8F5", borderRadius: 10, border: "1px solid rgba(0,0,0,0.05)" }}>
                      {officer.photo_url ? (
                        <img src={officer.photo_url} alt={officer.name} style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                      ) : (
                        <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#E4EFE7", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: "0.9rem", fontWeight: 700, color: "#0D3320" }}>
                          {(officer.name || "").trim() ? officer.name.trim().split(" ").filter((p: string) => p.length > 0).slice(0, 2).map((p: string) => p[0]).join("").toUpperCase() : "?"}
                        </div>
                      )}
                      <div>
                        <p style={{ fontSize: "0.9rem", fontWeight: 700, color: "#0D3320" }}>{officer.name}</p>
                        <p style={{ fontSize: "0.75rem", color: "#BBB", fontWeight: 500 }}>Board Member</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {officers.length === 0 && (
              <div style={{ padding: "3rem", textAlign: "center", color: "#BBB", fontSize: "0.95rem" }}>No officers listed yet.</div>
            )}

            <div style={{ margin: "0 1.5rem 1.5rem", padding: "1rem 1.2rem", background: "#EEF6F1", borderRadius: 10, border: "1px solid #C0D9C6", display: "flex", gap: 10, alignItems: "flex-start" }}>
              <Info size={16} color="#1A5C2A" style={{ marginTop: 2, flexShrink: 0 }} />
              <div>
                <p style={{ fontSize: "0.88rem", fontWeight: 700, color: "#1A5C2A", marginBottom: 4 }}>For inquiries and concerns</p>
                <p style={{ fontSize: "0.85rem", color: "#555", lineHeight: 1.6 }}>Contact any officer directly or submit a written request to the Secretary. General assemblies are held once a year.</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* EDIT PROFILE MODAL */}
      {editOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}>
          <div style={{ background: "white", borderRadius: 14, width: "100%", maxWidth: 480, overflow: "hidden", boxShadow: "0 24px 60px rgba(0,0,0,0.3)" }}>
            <div style={{ padding: "1.3rem 1.6rem", background: "#0D3320", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <p style={{ fontSize: "0.6rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 2 }}>My Account</p>
                <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1.1rem", color: "#C9A84C", fontWeight: 400 }}>Edit Profile</h3>
              </div>
              <button onClick={() => setEditOpen(false)} style={{ background: "rgba(255,255,255,0.08)", border: "none", color: "white", width: 30, height: 30, borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <X size={14} />
              </button>
            </div>
            <div style={{ padding: "1.5rem 1.6rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: "1.3rem", padding: "1rem", background: "#F9F8F5", borderRadius: 10 }}>
                <div style={{ width: 62, height: 62, borderRadius: "50%", border: "2.5px solid #C9A84C", overflow: "hidden", background: "#EAF0EB", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {member?.avatar_url ? (
                    <img src={member.avatar_url} alt="Profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1.3rem", color: "#0D3320" }}>{getInitials()}</span>
                  )}
                </div>
                <div>
                  <p style={{ fontSize: "0.88rem", fontWeight: 700, color: "#0D3320", marginBottom: 3 }}>Profile Photo</p>
                  <p style={{ fontSize: "0.75rem", color: "#BBB", marginBottom: 7 }}>Auto-compressed & saved as WebP</p>
                  <button onClick={() => fileRef.current?.click()} disabled={uploading} style={{ display: "flex", alignItems: "center", gap: 6, background: "#0D3320", color: "white", border: "none", padding: "0.35rem 0.9rem", borderRadius: 6, fontSize: "0.78rem", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>
                    <Upload size={12} /> {uploading ? "Uploading..." : "Change Photo"}
                  </button>
                </div>
              </div>
              {[
                { key: "mobile",               label: "Mobile Number",               placeholder: "e.g. 0917-000-0000" },
                { key: "address",              label: "Home Address",                placeholder: "Full address" },
                { key: "beneficiary_name",     label: "Beneficiary Name",            placeholder: "Full name" },
                { key: "beneficiary_relation", label: "Relationship to Beneficiary", placeholder: "e.g. Spouse, Child" },
              ].map(({ key, label, placeholder }) => (
                <div key={key} style={{ marginBottom: "1rem" }}>
                  <label style={{ display: "block", fontSize: "0.7rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "#999", marginBottom: 5, fontWeight: 600 }}>{label}</label>
                  <input
                    value={(editForm as any)[key]}
                    onChange={e => setEditForm(prev => ({ ...prev, [key]: e.target.value }))}
                    placeholder={placeholder}
                    style={{ width: "100%", padding: "0.72rem 1rem", border: "1.5px solid rgba(0,0,0,0.12)", borderRadius: 8, fontSize: "0.95rem", fontFamily: "'DM Sans', sans-serif", outline: "none", color: "#0D3320", boxSizing: "border-box" }}
                  />
                </div>
              ))}
              {saveMsg && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0.7rem 1rem", background: "#E6F9ED", borderRadius: 8, marginBottom: "1rem" }}>
                  <CheckCircle size={16} color="#1A6B35" />
                  <p style={{ fontSize: "0.88rem", color: "#1A6B35", fontWeight: 600 }}>{saveMsg}</p>
                </div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.7rem" }}>
                <button onClick={() => setEditOpen(false)} style={{ padding: "0.8rem", background: "#F5F5F5", border: "none", borderRadius: 8, fontSize: "0.88rem", color: "#777", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Cancel</button>
                <button onClick={handleSaveProfile} disabled={saving} style={{ padding: "0.8rem", background: "#0D3320", border: "none", borderRadius: 8, fontSize: "0.88rem", color: "white", cursor: saving ? "not-allowed" : "pointer", fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* GCash Payment Modal */}
      {showPayment && member && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}>
          <div style={{ background: "white", borderRadius: 14, maxWidth: 480, width: "100%", maxHeight: "95vh", overflowY: "auto", boxShadow: "0 24px 60px rgba(0,0,0,0.35)" }}>
            <div style={{ padding: "1.3rem 1.6rem", background: "#0D3320", borderRadius: "14px 14px 0 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <p style={{ fontSize: "0.62rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 2 }}>SUNCO Dues Payment</p>
                <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1.05rem", color: "#C9A84C", fontWeight: 400 }}>Pay via GCash</h3>
              </div>
              <button onClick={() => setShowPayment(false)} style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "white", width: 30, height: 30, borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <X size={14} />
              </button>
            </div>
            <div style={{ padding: "1.5rem" }}>
              <GCashPayment
                supabase={supabase}
                memberId={member.id}
                userId={user?.id}
                unpaidYears={paymentItems}
                hasLifetimePaid={hasLifetimePaid}
                gcashNumber="0946-365-7331"
                gcashName="Gabriel Sacro"
                onSuccess={() => { setShowPayment(false); }}
                onCancel={() => setShowPayment(false)}
              />
            </div>
          </div>
        </div>
      )}
    </main>
  );
}


// cache-bust
