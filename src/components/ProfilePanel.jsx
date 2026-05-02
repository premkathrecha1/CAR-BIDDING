/**
 * src/components/ProfilePanel.jsx
 * ─────────────────────────────────────────────────────────────
 * Slide-in right panel showing user profile, leading bids,
 * bid history, and sign-out button.
 * ─────────────────────────────────────────────────────────────
 */

import { Countdown } from "./UI.jsx";
import { formatCurrency, timeAgo } from "../utils/index.js";

/**
 * @param {{ user, bidHistory, cars, onClose, onLogout }} props
 */
export default function ProfilePanel({ user, bidHistory, cars, onClose, onLogout }) {
  const myBids = Object.values(bidHistory)
    .flat()
    .filter((b) => b.userId === user.id || b.userId === user.uid);

  const leading = cars.filter((c) => {
    const carBids = bidHistory[c.id] || bidHistory[String(c.id)] || [];
    return carBids[0]?.userId === user.id || carBids[0]?.userId === user.uid;
  });

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.45)", backdropFilter: "blur(4px)", zIndex: 900, display: "flex", justifyContent: "flex-end" }}
      onClick={onClose}
    >
      <div
        className="profile-panel"
        style={{ background: "white", height: "100%", overflowY: "auto", animation: "slideRight .3s ease", boxShadow: "-20px 0 60px rgba(0,40,120,.15)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div style={{ background: "linear-gradient(135deg,#1d4ed8,#2563eb)", padding: "28px 22px 22px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              {user.photoURL ? (
                <img src={user.photoURL} style={{ width: 50, height: 50, borderRadius: "50%", border: "2px solid rgba(255,255,255,.4)", objectFit: "cover" }} alt={user.name} />
              ) : (
                <div style={{ width: 50, height: 50, background: "rgba(255,255,255,.22)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700, color: "white" }}>
                  {user.avatar || "?"}
                </div>
              )}
              <div>
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 17, color: "white" }}>{user.name}</div>
                <div style={{ color: "rgba(255,255,255,.7)", fontSize: 12 }}>{user.email}</div>
                {user.phone && <div style={{ color: "rgba(255,255,255,.7)", fontSize: 12 }}>{user.phone}</div>}
                <div style={{ color: "rgba(255,255,255,.7)", fontSize: 12 }}>📍 {user.city || "India"}</div>
                {user.provider === "google" && (
                  <div style={{ marginTop: 3 }}>
                    <span style={{ background: "rgba(255,255,255,.15)", color: "white", fontSize: 10, padding: "2px 8px", borderRadius: 20 }}>G Google Account</span>
                  </div>
                )}
              </div>
            </div>
            <button onClick={onClose} style={{ background: "rgba(255,255,255,.15)", border: "none", color: "white", width: 30, height: 30, borderRadius: "50%", cursor: "pointer", fontSize: 18 }}>×</button>
          </div>

          {/* Stats bar */}
          <div style={{ display: "flex", gap: 12, marginTop: 18 }}>
            {[["Bids", myBids.length], ["Leading", leading.length], ["Won", user.wonAuctions || 0]].map(([k, v]) => (
              <div key={k} style={{ flex: 1, textAlign: "center", background: "rgba(255,255,255,.12)", borderRadius: 10, padding: "10px 4px" }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, color: "white" }}>{v}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,.65)" }}>{k}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Body ── */}
        <div style={{ padding: 20 }}>
          {/* Leading bids */}
          {leading.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                <span className="live-dot" />Leading Bids ({leading.length})
              </div>
              {leading.map((c) => {
                const carBids = bidHistory[c.id] || bidHistory[String(c.id)] || [];
                return (
                  <div key={c.id} style={{ background: "var(--blue-pale)", border: "1px solid var(--blue-mid)", borderRadius: "var(--radius-sm)", padding: "11px 13px", marginBottom: 6 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{c.year} {c.make} {c.model}</div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
                      <span style={{ color: "var(--blue)", fontWeight: 700, fontFamily: "var(--font-display)", fontSize: 14 }}>{formatCurrency(c.currentBid)}</span>
                      <Countdown endTime={c.endTime} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Bid history */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>My Bids ({myBids.length})</div>
            {myBids.length === 0 ? (
              <div style={{ color: "var(--text3)", fontSize: 13, padding: 14, background: "var(--surface2)", borderRadius: "var(--radius-sm)", textAlign: "center" }}>No bids yet</div>
            ) : (
              <div style={{ maxHeight: 260, overflowY: "auto" }}>
                {myBids
                  .sort((a, b) => (b.time || 0) - (a.time || 0))
                  .map((b, i) => {
                    const c = cars.find((x) => x.id === b.carId || String(x.id) === b.carId);
                    return (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid var(--border)", fontSize: 13 }}>
                        <div>
                          <div style={{ fontWeight: 600 }}>{c ? `${c.year} ${c.make} ${c.model}` : "Unknown"}</div>
                          <div style={{ color: "var(--text4)", fontSize: 11, display: "flex", gap: 6, alignItems: "center" }}>
                            {timeAgo(b.time || Date.now())}
                            {b.paymentId && <span className="payment-badge" style={{ fontSize: 9 }}>✓ Paid</span>}
                          </div>
                        </div>
                        <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--blue)", fontSize: 14 }}>{formatCurrency(b.amount)}</div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          <button className="btn btn-danger btn-md w-full" onClick={onLogout}>Sign Out</button>
        </div>
      </div>
    </div>
  );
}
