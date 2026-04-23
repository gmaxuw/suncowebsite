import { createClient } from "@/utils/supabase/client";
import NewsClient from "./_components/NewsClient";

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
      .from("ads")
      .select("*")
      .eq("is_active", true),
    supabase
      .from("site_settings")
      .select("key, value"),
  ]);

  const settingsMap: Record<string, string> = {};
  (settings || []).forEach((s: any) => { settingsMap[s.key] = s.value; });

  const allPosts   = posts || [];
  const allAds     = (ads || []).filter(Boolean);
  const featured   = allPosts.find(p => p.featured) || allPosts[0];
  const rest       = allPosts.filter(p => p.id !== featured?.id);
  const shuffledAds = [...allAds].filter(Boolean);

  const postsWithAds: any[] = [];
  rest.forEach((post, i) => {
    postsWithAds.push({ type: "post", data: post });
    if ((i + 1) % 4 === 0 && shuffledAds.length > 0) {
      const ad = shuffledAds[Math.floor(i / 4) % shuffledAds.length];
      if (ad) postsWithAds.push({ type: "ad", data: ad });
    }
  });

  return (
    <NewsClient
      allPosts={allPosts}
      postsWithAds={postsWithAds}
      shuffledAds={shuffledAds}
      featured={featured}
      settingsMap={settingsMap}
      orgName={settingsMap["org_short_name"] || "SUNCO"}
      logoUrl={settingsMap["hero_logo_url"] || "/images/sunco-logo.png"}
    />
  );
}