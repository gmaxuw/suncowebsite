import { createClient } from "@/utils/supabase/client";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import PostPageClient from "./_components/PostPageClient";

interface Props {
  params: Promise<{ slug: string }>;
}

async function getPost(slugOrId: string) {
  const supabase = createClient();

  const { data: postBySlug } = await supabase
    .from("posts")
    .select("*")
    .eq("slug", slugOrId)
    .eq("status", "published")
    .single();

  if (postBySlug) return { post: postBySlug, source: "posts" };

  const { data: postById } = await supabase
    .from("posts")
    .select("*")
    .eq("id", slugOrId)
    .eq("status", "published")
    .single();

  if (postById) return { post: postById, source: "posts" };

  return null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const result = await getPost(slug);
  if (!result) return { title: "Post Not Found — SUNCO" };

  const { post } = result;
  const orgName = "SUNCO — Surigao del Norte Consumers Organization";
  const baseUrl = "https://sunco.gabrielsacro.com";

  return {
    title: `${post.seo_title || post.title} | ${orgName}`,
    description: post.seo_description || post.excerpt || "",
    keywords: Array.isArray(post.seo_keywords) ? post.seo_keywords.join(", ") : "",
    authors: [{ name: post.author_name || "SUNCO Editorial Team" }],
    openGraph: {
      title: post.seo_title || post.title,
      description: post.seo_description || post.excerpt || "",
      url: `${baseUrl}/news/${slug}`,
      siteName: orgName,
      images: post.thumbnail_url ? [{ url: post.thumbnail_url, width: 1200, height: 630 }] : [],
      type: "article",
      publishedTime: post.published_at || post.created_at,
      authors: [post.author_name || "SUNCO Editorial Team"],
    },
    twitter: {
      card: "summary_large_image",
      title: post.seo_title || post.title,
      description: post.seo_description || post.excerpt || "",
      images: post.thumbnail_url ? [post.thumbnail_url] : [],
    },
    alternates: { canonical: `${baseUrl}/news/${slug}` },
    robots: { index: true, follow: true },
  };
}

export default async function PostPage({ params }: Props) {
  const { slug } = await params;
  const supabase = createClient();
  const result = await getPost(slug);

  if (!result) notFound();

  const { post } = result;

  const [
    { data: recentPosts },
    { data: activeAds },
    { data: settings },
    { data: documents },   // ← new: fetch matching public documents
  ] = await Promise.all([
    supabase
      .from("posts")
      .select("id, title, slug, thumbnail_url, category, published_at, created_at, excerpt")
      .eq("status", "published")
      .neq("id", post.id)
      .order("published_at", { ascending: false })
      .limit(6),

    // ✅ FIXED: was "promotion" (wrong), now "promotions" (matches your actual table)
    supabase
      .from("promotions")
      .select("*")
      .eq("is_active", true)
      .order("created_at"),

    supabase
      .from("site_settings")
      .select("key, value"),

    // Fetch public documents linked to this post by ID or matching tags
    supabase
      .from("documents")
      .select("id, title, description, file_type, file_size_kb, thumbnail_url, category, tags, download_count")
      .eq("visibility", "public")
      .or(
        post.tags?.length > 0
          ? `linked_post_ids.cs.{${post.id}},tags.ov.{${post.tags.join(",")}}`
          : `linked_post_ids.cs.{${post.id}}`
      )
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const settingsMap: Record<string, string> = {};
  (settings || []).forEach((s: any) => { settingsMap[s.key] = s.value; });

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": post.title,
    "description": post.seo_description || post.excerpt,
    "image": post.thumbnail_url,
    "author": { "@type": "Organization", "name": post.author_name || "SUNCO" },
    "publisher": {
      "@type": "Organization",
      "name": "SUNCO",
      "logo": { "@type": "ImageObject", "url": settingsMap["hero_logo_url"] || "/images/sunco-logo.png" },
    },
    "datePublished": post.published_at || post.created_at,
    "dateModified": post.updated_at,
    "mainEntityOfPage": { "@type": "WebPage", "@id": `https://sunco.gabrielsacro.com/news/${slug}` },
    "keywords": Array.isArray(post.seo_keywords) ? post.seo_keywords.join(", ") : "",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PostPageClient
        post={post}
        recentPosts={recentPosts || []}
        ads={activeAds || []}
        settings={settingsMap}
        documents={documents || []}
      />
    </>
  );
}
