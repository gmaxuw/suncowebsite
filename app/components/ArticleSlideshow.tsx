"use client";
// ─────────────────────────────────────────────
// ArticleSlideshow.tsx
// Auto-playing slideshow for article inline images
// Used by PostPageClient to render [slideshow:...] tags
// ─────────────────────────────────────────────
import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Slide {
  url: string;
  alt: string;
}

export default function ArticleSlideshow({ slides }: { slides: Slide[] }) {
  const [current, setCurrent] = useState(0);
  const [paused,  setPaused]  = useState(false);

  const next = useCallback(() => setCurrent(c => (c + 1) % slides.length), [slides.length]);
  const prev = useCallback(() => setCurrent(c => (c - 1 + slides.length) % slides.length), [slides.length]);

  useEffect(() => {
    if (paused || slides.length <= 1) return;
    const t = setInterval(next, 4500);
    return () => clearInterval(t);
  }, [paused, next, slides.length]);

  if (!slides.length) return null;

  return (
    <figure
      style={{ margin: "2.2rem 0", position: "relative", borderRadius: 14, overflow: "hidden", background: "#0D3320", boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}>

      {/* Images */}
      <div style={{ position: "relative", width: "100%", paddingBottom: "56.25%", overflow: "hidden" }}>
        {slides.map((slide, i) => (
          <img
            key={i}
            src={slide.url}
            alt={slide.alt}
            loading={i === 0 ? "eager" : "lazy"}
            style={{
              position: "absolute", inset: 0,
              width: "100%", height: "100%",
              objectFit: "cover",
              opacity: i === current ? 1 : 0,
              transition: "opacity 0.6s ease",
              pointerEvents: i === current ? "auto" : "none",
            }}
          />
        ))}

        {/* Gradient overlay for controls */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, rgba(0,0,0,0.25) 0%, transparent 15%, transparent 85%, rgba(0,0,0,0.25) 100%)", pointerEvents: "none" }} />

        {/* Prev / Next */}
        {slides.length > 1 && (
          <>
            <button
              onClick={prev}
              style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 40, height: 40, borderRadius: "50%", background: "rgba(255,255,255,0.15)", backdropFilter: "blur(4px)", border: "1px solid rgba(255,255,255,0.2)", color: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.15s" }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.3)")}
              onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.15)")}>
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={next}
              style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", width: 40, height: 40, borderRadius: "50%", background: "rgba(255,255,255,0.15)", backdropFilter: "blur(4px)", border: "1px solid rgba(255,255,255,0.2)", color: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.15s" }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.3)")}
              onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.15)")}>
              <ChevronRight size={20} />
            </button>
          </>
        )}

        {/* Slide counter */}
        <div style={{ position: "absolute", top: 12, right: 14, background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)", borderRadius: 20, padding: "3px 12px", fontSize: "0.68rem", color: "rgba(255,255,255,0.85)", fontWeight: 600, fontFamily: "'DM Sans',sans-serif" }}>
          {current + 1} / {slides.length}
        </div>
      </div>

      {/* Dots */}
      {slides.length > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 6, padding: "0.7rem 0", background: "#0D3320" }}>
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              style={{ width: i === current ? 20 : 7, height: 7, borderRadius: 20, border: "none", background: i === current ? "#C9A84C" : "rgba(255,255,255,0.25)", cursor: "pointer", padding: 0, transition: "all 0.3s" }}
            />
          ))}
        </div>
      )}

      {/* Caption */}
      {slides[current].alt && (
        <figcaption style={{ padding: "0.5rem 1.2rem 0.75rem", background: "#0D3320", textAlign: "center", fontSize: "0.78rem", color: "rgba(255,255,255,0.5)", fontStyle: "italic", fontFamily: "'DM Sans',sans-serif", lineHeight: 1.5 }}>
          {slides[current].alt}
        </figcaption>
      )}
    </figure>
  );
}
