"use client";
// ─────────────────────────────────────────────
// OfficersTab.tsx
// Handles: CRUD officers, BOD, PIO
//          Photo upload with WebP compression
//          Drag to reorder
// Accessible by: admin, president, secretary
// ─────────────────────────────────────────────
import { useEffect, useState } from "react";
import { PlusCircle, Trash2, Edit3, MoveUp, MoveDown, Upload } from "lucide-react";

interface Props {
  canCRUD: boolean;
  supabase: any;
}

type Officer = {
  id: string;
  name: string;
  role: string;
  role_type: string;
  photo_url: string | null;
  order_num: number;
  is_active: boolean;
};

const roleTypes = [
  { id: "executive", label: "Executive Officers" },
  { id: "pio", label: "Public Information Officers" },
  { id: "bod", label: "Board of Directors" },
];

export default function OfficersTab({ canCRUD, supabase }: Props) {
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState("executive");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Officer | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    name: "", role: "", role_type: "executive",
    photo_url: "", order_num: 0, is_active: true,
  });
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const loadOfficers = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("officers")
      .select("*")
      .order("order_num");
    setOfficers(data || []);
    setLoading(false);
  };

  useEffect(() => { loadOfficers(); }, []);

  const openNew = () => {
    setEditing(null);
    const typeOfficers = officers.filter(o => o.role_type === activeType);
    setForm({ name: "", role: "", role_type: activeType, photo_url: "", order_num: typeOfficers.length + 1, is_active: true });
    setPhotoPreview(null);
    setShowForm(true);
  };

  const openEdit = (officer: Officer) => {
    setEditing(officer);
    setForm({
      name: officer.name,
      role: officer.role,
      role_type: officer.role_type,
      photo_url: officer.photo_url || "",
      order_num: officer.order_num,
      is_active: officer.is_active,
    });
    setPhotoPreview(officer.photo_url);
    setShowForm(true);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);

    try {
      // Preview immediately
      const reader = new FileReader();
      reader.onload = (ev) => setPhotoPreview(ev.target?.result as string);
      reader.readAsDataURL(file);

      // Compress and convert to WebP
      const imageCompression = (await import("browser-image-compression")).default;
      const compressed = await imageCompression(file, {
        maxSizeMB: 0.2,
        maxWidthOrHeight: 300,
        fileType: "image/webp",
        useWebWorker: true,
      });

      const filename = `officer-${Date.now()}.webp`;
      const { data, error } = await supabase.storage
        .from("officers")
        .upload(`photos/${filename}`, compressed, {
          contentType: "image/webp",
          upsert: true,
        });

      if (!error) {
        const { data: urlData } = supabase.storage
          .from("officers")
          .getPublicUrl(`photos/${filename}`);
        setForm(prev => ({ ...prev, photo_url: urlData.publicUrl }));
      } else {
        alert("Upload failed: " + error.message);
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    }
    setUploading(false);
  };

  const handleSave = async () => {
    if (!form.name || !form.role) { alert("Name and role are required."); return; }
    setSaving(true);

    if (editing) {
      await supabase.from("officers").update({
        name: form.name,
        role: form.role,
        role_type: form.role_type,
        photo_url: form.photo_url || null,
        order_num: form.order_num,
        is_active: form.is_active,
      }).eq("id", editing.id);
    } else {
      await supabase.from("officers").insert({
        name: form.name,
        role: form.role,
        role_type: form.role_type,
        photo_url: form.photo_url || null,
        order_num: form.order_num,
        is_active: form.is_active,
      });
    }

    await loadOfficers();
    setShowForm(false);
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this officer? This cannot be undone.")) return;
    await supabase.from("officers").delete().eq("id", id);
    await loadOfficers();
  };

  const handleMove = async (officer: Officer, direction: "up" | "down") => {
    const typeOfficers = officers.filter(o => o.role_type === officer.role_type).sort((a, b) => a.order_num - b.order_num);
    const idx = typeOfficers.findIndex(o => o.id === officer.id);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= typeOfficers.length) return;
    const swapOfficer = typeOfficers[swapIdx];
    await supabase.from("officers").update({ order_num: swapOfficer.order_num }).eq("id", officer.id);
    await supabase.from("officers").update({ order_num: officer.order_num }).eq("id", swapOfficer.id);
    await loadOfficers();
  };

  const getInitials = (name: string) => {
    const parts = (name || "").split(" ").filter(p => p.length > 0 && !p.includes("."));
    return parts.slice(0, 2).map(p => p[0]).join("").toUpperCase();
  };

  const filteredOfficers = officers
    .filter(o => o.role_type === activeType)
    .sort((a, b) => a.order_num - b.order_num);

  const inputStyle = {
    width: "100%", padding: "0.7rem 1rem",
    border: "1.5px solid rgba(26,92,42,0.15)",
    borderRadius: 6, fontSize: "0.88rem",
    fontFamily: "'DM Sans', sans-serif",
    color: "var(--text)", background: "white", outline: "none",
  };

  const labelStyle = {
    display: "block" as const,
    fontSize: "0.72rem", fontWeight: 500 as const,
    letterSpacing: "0.08em", textTransform: "uppercase" as const,
    color: "var(--muted)", marginBottom: "0.4rem",
  };

  return (
    <div>
      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div>
          <p style={{ fontSize: "0.72rem", color: "var(--muted)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.3rem" }}>Admin Panel</p>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.8rem", fontWeight: 700, color: "var(--green-dk)" }}>Officers & BOD</h1>
        </div>
        {canCRUD && (
          <button onClick={openNew}
            style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--gold)", color: "var(--green-dk)", border: "none", padding: "0.7rem 1.4rem", borderRadius: 6, fontSize: "0.82rem", fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.06em", textTransform: "uppercase" }}>
            <PlusCircle size={15} /> Add Officer
          </button>
        )}
      </div>

      {/* ── Type Tabs ── */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem" }}>
        {roleTypes.map(t => (
          <button key={t.id} onClick={() => setActiveType(t.id)}
            style={{ padding: "0.45rem 1rem", borderRadius: 20, border: "1.5px solid", borderColor: activeType === t.id ? "var(--gold)" : "rgba(26,92,42,0.15)", background: activeType === t.id ? "var(--gold)" : "white", color: activeType === t.id ? "var(--green-dk)" : "var(--muted)", fontSize: "0.75rem", fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
            {t.label} ({officers.filter(o => o.role_type === t.id).length})
          </button>
        ))}
      </div>

      {/* ── Officers Grid ── */}
      {loading ? (
        <div style={{ padding: "3rem", textAlign: "center", color: "var(--muted)" }}>Loading officers...</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "1.2rem" }}>
          {filteredOfficers.map((officer, idx) => (
            <div key={officer.id} style={{ background: "white", borderRadius: 10, border: "1px solid rgba(26,92,42,0.08)", borderBottom: `3px solid ${officer.is_active ? "var(--gold)" : "var(--muted)"}`, overflow: "hidden", opacity: officer.is_active ? 1 : 0.6 }}>

              {/* Photo */}
              <div style={{ height: 120, background: "var(--green-dk)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                {officer.photo_url ? (
                  <img
                    src={officer.photo_url}
                    alt={officer.name}
                    loading="lazy"
                    style={{ width: 80, height: 80, borderRadius: "50%", objectFit: "cover", border: "3px solid var(--gold)" }}
                  />
                ) : (
                  <div style={{ width: 80, height: 80, borderRadius: "50%", background: "rgba(212,160,23,0.2)", border: "3px solid var(--gold)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Playfair Display', serif", fontSize: "1.5rem", fontWeight: 700, color: "var(--gold-lt)" }}>
                    {getInitials(officer.name)}
                  </div>
                )}
                {!officer.is_active && (
                  <div style={{ position: "absolute", top: 8, right: 8, background: "rgba(192,57,43,0.8)", color: "white", fontSize: "0.62rem", padding: "2px 6px", borderRadius: 3, fontWeight: 500 }}>INACTIVE</div>
                )}
              </div>

              {/* Info */}
              <div style={{ padding: "1rem" }}>
                <div style={{ fontSize: "0.65rem", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--gold-dk)", marginBottom: "0.2rem" }}>{officer.role}</div>
                <div style={{ fontSize: "0.88rem", fontWeight: 500, color: "var(--green-dk)", lineHeight: 1.3, marginBottom: "0.8rem" }}>{officer.name}</div>

                {/* Actions */}
                {canCRUD && (
                  <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                    <button onClick={() => openEdit(officer)}
                      style={{ display: "flex", alignItems: "center", gap: 3, background: "none", border: "1px solid rgba(26,92,42,0.2)", color: "var(--green-dk)", padding: "0.3rem 0.6rem", borderRadius: 4, fontSize: "0.72rem", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                      <Edit3 size={11} /> Edit
                    </button>
                    <button onClick={() => handleMove(officer, "up")} disabled={idx === 0}
                      style={{ background: "none", border: "1px solid rgba(26,92,42,0.2)", color: idx === 0 ? "var(--muted)" : "var(--green-dk)", padding: "0.3rem 0.5rem", borderRadius: 4, fontSize: "0.72rem", cursor: idx === 0 ? "not-allowed" : "pointer", opacity: idx === 0 ? 0.4 : 1 }}>
                      <MoveUp size={11} />
                    </button>
                    <button onClick={() => handleMove(officer, "down")} disabled={idx === filteredOfficers.length - 1}
                      style={{ background: "none", border: "1px solid rgba(26,92,42,0.2)", color: idx === filteredOfficers.length - 1 ? "var(--muted)" : "var(--green-dk)", padding: "0.3rem 0.5rem", borderRadius: 4, fontSize: "0.72rem", cursor: idx === filteredOfficers.length - 1 ? "not-allowed" : "pointer", opacity: idx === filteredOfficers.length - 1 ? 0.4 : 1 }}>
                      <MoveDown size={11} />
                    </button>
                    <button onClick={() => handleDelete(officer.id)}
                      style={{ background: "none", border: "1px solid rgba(192,57,43,0.3)", color: "#C0392B", padding: "0.3rem 0.5rem", borderRadius: 4, fontSize: "0.72rem", cursor: "pointer" }}>
                      <Trash2 size={11} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Officer Form Modal ── */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
          <div style={{ background: "white", borderRadius: 12, padding: "2rem", maxWidth: 480, width: "100%", maxHeight: "90vh", overflowY: "auto" }}>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.2rem", fontWeight: 700, color: "var(--green-dk)" }}>
                {editing ? "Edit Officer" : "Add Officer"}
              </h2>
              <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", fontSize: "1.5rem", cursor: "pointer", color: "var(--muted)" }}>✕</button>
            </div>

            {/* Photo upload */}
            <div style={{ marginBottom: "1.5rem", textAlign: "center" }}>
              <div style={{ width: 100, height: 100, borderRadius: "50%", background: "var(--green-dk)", border: "3px solid var(--gold)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem", overflow: "hidden" }}>
                {photoPreview ? (
                  <img src={photoPreview} alt="Preview" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <span style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.8rem", fontWeight: 700, color: "var(--gold-lt)" }}>
                    {form.name ? form.name.split(" ").slice(0, 2).map(p => p[0]).join("").toUpperCase() : "?"}
                  </span>
                )}
              </div>
              <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handlePhotoUpload} style={{ display: "none" }} id="officer-photo" />
              <label htmlFor="officer-photo"
                style={{ display: "inline-flex", alignItems: "center", gap: 5, background: uploading ? "var(--warm)" : "var(--warm)", border: "1.5px solid rgba(26,92,42,0.2)", color: "var(--green-dk)", padding: "0.5rem 1rem", borderRadius: 6, fontSize: "0.78rem", fontWeight: 500, cursor: uploading ? "not-allowed" : "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                <Upload size={13} /> {uploading ? "Uploading..." : "Upload Photo"}
              </label>
              <p style={{ fontSize: "0.68rem", color: "var(--muted)", marginTop: "0.4rem" }}>PNG or JPG. Auto-compressed to WebP.</p>
            </div>

            {/* Name */}
            <div style={{ marginBottom: "1rem" }}>
              <label style={labelStyle}>Full Name *</label>
              <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="Engr. Juan dela Cruz" style={inputStyle} />
            </div>

            {/* Role */}
            <div style={{ marginBottom: "1rem" }}>
              <label style={labelStyle}>Role / Position *</label>
              <input type="text" value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                placeholder="President, Treasurer, Board Member..." style={inputStyle} />
            </div>

            {/* Role Type */}
            <div style={{ marginBottom: "1rem" }}>
              <label style={labelStyle}>Category *</label>
              <select value={form.role_type} onChange={e => setForm(p => ({ ...p, role_type: e.target.value }))} style={inputStyle}>
                <option value="executive">Executive Officer</option>
                <option value="pio">Public Information Officer</option>
                <option value="bod">Board of Directors</option>
              </select>
            </div>

            {/* Order */}
            <div style={{ marginBottom: "1rem" }}>
              <label style={labelStyle}>Display Order</label>
              <input type="number" value={form.order_num} onChange={e => setForm(p => ({ ...p, order_num: Number(e.target.value) }))} style={inputStyle} />
            </div>

            {/* Active toggle */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.8rem 1rem", background: "var(--warm)", borderRadius: 8, marginBottom: "1.5rem" }}>
              <div>
                <p style={{ fontSize: "0.85rem", fontWeight: 500, color: "var(--green-dk)" }}>
                  {form.is_active ? "Active — shown on public website" : "Inactive — hidden from public website"}
                </p>
              </div>
              <button onClick={() => setForm(p => ({ ...p, is_active: !p.is_active }))}
                style={{ background: form.is_active ? "var(--green-lt)" : "rgba(26,92,42,0.1)", border: "none", color: form.is_active ? "white" : "var(--green-dk)", padding: "0.5rem 1rem", borderRadius: 6, fontSize: "0.78rem", fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                {form.is_active ? "✓ Active" : "Set Active"}
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.8rem" }}>
              <button onClick={() => setShowForm(false)}
                style={{ padding: "0.85rem", background: "white", border: "1.5px solid rgba(26,92,42,0.15)", color: "var(--muted)", borderRadius: 6, fontSize: "0.85rem", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving}
                style={{ padding: "0.85rem", background: saving ? "var(--gold-dk)" : "var(--gold)", border: "none", color: "var(--green-dk)", borderRadius: 6, fontSize: "0.85rem", fontWeight: 500, cursor: saving ? "not-allowed" : "pointer", letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: "'DM Sans', sans-serif" }}>
                {saving ? "Saving..." : editing ? "Update" : "Add Officer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}