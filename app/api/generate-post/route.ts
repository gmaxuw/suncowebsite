// app/api/generate-post/route.ts
// ─────────────────────────────────────────────
// Server-side API route for Claude AI generation.
// Keeps ANTHROPIC_API_KEY secure on the server.
// Called from PostEditor.tsx via fetch("/api/generate-post")
// ─────────────────────────────────────────────
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not set in environment variables." },
      { status: 500 }
    );
  }

  try {
    const { title, category, context } = await req.json();

    if (!title?.trim()) {
      return NextResponse.json({ error: "Title is required." }, { status: 400 });
    }

    const prompt = `You are a content writer for SUNCO (Surigao del Norte Consumers Organization), a Filipino consumer cooperative in Mindanao, Philippines. 

Write a complete, SEO-optimized article for:
Title: "${title}"
Category: ${category || "news"}
${context ? `Additional context: ${context}` : ""}

Write naturally for Filipino readers. Include practical tips, reference Philippine consumer laws where relevant, and highlight SUNCO's mission in Surigao del Norte.

Respond ONLY with valid JSON (no markdown, no backticks, no preamble):
{
  "content": "Full article body with natural paragraphs separated by double newlines. Minimum 600 words. Include subheadings by writing them as lines ending with a colon. Write in a clear, warm, informative tone. Do NOT include a Conclusion section or any closing summary paragraph — end naturally after the last main point.",
  "excerpt": "Compelling 150-160 character excerpt for preview cards and meta descriptions.",
  "seo_title": "SEO-optimized title under 60 characters that includes primary keyword",
  "seo_description": "Meta description 150-160 characters with primary keyword and clear call to action",
  "seo_keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5", "keyword6"],
  "tags": ["tag1", "tag2", "tag3", "tag4"],
  "reading_time": 5
}`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type":         "application/json",
        "x-api-key":            apiKey,
        "anthropic-version":    "2023-06-01",
      },
      body: JSON.stringify({
        model:      "claude-sonnet-4-20250514",
        max_tokens: 4000,
        messages:   [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return NextResponse.json({ error: "Claude API error: " + err }, { status: response.status });
    }

    const data = await response.json();
    const raw  = data.content?.find((b: any) => b.type === "text")?.text || "";
    const clean = raw.replace(/```json|```/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(clean);
    } catch {
      return NextResponse.json({ error: "Failed to parse Claude response.", raw }, { status: 500 });
    }

    return NextResponse.json(parsed);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
