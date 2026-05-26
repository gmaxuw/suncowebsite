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

  return <PageClient page={page} settings={settings} navPages={navPages || []} />;
}
