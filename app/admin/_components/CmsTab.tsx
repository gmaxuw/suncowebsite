"use client";
// ─────────────────────────────────────────────
// CmsTab.tsx  —  Thin shell
// Splits into: PostsList, PostEditor, AdsManager
// Settings are handled by SettingsTab.tsx
// ─────────────────────────────────────────────
import { useState } from "react";
import { FileText, Megaphone, PlusCircle, Settings } from "lucide-react";
import PostsList     from "./cms/PostsList";
import PostEditor    from "./cms/PostEditor";
import AdsManager    from "./cms/AdsManager";
import SettingsPanel from "./cms/SettingsPanel";

export interface CmsTabProps {
  canCRUD:           boolean;
  supabase:          any;
  userId:            string;
  currentMemberName?: string;
}

export type Post = {
  id?:              string;
  title:            string;
  slug:             string;
  excerpt:          string;
  content:          string;
  category:         string;
  tags:             string[];
  status:           string;
  featured:         boolean;
  thumbnail_url:    string;
  author_name:      string;
  reading_time:     number;
  seo_title:        string;
  seo_description:  string;
  seo_keywords:     string[];
};

export const EMPTY_POST: Post = {
  title: "", slug: "", excerpt: "", content: "",
  category: "news", tags: [], status: "draft",
  featured: false, thumbnail_url: "", author_name: "",
  reading_time: 5, seo_title: "", seo_description: "", seo_keywords: [],
};

export const CATEGORIES = [
  { value: "news",            label: "News",            color: "#2B5FA8" },
  { value: "consumer-rights", label: "Consumer Rights", color: "#2E8B44" },
  { value: "announcements",   label: "Announcements",   color: "#D4A017" },
  { value: "mas",             label: "MAS Program",     color: "#9A2020" },
  { value: "programs",        label: "Programs",        color: "#6B3FA0" },
  { value: "success-stories", label: "Success Stories", color: "#1A7A8A" },
  { value: "milestones",      label: "Milestones",      color: "#C46B1A" },
];

type Tab = "posts" | "ads" | "settings";

export default function CmsTab({ canCRUD, supabase, userId, currentMemberName }: CmsTabProps) {
  const [activeTab,   setActiveTab]   = useState<Tab>("posts");
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [showEditor,  setShowEditor]  = useState(false);
  const [refreshKey,  setRefreshKey]  = useState(0);

  const openNew = () => {
    setEditingPost({ ...EMPTY_POST, author_name: currentMemberName || "" });
    setShowEditor(true);
  };

  const openEdit = (post: any) => {
    setEditingPost(post);
    setShowEditor(true);
  };

  const onSaved = () => {
    setShowEditor(false);
    setRefreshKey(k => k + 1);
  };

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "0.8rem" }}>
        <div>
          <p style={{ fontSize: "0.7rem", color: "var(--muted)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.3rem" }}>Admin Panel</p>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.8rem", fontWeight: 700, color: "var(--green-dk)" }}>Content Management</h1>
        </div>
        {canCRUD && (
          <div style={{ display: "flex", gap: "0.5rem" }}>
            {activeTab === "posts" && (
              <button onClick={openNew} style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--gold)", color: "var(--green-dk)", border: "none", padding: "0.7rem 1.4rem", borderRadius: 6, fontSize: "0.82rem", fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                <PlusCircle size={15} /> New Post
              </button>
            )}
          </div>
        )}
      </div>

      {/* Tab switcher */}
      <div style={{ display: "flex", gap: "0.3rem", marginBottom: "1.5rem", background: "white", padding: "0.35rem", borderRadius: 10, border: "1px solid rgba(26,92,42,0.08)", width: "fit-content" }}>
        {([
          { id: "posts", label: "Posts",    icon: FileText  },
          { id: "ads",   label: "Ads",      icon: Megaphone },
        ] as const).map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setActiveTab(id)}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "0.5rem 1.1rem", borderRadius: 7, border: "none", background: activeTab === id ? "var(--green-dk)" : "transparent", color: activeTab === id ? "white" : "var(--muted)", fontSize: "0.8rem", fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "posts" && (
        <PostsList
          key={refreshKey}
          canCRUD={canCRUD}
          supabase={supabase}
          onEdit={openEdit}
          onNew={openNew}
        />
      )}
      {activeTab === "ads" && (
        <AdsManager canCRUD={canCRUD} supabase={supabase} />
      )}
      {activeTab === "settings" && (
        <SettingsPanel supabase={supabase} />
      )}

      {/* Editor overlay */}
      {showEditor && editingPost && (
        <PostEditor
          supabase={supabase}
          post={editingPost}
          currentMemberName={currentMemberName}
          onSaved={onSaved}
          onClose={() => setShowEditor(false)}
        />
      )}
    </div>
  );
}
