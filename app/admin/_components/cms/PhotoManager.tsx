"use client";
// ─────────────────────────────────────────────
// cms/PhotoManager.tsx
// Manages up to 10 article photos with:
//   - Upload + WebP compression
//   - Alt text / caption per photo
//   - Insert as single [img:N] or slideshow [slideshow:1,2,3]
//   - Drag-to-reorder (simple up/down)
//   - AI-generated alt text fills in after Generate
// ─────────────────────────────────────────────
import { useRef, useState } from "react";
import { Upload, Image, X, ChevronUp, ChevronDown, GalleryHorizontal, ImageIcon, Loader2 } from "lucide-react";

export type ArticlePhoto = {
  id:      string;   // local uuid
  url:     string;   // Supabase public URL
  alt:     string;   // alt text / caption
  uploading?: boolean;
};

interface Props {
  supabase:   any;
  photos:     ArticlePhoto[];
  onChange:   (updater: ArticlePhoto[] | ((prev: ArticlePhoto[]) => ArticlePhoto[])) => void;
  onInsert:   (tag: string) => void; // inserts into content textarea
}

function uid() { return Math.random().toString(36).slice(2, 9); }

export default function PhotoManager({ supabase, photos, onChange, onInsert }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [selecting, setSelecting] = useState<string[]>([]); // ids selected for slideshow

  const compressToWebP = (file: File): Promise<Blob> =>
    new Promise((resolve, reject) => {
      const img = document.createElement("img");
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const MAX = 1400;
        let { width, height } = img;
        if (width > MAX || height > MAX) {
          if (width > height) { height = Math.round((height / width) * MAX); width = MAX; }
          else { width = Math.round((width / height) * MAX); height = MAX; }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width; canvas.height = height;
        canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
        canvas.toBlob(b => b ? resolve(b) : reject(new Error("Failed")), "image/webp", 0.88);
      };
      img.onerror = reject;
      img.src = url;
    });

  const handleFiles = async (files: FileList) => {
    const remaining = 10 - photos.length;
    const toUpload  = Array.from(files).slice(0, remaining);
    if (!toUpload.length) return;

    // Add placeholders immediately
    const placeholders: ArticlePhoto[] = toUpload.map(f => ({
      id: uid(), url: URL.createObjectURL(f), alt: "", uploading: true,
    }));
    onChange([...photos, ...placeholders]);

    // Upload each
    for (let i = 0; i < toUpload.length; i++) {
      const file   = toUpload[i];
      const ph     = placeholders[i];
      try {
        const blob     = await compressToWebP(file);
        const filename = `content/photo-${Date.now()}-${i}.webp`;
        const { error } = await supabase.storage.from("articles").upload(filename, blob, { contentType: "image/webp", upsert: true });
        if (error) throw error;
        const { data: urlData } = supabase.storage.from("articles").getPublicUrl(filename);
        onChange((prev: ArticlePhoto[]) => prev.map(p => p.id === ph.id ? { ...p, url: urlData.publicUrl, uploading: false } : p));
      } catch {
        onChange((prev: ArticlePhoto[]) => prev.filter(p => p.id !== ph.id));
      }
    }
  };

  const removePhoto = (id: string) => {
    onChange(photos.filter(p => p.id !== id));
    setSelecting(s => s.filter(x => x !== id));
  };

  const updateAlt = (id: string, alt: string) =>
    onChange(photos.map(p => p.id === id ? { ...p, alt } : p));

  const moveUp = (idx: number) => {
    if (idx === 0) return;
    const arr = [...photos];
    [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
    onChange(arr);
  };

  const moveDown = (idx: number) => {
    if (idx === photos.length - 1) return;
    const arr = [...photos];
    [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
    onChange(arr);
  };

  const toggleSelect = (id: string) => {
    setSelecting(s => s.includes(id) ? s.filter(x => x !== id) : s.length < 5 ? [...s, id] : s);
  };

  const insertSingle = (photo: ArticlePhoto) => {
    const idx = photos.findIndex(p => p.id === photo.id);
    onInsert(`\n\n[img:${photo.url}|${photo.alt || ""}]\n\n`);
  };

  const insertSlideshow = () => {
    if (selecting.length < 2) return;
    const ordered = photos.filter(p => selecting.includes(p.id));
    const parts   = ordered.map(p => `${p.url}||${p.alt || ""}`).join(";;");
    onInsert(`\n\n[slideshow:${parts}]\n\n`);
    setSelecting([]);
  };

  return (
    <div style={{ background: "white", borderRadius: 14, border: "1px solid rgba(26,92,42,0.1)", overflow: "hidden", marginBottom: "1.4rem", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
      {/* Header */}
      <div style={{ background: "#F0EDE6", padding: "0.9rem 1.2rem", borderBottom: "1px solid rgba(26,92,42,0.08)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <ImageIcon size={14} color="#1A5C2A" />
          <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#0D3320" }}>Article Photos</span>
          <span style={{ fontSize: "0.65rem", background: "rgba(26,92,42,0.1)", color: "#1A5C2A", padding: "2px 8px", borderRadius: 20, fontWeight: 700 }}>
            {photos.length}/10
          </span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {selecting.length >= 2 && (
            <button
              onClick={insertSlideshow}
              style={{ display: "flex", alignItems: "center", gap: 6, background: "#0D3320", color: "#C9A84C", border: "none", padding: "0.4rem 0.9rem", borderRadius: 8, fontSize: "0.75rem", fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
              <GalleryHorizontal size={13} />
              Insert Slideshow ({selecting.length})
            </button>
          )}
          {photos.length < 10 && (
            <>
              <input ref={fileRef} type="file" multiple accept="image/*" onChange={e => e.target.files && handleFiles(e.target.files)} style={{ display: "none" }} />
              <button
                onClick={() => fileRef.current?.click()}
                style={{ display: "flex", alignItems: "center", gap: 6, background: "#1A5C2A", color: "white", border: "none", padding: "0.4rem 0.9rem", borderRadius: 8, fontSize: "0.75rem", fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                <Upload size={12} /> Add Photos
              </button>
            </>
          )}
        </div>
      </div>

      {/* Instructions */}
      {photos.length === 0 ? (
        <div
          onClick={() => fileRef.current?.click()}
          style={{ padding: "2.5rem", textAlign: "center", cursor: "pointer", color: "#BBB" }}>
          <Image size={32} color="rgba(26,92,42,0.15)" style={{ marginBottom: 8, display: "block", margin: "0 auto 0.7rem" }} />
          <p style={{ fontSize: "0.82rem", fontWeight: 600, color: "#888", marginBottom: 4 }}>No photos yet</p>
          <p style={{ fontSize: "0.72rem", color: "#BBB", lineHeight: 1.6 }}>Click to upload up to 10 photos.<br />Auto-compressed to WebP.</p>
        </div>
      ) : (
        <>
          <div style={{ padding: "0.5rem 0.8rem", background: "rgba(43,95,168,0.04)", borderBottom: "1px solid rgba(26,92,42,0.06)" }}>
            <p style={{ fontSize: "0.65rem", color: "#888" }}>
              💡 <strong>Single photo:</strong> click "Insert" · <strong>Slideshow:</strong> tick 2–5 photos then "Insert Slideshow"
            </p>
          </div>

          {/* Photo list */}
          <div style={{ padding: "0.6rem" }}>
            {photos.map((photo, idx) => (
              <div key={photo.id}
                style={{ display: "grid", gridTemplateColumns: "20px 80px 1fr auto", gap: 10, alignItems: "center", padding: "0.6rem 0.5rem", borderBottom: idx < photos.length - 1 ? "1px solid rgba(26,92,42,0.05)" : "none", background: selecting.includes(photo.id) ? "rgba(43,95,168,0.04)" : "transparent", borderRadius: 8, transition: "background 0.15s" }}>

                {/* Slideshow checkbox */}
                <input
                  type="checkbox"
                  checked={selecting.includes(photo.id)}
                  onChange={() => toggleSelect(photo.id)}
                  disabled={!!photo.uploading}
                  title="Select for slideshow"
                  style={{ accentColor: "#2B5FA8", width: 15, height: 15, cursor: "pointer" }}
                />

                {/* Thumbnail */}
                <div style={{ width: 80, height: 54, borderRadius: 7, overflow: "hidden", background: "#F0EDE6", border: "1px solid rgba(26,92,42,0.1)", position: "relative", flexShrink: 0 }}>
                  <img src={photo.url} alt={photo.alt} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  {photo.uploading && (
                    <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.7)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Loader2 size={16} color="#1A5C2A" style={{ animation: "spin 1s linear infinite" }} />
                    </div>
                  )}
                </div>

                {/* Alt text + photo number */}
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                    <span style={{ fontSize: "0.6rem", background: "rgba(26,92,42,0.1)", color: "#1A5C2A", padding: "1px 7px", borderRadius: 10, fontWeight: 700 }}>Photo {idx + 1}</span>
                    {!photo.uploading && (
                      <button
                        onClick={() => insertSingle(photo)}
                        style={{ fontSize: "0.62rem", color: "#C9A84C", background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.25)", padding: "1px 8px", borderRadius: 10, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", fontWeight: 700 }}>
                        Insert ↵
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={photo.alt}
                    onChange={e => updateAlt(photo.id, e.target.value)}
                    placeholder="Alt text / caption (AI will fill this after Generate)"
                    style={{ width: "100%", padding: "0.38rem 0.6rem", border: "1.5px solid rgba(26,92,42,0.12)", borderRadius: 7, fontSize: "0.75rem", fontFamily: "'DM Sans',sans-serif", color: "#0D3320", outline: "none", boxSizing: "border-box" }}
                  />
                </div>

                {/* Actions */}
                <div style={{ display: "flex", flexDirection: "column", gap: 3, alignItems: "center" }}>
                  <button onClick={() => moveUp(idx)} disabled={idx === 0} style={{ width: 24, height: 24, border: "none", background: "none", cursor: idx === 0 ? "not-allowed" : "pointer", opacity: idx === 0 ? 0.3 : 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <ChevronUp size={14} color="#888" />
                  </button>
                  <button onClick={() => removePhoto(photo.id)} style={{ width: 24, height: 24, border: "none", background: "rgba(192,57,43,0.07)", borderRadius: 5, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <X size={12} color="#C0392B" />
                  </button>
                  <button onClick={() => moveDown(idx)} disabled={idx === photos.length - 1} style={{ width: 24, height: 24, border: "none", background: "none", cursor: idx === photos.length - 1 ? "not-allowed" : "pointer", opacity: idx === photos.length - 1 ? 0.3 : 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <ChevronDown size={14} color="#888" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
