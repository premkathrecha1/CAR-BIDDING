
import { useState } from "react";
import { Countdown } from "./UI.jsx";
import Gallery       from "./Gallery.jsx";
import { CAR_PHOTOS, BADGE_STYLES, FALLBACK_IMG } from "../models/index.js";
import { formatCurrency, timeAgo }                 from "../utils/index.js";

const TABS = ["overview", "specs", "features", "history", "bids"];

/**
 * @param {{ car, bids, user, onBack, onBid, onAI }} props
 */
export default function DetailPage({ car, bids, user, onBack, onBid, onAI }) {
  const photos   = CAR_PHOTOS[car.numId || car.id] || CAR_PHOTOS[1];
  const [photoIdx, setPhotoIdx] = useState(0);
  const [gallery,  setGallery]  = useState(false);
  const [tab,      setTab]      = useState("overview");

  return (
    <div style={{ animation: "fadeUp .3s ease" }}>
      <button className="btn btn-ghost btn-sm" onClick={onBack}
        style={{ marginBottom: 18, color: "var(--blue)", fontWeight: 600, padding: "6px 0", gap: 4 }}>
        ← Back to Listings
      </button>

      <div className="grid-detail">
        {/* ── Left column: photos + tabs ── */}
        <div>
          {/* Main photo */}
          <div style={{ position: "relative", borderRadius: "var(--radius-lg)", overflow: "hidden", aspectRatio: "16/9", background: "#e2e8f0", marginBottom: 10, cursor: "pointer" }}
            onClick={() => setGallery(true)}>
            <img src={photos[photoIdx]} alt={car.make} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={(e) => { e.target.src = FALLBACK_IMG; }} />
            {car.badge && <div className="badge" style={{ position: "absolute", top: 12, left: 12, ...(BADGE_STYLES[car.badge] || {}) }}>{car.badge}</div>}
            <div style={{ position: "absolute", bottom: 12, right: 12, background: "rgba(0,0,0,.6)", color: "white", padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600, backdropFilter: "blur(4px)" }}>
              📷 View All {photos.length} Photos
            </div>
          </div>

          {/* Thumbnail strip */}
          <div className="thumb-strip" style={{ marginBottom: 20 }}>
            {photos.map((p, i) => (
              <img key={i} src={p} onClick={() => setPhotoIdx(i)}
                style={{ width: 66, height: 46, objectFit: "cover", borderRadius: 8, flexShrink: 0, cursor: "pointer", border: photoIdx === i ? "2.5px solid var(--blue)" : "2.5px solid transparent", opacity: photoIdx === i ? 1 : 0.6, transition: "all .15s" }}
                onError={(e) => { e.target.style.display = "none"; }}
              />
            ))}
          </div>

          {/* Tab bar */}
          <div className="tab-bar" style={{ marginBottom: 20, overflowX: "auto" }}>
            {TABS.map((t) => (
              <button key={t} className={`tab-btn${tab === t ? " active" : ""}`} onClick={() => setTab(t)}
                style={{ textTransform: "capitalize", paddingBottom: 12 }}>
                {t}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {tab === "overview" && (
            <div className="grid-specs">
              {[["Year", car.year], ["Make", car.make], ["Model", car.model], ["Color", car.color], ["Fuel", car.fuel], ["Transmission", car.transmission], ["Mileage", `${(car.mileage || 0).toLocaleString()} km`], ["Condition", car.condition], ["Seller", car.seller], ["Location", car.location]]
                .map(([k, v]) => (
                  <div key={k} style={{ background: "white", borderRadius: "var(--radius-sm)", padding: "12px 14px", border: "1px solid var(--border)" }}>
                    <div style={{ fontSize: 10, color: "var(--text4)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 }}>{k}</div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{v}</div>
                  </div>
                ))}
            </div>
          )}

          {tab === "specs" && (
            <div className="grid-specs">
              {[["Engine", car.engine], ["Power", car.power], ["Torque", car.torque], ["Top Speed", car.topSpeed], ["0–100 km/h", car.acceleration], ["Fuel", car.fuel]]
                .map(([k, v]) => (
                  <div key={k} style={{ background: "white", borderRadius: "var(--radius-sm)", padding: 14, border: "1px solid var(--border)" }}>
                    <div style={{ fontSize: 10, color: "var(--text4)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>{k}</div>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 700, color: "var(--blue)" }}>{v}</div>
                  </div>
                ))}
            </div>
          )}

          {tab === "features" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {(car.features || []).map((f) => (
                <div key={f} style={{ display: "flex", alignItems: "center", gap: 10, background: "white", borderRadius: "var(--radius-sm)", padding: "11px 14px", border: "1px solid var(--border)" }}>
                  <div style={{ width: 22, height: 22, background: "var(--blue-pale)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "var(--blue)", fontWeight: 700, flexShrink: 0 }}>✓</div>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{f}</span>
                </div>
              ))}
            </div>
          )}

          {tab === "history" && (
            <div style={{ background: "white", borderRadius: "var(--radius)", border: "1px solid var(--border)", padding: 20 }}>
              <div style={{ fontSize: 14, color: "var(--text)", lineHeight: 1.7, marginBottom: 14 }}>{car.history}</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {car.verified && <span className="chip" style={{ background: "var(--green-pale)", color: "#166534" }}>✓ Verified Seller</span>}
                <span className="chip" style={{ background: "var(--blue-pale)", color: "var(--blue)" }}>📋 Service History</span>
              </div>
            </div>
          )}

          {tab === "bids" && (
            <div className="card" style={{ overflow: "hidden" }}>
              <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", fontWeight: 700, fontSize: 14 }}>
                Bid History · {bids.length} bids
              </div>
              {bids.length === 0
                ? <div style={{ padding: 28, textAlign: "center", color: "var(--text3)" }}>No bids yet — be the first!</div>
                : bids.map((b, i) => (
                  <div key={b.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 18px", borderBottom: i < bids.length - 1 ? "1px solid var(--border)" : "none", background: i === 0 ? "var(--blue-pale)" : "white" }}>
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <div style={{ width: 32, height: 32, background: i === 0 ? "var(--blue)" : "var(--surface2)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: i === 0 ? "white" : "var(--text2)", flexShrink: 0 }}>
                        {(b.userName || "?").slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{b.userName}</div>
                        <div style={{ fontSize: 11, color: "var(--text4)" }}>{timeAgo(b.time || Date.now())}</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 700, color: i === 0 ? "var(--blue)" : "var(--text2)" }}>{formatCurrency(b.amount)}</span>
                      {i === 0 && <span className="chip" style={{ background: "var(--blue)", color: "white", fontSize: 10 }}>LEAD</span>}
                      {b.paymentId && <span className="payment-badge" style={{ fontSize: 9 }}>✓ Paid</span>}
                    </div>
                  </div>
                ))
              }
            </div>
          )}
        </div>

        {/* ── Right column: sticky bid panel ── */}
        <div style={{ position: "sticky", top: "calc(var(--header-h) + 16px)" }}>
          <div className="card" style={{ overflow: "hidden" }}>
            <div style={{ background: "linear-gradient(135deg,#1d4ed8,#2563eb)", padding: "18px 20px" }}>
              <div style={{ color: "rgba(255,255,255,.7)", fontSize: 11, marginBottom: 2 }}>Current Highest Bid</div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 800, color: "white" }}>{formatCurrency(car.currentBid)}</div>
              <div style={{ color: "rgba(255,255,255,.75)", fontSize: 12, marginTop: 3 }}>{bids.length} bids · Started at {formatCurrency(car.startingBid)}</div>
            </div>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div><div style={{ fontSize: 11, color: "var(--text4)" }}>Ends in</div><Countdown endTime={car.endTime} style={{ fontSize: 15 }} /></div>
              <div style={{ textAlign: "right" }}><div style={{ fontSize: 11, color: "var(--text4)" }}>Leading</div><div style={{ fontSize: 13, fontWeight: 600 }}>{bids[0]?.userName || "No bids"}</div></div>
            </div>
            {bids.length > 0 && (
              <div style={{ padding: "10px 18px", borderBottom: "1px solid var(--border)", maxHeight: 120, overflowY: "auto" }}>
                <div style={{ fontSize: 10, color: "var(--text4)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6, display: "flex", alignItems: "center", gap: 5 }}>
                  <span className="live-dot" />Live Bids
                </div>
                {bids.slice(0, 5).map((b, i) => (
                  <div key={b.id} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", fontSize: 12 }}>
                    <span style={{ color: "var(--text2)", fontWeight: 500 }}>{b.userName}</span>
                    <span style={{ color: i === 0 ? "var(--blue)" : "var(--text3)", fontWeight: i === 0 ? 700 : 400 }}>{formatCurrency(b.amount)}</span>
                  </div>
                ))}
              </div>
            )}
            <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 8 }}>
              <button className="btn btn-primary btn-lg w-full" onClick={() => onBid(car)}>⚡ Place Bid Now</button>
              <button className="btn btn-outline btn-md w-full" onClick={() => onAI(car)}>🤖 Ask AI Advisor</button>
            </div>
            {car.verified && (
              <div style={{ padding: "0 18px 16px", display: "flex", gap: 6, flexWrap: "wrap" }}>
                <span className="chip" style={{ background: "var(--green-pale)", color: "#166534", fontSize: 10 }}>✓ Verified</span>
                <span className="chip" style={{ background: "var(--blue-pale)", color: "var(--blue)", fontSize: 10 }}>🔒 Secure</span>
                <div className="razorpay-badge" style={{ fontSize: 10, padding: "3px 8px" }}>💳 Razorpay</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {gallery && <Gallery photos={photos} title={`${car.year} ${car.make} ${car.model}`} onClose={() => setGallery(false)} />}
    </div>
  );
}
