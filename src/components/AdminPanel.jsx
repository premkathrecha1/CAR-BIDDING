/**
 * src/components/AdminPanel.jsx
 * ─────────────────────────────────────────────────────────────
 * Full admin panel with 5 live-connected sections:
 *   1. Dashboard  — real-time stats
 *   2. Cars       — full CRUD (add/edit/delete/extend)
 *   3. Users      — verify, ban, search
 *   4. Bids       — view all, delete fraudulent
 *   5. Payments   — view all, mark refunded
 *
 * Access: only users with role="admin" in Firestore users/{uid}
 * ─────────────────────────────────────────────────────────────
 */
import React from 'react';

import { useState, useEffect, useCallback } from "react";
import {
  AdminCarsRepo, AdminUsersRepo, AdminBidsRepo,
  AdminPaymentsRepo, AdminStatsRepo,
} from "../services/adminRepositories.js";
import { formatCurrency, formatCurrencyFull, timeAgo } from "../utils/index.js";

// ── helpers ───────────────────────────────────────────────────
const Spinner = () => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 60 }}>
    <div style={{ width: 40, height: 40, border: "4px solid #dde4f5", borderTopColor: "#1d4ed8", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
  </div>
);

const Badge = ({ children, color = "#1d4ed8", bg = "#eff6ff" }) => (
  <span style={{ display: "inline-block", padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, color, background: bg }}>{children}</span>
);

const Confirm = ({ msg, onYes, onNo }) => (
  <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.6)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center" }}>
    <div style={{ background: "white", borderRadius: 16, padding: 28, maxWidth: 360, width: "100%", boxShadow: "0 24px 64px rgba(0,40,120,.2)", textAlign: "center" }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
      <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Confirm Action</div>
      <div style={{ color: "#64748b", fontSize: 14, marginBottom: 24 }}>{msg}</div>
      <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
        <button onClick={onNo}  style={{ padding: "9px 24px", borderRadius: 8, border: "1.5px solid #dde4f5", background: "white",   cursor: "pointer", fontWeight: 600 }}>Cancel</button>
        <button onClick={onYes} style={{ padding: "9px 24px", borderRadius: 8, border: "none",               background: "#dc2626", color: "white", cursor: "pointer", fontWeight: 600 }}>Confirm</button>
      </div>
    </div>
  </div>
);

// ── STAT CARD ─────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, color = "#1d4ed8" }) {
  return (
    <div style={{ background: "white", borderRadius: 14, border: "1px solid #dde4f5", padding: "18px 20px", boxShadow: "0 2px 8px rgba(0,40,120,.07)" }}>
      <div style={{ fontSize: 26, marginBottom: 6 }}>{icon}</div>
      <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 26, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontWeight: 600, fontSize: 13, color: "#334155", marginTop: 2 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

// ── CAR FORM MODAL ────────────────────────────────────────────
const EMPTY_CAR = {
  make: "", model: "", year: new Date().getFullYear(), mileage: 0,
  color: "", fuel: "Petrol", transmission: "Automatic", condition: "Excellent",
  engine: "", power: "", torque: "", topSpeed: "", acceleration: "",
  startingBid: 1000000, location: "", seller: "", verified: false,
  badge: "", features: "", history: "",
  endTime: Date.now() + 86_400_000 * 3, // 3 days default
};

function CarFormModal({ car, onSave, onClose }) {
  const [form, setForm]     = useState(car ? { ...car, features: (car.features || []).join(", "), endTime: car.endTime } : { ...EMPTY_CAR });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  async function handleSave() {
    if (!form.make || !form.model || !form.year) { setError("Make, Model, Year required."); return; }
    setSaving(true); setError("");
    try {
      const data = {
        ...form,
        year:        Number(form.year),
        mileage:     Number(form.mileage),
        startingBid: Number(form.startingBid),
        numId:       form.numId || Math.floor(Math.random() * 9000 + 1000),
        features:    form.features.split(",").map((s) => s.trim()).filter(Boolean),
        endTime:     Number(form.endTime),
      };
      if (car?.id) {
        await AdminCarsRepo.update(car.id, data);
      } else {
        await AdminCarsRepo.create(data);
      }
      onSave();
    } catch (e) { setError(e.message); }
    setSaving(false);
  }

  const F = ({ label, children }) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: "#334155" }}>{label}</label>
      {children}
    </div>
  );

  const inp = (key, type = "text", placeholder = "") => (
    <input type={type} value={form[key] || ""} placeholder={placeholder}
      onChange={(e) => set(key, type === "number" ? Number(e.target.value) : e.target.value)}
      style={{ padding: "9px 12px", border: "1.5px solid #dde4f5", borderRadius: 8, fontSize: 13, fontFamily: "inherit", outline: "none", width: "100%" }}
    />
  );

  const sel = (key, opts) => (
    <select value={form[key] || ""} onChange={(e) => set(key, e.target.value)}
      style={{ padding: "9px 12px", border: "1.5px solid #dde4f5", borderRadius: 8, fontSize: 13, fontFamily: "inherit", outline: "none", width: "100%" }}>
      {opts.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.55)", zIndex: 1500, display: "flex", alignItems: "center", justifyContent: "center", padding: 12 }}>
      <div style={{ background: "white", borderRadius: 20, width: "100%", maxWidth: 680, maxHeight: "92vh", overflowY: "auto", boxShadow: "0 24px 64px rgba(0,40,120,.2)" }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #dde4f5", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, background: "white", zIndex: 10 }}>
          <div style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, fontSize: 18 }}>{car ? "✏️ Edit Car" : "➕ Add New Car"}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#64748b" }}>×</button>
        </div>
        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <F label="Make *">{inp("make", "text", "BMW")}</F>
            <F label="Model *">{inp("model", "text", "M3 Competition")}</F>
            <F label="Year *">{inp("year", "number", "2022")}</F>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <F label="Fuel">{sel("fuel", ["Petrol", "Diesel", "Mild Hybrid", "Electric", "CNG"])}</F>
            <F label="Transmission">{sel("transmission", ["Automatic", "Manual", "PDK 8-Speed", "Tiptronic 8-Spd", "Tremec 7-Speed", "9G-Tronic"])}</F>
            <F label="Condition">{sel("condition", ["Like New", "Excellent", "Good", "Fair"])}</F>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <F label="Color">{inp("color", "text", "Alpine White")}</F>
            <F label="Mileage (km)">{inp("mileage", "number", "15000")}</F>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 }}>
            <F label="Engine">{inp("engine", "text", "3.0L Twin-Turbo I6")}</F>
            <F label="Power">{inp("power", "text", "503 hp")}</F>
            <F label="Torque">{inp("torque", "text", "650 Nm")}</F>
            <F label="0–100 km/h">{inp("acceleration", "text", "3.9s")}</F>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <F label="Starting Bid (₹)">{inp("startingBid", "number", "4200000")}</F>
            <F label="Location">{inp("location", "text", "Mumbai")}</F>
            <F label="Seller">{inp("seller", "text", "Premium Auto Group")}</F>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <F label="Badge">{sel("badge", ["", "HOT", "POPULAR", "ENDING SOON", "NEW", "PREMIUM"])}</F>
            <F label="Auction End Time">
              <input type="datetime-local" value={new Date(form.endTime).toISOString().slice(0, 16)}
                onChange={(e) => set("endTime", new Date(e.target.value).getTime())}
                style={{ padding: "9px 12px", border: "1.5px solid #dde4f5", borderRadius: 8, fontSize: 13, fontFamily: "inherit", outline: "none", width: "100%" }}
              />
            </F>
          </div>
          <F label="Features (comma-separated)">
            <input value={form.features || ""} onChange={(e) => set("features", e.target.value)}
              placeholder="Harman Kardon Audio, Carbon Fibre Trim, M Sport Seats"
              style={{ padding: "9px 12px", border: "1.5px solid #dde4f5", borderRadius: 8, fontSize: 13, fontFamily: "inherit", outline: "none", width: "100%" }}
            />
          </F>
          <F label="History">
            <textarea value={form.history || ""} onChange={(e) => set("history", e.target.value)}
              rows={2} placeholder="1 Owner · Full Service History · No Accidents"
              style={{ padding: "9px 12px", border: "1.5px solid #dde4f5", borderRadius: 8, fontSize: 13, fontFamily: "inherit", outline: "none", resize: "vertical", width: "100%" }}
            />
          </F>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
            <input type="checkbox" checked={!!form.verified} onChange={(e) => set("verified", e.target.checked)} style={{ accentColor: "#1d4ed8", width: 16, height: 16 }} />
            Verified Seller
          </label>
          {error && <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", color: "#dc2626", padding: "10px 14px", borderRadius: 8, fontSize: 13 }}>⚠ {error}</div>}
          <div style={{ display: "flex", gap: 10, paddingTop: 4 }}>
            <button onClick={onClose} style={{ flex: 1, padding: "12px", borderRadius: 8, border: "1.5px solid #dde4f5", background: "white", cursor: "pointer", fontWeight: 600, fontFamily: "inherit" }}>Cancel</button>
            <button onClick={handleSave} disabled={saving} style={{ flex: 2, padding: "12px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#1d4ed8,#2563eb)", color: "white", cursor: "pointer", fontWeight: 700, fontFamily: "inherit", opacity: saving ? 0.6 : 1 }}>
              {saving ? "Saving..." : car ? "Save Changes" : "Add Car"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── DASHBOARD TAB ─────────────────────────────────────────────
function DashboardTab() {
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const s = await AdminStatsRepo.getDashboard();
    setStats(s);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  if (loading) return <Spinner />;
  if (!stats)  return <div style={{ padding: 40, textAlign: "center", color: "#64748b" }}>⚠ Firebase not configured. Stats unavailable in demo mode.</div>;

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 16, marginBottom: 28 }}>
        <StatCard icon="🏎️" label="Total Listings"   value={stats.totalCars}     sub="All-time" />
        <StatCard icon="🔴" label="Live Auctions"     value={stats.liveAuctions}  sub="Active now"     color="#dc2626" />
        <StatCard icon="⚡" label="Total Bids"         value={stats.totalBids}     sub={`${stats.bidsToday} today`} color="#7c3aed" />
        <StatCard icon="👥" label="Registered Users"  value={stats.totalUsers}    sub="All-time" color="#059669" />
        <StatCard icon="💳" label="Payments"           value={stats.totalPayments} sub="Completed" color="#d97706" />
        <StatCard icon="💰" label="Deposit Revenue"   value={formatCurrency(stats.totalRevenue)} sub="2% deposits" color="#1d4ed8" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ background: "white", borderRadius: 14, border: "1px solid #dde4f5", padding: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>🏆 Top Bid Car</div>
          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 20, fontWeight: 700, color: "#1d4ed8" }}>{stats.topCar}</div>
          <div style={{ color: "#64748b", marginTop: 4 }}>Current bid: <strong>{formatCurrencyFull(stats.topBid)}</strong></div>
        </div>
        <div style={{ background: "linear-gradient(135deg,#1d4ed8,#2563eb)", borderRadius: 14, padding: 20, color: "white" }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>📊 Quick Summary</div>
          <div style={{ fontSize: 13, opacity: 0.85, lineHeight: 1.8 }}>
            {stats.liveAuctions} live auction{stats.liveAuctions !== 1 ? "s" : ""}<br />
            {stats.bidsToday} bids in last 24h<br />
            {stats.totalUsers} registered bidders<br />
            {formatCurrency(stats.totalRevenue)} collected
          </div>
        </div>
      </div>
      <div style={{ marginTop: 16, textAlign: "right" }}>
        <button onClick={refresh} style={{ padding: "8px 18px", border: "1.5px solid #dde4f5", borderRadius: 8, background: "white", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "inherit" }}>🔄 Refresh Stats</button>
      </div>
    </div>
  );
}

// ── CARS TAB ──────────────────────────────────────────────────
function CarsTab() {
  const [cars,    setCars]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");
  const [form,    setForm]    = useState(null);  // null | "new" | carObj
  const [confirm, setConfirm] = useState(null);
  const [extending, setExtending] = useState(null);
  const [extHours,  setExtHours]  = useState(24);

  useEffect(() => {
    setLoading(true);
    const unsub = AdminCarsRepo.subscribe((data) => { setCars(data); setLoading(false); });
    return unsub;
  }, []);

  const filtered = cars.filter((c) =>
    `${c.make} ${c.model} ${c.year} ${c.location}`.toLowerCase().includes(search.toLowerCase())
  );

  async function handleDelete(car) {
    await AdminCarsRepo.delete(car.id);
    setConfirm(null);
  }

  async function handleExtend() {
    await AdminCarsRepo.extendAuction(extending.id, extHours);
    setExtending(null);
  }

  const live  = (c) => (c.endTime || 0) > Date.now();
  const ended = (c) => !live(c);

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="🔍 Search cars..."
          style={{ flex: 1, minWidth: 180, padding: "9px 14px", border: "1.5px solid #dde4f5", borderRadius: 8, fontSize: 13, fontFamily: "inherit", outline: "none" }}
        />
        <button onClick={() => setForm("new")}
          style={{ padding: "9px 20px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#1d4ed8,#2563eb)", color: "white", cursor: "pointer", fontWeight: 700, fontFamily: "inherit", whiteSpace: "nowrap" }}>
          ➕ Add Car
        </button>
      </div>

      {loading ? <Spinner /> : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f8faff" }}>
                {["Vehicle","Location","Starting Bid","Current Bid","Bids","Status","Badge","Verified","Actions"].map((h) => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontWeight: 700, fontSize: 12, color: "#334155", borderBottom: "2px solid #dde4f5", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((car) => (
                <tr key={car.id} style={{ borderBottom: "1px solid #f0f4ff" }}>
                  <td style={{ padding: "11px 14px", fontWeight: 600 }}>{car.year} {car.make} {car.model}</td>
                  <td style={{ padding: "11px 14px", color: "#64748b" }}>{car.location}</td>
                  <td style={{ padding: "11px 14px" }}>{formatCurrency(car.startingBid)}</td>
                  <td style={{ padding: "11px 14px", fontWeight: 700, color: "#1d4ed8" }}>{formatCurrency(car.currentBid)}</td>
                  <td style={{ padding: "11px 14px" }}>{car.bidCount || 0}</td>
                  <td style={{ padding: "11px 14px" }}>
                    {live(car)
                      ? <Badge color="#059669" bg="#dcfce7">🟢 Live</Badge>
                      : <Badge color="#64748b" bg="#f1f5f9">⏹ Ended</Badge>}
                  </td>
                  <td style={{ padding: "11px 14px" }}>
                    {car.badge ? <Badge>{car.badge}</Badge> : <span style={{ color: "#94a3b8" }}>—</span>}
                  </td>
                  <td style={{ padding: "11px 14px" }}>
                    {car.verified
                      ? <Badge color="#059669" bg="#dcfce7">✓</Badge>
                      : <Badge color="#dc2626" bg="#fef2f2">✗</Badge>}
                  </td>
                  <td style={{ padding: "11px 14px" }}>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <button onClick={() => setForm(car)} style={btnStyle("#1d4ed8")}>Edit</button>
                      {ended(car) && (
                        <button onClick={() => setExtending(car)} style={btnStyle("#7c3aed")}>Extend</button>
                      )}
                      <button onClick={() => setConfirm(car)} style={btnStyle("#dc2626")}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <div style={{ textAlign: "center", padding: 32, color: "#94a3b8" }}>No cars found.</div>}
        </div>
      )}

      {/* Add/Edit modal */}
      {form && (
        <CarFormModal
          car={form === "new" ? null : form}
          onSave={() => setForm(null)}
          onClose={() => setForm(null)}
        />
      )}

      {/* Extend modal */}
      {extending && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.55)", zIndex: 1500, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "white", borderRadius: 16, padding: 28, maxWidth: 340, width: "100%", boxShadow: "0 24px 64px rgba(0,40,120,.2)" }}>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>⏱ Extend Auction</div>
            <div style={{ color: "#64748b", fontSize: 13, marginBottom: 16 }}>{extending.year} {extending.make} {extending.model}</div>
            <label style={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>Extra Hours</label>
            <input type="number" value={extHours} min={1} max={168} onChange={(e) => setExtHours(Number(e.target.value))}
              style={{ width: "100%", marginTop: 6, marginBottom: 16, padding: "9px 12px", border: "1.5px solid #dde4f5", borderRadius: 8, fontSize: 14, fontFamily: "inherit", outline: "none" }}
            />
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setExtending(null)} style={{ flex: 1, padding: "10px", borderRadius: 8, border: "1.5px solid #dde4f5", background: "white", cursor: "pointer", fontWeight: 600, fontFamily: "inherit" }}>Cancel</button>
              <button onClick={handleExtend} style={{ flex: 2, padding: "10px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#7c3aed,#8b5cf6)", color: "white", cursor: "pointer", fontWeight: 700, fontFamily: "inherit" }}>Extend +{extHours}h</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {confirm && <Confirm msg={`Delete ${confirm.year} ${confirm.make} ${confirm.model} and ALL its bids?`} onYes={() => handleDelete(confirm)} onNo={() => setConfirm(null)} />}
    </div>
  );
}

// ── USERS TAB ─────────────────────────────────────────────────
function UsersTab() {
  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");

  useEffect(() => {
    setLoading(true);
    const unsub = AdminUsersRepo.subscribe((data) => { setUsers(data); setLoading(false); });
    return unsub;
  }, []);

  const filtered = users.filter((u) =>
    `${u.name} ${u.email} ${u.city}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="🔍 Search users..."
        style={{ width: "100%", maxWidth: 360, padding: "9px 14px", border: "1.5px solid #dde4f5", borderRadius: 8, fontSize: 13, fontFamily: "inherit", outline: "none", marginBottom: 18 }}
      />
      {loading ? <Spinner /> : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f8faff" }}>
                {["User","Email","City","Provider","Bids","Won","Verified","Banned","Actions"].map((h) => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontWeight: 700, fontSize: 12, color: "#334155", borderBottom: "2px solid #dde4f5", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id} style={{ borderBottom: "1px solid #f0f4ff", background: u.banned ? "#fff7f7" : "white" }}>
                  <td style={{ padding: "11px 14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#1d4ed8", flexShrink: 0 }}>{(u.avatar || u.name?.slice(0,2) || "?").toUpperCase()}</div>
                      <span style={{ fontWeight: 600 }}>{u.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: "11px 14px", color: "#64748b" }}>{u.email}</td>
                  <td style={{ padding: "11px 14px", color: "#64748b" }}>{u.city || "—"}</td>
                  <td style={{ padding: "11px 14px" }}>
                    <Badge color={u.provider === "google" ? "#1d4ed8" : "#334155"} bg={u.provider === "google" ? "#eff6ff" : "#f1f5f9"}>
                      {u.provider === "google" ? "G Google" : "✉ Email"}
                    </Badge>
                  </td>
                  <td style={{ padding: "11px 14px" }}>{u.bidsPlaced || 0}</td>
                  <td style={{ padding: "11px 14px" }}>{u.wonAuctions || 0}</td>
                  <td style={{ padding: "11px 14px" }}>
                    <button onClick={() => AdminUsersRepo.setVerified(u.id, !u.verified)} title="Toggle verified"
                      style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18 }}>
                      {u.verified ? "✅" : "⬜"}
                    </button>
                  </td>
                  <td style={{ padding: "11px 14px" }}>
                    <button onClick={() => AdminUsersRepo.setBanned(u.id, !u.banned)} title="Toggle ban"
                      style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18 }}>
                      {u.banned ? "🔴" : "🟢"}
                    </button>
                  </td>
                  <td style={{ padding: "11px 14px" }}>
                    <Badge color="#64748b" bg="#f1f5f9">{u.id?.slice(0, 8)}…</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <div style={{ textAlign: "center", padding: 32, color: "#94a3b8" }}>No users found.</div>}
        </div>
      )}
    </div>
  );
}

// ── BIDS TAB ──────────────────────────────────────────────────
function BidsTab() {
  const [bids,    setBids]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");
  const [confirm, setConfirm] = useState(null);

  useEffect(() => {
    setLoading(true);
    AdminBidsRepo.getAll().then((data) => { setBids(data); setLoading(false); });
  }, []);

  const filtered = bids.filter((b) =>
    `${b.userName} ${b.carId} ${b.amount}`.toLowerCase().includes(search.toLowerCase())
  );

  async function handleDelete(bid) {
    await AdminBidsRepo.delete(bid.id);
    setBids((p) => p.filter((b) => b.id !== bid.id));
    setConfirm(null);
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 10, marginBottom: 18, alignItems: "center", flexWrap: "wrap" }}>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="🔍 Search bids..."
          style={{ flex: 1, minWidth: 180, padding: "9px 14px", border: "1.5px solid #dde4f5", borderRadius: 8, fontSize: 13, fontFamily: "inherit", outline: "none" }}
        />
        <button onClick={() => { setLoading(true); AdminBidsRepo.getAll().then((d) => { setBids(d); setLoading(false); }); }}
          style={{ padding: "9px 16px", border: "1.5px solid #dde4f5", borderRadius: 8, background: "white", cursor: "pointer", fontWeight: 600, fontSize: 13, fontFamily: "inherit" }}>🔄 Refresh</button>
        <span style={{ fontSize: 13, color: "#64748b" }}>{filtered.length} bids</span>
      </div>
      {loading ? <Spinner /> : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f8faff" }}>
                {["Bidder","Car ID","Amount","Deposit","Payment ID","Time","Actions"].map((h) => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontWeight: 700, fontSize: 12, color: "#334155", borderBottom: "2px solid #dde4f5", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((bid) => (
                <tr key={bid.id} style={{ borderBottom: "1px solid #f0f4ff" }}>
                  <td style={{ padding: "11px 14px", fontWeight: 600 }}>{bid.userName}</td>
                  <td style={{ padding: "11px 14px", color: "#64748b", fontFamily: "monospace", fontSize: 11 }}>{bid.carId?.slice(0, 10)}…</td>
                  <td style={{ padding: "11px 14px", fontWeight: 700, color: "#1d4ed8", fontFamily: "'Playfair Display',serif" }}>{formatCurrencyFull(bid.amount)}</td>
                  <td style={{ padding: "11px 14px" }}>
                    {bid.depositAmount
                      ? <Badge color="#059669" bg="#dcfce7">{formatCurrency(bid.depositAmount)}</Badge>
                      : <span style={{ color: "#94a3b8" }}>—</span>}
                  </td>
                  <td style={{ padding: "11px 14px", fontFamily: "monospace", fontSize: 10, color: "#64748b" }}>{bid.paymentId ? bid.paymentId.slice(0, 16) + "…" : "—"}</td>
                  <td style={{ padding: "11px 14px", color: "#64748b" }}>{timeAgo(bid.time || Date.now())}</td>
                  <td style={{ padding: "11px 14px" }}>
                    <button onClick={() => setConfirm(bid)} style={btnStyle("#dc2626")}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <div style={{ textAlign: "center", padding: 32, color: "#94a3b8" }}>No bids found.</div>}
        </div>
      )}
      {confirm && <Confirm msg={`Delete bid of ${formatCurrencyFull(confirm.amount)} by ${confirm.userName}?`} onYes={() => handleDelete(confirm)} onNo={() => setConfirm(null)} />}
    </div>
  );
}

// ── PAYMENTS TAB ──────────────────────────────────────────────
function PaymentsTab() {
  const [payments, setPayments] = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    setLoading(true);
    const unsub = AdminPaymentsRepo.subscribe((data) => { setPayments(data); setLoading(false); });
    return unsub;
  }, []);

  const total    = payments.filter((p) => p.status === "completed").reduce((s, p) => s + (p.depositAmount || 0), 0);
  const refunded = payments.filter((p) => p.status === "refunded").reduce((s, p) => s + (p.depositAmount || 0), 0);

  return (
    <div>
      {/* Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12, marginBottom: 20 }}>
        <StatCard icon="💰" label="Total Collected" value={formatCurrency(total)}    sub="Completed" />
        <StatCard icon="↩️" label="Refunded"         value={formatCurrency(refunded)} sub="All-time"  color="#dc2626" />
        <StatCard icon="📊" label="Total Payments"   value={payments.length}          sub="All-time"  color="#7c3aed" />
      </div>
      {loading ? <Spinner /> : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f8faff" }}>
                {["User","Car","Bid Amount","Deposit","Razorpay ID","Status","Date","Actions"].map((h) => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontWeight: 700, fontSize: 12, color: "#334155", borderBottom: "2px solid #dde4f5", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} style={{ borderBottom: "1px solid #f0f4ff" }}>
                  <td style={{ padding: "11px 14px", fontWeight: 600 }}>{p.userName}</td>
                  <td style={{ padding: "11px 14px", color: "#64748b", fontSize: 12 }}>{p.carName}</td>
                  <td style={{ padding: "11px 14px", fontWeight: 700 }}>{formatCurrency(p.bidAmount || 0)}</td>
                  <td style={{ padding: "11px 14px", color: "#059669", fontWeight: 700 }}>{formatCurrency(p.depositAmount || 0)}</td>
                  <td style={{ padding: "11px 14px", fontFamily: "monospace", fontSize: 10, color: "#64748b" }}>{p.razorpayPaymentId?.slice(0, 18)}…</td>
                  <td style={{ padding: "11px 14px" }}>
                    {p.status === "completed"
                      ? <Badge color="#059669" bg="#dcfce7">✓ Completed</Badge>
                      : <Badge color="#dc2626" bg="#fef2f2">↩ Refunded</Badge>}
                  </td>
                  <td style={{ padding: "11px 14px", color: "#64748b", fontSize: 11 }}>
                    {p.createdAt?.toDate ? p.createdAt.toDate().toLocaleDateString("en-IN") : "—"}
                  </td>
                  <td style={{ padding: "11px 14px" }}>
                    {p.status === "completed" && (
                      <button onClick={() => AdminPaymentsRepo.markRefunded(p.id)} style={btnStyle("#d97706")}>Refund</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {payments.length === 0 && <div style={{ textAlign: "center", padding: 32, color: "#94a3b8" }}>No payments yet.</div>}
        </div>
      )}
    </div>
  );
}

// ── shared small button style ──────────────────────────────────
function btnStyle(color) {
  return {
    padding: "5px 12px", borderRadius: 6, border: `1.5px solid ${color}22`,
    background: `${color}11`, color, cursor: "pointer", fontWeight: 600,
    fontSize: 12, fontFamily: "inherit", whiteSpace: "nowrap",
  };
}

// ── MAIN ADMIN PANEL ──────────────────────────────────────────
const TABS = [
  { key: "dashboard", label: "📊 Dashboard" },
  { key: "cars",      label: "🏎️ Cars"      },
  { key: "users",     label: "👥 Users"     },
  { key: "bids",      label: "⚡ Bids"      },
  { key: "payments",  label: "💳 Payments"  },
];

/**
 * @param {{ user: UserModel, onClose: Function }} props
 * user.role must === "admin" or user.email must be in ADMIN_EMAILS
 */
export default function AdminPanel({ user, onClose }) {
  const [tab, setTab] = useState("dashboard");

  return (
    <div style={{ position: "fixed", inset: 0, background: "#f0f4ff", zIndex: 700, display: "flex", flexDirection: "column", overflowY: "auto" }}>
      {/* ── Top bar ── */}
      <div style={{ background: "linear-gradient(135deg,#0f172a,#1e293b)", color: "white", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 56, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 22 }}>🏁</span>
          <span style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, fontSize: 18 }}>BidDrive Admin</span>
          <span style={{ background: "#dc2626", color: "white", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20 }}>ADMIN</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 13, color: "rgba(255,255,255,.6)" }}>{user?.name}</span>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,.1)", border: "none", color: "white", padding: "6px 16px", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontFamily: "inherit", fontSize: 13 }}>← Back to Site</button>
        </div>
      </div>

      {/* ── Tab nav ── */}
      <div style={{ background: "white", borderBottom: "1px solid #dde4f5", display: "flex", gap: 0, padding: "0 24px", overflowX: "auto", flexShrink: 0 }}>
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ background: "none", border: "none", padding: "14px 20px", cursor: "pointer", fontFamily: "inherit", fontWeight: tab === t.key ? 700 : 500, fontSize: 13, color: tab === t.key ? "#1d4ed8" : "#64748b", borderBottom: tab === t.key ? "2.5px solid #1d4ed8" : "2.5px solid transparent", whiteSpace: "nowrap", transition: "color .15s" }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      <div style={{ flex: 1, padding: "28px 24px", maxWidth: 1280, width: "100%", margin: "0 auto" }}>
        <div style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, fontSize: 22, marginBottom: 20, color: "#0f172a" }}>
          {TABS.find((t) => t.key === tab)?.label}
        </div>
        {tab === "dashboard" && <DashboardTab />}
        {tab === "cars"      && <CarsTab />}
        {tab === "users"     && <UsersTab />}
        {tab === "bids"      && <BidsTab />}
        {tab === "payments"  && <PaymentsTab />}
      </div>
    </div>
  );
}