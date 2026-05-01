// ─────────────────────────────────────────────────────────────
// hooks/useWindowWidth.ts
// Place at: D:\suncowebsite\app\admin\hooks\useWindowWidth.ts
// ─────────────────────────────────────────────────────────────
"use client";
import { useEffect, useState } from "react";

export function useWindowWidth() {
  const [width, setWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1200
  );

  useEffect(() => {
    const handler = () => setWidth(window.innerWidth);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  return {
    width,
    isMobile: width < 640,
    isTablet: width >= 640 && width < 1024,
    isDesktop: width >= 1024,
  };
}