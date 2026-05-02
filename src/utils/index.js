/**
 * src/utils/index.js
 * ============================================================
 * Utility functions shared across the BidDrive application.
 * Sections:
 *   1. Formatters    — currency, countdown, time-ago, initials
 *   2. Validators    — field-level validation functions
 *   3. Export helpers — CSV, JSON, print report
 *   4. Misc          — dateStamp, clamp, parseCSV
 * ============================================================
 */

// ── 1. FORMATTERS ────────────────────────────────────────────

/**
 * Formats a number (INR) into compact Indian notation.
 * e.g. 5120000 → "₹51.2L"  |  11000000 → "₹1.10Cr"
 * @param {number} amount
 * @returns {string}
 */
export function formatCurrency(amount) {
  if (amount >= 10_000_000) return `₹${(amount / 10_000_000).toFixed(2)}Cr`;
  if (amount >= 100_000)    return `₹${(amount / 100_000).toFixed(1)}L`;
  return `₹${Number(amount).toLocaleString("en-IN")}`;
}

/**
 * Formats a number as full Indian Rupee amount.
 * e.g. 5120000 → "₹51,20,000"
 * @param {number} amount
 * @returns {string}
 */
export function formatCurrencyFull(amount) {
  return "₹" + Number(amount).toLocaleString("en-IN");
}

/**
 * Returns a human-readable "time ago" string.
 * e.g. 90000ms ago → "1m ago"
 * @param {number} timestamp - Unix timestamp in ms
 * @returns {string}
 */
export function timeAgo(timestamp) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60)    return `${seconds}s ago`;
  if (seconds < 3600)  return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

/**
 * Converts a future timestamp to a countdown string "HH:MM:SS".
 * Returns "ENDED" if time has elapsed.
 * @param {number} endTime - Future Unix timestamp in ms
 * @returns {string}
 */
export function formatCountdown(endTime) {
  const remaining = endTime - Date.now();
  if (remaining <= 0) return "ENDED";
  const h = Math.floor(remaining / 3_600_000);
  const m = Math.floor((remaining % 3_600_000) / 60_000);
  const s = Math.floor((remaining % 60_000)    / 1_000);
  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
}

/**
 * Generates 2-letter avatar initials from a full name.
 * e.g. "Rahul Sharma" → "RS"
 * @param {string} name
 * @returns {string}
 */
export function getInitials(name = "") {
  return name.trim().split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

// ── 2. VALIDATORS ────────────────────────────────────────────

/**
 * Collection of validator functions.
 * Each returns an error string or null (valid).
 */
export const VALIDATORS = {
  /** Field must not be empty */
  required: (v) => !v?.toString().trim() ? "This field is required." : null,

  /** Must be a valid email format */
  email: (v) =>
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? "Enter a valid email address." : null,

  /** Minimum character length */
  minLen: (min) => (v) =>
    (v?.length ?? 0) < min ? `Must be at least ${min} characters.` : null,

  /** Maximum character length */
  maxLen: (max) => (v) =>
    (v?.length ?? 0) > max ? `Must be ${max} characters or fewer.` : null,

  /** Name: letters and spaces, 2–50 chars */
  name: (v) =>
    !/^[a-zA-Z\s]{2,50}$/.test(v) ? "Name must be 2–50 letters only." : null,

  /** City: letters and spaces, 2–30 chars */
  city: (v) =>
    !/^[a-zA-Z\s]{2,30}$/.test(v) ? "Enter a valid city name." : null,

  /** Indian / international phone number */
  phone: (v) =>
    !/^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/.test(
      v?.replace(/\s/g, "")
    ) ? "Enter a valid phone number (e.g. +91 98765 43210)." : null,

  /**
   * Strong password:
   * - min 8 chars
   * - ≥1 uppercase
   * - ≥1 digit
   * - ≥1 special character
   */
  password: (v) => {
    if (!v || v.length < 8)        return "Password must be at least 8 characters.";
    if (!/[A-Z]/.test(v))          return "Must contain at least one uppercase letter.";
    if (!/[0-9]/.test(v))          return "Must contain at least one number.";
    if (!/[^A-Za-z0-9]/.test(v))   return "Must contain at least one special character (@, #, !, etc).";
    return null;
  },

  /**
   * Confirm-password validator.
   * NOTE: In AuthModal, this is called with the current password value
   * from the form, not a closure, so we keep it as a simple fn here.
   * @param {*} v - Value of the confirmPwd field
   */
  confirmPassword: (v) => {
    // The form passes the raw value; the cross-field check is done inline
    // in AuthModal using registerForm.values.password comparison.
    if (!v) return "This field is required.";
    return null;
  },

  /**
   * Bid amount validator.
   * @param {number} min - Minimum bid (currentBid + 1000)
   */
  bidAmount: (min) => (v) => {
    const n = Number(v);
    if (!v || isNaN(n) || n <= 0) return "Enter a valid bid amount.";
    if (n < min)        return `Minimum bid is ${formatCurrencyFull(min)}.`;
    if (n > 99_999_999) return "Bid amount is too high.";
    return null;
  },

  /** Email must not already exist in an array of users */
  uniqueEmail: (existingUsers) => (v) =>
    existingUsers.find((u) => u.email === v)
      ? "This email is already registered. Please sign in."
      : null,

  /** Checkbox must be checked (for terms agreement) */
  checked: (v) => !v ? "You must accept the terms and conditions." : null,
};

/**
 * Calculates password strength score and label.
 * @param {string} password
 * @returns {{ score: number, label: string, color: string, percent: number }}
 */
export function getPasswordStrength(password = "") {
  let score = 0;
  if (!password) return { score: 0, label: "", color: "", percent: 0 };
  if (password.length >= 8)            score++;
  if (/[A-Z]/.test(password))          score++;
  if (/[0-9]/.test(password))          score++;
  if (/[^A-Za-z0-9]/.test(password))   score++;
  if (password.length >= 12)            score++;

  const levels = [
    { label: "Very Weak", color: "#ef4444" },
    { label: "Weak",      color: "#f97316" },
    { label: "Fair",      color: "#f59e0b" },
    { label: "Good",      color: "#3b82f6" },
    { label: "Strong",    color: "#10b981" },
  ];
  const idx = Math.min(score - 1, 4);
  return {
    score,
    label:   idx >= 0 ? levels[idx].label : "",
    color:   idx >= 0 ? levels[idx].color : "",
    percent: Math.min((score / 5) * 100, 100),
  };
}

// ── 3. EXPORT / IMPORT HELPERS ───────────────────────────────

/**
 * Downloads a CSV file from an array of objects.
 * @param {Object[]} data
 * @param {string}   filename - Base filename without extension
 */
export function exportToCSV(data, filename) {
  if (!data.length) return;
  const keys    = Object.keys(data[0]);
  const csvRows = [
    keys.join(","),
    ...data.map((row) =>
      keys.map((k) => `"${String(row[k] ?? "").replace(/"/g, '""')}"`).join(",")
    ),
  ];
  _triggerDownload(new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" }), `${filename}.csv`);
}

/**
 * Downloads a JSON file.
 * @param {*}      data
 * @param {string} filename - Base filename without extension
 */
export function exportToJSON(data, filename) {
  _triggerDownload(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }), `${filename}.json`);
}

/** @private */
function _triggerDownload(blob, filename) {
  const url    = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href  = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

/**
 * Opens a styled print-ready auction report in a new window.
 * @param {CarModel[]} cars
 * @param {Object}     bidHistory
 * @param {UserModel|null} user
 */
export function printAuctionReport(cars, bidHistory, user) {
  const rows = cars.map((car) => {
    const bids = bidHistory[car.id] || [];
    return `<tr>
      <td>${car.year} ${car.make} ${car.model}</td>
      <td>${car.location}</td>
      <td>${formatCurrencyFull(car.startingBid)}</td>
      <td><strong>${formatCurrencyFull(car.currentBid)}</strong></td>
      <td>${bids.length}</td>
      <td>${bids[0]?.userName || "—"}</td>
      <td>${car.condition}</td>
      <td>${(car.mileage || 0).toLocaleString()} km</td>
    </tr>`;
  }).join("");

  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/>
<title>BidDrive — Auction Report</title>
<style>body{font-family:Georgia,serif;padding:36px;color:#0f172a;}h1{font-size:26px;color:#1d4ed8;margin-bottom:4px;}.meta{color:#64748b;font-size:13px;margin-bottom:28px;}table{width:100%;border-collapse:collapse;font-size:13px;}th{background:#1d4ed8;color:white;padding:10px 12px;text-align:left;}td{padding:9px 12px;border-bottom:1px solid #dde4f5;}tr:nth-child(even)td{background:#f0f4ff;}.footer{margin-top:36px;font-size:12px;color:#94a3b8;border-top:1px solid #dde4f5;padding-top:16px;}@media print{body{padding:20px;}}</style>
</head><body>
<h1>🏁 BidDrive — Live Auction Report</h1>
<div class="meta">Generated: ${new Date().toLocaleString("en-IN")}${user ? ` · Exported by: ${user.name}` : ""} · Listings: ${cars.length}</div>
<table><thead><tr><th>Vehicle</th><th>Location</th><th>Starting Bid</th><th>Current Bid</th><th>Bids</th><th>Leading Bidder</th><th>Condition</th><th>Mileage</th></tr></thead>
<tbody>${rows}</tbody></table>
<div class="footer">BidDrive — India's Premier Car Auction Platform · Auto-generated, for reference only.</div>
</body></html>`;

  const win = window.open("", "_blank", "width=980,height=700");
  win.document.write(html);
  win.document.close();
  win.onload = () => win.print();
}

/**
 * Parses a CSV string into an array of plain objects.
 * First row is treated as header.
 * @param {string} text - Raw CSV string
 * @returns {Object[]}
 */
export function parseCSV(text) {
  const lines   = text.split("\n").filter(Boolean);
  const headers = lines[0].split(",").map((h) => h.replace(/"/g, "").trim());
  return lines.slice(1).map((row) => {
    const values = row.split(",").map((v) => v.replace(/"/g, "").trim());
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? ""]));
  });
}

// ── 4. MISC UTILITIES ────────────────────────────────────────

/**
 * Returns a date string for filenames, e.g. "2026-05-02".
 * @returns {string}
 */
export function dateStamp() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Clamps a value between min and max (inclusive).
 * @param {number} val
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function clamp(val, min, max) {
  return Math.min(Math.max(val, min), max);
}
