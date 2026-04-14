// ─────────────────────────────────────────────
// app/page.tsx
// Public homepage — pulls content from Supabase
// SEO: metadata, OpenGraph, structured data
// Performance: lazy loading, image optimization
// ─────────────────────────────────────────────
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { Metadata } from "next";
import HomeClient from "./admin/_components/HomeClient";

// ── SEO Metadata ──
export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: settings } = await supabase
    .from("site_settings")
    .select("key, value");

  const getSetting = (key: string) =>
    settings?.find(s => s.key === key)?.value || "";

  const orgName = getSetting("org_name") || "Surigao del Norte Consumers Organization, Inc.";
  const description = getSetting("hero_description") || "SUNCO is the voice of consumers in Surigao del Norte — advocating for your rights and welfare.";

  return {
  metadataBase: new URL("https://sunco.org.ph"),
    title: `SUNCO — ${orgName}`,
    description,
    keywords: ["SUNCO", "Surigao del Norte", "consumers organization", "DTI", "consumer rights", "Philippines", "Caraga"],
    openGraph: {
      title: `SUNCO — ${orgName}`,
      description,
      type: "website",
      locale: "en_PH",
      images: [{ url: "/images/sunco-logo.png", width: 400, height: 400, alt: "SUNCO Official Seal" }],
    },
    twitter: {
      card: "summary",
      title: `SUNCO — ${orgName}`,
      description,
      images: ["/images/sunco-logo.png"],
    },
    robots: { index: true, follow: true },
    alternates: { canonical: "/" },
  };
}

export default async function HomePage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  // Fetch all data in parallel
  const [settingsRes, officersRes, programsRes, articlesRes] = await Promise.all([
    supabase.from("site_settings").select("key, value"),
    supabase.from("officers").select("*").eq("is_active", true).order("order_num"),
    supabase.from("programs").select("*").eq("is_active", true).order("order_num"),
    supabase.from("articles").select("*").eq("published", true).order("created_at", { ascending: false }).limit(3),
  ]);

  // Build settings map
  const settingsMap: Record<string, string> = {};
  (settingsRes.data || []).forEach(s => { settingsMap[s.key] = s.value; });

  return (
    <>
      {/* ── JSON-LD Structured Data for Google ── */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            name: settingsMap.org_name || "Surigao del Norte Consumers Organization, Inc.",
            alternateName: "SUNCO",
            url: "https://sunco.org.ph",
            logo: "/images/sunco-logo.png",
            foundingDate: settingsMap.org_established || "2011",
            address: {
              "@type": "PostalAddress",
              addressRegion: "Surigao del Norte",
              addressCountry: "PH",
            },
            description: settingsMap.hero_description,
          })
        }}
      />
      <HomeClient
        settings={settingsMap}
        officers={officersRes.data || []}
        programs={programsRes.data || []}
        articles={articlesRes.data || []}
      />
    </>
  );
}