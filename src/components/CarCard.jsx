
import { Countdown } from "./UI.jsx";
import { CAR_PHOTOS, BADGE_STYLES, FALLBACK_IMG } from "../models/index.js";
import { formatCurrency } from "../utils/index.js";
import React from 'react';
/**
 * @param {{
 *   car:      CarModel,
 *   bids:     BidModel[],
 *   watched:  boolean,
 *   onDetail: Function,
 *   onBid:    Function,
 *   onAI:     Function,
 *   onWatch:  Function,
 * }} props
 */
export default function CarCard({ car, bids, watched, onDetail, onBid, onAI, onWatch }) {
  const photos = CAR_PHOTOS[car.numId || car.id] || CAR_PHOTOS[1];

  return (
    <div className="card card-hover" style={{ cursor: "pointer" }} onClick={() => onDetail(car)}>
      {/* ── Photo ── */}
      <div style={{ position: "relative", aspectRatio: "16/10", overflow: "hidden", background: "#e2e8f0" }}>
        <img
          src={photos[0]} alt={car.make}
          style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform .4s ease" }}
          onError={(e) => { e.target.src = FALLBACK_IMG; }}
          onMouseEnter={(e) => { e.target.style.transform = "scale(1.06)"; }}
          onMouseLeave={(e) => { e.target.style.transform = "scale(1)"; }}
        />
        {car.badge && (
          <div className="badge" style={{ position: "absolute", top: 10, left: 10, ...(BADGE_STYLES[car.badge] || {}) }}>
            {car.badge}
          </div>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onWatch(car.id); }}
          className="btn btn-icon"
          style={{ position: "absolute", top: 10, right: 10, background: watched ? "var(--blue)" : "rgba(255,255,255,.9)", border: "none", boxShadow: "var(--shadow-sm)", fontSize: 14, transition: "all .18s" }}
        >
          {watched ? "❤️" : "🤍"}
        </button>
        <div style={{ position: "absolute", bottom: 10, right: 10, background: "rgba(0,0,0,.55)", color: "white", fontSize: 11, padding: "3px 9px", borderRadius: 12, backdropFilter: "blur(4px)" }}>
          📷 {photos.length}
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ padding: "14px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16, lineHeight: 1.2 }}>{car.year} {car.make}</div>
            <div style={{ color: "var(--text3)", fontSize: 13 }}>{car.model}</div>
          </div>
          {car.verified && <span className="chip" style={{ background: "var(--green-pale)", color: "#166534" }}>✓ Verified</span>}
        </div>

        {/* Spec chips */}
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 12 }}>
          {[car.fuel, car.transmission, `${((car.mileage || 0) / 1000).toFixed(0)}k km`, car.condition].map((t) => (
            <span key={t} className="chip" style={{ background: "var(--surface2)", color: "var(--text3)", border: "1px solid var(--border)" }}>{t}</span>
          ))}
        </div>

        {/* Bid info + countdown */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", paddingTop: 12, borderTop: "1px solid var(--border)" }}>
          <div>
            <div style={{ fontSize: 11, color: "var(--text4)" }}>Current Bid</div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 19, fontWeight: 700 }}>{formatCurrency(car.currentBid)}</div>
            <div style={{ fontSize: 11, color: "var(--text4)" }}>{bids.length} bids · {bids[0]?.userName || "No bids"}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <Countdown endTime={car.endTime} />
            <div style={{ fontSize: 11, color: "var(--text4)", marginTop: 2 }}>{car.location}</div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 8, marginTop: 12 }} onClick={(e) => e.stopPropagation()}>
          <button className="btn btn-outline btn-sm" onClick={() => onAI(car)} style={{ flex: "0 0 auto", padding: "8px 12px" }}>🤖 AI</button>
          <button className="btn btn-primary btn-sm" onClick={() => onBid(car)} style={{ flex: 1 }}>⚡ Bid Now</button>
        </div>
      </div>
    </div>
  );
}
