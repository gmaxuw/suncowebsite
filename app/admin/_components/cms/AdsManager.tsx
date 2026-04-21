"use client";
// ─────────────────────────────────────────────
// cms/AdsManager.tsx
// Upload, manage and toggle ads.
// Positions: left sidebar, right sidebar,
//            inline/body, top banner.
// ─────────────────────────────────────────────
import { useEffect, useState, useRef } from "react";
import { PlusCircle, Trash2, Upload, Image, X, Megaphone } from "lucide-react";

interface Props {
  canCRUD:  boolean;
  supabase: any;
}

const AD_POSITIONS = [
  { value: "left",   label: "Left Sidebar"  },
  { value: "right",  label: "Right Sidebar" },
  { value: "inline", label: "Inline / Body" },
  { value: "top",    label: "Top Banner"    },
];

const EMPTY_AD = { title: "", image_url: "", link_url: "", position: "left", is_active: true };

export default function AdsManager({ canCRUD, supabase }: Props) {
  const [ads,        setAds]        = useState<any[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [showForm,   setShowForm]   = useState(false);
  const [editing,    setEditing]    = useState<any>(null);
  const [adForm,     setAdForm]     = useState({ ...EMPTY_AD });
  const [preview,    setPreview]    = useState<string | null>(null);
  const [uploading,  setUploading]  = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadAds = async () => {
    setLoading(true);
    const { data } = await supabase.from("ads").select("*").order("created_at", { ascending: false });
    setAds(data || []);
    setLoading(false);
  };

  useEffect(() => { loadAds(); }, []);

  const compressToWebP = (file: File): Promise<Blob> =>
    new Promise((resolve, reject) => {
      const img = document.createElement("img") as HTMLImageElement;
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const MAX = 800;
        let { width, height } = img;
        if (width > MAX || height > MAX) {
          if (width > height) { height = Math.round((height / width) * MAX); width = MAX; }
          else { width = Math.round((width / height) * MAX); height = MAX; }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width; canvas.height = height;
        canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
        canvas.toBlob(b => b ? resolve(b) : reject(new Error("Conversion failed")), "image/webp", 0.85);
      };
      img.onerror = reject;
      img.src = url;
    });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const reader = new FileReader();
    reader.onload = ev => setPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    try {
      const blob = await compressToWebP(file);
      const filename = `ads/ad-${Date.now()}.webp`;
      const { error } = await supabase.storage.from("articles").upload(filename, blob, { contentType: "image/webp", upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("articles").getPublicUrl(filename);
      setAdForm(prev => ({ ...prev, image_url: urlData.publicUrl }));
    } catch (err: any) { alert("Upload failed: " + err.message); }
    setUploading(false);
  };

  const openNew = () => {
    setEditing(null);
    setAdForm({ ...EMPTY_AD });
    setPreview(null);
    setShowForm(true);
  };

  const openEdit = (ad: any) => {
    setEditing(ad);
    setAdForm({ title: ad.title || "", image_url: ad.image_url || "", link_url: ad.link_url || "", position: ad.position || "left", is_active: ad.is_active });
    setPreview(ad.image_url || null);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!adForm.image_url) { alert("Please upload an ad image."); return; }
    if (editing) {
      await supabase.from("ads").update(adForm).eq("id", editing.id);
    } else {
      await supabase.from("ads").insert(adForm);
    }
    await loadAds();
    setShowForm(false);
  };

  const toggleActive = async (ad: any) => {
    await supabase.from("ads").update({ is_active: !ad.is_active }).eq("id", ad.id);
    await loadAds();
  };

  const deleteAd = async (id: string) => {
    if (!confirm("Delete this ad?")) return;
    await supabase.from("ads").delete().eq("id", id);
    await loadAds();
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "0.72rem 1rem",
    border: "1.5px solid rgba(26,92,42,0.15)",
    borderRadius: 8, fontSize: "0.9rem",
    fontFamily: "'DM Sans', sans-serif",
    color: "#0D3320", background: "white", outline: "none",
    boxSizing: "border-box",
  };
  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: "0.68rem", fontWeight: 600,
    letterSpacing: "0.1em", textTransform: "uppercase",
    color: "#888", marginBottom: "0.45rem",
  };

  return (
    <div>
      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
        {[
          { label: "Total Ads", value: ads.length,                          color: "#2B5FA8" },
          { label: "Active",    value: ads.filter(a => a.is_active).length, color: "#2E8B44" },
          { label: "Inactive",  value: ads.filter(a => !a.is_active).length,color: "#888"    },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: "white", borderRadius: 10, padding: "1.1rem 1.3rem", border: "1px solid rgba(26,92,42,0.08)", borderTop: `4px solid ${color}` }}>
            <p style={{ fontSize: "0.65rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)", marginBottom: "0.4rem" }}>{label}</p>
            <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.6rem", fontWeight: 700, color }}>{value}</p>
          </div>
        ))}
      </div>

      {canCRUD && (
        <div style={{ marginBottom: "1.2rem" }}>
          <button onClick={openNew} style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--gold)", color: "var(--green-dk)", border: "none", padding: "0.7rem 1.4rem", borderRadius: 6, fontSize: "0.82rem", fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
            <PlusCircle size={15} /> New Ad
          </button>
        </div>
      )}

      {/* Ads grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "1rem" }}>
        {loading ? (
          <div style={{ gridColumn: "1/-1", padding: "2rem", textAlign: "center", color: "var(--muted)" }}>Loading ads...</div>
        ) : ads.length === 0 ? (
          <div style={{ gridColumn: "1/-1", padding: "3rem", textAlign: "center", background: "white", borderRadius: 10, border: "1px dashed rgba(26,92,42,0.15)" }}>
            <Megaphone size={32} color="rgba(26,92,42,0.12)" style={{ marginBottom: "0.8rem" }} />
            <p style={{ color: "var(--muted)", fontSize: "0.88rem" }}>No ads yet. Create your first ad placement.</p>
          </div>
        ) : ads.map(ad => (
          <div key={ad.id} style={{ background: "white", borderRadius: 10, border: "1px solid rgba(26,92,42,0.08)", overflow: "hidden" }}>
            <div style={{ position: "relative", height: 140, background: "#F9F8F5", cursor: "pointer" }} onClick={() => canCRUD && openEdit(ad)}>
              {ad.image_url ? (
                <img src={ad.image_url} alt={ad.title || "Ad"} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Image size={28} color="rgba(0,0,0,0.1)" />
                </div>
              )}
              <div style={{ position: "absolute", top: 8, right: 8 }}>
                <span style={{ background: ad.is_active ? "rgba(46,139,68,0.9)" : "rgba(0,0,0,0.5)", color: "white", fontSize: "0.6rem", fontWeight: 700, padding: "2px 8px", borderRadius: 20 }}>
                  {ad.is_active ? "Active" : "Off"}
                </span>
              </div>
            </div>
            <div style={{ padding: "0.8rem 1rem" }}>
              <p style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--green-dk)", marginBottom: 3 }}>{ad.title || "Untitled Ad"}</p>
              <p style={{ fontSize: "0.7rem", color: "var(--muted)", marginBottom: "0.6rem" }}>
                {AD_POSITIONS.find(p => p.value === ad.position)?.label || ad.position}
              </p>
              {canCRUD && (
                <div style={{ display: "flex", gap: "0.4rem" }}>
                  <button onClick={() => openEdit(ad)} style={{ flex: 1, background: "none", border: "1px solid rgba(26,92,42,0.2)", color: "var(--green-dk)", padding: "0.35rem", borderRadius: 4, fontSize: "0.72rem", cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>Edit</button>
                  <button onClick={() => toggleActive(ad)} style={{ flex: 1, background: ad.is_active ? "rgba(212,160,23,0.1)" : "rgba(46,139,68,0.1)", border: `1px solid ${ad.is_active ? "#D4A017" : "#2E8B44"}`, color: ad.is_active ? "#D4A017" : "#2E8B44", padding: "0.35rem", borderRadius: 4, fontSize: "0.72rem", cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                    {ad.is_active ? "Deactivate" : "Activate"}
                  </button>
                  <button onClick={() => deleteAd(ad.id)} style={{ background: "none", border: "1px solid rgba(192,57,43,0.3)", color: "#C0392B", padding: "0.35rem 0.6rem", borderRadius: 4, fontSize: "0.72rem", cursor: "pointer" }}>
                    <Trash2 size={12} />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Ad Form Modal */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
          <div style={{ background: "white", borderRadius: 12, maxWidth: 480, width: "100%", overflow: "hidden", boxShadow: "0 24px 60px rgba(0,0,0,0.3)" }}>
            <div style={{ padding: "1.2rem 1.5rem", background: "var(--green-dk)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.1rem", color: "#C9A84C" }}>{editing ? "Edit Ad" : "New Ad"}</h3>
              <button onClick={() => setShowForm(false)} style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "white", width: 28, height: 28, borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><X size={13} /></button>
            </div>
            <div style={{ padding: "1.5rem" }}>
              {/* Image upload */}
              <div style={{ marginBottom: "1rem" }}>
                <label style={labelStyle}>Ad Image *</label>
                <div style={{ width: "100%", height: 160, background: "#F9F8F5", border: "2px dashed rgba(26,92,42,0.2)", borderRadius: 8, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "0.6rem", cursor: "pointer" }} onClick={() => fileRef.current?.click()}>
                  {preview || adForm.image_url ? (
                    <img src={preview || adForm.image_url} alt="Preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <div style={{ textAlign: "center" }}>
                      <Upload size={24} color="rgba(26,92,42,0.2)" />
                      <p style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: 6 }}>Click to upload</p>
                    </div>
                  )}
                </div>
                <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} style={{ display: "none" }} />
                {uploading && <p style={{ fontSize: "0.75rem", color: "var(--muted)" }}>Uploading...</p>}
              </div>

              {[
                { key: "title",    label: "Ad Title (optional)",    placeholder: "e.g. Surigao Business Expo 2026" },
                { key: "link_url", label: "Link URL (optional)",    placeholder: "https://..." },
              ].map(({ key, label, placeholder }) => (
                <div key={key} style={{ marginBottom: "1rem" }}>
                  <label style={labelStyle}>{label}</label>
                  <input type="text" value={(adForm as any)[key]} onChange={e => setAdForm(prev => ({ ...prev, [key]: e.target.value }))} placeholder={placeholder} style={inputStyle} />
                </div>
              ))}

              <div style={{ marginBottom: "1rem" }}>
                <label style={labelStyle}>Position</label>
                <select value={adForm.position} onChange={e => setAdForm(prev => ({ ...prev, position: e.target.value }))} style={inputStyle}>
                  {AD_POSITIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.8rem 1rem", background: "var(--warm)", borderRadius: 8, marginBottom: "1.2rem" }}>
                <p style={{ fontSize: "0.85rem", fontWeight: 500, color: "var(--green-dk)" }}>Active (visible on site)</p>
                <button onClick={() => setAdForm(prev => ({ ...prev, is_active: !prev.is_active }))} style={{ background: adForm.is_active ? "#2E8B44" : "rgba(26,92,42,0.1)", border: "none", color: adForm.is_active ? "white" : "var(--green-dk)", padding: "0.4rem 1rem", borderRadius: 6, fontSize: "0.8rem", fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                  {adForm.is_active ? "✓ Active" : "Inactive"}
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.7rem" }}>
                <button onClick={() => setShowForm(false)} style={{ padding: "0.8rem", background: "white", border: "1.5px solid rgba(26,92,42,0.15)", color: "var(--muted)", borderRadius: 6, fontSize: "0.85rem", cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>Cancel</button>
                <button onClick={handleSave} style={{ padding: "0.8rem", background: "var(--gold)", border: "none", color: "var(--green-dk)", borderRadius: 6, fontSize: "0.85rem", fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>Save Ad</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
