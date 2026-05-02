/**
 * src/components/Gallery.jsx
 * ─────────────────────────────────────────────────────────────
 * Full-screen photo gallery overlay with keyboard navigation.
 * ─────────────────────────────────────────────────────────────
 */
import { useState, useEffect } from "react";
import { FALLBACK_IMG } from "../models/index.js";

export default function Gallery({ photos, title, onClose }) {
  const [idx, setIdx] = useState(0);
  const prev = () => setIdx((i) => (i - 1 + photos.length) % photos.length);
  const next = () => setIdx((i) => (i + 1) % photos.length);

  useEffect(() => {
    const fn = (e) => {
      if (e.key === "ArrowLeft")  prev();
      if (e.key === "ArrowRight") next();
      if (e.key === "Escape")     onClose();
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, []);

  return (
    <div className="gallery-overlay">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 18px", borderBottom: "1px solid #1e2d4a", flexShrink: 0 }}>
        <div style={{ fontFamily: "var(--font-display)", color: "white", fontWeight: 700, fontSize: 16 }}>{title}</div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <span style={{ color: "#94a3b8", fontSize: 13 }}>{idx + 1} / {photos.length}</span>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,.12)", border: "none", color: "white", width: 32, height: 32, borderRadius: "50%", cursor: "pointer", fontSize: 18 }}>×</button>
        </div>
      </div>
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", padding: "0 56px", overflow: "hidden" }}>
        <button onClick={prev} style={{ position: "absolute", left: 10, background: "rgba(255,255,255,.12)", border: "none", color: "white", width: 40, height: 40, borderRadius: "50%", cursor: "pointer", fontSize: 22, backdropFilter: "blur(8px)", zIndex: 2 }}>‹</button>
        <img src={photos[idx]} alt="" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", borderRadius: 8, userSelect: "none" }} onError={(e) => { e.target.src = FALLBACK_IMG; }} />
        <button onClick={next} style={{ position: "absolute", right: 10, background: "rgba(255,255,255,.12)", border: "none", color: "white", width: 40, height: 40, borderRadius: "50%", cursor: "pointer", fontSize: 22, backdropFilter: "blur(8px)", zIndex: 2 }}>›</button>
      </div>
      <div className="thumb-strip" style={{ padding: "10px 14px", borderTop: "1px solid #1e2d4a", flexShrink: 0 }}>
        {photos.map((p, i) => (
          <img key={i} src={p} onClick={() => setIdx(i)}
            style={{ width: 60, height: 42, objectFit: "cover", borderRadius: 6, flexShrink: 0, cursor: "pointer", border: idx === i ? "2.5px solid #3b82f6" : "2.5px solid transparent", opacity: idx === i ? 1 : 0.55, transition: "all .15s" }}
            onError={(e) => { e.target.style.display = "none"; }}
          />
        ))}
      </div>
    </div>
  );
}
