/**
 * src/App.js
 * ============================================================
 * BidDrive — Root application component.
 *
 * Responsibilities (orchestration only):
 *  - Firebase initialisation on boot
 *  - Global state: cars, bids, user, modals, filters
 *  - Real-time bid simulation via useRealTimeBids hook
 *  - Firestore writes after every user bid
 *  - Routing between listing grid, detail page, and modals
 *
 * All UI, business logic, and data access is delegated to:
 *  - src/components/   — UI components
 *  - src/services/     — Firebase, Auth, Razorpay
 *  - src/hooks/        — Custom React hooks
 *  - src/models/       — Data shapes and seed data
 *  - src/utils/        — Pure helper functions
 *  - src/config/       — Firebase + Razorpay keys
 *  - src/styles/       — Global CSS
 * ============================================================
 */

import { useState, useEffect }     from "react";
import "./styles/global.css";

import React from 'react';

// ── Config ────────────────────────────────────────────────────
import { initFirebase }            from "./config/firebase.js";

// ── Services ──────────────────────────────────────────────────
import { CarsRepo, BidsRepo, UsersRepo } from "./services/repositories.js";
import AuthService                        from "./services/AuthService.js";

// ── Hooks ─────────────────────────────────────────────────────
import { useRealTimeBids, useToast, useLocalStorage } from "./hooks/index.js";

// ── Models / static data ──────────────────────────────────────
import { SEED_CARS }               from "./models/index.js";

// ── Utils ─────────────────────────────────────────────────────
import { formatCurrency }          from "./utils/index.js";

// ── Components ────────────────────────────────────────────────
import CarCard      from "./components/CarCard.jsx";
import DetailPage   from "./components/DetailPage.jsx";
import AuthModal    from "./components/AuthModal.jsx";
import BidModal     from "./components/BidModal.jsx";
import AIAdvisor    from "./components/AIAdvisor.jsx";
import ProfilePanel from "./components/ProfilePanel.jsx";

// ────────────────────────────────────────────────────────────────
export default function App() {
  // ── Core data ──────────────────────────────────────────────
  const [cars,        setCars]        = useState(SEED_CARS);
  const [bidHistory,  setBidHistory]  = useState({});

  // ── Auth ───────────────────────────────────────────────────
  const [user,          setUser]          = useState(null);
  const [firebaseReady, setFirebaseReady] = useState(false);

  // ── UI state ───────────────────────────────────────────────
  const [modal,      setModal]      = useState(null); // "auth"|"bid"|"ai"|"profile"|null
  const [bidCar,     setBidCar]     = useState(null);
  const [aiCar,      setAiCar]      = useState(null);
  const [detailCar,  setDetailCar]  = useState(null);
  const [tab,        setTab]        = useState("live"); // "live"|"watchlist"
  const [notif,      setNotif]      = useState(null);   // live bid notification

  // ── Filters ────────────────────────────────────────────────
  const [search,     setSearch]     = useState("");
  const [filterFuel, setFilterFuel] = useState("all");
  const [sortBy,     setSortBy]     = useState("ending");

  // ── Persisted watchlist ────────────────────────────────────
  const [watchlist, setWatchlist]   = useLocalStorage("bd_watchlist", []);

  // ── Toast ──────────────────────────────────────────────────
  const { toast, showToast }        = useToast();

  // ── Firebase boot ──────────────────────────────────────────
  useEffect(() => {
    let unsubCars = () => {};
    let unsubAuth = () => {};

    async function boot() {
      try {
        const { db, auth } = await initFirebase();
        if (!db || !auth) return;

        setFirebaseReady(true);

        // Seed Firestore with demo cars on first run
        await CarsRepo.seedIfEmpty(SEED_CARS);

        // Real-time car subscription
        unsubCars = CarsRepo.subscribe((firestoreCars) => {
          if (firestoreCars.length > 0) setCars(firestoreCars);
        });

        // Load all bids from Firestore
        const allBids = await BidsRepo.getAll();
        setBidHistory(allBids);

        // Auth state subscription
        unsubAuth = AuthService.onAuthChange(setUser);
      } catch (err) {
        console.warn("Firebase boot error:", err.message);
      }
    }

    boot();
    return () => { unsubCars(); unsubAuth(); };
  }, []);

  // ── Real-time bid simulation ────────────────────────────────
  // Supplements live Firestore data with animated "other user" bids.
  useRealTimeBids(
    cars,
    (carId, amount, bid) => {
      setCars((prev) => prev.map((c) => c.id === carId ? { ...c, currentBid: amount } : c));
      setBidHistory((prev) => ({ ...prev, [String(carId)]: [bid, ...(prev[String(carId)] || [])] }));
    },
    (notifPayload) => {
      setNotif(notifPayload);
      setTimeout(() => setNotif(null), 4500);
    }
  );

  // ── Bid handler ────────────────────────────────────────────
  /**
   * Called after a bid is confirmed (and payment collected).
   * Performs an optimistic UI update, then writes to Firestore.
   */
  async function handleBid(carId, amount, bidUser, payment) {
    const carIdStr = String(carId);
    const bid = {
      userId:        bidUser.uid || bidUser.id,
      userName:      bidUser.name,
      amount,
      carId:         carIdStr,
      time:          Date.now(),
      paymentId:     payment?.paymentId     || null,
      depositAmount: payment?.depositAmount || null,
    };

    // Optimistic UI — instant feedback
    setCars((prev) => prev.map((c) => String(c.id) === carIdStr ? { ...c, currentBid: amount } : c));
    setBidHistory((prev) => ({ ...prev, [carIdStr]: [bid, ...(prev[carIdStr] || [])] }));
    setUser((prev) => ({ ...prev, bidsPlaced: (prev?.bidsPlaced || 0) + 1 }));
    showToast(`🏆 Bid of ${formatCurrency(amount)} placed! You're the highest bidder.`);

    // Persist to Firestore
    if (firebaseReady) {
      try {
        await BidsRepo.create(bid);
        await CarsRepo.updateBid(carIdStr, amount);
        await UsersRepo.incrementBids(bidUser.uid || bidUser.id);
      } catch (err) {
        console.error("Firestore bid write error:", err);
      }
    }
  }

  // ── Helpers ────────────────────────────────────────────────
  function openBid(car) {
    if (!user) { setModal("auth"); return; }
    setBidCar(car);
    setModal("bid");
  }

  function toggleWatch(id) {
    setWatchlist((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  async function handleLogout() {
    await AuthService.signOut();
    setUser(null);
    setModal(null);
    showToast("Signed out successfully.");
  }

  function getBids(carId) {
    return bidHistory[carId] || bidHistory[String(carId)] || [];
  }

  // ── Filtered / sorted car list ─────────────────────────────
  const shownCars = cars
    .filter((c) => filterFuel === "all" || c.fuel === filterFuel)
    .filter((c) => tab === "watchlist" ? watchlist.includes(c.id) : true)
    .filter((c) => {
      if (!search) return true;
      return `${c.make} ${c.model} ${c.year} ${c.color} ${c.location}`.toLowerCase().includes(search.toLowerCase());
    })
    .sort((a, b) => {
      if (sortBy === "ending")     return a.endTime - b.endTime;
      if (sortBy === "price_asc")  return a.currentBid - b.currentBid;
      if (sortBy === "price_desc") return b.currentBid - a.currentBid;
      if (sortBy === "bids")       return getBids(b.id).length - getBids(a.id).length;
      return 0;
    });

  const totalBids = Object.values(bidHistory).reduce((s, arr) => s + arr.length, 0);

  // ── Render ─────────────────────────────────────────────────
  return (
    <>
      {/* ── HEADER ── */}
      <header style={{ background: "white", borderBottom: "1px solid var(--border)", boxShadow: "var(--shadow-sm)", position: "sticky", top: 0, zIndex: 500 }} className="no-print">
        <div className="container">
          <div className="header-inner">
            {/* Logo */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }} onClick={() => setDetailCar(null)}>
              <span style={{ fontSize: 24 }}>🏁</span>
              <div>
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 20, color: "var(--blue)", lineHeight: 1.1 }}>BidDrive</div>
                <div className="nav-brand-sub" style={{ fontSize: 10, color: "var(--text4)", letterSpacing: 1, textTransform: "uppercase" }}>Premium Car Auctions</div>
              </div>
            </div>

            <div className="header-right">
              {/* Firebase status */}
              <div className={`fb-status ${firebaseReady ? "live" : "demo"} header-stat`}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: firebaseReady ? "#22c55e" : "#f59e0b", display: "inline-block" }} />
                {firebaseReady ? "🔥 Firebase Live" : "Demo Mode"}
              </div>
              {/* Live count */}
              <div className="header-stat flex items-center gap-4" style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 20, padding: "5px 12px", fontSize: 12 }}>
                <span className="live-dot" /><span style={{ color: "var(--text3)", fontWeight: 600 }}>{cars.filter((c) => c.endTime > Date.now()).length} Live</span>
              </div>
              <div className="header-stat" style={{ fontSize: 12, color: "var(--text3)" }}><strong style={{ color: "var(--text)" }}>{totalBids}</strong> bids</div>

              {/* User avatar / sign-in */}
              {user ? (
                <button onClick={() => setModal("profile")} style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--blue-pale)", border: "1.5px solid var(--blue-mid)", borderRadius: 24, padding: "6px 14px 6px 8px", cursor: "pointer" }}>
                  {user.photoURL
                    ? <img src={user.photoURL} style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} alt={user.name} />
                    : <div style={{ width: 28, height: 28, background: "var(--blue)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "white", flexShrink: 0 }}>{user.avatar || "?"}</div>
                  }
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--blue)" }} className="header-stat">{user.name?.split(" ")[0]}</span>
                </button>
              ) : (
                <button className="btn btn-primary btn-sm" onClick={() => setModal("auth")}>Sign In</button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ── MAIN ── */}
      <main className="container page-content" style={{ paddingTop: 24 }}>
        {detailCar ? (
          <DetailPage
            car={detailCar}
            bids={getBids(detailCar.id)}
            user={user}
            onBack={() => setDetailCar(null)}
            onBid={openBid}
            onAI={(c) => { setAiCar(c); setModal("ai"); }}
          />
        ) : (
          <>
            {/* Stats row */}
            <div className="grid-stats" style={{ marginBottom: 22 }}>
              {[
                { icon: "🏎️", label: "Live Auctions",   val: cars.filter((c) => c.endTime > Date.now()).length },
                { icon: "⚡",  label: "Bids Today",      val: totalBids },
                { icon: "💰", label: "Total Value",      val: formatCurrency(cars.reduce((s, c) => s + c.currentBid, 0)) },
                { icon: "👥", label: "Active Bidders",   val: new Set(Object.values(bidHistory).flat().map((b) => b.userId)).size },
              ].map((s) => (
                <div key={s.label} className="card" style={{ padding: "16px 18px" }}>
                  <div style={{ fontSize: 20, marginBottom: 4 }}>{s.icon}</div>
                  <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 22 }}>{s.val}</div>
                  <div style={{ color: "var(--text3)", fontSize: 12 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Toolbar */}
            <div className="card toolbar no-print" style={{ padding: "14px 16px", marginBottom: 20 }}>
              {/* Tab switcher */}
              <div className="tab-bar" style={{ display: "flex", gap: 20, borderBottom: "none", paddingRight: 12, marginRight: 4, borderRight: "1px solid var(--border)" }}>
                {[["live", "🔴 Live"], ["watchlist", "❤️ Saved"]].map(([k, l]) => (
                  <button key={k} className={`tab-btn${tab === k ? " active" : ""}`} onClick={() => setTab(k)} style={{ paddingBottom: 0, fontSize: 13 }}>{l}</button>
                ))}
              </div>
              <input className="field-input" style={{ flex: 1, minWidth: 140 }} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="🔍 Search make, model, city..." />
              <select className="field-input" style={{ width: "auto", minWidth: 120 }} value={filterFuel} onChange={(e) => setFilterFuel(e.target.value)}>
                <option value="all">All Fuels</option>
                <option value="Petrol">Petrol</option>
                <option value="Diesel">Diesel</option>
                <option value="Mild Hybrid">Hybrid</option>
              </select>
              <select className="field-input" style={{ width: "auto", minWidth: 150 }} value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="ending">Ending Soonest</option>
                <option value="price_asc">Price: Low → High</option>
                <option value="price_desc">Price: High → Low</option>
                <option value="bids">Most Bids</option>
              </select>
              <div style={{ color: "var(--text3)", fontSize: 13, whiteSpace: "nowrap" }}>{shownCars.length} cars</div>
            </div>

            {/* Car grid */}
            {shownCars.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--text3)" }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>No cars found</div>
                <div>Try adjusting your search or filters</div>
              </div>
            ) : (
              <div className="grid-cards">
                {shownCars.map((car) => (
                  <CarCard
                    key={car.id}
                    car={car}
                    bids={getBids(car.id)}
                    watched={watchlist.includes(car.id)}
                    onDetail={setDetailCar}
                    onBid={openBid}
                    onAI={(c) => { setAiCar(c); setModal("ai"); }}
                    onWatch={toggleWatch}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {/* ── FOOTER ── */}
      <footer className="no-print" style={{ background: "white", borderTop: "1px solid var(--border)", padding: "24px 16px", textAlign: "center", marginTop: 32 }}>
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 18, color: "var(--blue)", marginBottom: 4 }}>🏁 BidDrive</div>
        <div style={{ color: "var(--text3)", fontSize: 13 }}>India's Premier Car Auction Platform · Secure · Verified · Real-Time</div>
        <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 8, flexWrap: "wrap" }}>
          <div className="razorpay-badge">💳 Razorpay Payments</div>
          <div className={`fb-status ${firebaseReady ? "live" : "demo"}`} style={{ fontSize: 11 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: firebaseReady ? "#22c55e" : "#f59e0b", display: "inline-block" }} />
            {firebaseReady ? "Firebase Firestore" : "Demo Mode"}
          </div>
          <div style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 20, padding: "3px 10px", fontSize: 11, color: "var(--text3)" }}>🔐 Google SSO</div>
        </div>
        <div style={{ color: "var(--text4)", fontSize: 12, marginTop: 8 }}>© 2026 BidDrive. All rights reserved.</div>
      </footer>

      {/* ── MOBILE BOTTOM NAV ── */}
      <nav className="mobile-nav no-print">
        {[["live", "🏎", "Live"], ["watchlist", "❤️", "Saved"], ["profile", "👤", "Account"]].map(([k, icon, label]) => (
          <button key={k} className={`mobile-nav-btn${tab === k ? " active" : ""}`}
            onClick={() => {
              if (k === "live" || k === "watchlist") { setTab(k); setDetailCar(null); }
              else if (k === "profile") { if (!user) setModal("auth"); else setModal("profile"); }
            }}>
            <span className="icon">{icon}</span>
            <span>{label}</span>
          </button>
        ))}
      </nav>

      {/* ── MODALS ── */}
      {modal === "auth" && (
        <AuthModal
          firebaseReady={firebaseReady}
          onAuth={(u) => { setUser(u); setModal(null); showToast(`Welcome, ${u.name?.split(" ")[0]}! 👋`); }}
          onClose={() => setModal(null)}
        />
      )}
      {modal === "bid" && bidCar && (
        <BidModal
          car={bidCar} user={user} bidHistory={bidHistory}
          onClose={() => { setModal(null); setBidCar(null); }}
          onConfirm={handleBid}
        />
      )}
      {modal === "ai" && aiCar && (
        <AIAdvisor car={aiCar} user={user} onClose={() => { setModal(null); setAiCar(null); }} />
      )}
      {modal === "profile" && user && (
        <ProfilePanel user={user} bidHistory={bidHistory} cars={cars} onClose={() => setModal(null)} onLogout={handleLogout} />
      )}

      {/* ── LIVE BID NOTIFICATION ── */}
      {notif && (
        <div style={{ position: "fixed", top: 80, right: 16, background: "white", border: "1px solid var(--border)", borderLeft: "4px solid var(--blue)", borderRadius: "var(--radius-sm)", padding: "11px 14px", boxShadow: "var(--shadow-lg)", zIndex: 800, animation: "notifIn .3s ease", maxWidth: 280 }} className="no-print">
          <div style={{ fontSize: 10, color: "var(--text4)", marginBottom: 2, display: "flex", alignItems: "center", gap: 4 }}><span className="live-dot" />New Bid</div>
          <div style={{ fontWeight: 700, fontSize: 13 }}>{notif.bidder}</div>
          <div style={{ fontSize: 12, color: "var(--text3)" }}>bid <strong style={{ color: "var(--blue)", fontFamily: "var(--font-display)" }}>{formatCurrency(notif.amount)}</strong> on {notif.car}</div>
        </div>
      )}

      {/* ── TOAST ── */}
      {toast && (
        <div style={{ position: "fixed", bottom: 80, left: "50%", transform: "translateX(-50%)", background: toast.type === "error" ? "var(--red)" : "var(--text)", color: "white", padding: "12px 22px", borderRadius: 30, fontWeight: 600, fontSize: 13, zIndex: 9999, boxShadow: "var(--shadow-xl)", animation: "toastIn .3s ease", whiteSpace: "nowrap" }} className="no-print">
          {toast.message}
        </div>
      )}
    </>
  );
}
