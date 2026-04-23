"use client";
// ─────────────────────────────────────────────
// admin/page.tsx  —  Responsive shell
//
// Sidebar tabs: Dashboard · Members · Payments
//               Submissions · CMS · Reports · Roles
//
// Moved into CMS: Officers · Logs · Settings
// FIX: Full mobile + tablet responsiveness
// ─────────────────────────────────────────────
import { useEffect, useState, Suspense } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import {
  LogOut, Shield, Home, Users, CreditCard,
  FileText, BarChart2, ChevronRight, Inbox,
  UserCog, Menu, X, Bell,
} from "lucide-react";

import MembersTab            from "./_components/MembersTab";
import PaymentsTab           from "./_components/PaymentsTab";
import PaymentSubmissionsTab from "./_components/PaymentSubmissionsTab";
import CmsTab                from "./_components/CmsTab";
import ReportsTab            from "./_components/ReportsTab";
import RolesTab              from "./_components/RolesTab";

function AdminPageInner() {
  const [memberName,         setMemberName]         = useState("");
  const [user,               setUser]               = useState<any>(null);
  const [role,               setRole]               = useState("");
  const [stats,              setStats]              = useState({ total: 0, active: 0, nonactive: 0, dropped: 0, pending: 0 });
  const [recentMembers,      setRecentMembers]      = useState<any[]>([]);
  const [pendingSubmissions, setPendingSubmissions] = useState(0);
  const [loading,            setLoading]            = useState(true);
  const [sidebarOpen,        setSidebarOpen]        = useState(false);

  const router       = useRouter();
  const searchParams = useSearchParams();
  const supabase     = createClient();

  const [activeTab, setActiveTab] = useState(() => searchParams.get("tab") || "dashboard");

  const setTab = (tab: string) => {
    setActiveTab(tab);
    router.replace(`/admin?tab=${tab}`, { scroll: false });
    setSidebarOpen(false);
  };

  const canCRUD        = ["admin","president","treasurer","secretary"].includes(role);
  const canViewReports = !["member",""].includes(role);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUser(user);

      const { data: roleData } = await supabase
        .from("user_roles").select("role").eq("user_id", user.id).single();
      const userRole = roleData?.role || "member";
      setRole(userRole);

      const { data: memberData } = await supabase
        .from("members").select("first_name, last_name").eq("user_id", user.id).single();
      if (memberData) setMemberName(`${memberData.first_name} ${memberData.last_name}`);

      if (userRole === "member") { router.push("/dashboard"); return; }

      const { data: members } = await supabase.from("members").select("status, approval_status");
      if (members) {
        setStats({
          total:     members.length,
          active:    members.filter((m: any) => (m.status||"").toLowerCase() === "active").length,
          nonactive: members.filter((m: any) => (m.status||"").toLowerCase() === "non-active").length,
          dropped:   members.filter((m: any) => (m.status||"").toLowerCase() === "dropped").length,
          pending:   members.filter((m: any) => (m.approval_status||"").toLowerCase() === "pending").length,
        });
      }

      const { data: recent } = await supabase
        .from("members").select("*").order("created_at", { ascending: false }).limit(10);
      const sorted = (recent || []).sort((a: any, b: any) => {
        const aP = (a.approval_status||"").toLowerCase() === "pending";
        const bP = (b.approval_status||"").toLowerCase() === "pending";
        if (aP && !bP) return -1;
        if (bP && !aP) return 1;
        return 0;
      });
      setRecentMembers(sorted.slice(0, 5));

      const { count } = await supabase
        .from("payment_submissions")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending");
      setPendingSubmissions(count || 0);
      setLoading(false);
    };
    load();
  }, []);

  const handleLogout = async () => { await supabase.auth.signOut(); router.push("/"); };

  const NAV_ITEMS = [
    { id: "dashboard",   icon: Home,      label: "Dashboard",   show: true,           badge: 0 },
    { id: "members",     icon: Users,     label: "Members",     show: canCRUD,        badge: stats.pending },
    { id: "payments",    icon: CreditCard,label: "Payments",    show: canCRUD,        badge: 0 },
    { id: "submissions", icon: Inbox,     label: "Submissions", show: canCRUD,        badge: pendingSubmissions },
    { id: "cms",         icon: FileText,  label: "CMS",         show: canCRUD,        badge: 0 },
    { id: "reports",     icon: BarChart2, label: "Reports",     show: canViewReports, badge: 0 },
    { id: "roles",       icon: UserCog,   label: "Roles",       show: role === "admin",badge: 0 },
  ].filter(i => i.show);

  const statusColor: any = {
    active: "#2E8B44", "non-active": "#D4A017",
    dropped: "#C0392B", deceased: "#95A5A6",
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "var(--green-dk)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <img src="/images/sunco-logo.png" alt="SUNCO" style={{ width: 60, height: 60, borderRadius: "50%", marginBottom: "1rem", opacity: 0.7 }} />
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.85rem", letterSpacing: "0.1em", textTransform: "uppercase" }}>Loading Admin Panel...</p>
      </div>
    </div>
  );

  const totalBadges = (stats.pending || 0) + (pendingSubmissions || 0);

  return (
    <main style={{ minHeight: "100vh", background: "var(--cream)", display: "flex", flexDirection: "column" }}>

      {/* Mobile-responsive global styles */}
      <style>{`
        @media (max-width: 640px) {
          .admin-content { padding: 1rem 0.9rem !important; }
          .dash-stats    { grid-template-columns: repeat(2, 1fr) !important; }
          .dash-table    { font-size: 0.78rem !important; }
          .topbar-right a { display: none !important; }
          .topbar-right .signout-text { display: none !important; }
        }
        @media (max-width: 480px) {
          .dash-stats { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>

      {/* ── TOP BAR ── */}
      <nav style={{ background: "var(--green-dk)", borderBottom: "3px solid var(--gold)", padding: "0 1rem", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 200, flexShrink: 0 }}>

        {/* Left */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={() => setSidebarOpen(v => !v)}
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", color: "white", width: 34, height: 34, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, position: "relative" }}>
            {sidebarOpen ? <X size={16} /> : <Menu size={16} />}
            {!sidebarOpen && totalBadges > 0 && (
              <span style={{ position: "absolute", top: -4, right: -4, background: "#C0392B", color: "white", fontSize: "0.5rem", fontWeight: 700, width: 13, height: 13, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {totalBadges > 9 ? "9+" : totalBadges}
              </span>
            )}
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <img src="/images/sunco-logo.png" alt="SUNCO" style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "contain" }} />
            <div>
              <span style={{ fontFamily: "'Playfair Display', serif", fontSize: "0.9rem", fontWeight: 700, color: "var(--gold-lt)" }}>SUNCO</span>
              <span style={{ display: "block", fontSize: "0.5rem", color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em", textTransform: "uppercase", lineHeight: 1 }}>Admin Panel</span>
            </div>
          </div>

          {/* Breadcrumb — hidden on very small screens */}
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginLeft: 2 }}>
            <ChevronRight size={11} color="rgba(255,255,255,0.3)" />
            <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.5)", textTransform: "capitalize", whiteSpace: "nowrap" }}>
              {NAV_ITEMS.find(i => i.id === activeTab)?.label || activeTab}
            </span>
          </div>
        </div>

        {/* Right */}
        <div className="topbar-right" style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          {pendingSubmissions > 0 && (
            <button onClick={() => setTab("submissions")} title={`${pendingSubmissions} pending`}
              style={{ position: "relative", background: "rgba(0,119,255,0.15)", border: "1px solid rgba(0,119,255,0.3)", color: "#5BA8FF", width: 32, height: 32, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <Bell size={14} />
              <span style={{ position: "absolute", top: -4, right: -4, background: "#0077FF", color: "white", fontSize: "0.5rem", fontWeight: 700, width: 13, height: 13, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>{pendingSubmissions}</span>
            </button>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <Shield size={11} color="var(--gold)" />
            <span style={{ fontSize: "0.65rem", color: "var(--gold)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>
              {memberName ? `${memberName.split(" ")[0]} · ${role}` : role}
            </span>
          </div>
          <a href="/admin/profile" style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.45)", textDecoration: "none" }}>Profile</a>
          <a href="/" target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.35)", textDecoration: "none" }}>Site</a>
          <button onClick={handleLogout} style={{ display: "flex", alignItems: "center", gap: 4, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.65)", padding: "0.3rem 0.65rem", borderRadius: 6, cursor: "pointer", fontSize: "0.7rem", fontFamily: "'DM Sans',sans-serif" }}>
            <LogOut size={11} /> <span className="signout-text">Sign Out</span>
          </button>
        </div>
      </nav>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* Overlay */}
        {sidebarOpen && (
          <div onClick={() => setSidebarOpen(false)}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 150, top: 56 }} />
        )}

        {/* ── SIDEBAR — slides in as overlay on all screen sizes ── */}
        <aside style={{
          width: sidebarOpen ? 240 : 0,
          minWidth: sidebarOpen ? 240 : 0,
          background: "var(--green-dk)",
          borderRight: "1px solid rgba(255,255,255,0.06)",
          display: "flex", flexDirection: "column",
          position: "fixed", top: 56, left: 0, bottom: 0,
          zIndex: 160,
          transition: "width 0.22s ease, min-width 0.22s ease",
          overflow: "hidden",
        }}>

          {/* User identity */}
          <div style={{ padding: "1rem 1.2rem", borderBottom: "1px solid rgba(255,255,255,0.07)", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: "50%", background: "rgba(201,168,76,0.2)", border: "1.5px solid rgba(201,168,76,0.4)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ fontFamily: "'Playfair Display',serif", fontSize: "0.85rem", color: "#C9A84C", fontWeight: 700 }}>
                  {memberName ? memberName[0].toUpperCase() : "A"}
                </span>
              </div>
              <div style={{ overflow: "hidden" }}>
                <p style={{ fontSize: "0.82rem", fontWeight: 700, color: "white", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{memberName || "Admin"}</p>
                <p style={{ fontSize: "0.62rem", color: "var(--gold)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{role.replace("_"," ")}</p>
              </div>
            </div>
          </div>

          {/* Nav items */}
          <nav style={{ flex: 1, overflowY: "auto", padding: "0.5rem 0" }}>
            <div style={{ padding: "0.5rem 1.2rem 0.25rem" }}>
              <p style={{ fontSize: "0.58rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.2)" }}>Navigation</p>
            </div>

            {NAV_ITEMS.map(item => {
              const Icon     = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button key={item.id} onClick={() => setTab(item.id)}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 10,
                    padding: "0.72rem 1.2rem",
                    background: isActive ? "rgba(201,168,76,0.15)" : "transparent",
                    borderLeft: `3px solid ${isActive ? "var(--gold)" : "transparent"}`,
                    border: "none", borderLeftWidth: 3, borderLeftStyle: "solid",
                    cursor: "pointer", fontFamily: "'DM Sans',sans-serif",
                    color: isActive ? "white" : "rgba(255,255,255,0.55)",
                    textAlign: "left", position: "relative",
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
                >
                  <div style={{ width: 29, height: 29, borderRadius: 7, background: isActive ? "rgba(201,168,76,0.25)" : "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Icon size={14} color={isActive ? "#C9A84C" : "rgba(255,255,255,0.5)"} />
                  </div>
                  <span style={{ fontSize: "0.82rem", fontWeight: isActive ? 700 : 500, whiteSpace: "nowrap" }}>{item.label}</span>
                  {item.badge > 0 && (
                    <span style={{ marginLeft: "auto", background: item.id === "submissions" ? "#0077FF" : "#C0392B", color: "white", fontSize: "0.58rem", fontWeight: 700, padding: "2px 7px", borderRadius: 20, flexShrink: 0 }}>{item.badge}</span>
                  )}
                </button>
              );
            })}

            {/* CMS hint */}
            <div style={{ margin: "0.8rem 1.2rem 0.3rem", padding: "0.65rem 0.9rem", background: "rgba(201,168,76,0.08)", borderRadius: 8, border: "1px solid rgba(201,168,76,0.15)" }}>
              <p style={{ fontSize: "0.63rem", color: "rgba(201,168,76,0.7)", fontWeight: 600, marginBottom: 2 }}>📋 Inside CMS</p>
              <p style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.3)", lineHeight: 1.5 }}>Posts · Ads · Officers · Audit Logs · Settings</p>
            </div>
          </nav>

          {/* Sidebar footer */}
          <div style={{ padding: "0.8rem 1.2rem", borderTop: "1px solid rgba(255,255,255,0.07)", flexShrink: 0 }}>
            <a href="/" target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.73rem", color: "rgba(255,255,255,0.4)", textDecoration: "none", marginBottom: "0.5rem" }}>
              🌐 View Main Site
            </a>
            <button onClick={handleLogout} style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.55)", padding: "0.5rem 0.8rem", borderRadius: 6, cursor: "pointer", fontSize: "0.78rem", fontFamily: "'DM Sans',sans-serif" }}>
              <LogOut size={13} /> Sign Out
            </button>
          </div>
        </aside>

        {/* ── MAIN CONTENT ── */}
        <div className="admin-content" style={{ flex: 1, padding: "1.6rem 1.4rem", overflowY: "auto", maxWidth: "100%", boxSizing: "border-box" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>

            {/* DASHBOARD */}
            {activeTab === "dashboard" && (
              <div>
                <div style={{ marginBottom: "1.3rem" }}>
                  <p style={{ fontSize: "0.68rem", color: "var(--muted)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.25rem" }}>Welcome back</p>
                  <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(1.3rem, 4vw, 1.8rem)", fontWeight: 700, color: "var(--green-dk)" }}>
                    {role === "admin" ? "Admin Overview" : `${role.replace("_"," ").replace(/\b\w/g, (l: string) => l.toUpperCase())} Dashboard`}
                  </h1>
                  <p style={{ fontSize: "0.8rem", color: "var(--muted)", marginTop: 3 }}>{memberName}</p>
                </div>

                {/* Stats */}
                <div className="dash-stats" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "0.85rem", marginBottom: "1.3rem" }}>
                  {[
                    { label: "Total Members",    value: stats.total,     color: "var(--gold)" },
                    { label: "Active",           value: stats.active,    color: "#2E8B44" },
                    { label: "Non-active",       value: stats.nonactive, color: "#D4A017" },
                    { label: "Dropped",          value: stats.dropped,   color: "#C0392B" },
                    { label: "Pending Approval", value: stats.pending,   color: "#2B5FA8", onClick: () => setTab("members") },
                  ].map(({ label, value, color, onClick }: any) => (
                    <div key={label} onClick={onClick}
                      style={{ background: "white", borderRadius: 10, padding: "1rem 1.1rem", border: "1px solid rgba(26,92,42,0.08)", borderTop: `4px solid ${color}`, cursor: onClick ? "pointer" : "default" }}>
                      <p style={{ fontSize: "0.6rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)", marginBottom: "0.3rem" }}>{label}</p>
                      <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.7rem", fontWeight: 700, color }}>{value}</p>
                    </div>
                  ))}
                </div>

                {/* Pending submissions alert */}
                {pendingSubmissions > 0 && (
                  <div onClick={() => setTab("submissions")}
                    style={{ background: "rgba(0,119,255,0.06)", border: "1px solid rgba(0,119,255,0.25)", borderRadius: 10, padding: "1rem 1.2rem", marginBottom: "1.3rem", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", flexWrap: "wrap", gap: "0.5rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: "1.1rem" }}>📱</span>
                      <div>
                        <p style={{ fontSize: "0.85rem", fontWeight: 700, color: "#0077FF", marginBottom: 2 }}>
                          {pendingSubmissions} GCash {pendingSubmissions === 1 ? "Submission" : "Submissions"} Pending Review
                        </p>
                        <p style={{ fontSize: "0.73rem", color: "var(--muted)" }}>Members submitted GCash payments waiting for your approval.</p>
                      </div>
                    </div>
                    <span style={{ fontSize: "0.78rem", color: "#0077FF", fontWeight: 600, whiteSpace: "nowrap" }}>Review →</span>
                  </div>
                )}

                {/* Recent registrations */}
                <div style={{ background: "white", borderRadius: 10, border: "1px solid rgba(26,92,42,0.08)", overflow: "hidden" }}>
                  <div style={{ padding: "1rem 1.3rem", borderBottom: "1px solid rgba(26,92,42,0.08)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1rem", fontWeight: 700, color: "var(--green-dk)" }}>Recent Registrations</h2>
                    <button onClick={() => setTab("members")} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: "var(--gold)", cursor: "pointer", fontSize: "0.75rem", fontWeight: 600, fontFamily: "'DM Sans',sans-serif" }}>
                      View all <ChevronRight size={12} />
                    </button>
                  </div>
                  <div style={{ overflowX: "auto" }}>
                    <table className="dash-table" style={{ width: "100%", borderCollapse: "collapse", minWidth: 420 }}>
                      <thead>
                        <tr style={{ background: "var(--warm)" }}>
                          {["Name","Contact","Date Applied","Approval","Status"].map(h => (
                            <th key={h} style={{ padding: "0.7rem 0.9rem", textAlign: "left", fontSize: "0.62rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)", whiteSpace: "nowrap" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {recentMembers.map((m: any, i: number) => (
                          <tr key={m.id} style={{ borderBottom: "1px solid rgba(26,92,42,0.06)", background: i % 2 === 0 ? "white" : "var(--cream)" }}>
                            <td style={{ padding: "0.8rem 0.9rem", fontSize: "0.85rem", fontWeight: 600, color: "var(--green-dk)", whiteSpace: "nowrap" }}>{m.first_name} {m.last_name}</td>
                            <td style={{ padding: "0.8rem 0.9rem", fontSize: "0.78rem", color: "var(--muted)" }}>{m.mobile || m.email}</td>
                            <td style={{ padding: "0.8rem 0.9rem", fontSize: "0.78rem", color: "var(--muted)", whiteSpace: "nowrap" }}>{m.created_at ? new Date(m.created_at).toLocaleDateString("en-US") : "—"}</td>
                            <td style={{ padding: "0.8rem 0.9rem" }}>
                              <span style={{ background: (m.approval_status||"").toLowerCase() === "approved" ? "rgba(46,139,68,0.1)" : (m.approval_status||"").toLowerCase() === "rejected" ? "rgba(192,57,43,0.1)" : "rgba(43,95,168,0.1)", color: (m.approval_status||"").toLowerCase() === "approved" ? "#2E8B44" : (m.approval_status||"").toLowerCase() === "rejected" ? "#C0392B" : "#2B5FA8", fontSize: "0.68rem", fontWeight: 600, padding: "2px 9px", borderRadius: 20, textTransform: "capitalize" }}>{m.approval_status || "—"}</span>
                            </td>
                            <td style={{ padding: "0.8rem 0.9rem", fontSize: "0.78rem", color: statusColor[(m.status||"").toLowerCase()] || "var(--muted)", textTransform: "capitalize", fontWeight: 600 }}>{m.status || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "members"     && <MembersTab canCRUD={canCRUD} supabase={supabase} currentUser={user} currentRole={role} currentMemberName={memberName} />}
            {activeTab === "payments"    && <PaymentsTab canCRUD={canCRUD} supabase={supabase} currentUser={user} currentRole={role} currentMemberName={memberName} />}
            {activeTab === "submissions" && <PaymentSubmissionsTab supabase={supabase} currentUser={user} currentMemberName={memberName} currentRole={role} />}
            {activeTab === "cms"         && <CmsTab canCRUD={canCRUD} supabase={supabase} userId={user?.id} currentMemberName={memberName} currentRole={role} />}
            {activeTab === "reports"     && <ReportsTab canCRUD={canCRUD} supabase={supabase} />}
            {activeTab === "roles"       && role === "admin" && <RolesTab supabase={supabase} />}

          </div>
        </div>
      </div>
    </main>
  );
}

export default function AdminPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", background: "var(--green-dk)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <img src="/images/sunco-logo.png" alt="SUNCO" style={{ width: 60, height: 60, borderRadius: "50%", marginBottom: "1rem", opacity: 0.7 }} />
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.85rem", letterSpacing: "0.1em", textTransform: "uppercase" }}>Loading Admin Panel...</p>
        </div>
      </div>
    }>
      <AdminPageInner />
    </Suspense>
  );
}
