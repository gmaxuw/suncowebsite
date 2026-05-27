import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import PageClient from "./PageClient";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function DynamicPage({ params }: Props) {
  const { slug } = await params;
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: page } = await supabase
    .from("pages")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .single();

  if (!page) notFound();

  const { data: settingsRaw } = await supabase
    .from("site_settings")
    .select("key, value");

  const settings: Record<string, string> = {};
  (settingsRaw || []).forEach((r: any) => { settings[r.key] = r.value; });

  const { data: navPages } = await supabase
    .from("pages")
    .select("title, slug, nav_label, nav_order, show_in_nav")
    .eq("status", "published")
    .eq("show_in_nav", true)
    .order("nav_order");

  // Fetch ads — same as news pages
  const { data: activeAds } = await supabase
    .from("promotions")
    .select("*")
    .eq("is_active", true)
    .order("created_at");

  // Fetch documents linked to this page
  const { data: documents } = await supabase
    .from("documents")
    .select("id, title, description, file_type, file_size_kb, thumbnail_url, category, tags, download_count")
    .eq("visibility", "public")
    .contains("linked_page_ids", [page.id])
    .order("created_at", { ascending: false })
    .limit(5);

  return (
    <PageClient
      page={page}
      settings={settings}
      navPages={navPages || []}
      ads={activeAds || []}
      documents={documents || []}
    />
  );
}
