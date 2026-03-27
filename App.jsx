import { useState, useEffect, useRef, useCallback } from "react";

/* ═══════════════════════════════════════════════════════════════════════════
   CONSTANTS & DATA
═══════════════════════════════════════════════════════════════════════════ */

const BRAND = "BidDrive";

const CAR_PHOTOS = {
  1: [ // BMW M3
    "https://images.unsplash.com/photo-1617531653332-bd46c16f7d5e?w=900&q=80",
    "https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=900&q=80",
    "https://images.unsplash.com/photo-1555215695-3004980ad54e?w=900&q=80",
    "https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=900&q=80",
    "https://images.unsplash.com/photo-1603584173870-7f23fdae1b7a?w=900&q=80",
    "https://images.unsplash.com/photo-1542362567-b07e54358753?w=900&q=80",
    "https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=900&q=80",
    "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=900&q=80",
    "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=900&q=80",
    "https://images.unsplash.com/photo-1502877338535-766e1452684a?w=900&q=80",
    "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=900&q=80",
    "https://images.unsplash.com/photo-1511919884226-fd3cad34687c?w=900&q=80",
    "https://images.unsplash.com/photo-1526726538690-5cbf956ae2fd?w=900&q=80",
    "https://images.unsplash.com/photo-1532581140115-3e355d1ed1de?w=900&q=80",
    "https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=900&q=80",
    "https://images.unsplash.com/photo-1612825173281-9a193378527e?w=900&q=80",
  ],
  2: [ // Toyota Land Cruiser
    "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=900&q=80",
    "https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?w=900&q=80",
    "https://images.unsplash.com/photo-1529778873920-4da4926a72c2?w=900&q=80",
    "https://images.unsplash.com/photo-1616422285623-13ff0162193c?w=900&q=80",
    "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=900&q=80",
    "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=900&q=80",
    "https://images.unsplash.com/photo-1490750967868-88df5691f2bf?w=900&q=80",
    "https://images.unsplash.com/photo-1612825173281-9a193378527e?w=900&q=80",
    "https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=900&q=80",
    "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=900&q=80",
    "https://images.unsplash.com/photo-1489824904134-891ab64532f1?w=900&q=80",
    "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=900&q=80",
    "https://images.unsplash.com/photo-1526726538690-5cbf956ae2fd?w=900&q=80",
    "https://images.unsplash.com/photo-1542362567-b07e54358753?w=900&q=80",
    "https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=900&q=80",
    "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=900&q=80",
    "https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=900&q=80",
  ],
  3: [ // Porsche 911
    "https://images.unsplash.com/photo-1611651338412-8403fa6e3599?w=900&q=80",
    "https://images.unsplash.com/photo-1503736334956-4c8f8e92946d?w=900&q=80",
    "https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=900&q=80",
    "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=900&q=80",
    "https://images.unsplash.com/photo-1555215695-3004980ad54e?w=900&q=80",
    "https://images.unsplash.com/photo-1617531653332-bd46c16f7d5e?w=900&q=80",
    "https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=900&q=80",
    "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=900&q=80",
    "https://images.unsplash.com/photo-1526726538690-5cbf956ae2fd?w=900&q=80",
    "https://images.unsplash.com/photo-1502877338535-766e1452684a?w=900&q=80",
    "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=900&q=80",
    "https://images.unsplash.com/photo-1511919884226-fd3cad34687c?w=900&q=80",
    "https://images.unsplash.com/photo-1603584173870-7f23fdae1b7a?w=900&q=80",
    "https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=900&q=80",
    "https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=900&q=80",
    "https://images.unsplash.com/photo-1532581140115-3e355d1ed1de?w=900&q=80",
    "https://images.unsplash.com/photo-1612825173281-9a193378527e?w=900&q=80",
    "https://images.unsplash.com/photo-1542362567-b07e54358753?w=900&q=80",
  ],
  4: [ // Mercedes GLE
    "https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=900&q=80",
    "https://images.unsplash.com/photo-1617531653332-bd46c16f7d5e?w=900&q=80",
    "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=900&q=80",
    "https://images.unsplash.com/photo-1489824904134-891ab64532f1?w=900&q=80",
    "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=900&q=80",
    "https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=900&q=80",
    "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=900&q=80",
    "https://images.unsplash.com/photo-1490750967868-88df5691f2bf?w=900&q=80",
    "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=900&q=80",
    "https://images.unsplash.com/photo-1529778873920-4da4926a72c2?w=900&q=80",
    "https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?w=900&q=80",
    "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=900&q=80",
    "https://images.unsplash.com/photo-1555215695-3004980ad54e?w=900&q=80",
    "https://images.unsplash.com/photo-1542362567-b07e54358753?w=900&q=80",
    "https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=900&q=80",
    "https://images.unsplash.com/photo-1502877338535-766e1452684a?w=900&q=80",
  ],
  5: [ // Audi RS7
    "https://images.unsplash.com/photo-1503736334956-4c8f8e92946d?w=900&q=80",
    "https://images.unsplash.com/photo-1611651338412-8403fa6e3599?w=900&q=80",
    "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=900&q=80",
    "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=900&q=80",
    "https://images.unsplash.com/photo-1603584173870-7f23fdae1b7a?w=900&q=80",
    "https://images.unsplash.com/photo-1532581140115-3e355d1ed1de?w=900&q=80",
    "https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=900&q=80",
    "https://images.unsplash.com/photo-1612825173281-9a193378527e?w=900&q=80",
    "https://images.unsplash.com/photo-1617531653332-bd46c16f7d5e?w=900&q=80",
    "https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=900&q=80",
    "https://images.unsplash.com/photo-1555215695-3004980ad54e?w=900&q=80",
    "https://images.unsplash.com/photo-1542362567-b07e54358753?w=900&q=80",
    "https://images.unsplash.com/photo-1511919884226-fd3cad34687c?w=900&q=80",
    "https://images.unsplash.com/photo-1526726538690-5cbf956ae2fd?w=900&q=80",
    "https://images.unsplash.com/photo-1502877338535-766e1452684a?w=900&q=80",
    "https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=900&q=80",
    "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=900&q=80",
    "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=900&q=80",
  ],
  6: [ // Ford Mustang
    "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=900&q=80",
    "https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=900&q=80",
    "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=900&q=80",
    "https://images.unsplash.com/photo-1611651338412-8403fa6e3599?w=900&q=80",
    "https://images.unsplash.com/photo-1490750967868-88df5691f2bf?w=900&q=80",
    "https://images.unsplash.com/photo-1529778873920-4da4926a72c2?w=900&q=80",
    "https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=900&q=80",
    "https://images.unsplash.com/photo-1617531653332-bd46c16f7d5e?w=900&q=80",
    "https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=900&q=80",
    "https://images.unsplash.com/photo-1555215695-3004980ad54e?w=900&q=80",
    "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=900&q=80",
    "https://images.unsplash.com/photo-1503736334956-4c8f8e92946d?w=900&q=80",
    "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=900&q=80",
    "https://images.unsplash.com/photo-1542362567-b07e54358753?w=900&q=80",
    "https://images.unsplash.com/photo-1511919884226-fd3cad34687c?w=900&q=80",
    "https://images.unsplash.com/photo-1526726538690-5cbf956ae2fd?w=900&q=80",
    "https://images.unsplash.com/photo-1532581140115-3e355d1ed1de?w=900&q=80",
    "https://images.unsplash.com/photo-1619682817481-e994891cd1f5?w=900&q=80",
  ],
};

const FAKE_USERS = [
  { id: "u1", name: "Rahul Sharma", email: "rahul@example.com", password: "pass123", avatar: "RS", city: "Mumbai", bidsPlaced: 12, wonAuctions: 3 },
  { id: "u2", name: "Priya Mehta", email: "priya@example.com", password: "pass123", avatar: "PM", city: "Delhi", bidsPlaced: 7, wonAuctions: 1 },
  { id: "u3", name: "Vikram Patel", email: "vikram@example.com", password: "pass123", avatar: "VP", city: "Bangalore", bidsPlaced: 19, wonAuctions: 5 },
];

const INITIAL_CARS = [
  {
    id: 1, make: "BMW", model: "M3 Competition", year: 2021, mileage: 18400,
    color: "Alpine White", fuel: "Petrol", transmission: "Automatic",
    condition: "Excellent", engine: "3.0L Twin-Turbo Inline-6",
    power: "503 hp", torque: "650 Nm", topSpeed: "290 km/h", acceleration: "3.9s 0-100",
    startingBid: 4200000, currentBid: 5120000,
    endTime: Date.now() + 3600 * 3 * 1000, badge: "HOT",
    seller: "Premium Auto Group", location: "Mumbai", verified: true,
    features: ["Harman Kardon Audio", "Carbon Fibre Trim", "M Sport Seats", "Head-Up Display", "Parking Assistant"],
    history: "1 Owner · Service History Available · No Accidents",
  },
  {
    id: 2, make: "Toyota", model: "Land Cruiser VX", year: 2020, mileage: 34200,
    color: "Midnight Black", fuel: "Diesel", transmission: "Automatic",
    condition: "Good", engine: "4.5L V8 Twin-Turbo Diesel",
    power: "261 hp", torque: "650 Nm", topSpeed: "210 km/h", acceleration: "8.2s 0-100",
    startingBid: 3800000, currentBid: 4480000,
    endTime: Date.now() + 3600 * 7 * 1000, badge: "POPULAR",
    seller: "CarZone Delhi", location: "Delhi", verified: true,
    features: ["7-Seater", "Panoramic Roof", "4WD with Crawl Control", "Ventilated Seats", "360° Camera"],
    history: "2 Owners · Full Toyota Service History · Minor Dent Repaired",
  },
  {
    id: 3, make: "Porsche", model: "911 Carrera S", year: 2022, mileage: 8900,
    color: "Guards Red", fuel: "Petrol", transmission: "PDK 8-Speed",
    condition: "Like New", engine: "3.0L Twin-Turbo Flat-6",
    power: "443 hp", torque: "530 Nm", topSpeed: "308 km/h", acceleration: "3.5s 0-100",
    startingBid: 8900000, currentBid: 9750000,
    endTime: Date.now() + 3600 * 1.5 * 1000, badge: "ENDING SOON",
    seller: "Luxury Rides", location: "Bangalore", verified: true,
    features: ["Sport Chrono Package", "BOSE Surround Sound", "PASM Sport Suspension", "SportDesign Package", "Burmester Audio"],
    history: "1 Owner · Porsche Approved Pre-Owned · 0 Accidents",
  },
  {
    id: 4, make: "Mercedes-Benz", model: "GLE 450 AMG", year: 2021, mileage: 27600,
    color: "Selenite Grey", fuel: "Mild Hybrid", transmission: "9G-Tronic",
    condition: "Excellent", engine: "3.0L Inline-6 EQ Boost",
    power: "367 hp", torque: "500 Nm", topSpeed: "250 km/h", acceleration: "5.7s 0-100",
    startingBid: 5800000, currentBid: 6320000,
    endTime: Date.now() + 3600 * 12 * 1000, badge: "NEW",
    seller: "Star Motors", location: "Hyderabad", verified: true,
    features: ["MBUX Infotainment", "Burmester 3D Audio", "Air Balance Package", "Panoramic Sunroof", "Distronic Plus"],
    history: "1 Owner · Mercedes-Benz Service · No Accidents",
  },
  {
    id: 5, make: "Audi", model: "RS7 Sportback", year: 2023, mileage: 4100,
    color: "Nardo Grey", fuel: "Petrol", transmission: "Tiptronic 8-Speed",
    condition: "Like New", engine: "4.0L V8 TFSI Biturbo",
    power: "591 hp", torque: "800 Nm", topSpeed: "305 km/h", acceleration: "3.6s 0-100",
    startingBid: 9500000, currentBid: 10400000,
    endTime: Date.now() + 3600 * 5 * 1000, badge: "PREMIUM",
    seller: "Quattro World", location: "Pune", verified: true,
    features: ["Bang & Olufsen 3D Premium Sound", "Matrix LED Headlights", "RS Sport Exhaust", "Ceramic Brakes", "Night Vision Assistant"],
    history: "1 Owner · Audi Approved · Full Service History · 0 Accidents",
  },
  {
    id: 6, make: "Ford", model: "Mustang Shelby GT500", year: 2020, mileage: 11200,
    color: "Grabber Blue", fuel: "Petrol", transmission: "Tremec 7-Speed",
    condition: "Excellent", engine: "5.2L Supercharged V8 Voodoo",
    power: "760 hp", torque: "847 Nm", topSpeed: "290 km/h", acceleration: "3.3s 0-100",
    startingBid: 5500000, currentBid: 6140000,
    endTime: Date.now() + 3600 * 20 * 1000, badge: "",
    seller: "Muscle Car Hub", location: "Chennai", verified: false,
    features: ["Track Package", "Recaro Seats", "Carbon Fibre Track Pack", "MagneRide Suspension", "Launch Control"],
    history: "1 Owner · Track Use Disclosed · Service History Complete",
  },
];

const SIMULATED_BIDDERS = ["Arjun K.", "Sneha R.", "Dev P.", "Kavya M.", "Rohan S.", "Ananya T.", "Nikhil B.", "Shreya G."];

function makeBid(userId, userName, amount, carId) {
  return { id: Math.random().toString(36).slice(2), userId, userName, amount, carId, time: Date.now(), timeAgo: "just now" };
}

const INITIAL_BID_HISTORY = {
  1: [
    makeBid("bot1", "Arjun K.", 5120000, 1),
    makeBid("bot2", "Sneha R.", 5050000, 1),
    makeBid("bot3", "Dev P.", 4900000, 1),
    makeBid("bot4", "Kavya M.", 4750000, 1),
  ],
  3: [
    makeBid("bot1", "Vikram P.", 9750000, 3),
    makeBid("bot2", "Neha R.", 9600000, 3),
    makeBid("bot3", "Suresh T.", 9400000, 3),
    makeBid("bot4", "Ananya T.", 9200000, 3),
  ],
  5: [
    makeBid("bot1", "Rohan S.", 10400000, 5),
    makeBid("bot2", "Nikhil B.", 10200000, 5),
    makeBid("bot3", "Shreya G.", 10000000, 5),
  ],
};

/* ═══════════════════════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════════════════════ */

function fmt(n) {
  if (n >= 10000000) return "₹" + (n / 10000000).toFixed(2) + "Cr";
  if (n >= 100000) return "₹" + (n / 100000).toFixed(1) + "L";
  return "₹" + Number(n).toLocaleString("en-IN");
}

function fmtFull(n) { return "₹" + Number(n).toLocaleString("en-IN"); }

function timeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return s + "s ago";
  if (s < 3600) return Math.floor(s / 60) + "m ago";
  return Math.floor(s / 3600) + "h ago";
}

function useCountdown(endTime) {
  const [r, setR] = useState(endTime - Date.now());
  useEffect(() => { const iv = setInterval(() => setR(endTime - Date.now()), 1000); return () => clearInterval(iv); }, [endTime]);
  if (r <= 0) return "ENDED";
  const h = Math.floor(r / 3600000), m = Math.floor((r % 3600000) / 60000), s = Math.floor((r % 60000) / 1000);
  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
}

const BADGE_STYLE = {
  "HOT": { bg: "#ef4444", color: "#fff" },
  "POPULAR": { bg: "#f59e0b", color: "#fff" },
  "ENDING SOON": { bg: "#8b5cf6", color: "#fff" },
  "NEW": { bg: "#10b981", color: "#fff" },
  "PREMIUM": { bg: "#1d4ed8", color: "#fff" },
};

/* ═══════════════════════════════════════════════════════════════════════════
   CSS STYLES
═══════════════════════════════════════════════════════════════════════════ */

const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700;800&family=DM+Sans:wght@300;400;500;600;700&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --white: #ffffff;
    --offwhite: #f8faff;
    --bg: #f0f4ff;
    --surface: #ffffff;
    --surface2: #f0f4ff;
    --border: #dde4f5;
    --border-strong: #b8c8e8;
    --blue: #1d4ed8;
    --blue-light: #3b82f6;
    --blue-pale: #eff6ff;
    --blue-mid: #dbeafe;
    --text: #0f172a;
    --text2: #334155;
    --text3: #64748b;
    --text4: #94a3b8;
    --green: #059669;
    --red: #dc2626;
    --amber: #d97706;
    --shadow-sm: 0 1px 3px rgba(0,40,120,0.08);
    --shadow: 0 4px 16px rgba(0,40,120,0.10);
    --shadow-lg: 0 12px 40px rgba(0,40,120,0.14);
    --shadow-xl: 0 24px 64px rgba(0,40,120,0.18);
    --radius: 14px;
    --radius-sm: 8px;
    --radius-lg: 20px;
    font-family: 'DM Sans', system-ui, sans-serif;
  }
  body { background: var(--bg); color: var(--text); }
  ::-webkit-scrollbar { width: 5px; height: 5px; }
  ::-webkit-scrollbar-track { background: var(--bg); }
  ::-webkit-scrollbar-thumb { background: var(--border-strong); border-radius: 3px; }
  input, select, textarea { font-family: inherit; }
  button { font-family: inherit; }
  @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
  @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
  @keyframes pulse { 0%,100%{opacity:1;} 50%{opacity:0.4;} }
  @keyframes slideIn { from{transform:translateX(100%);opacity:0;} to{transform:translateX(0);opacity:1;} }
  @keyframes toastIn { from{transform:translateX(-50%) translateY(20px);opacity:0;} to{transform:translateX(-50%) translateY(0);opacity:1;} }
  @keyframes bidFlash { 0%{background:#dbeafe;} 100%{background:transparent;} }
  .card-hover { transition: transform 0.22s ease, box-shadow 0.22s ease; }
  .card-hover:hover { transform: translateY(-5px); box-shadow: var(--shadow-xl) !important; }
  .btn-primary {
    background: linear-gradient(135deg, #1d4ed8, #2563eb);
    color: white; border: none; border-radius: var(--radius-sm);
    font-weight: 600; cursor: pointer; letter-spacing: 0.01em;
    transition: all 0.18s; font-family: 'DM Sans', sans-serif;
  }
  .btn-primary:hover { background: linear-gradient(135deg, #1e40af, #1d4ed8); transform: translateY(-1px); box-shadow: 0 6px 20px rgba(29,78,216,0.35); }
  .btn-outline {
    background: white; color: var(--blue); border: 2px solid var(--blue);
    border-radius: var(--radius-sm); font-weight: 600; cursor: pointer;
    transition: all 0.18s; font-family: 'DM Sans', sans-serif;
  }
  .btn-outline:hover { background: var(--blue-pale); }
  .btn-ghost {
    background: none; border: none; cursor: pointer; color: var(--text3);
    font-family: 'DM Sans', sans-serif; transition: color 0.15s;
  }
  .btn-ghost:hover { color: var(--blue); }
  .input-field {
    width: 100%; padding: 11px 14px; border: 1.5px solid var(--border);
    border-radius: var(--radius-sm); background: white; color: var(--text);
    font-size: 14px; outline: none; transition: border-color 0.18s, box-shadow 0.18s;
    font-family: 'DM Sans', sans-serif;
  }
  .input-field:focus { border-color: var(--blue-light); box-shadow: 0 0 0 3px rgba(59,130,246,0.15); }
  .modal-overlay {
    position: fixed; inset: 0; background: rgba(15,23,42,0.55);
    backdrop-filter: blur(4px); z-index: 1000;
    display: flex; align-items: center; justify-content: center; padding: 16px;
    animation: fadeIn 0.2s ease;
  }
  .modal-box {
    background: white; border-radius: var(--radius-lg); box-shadow: var(--shadow-xl);
    width: 100%; animation: fadeUp 0.25s ease;
  }
  .tab-btn { background: none; border: none; cursor: pointer; font-family: 'DM Sans', sans-serif; font-weight: 500; font-size: 14px; padding: 8px 0; color: var(--text3); transition: color 0.15s; position: relative; }
  .tab-btn.active { color: var(--blue); font-weight: 600; }
  .tab-btn.active::after { content:''; position:absolute; bottom:-2px; left:0; right:0; height:2px; background:var(--blue); border-radius:2px; }
  .chip { display:inline-flex; align-items:center; gap:4px; padding:4px 10px; border-radius:20px; font-size:12px; font-weight:500; white-space:nowrap; }
  .bid-row { animation: bidFlash 1.2s ease; }
  .live-dot { display:inline-block; width:8px; height:8px; border-radius:50%; background:#ef4444; animation: pulse 1.5s infinite; }
`;

/* ═══════════════════════════════════════════════════════════════════════════
   COUNTDOWN COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

function Countdown({ endTime, style = {} }) {
  const t = useCountdown(endTime);
  const urgent = endTime - Date.now() < 3600000 * 2;
  return (
    <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 13,
      color: t === "ENDED" ? "#94a3b8" : urgent ? "#dc2626" : "#1d4ed8", ...style }}>
      {t === "ENDED" ? "Ended" : `⏱ ${t}`}
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   LOGIN / REGISTER MODAL
═══════════════════════════════════════════════════════════════════════════ */

function AuthModal({ onAuth, onClose }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "", city: "" });
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  function handleSubmit() {
    setErr(""); setLoading(true);
    setTimeout(() => {
      if (mode === "login") {
        const user = FAKE_USERS.find(u => u.email === form.email && u.password === form.password);
        if (user) { onAuth(user); }
        else { setErr("Invalid email or password. Try rahul@example.com / pass123"); }
      } else {
        if (!form.name || !form.email || !form.password) { setErr("Please fill all fields."); setLoading(false); return; }
        const newUser = {
          id: "u" + Date.now(), name: form.name, email: form.email,
          password: form.password, avatar: form.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase(),
          city: form.city || "India", bidsPlaced: 0, wonAuctions: 0,
        };
        FAKE_USERS.push(newUser);
        onAuth(newUser);
      }
      setLoading(false);
    }, 800);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: 420, padding: 36 }} onClick={e => e.stopPropagation()}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🏁</div>
          <div style={{ fontFamily: "Playfair Display, serif", fontSize: 26, fontWeight: 700, color: "var(--text)" }}>{BRAND}</div>
          <div style={{ color: "var(--text3)", fontSize: 14, marginTop: 4 }}>Premium Car Auctions Platform</div>
        </div>

        <div style={{ display: "flex", gap: 24, marginBottom: 24, borderBottom: "2px solid var(--border)" }}>
          {["login", "register"].map(m => (
            <button key={m} className={`tab-btn ${mode === m ? "active" : ""}`} onClick={() => setMode(m)} style={{ textTransform: "capitalize", paddingBottom: 10 }}>
              {m === "login" ? "Sign In" : "Create Account"}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {mode === "register" && (
            <>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text2)", display: "block", marginBottom: 5 }}>Full Name</label>
                <input className="input-field" placeholder="Rahul Sharma" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text2)", display: "block", marginBottom: 5 }}>City</label>
                <input className="input-field" placeholder="Mumbai" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
              </div>
            </>
          )}
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text2)", display: "block", marginBottom: 5 }}>Email Address</label>
            <input className="input-field" type="email" placeholder="your@email.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text2)", display: "block", marginBottom: 5 }}>Password</label>
            <input className="input-field" type="password" placeholder="••••••••" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
          </div>

          {err && <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", color: "#dc2626", padding: "10px 14px", borderRadius: "var(--radius-sm)", fontSize: 13 }}>{err}</div>}

          {mode === "login" && (
            <div style={{ background: "var(--blue-pale)", border: "1px solid var(--blue-mid)", borderRadius: "var(--radius-sm)", padding: "10px 14px", fontSize: 12, color: "var(--text3)" }}>
              💡 Demo: <strong>rahul@example.com</strong> / <strong>pass123</strong>
            </div>
          )}

          <button className="btn-primary" onClick={handleSubmit} disabled={loading} style={{ padding: "13px", fontSize: 15, borderRadius: "var(--radius-sm)", marginTop: 4 }}>
            {loading ? "Please wait..." : mode === "login" ? "Sign In →" : "Create Account →"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   PHOTO GALLERY
═══════════════════════════════════════════════════════════════════════════ */

function PhotoGallery({ photos, carName, onClose }) {
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState(false);

  function prev() { setActive(a => (a - 1 + photos.length) % photos.length); }
  function next() { setActive(a => (a + 1) % photos.length); }

  useEffect(() => {
    function onKey(e) {
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="modal-overlay" style={{ alignItems: "stretch", padding: 0 }} onClick={onClose}>
      <div style={{ background: "#0a0f1e", width: "100%", height: "100%", display: "flex", flexDirection: "column", animation: "fadeIn 0.2s" }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px", borderBottom: "1px solid #1e2d4a" }}>
          <div style={{ color: "#fff", fontFamily: "Playfair Display, serif", fontWeight: 700, fontSize: 18 }}>{carName}</div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <span style={{ color: "#94a3b8", fontSize: 13 }}>{active + 1} / {photos.length}</span>
            <button onClick={onClose} style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "#fff", width: 32, height: 32, borderRadius: "50%", cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
          </div>
        </div>

        {/* Main image */}
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden", padding: "0 60px" }}>
          <button onClick={prev} style={{ position: "absolute", left: 12, zIndex: 2, background: "rgba(255,255,255,0.12)", border: "none", color: "#fff", width: 44, height: 44, borderRadius: "50%", cursor: "pointer", fontSize: 20, backdropFilter: "blur(8px)" }}>‹</button>
          <img src={photos[active]} alt={carName} onClick={() => setZoom(!zoom)}
            style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", borderRadius: 8, cursor: "zoom-in", transform: zoom ? "scale(1.5)" : "scale(1)", transition: "transform 0.3s ease", userSelect: "none" }}
            onError={e => { e.target.src = "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=900&q=80"; }}
          />
          <button onClick={next} style={{ position: "absolute", right: 12, zIndex: 2, background: "rgba(255,255,255,0.12)", border: "none", color: "#fff", width: 44, height: 44, borderRadius: "50%", cursor: "pointer", fontSize: 20, backdropFilter: "blur(8px)" }}>›</button>
        </div>

        {/* Thumbnails */}
        <div style={{ padding: "12px 16px", borderTop: "1px solid #1e2d4a", display: "flex", gap: 8, overflowX: "auto" }}>
          {photos.map((p, i) => (
            <img key={i} src={p} alt={i} onClick={() => setActive(i)}
              style={{ width: 64, height: 44, objectFit: "cover", borderRadius: 6, flexShrink: 0, cursor: "pointer",
                border: active === i ? "2px solid #3b82f6" : "2px solid transparent", opacity: active === i ? 1 : 0.55, transition: "all 0.15s" }}
              onError={e => { e.target.style.display = "none"; }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   AI ADVISOR CHAT
═══════════════════════════════════════════════════════════════════════════ */

function AIAdvisor({ car, user, onClose }) {
  const [msgs, setMsgs] = useState([{
    role: "assistant",
    content: `Hello${user ? " " + user.name.split(" ")[0] : ""}! 👋 I'm your AI Car Advisor for the **${car.year} ${car.make} ${car.model}**.\n\nCurrent bid is **${fmt(car.currentBid)}** with ${(car.endTime - Date.now()) > 0 ? "auction still live" : "auction ended"}. Ask me about fair market value, inspection checklist, bid strategy, or anything about this car!`,
  }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef();
  const inputRef = useRef();

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  const SUGGESTIONS = ["Is the current bid price fair?", "What should I inspect before buying?", "What's the resale value in 3 years?", "Any known issues with this model?"];

  async function send(text) {
    const msg = text || input.trim();
    if (!msg || loading) return;
    setInput("");
    setMsgs(p => [...p, { role: "user", content: msg }]);
    setLoading(true);

    try {
      const sys = `You are an expert used-car auction advisor for an Indian premium car auction platform called BidDrive.

Car Listing Details:
- Vehicle: ${car.year} ${car.make} ${car.model}
- Color: ${car.color} | Fuel: ${car.fuel} | Transmission: ${car.transmission}
- Engine: ${car.engine} | Power: ${car.power} | Torque: ${car.torque}
- Top Speed: ${car.topSpeed} | 0-100 km/h: ${car.acceleration}
- Mileage: ${car.mileage.toLocaleString()} km | Condition: ${car.condition}
- Key Features: ${car.features.join(", ")}
- History: ${car.history}
- Starting Bid: ${fmt(car.startingBid)} | Current Bid: ${fmt(car.currentBid)}
- Seller: ${car.seller}, ${car.location} | Verified: ${car.verified}

${user ? `User Profile: ${user.name} from ${user.city}, has placed ${user.bidsPlaced} bids, won ${user.wonAuctions} auctions.` : ""}

Guidelines:
- Use Indian Rupees (₹), refer to Indian market conditions
- Give concise practical advice (max 130 words)
- Be direct, helpful, and slightly formal
- If asked about bid strategy, give a specific recommendation
- Mention if the car seems well-priced or overpriced for the Indian market
- Format key numbers in bold using **text**`;

      const history = msgs.map(m => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content }));
const res = await fetch("http://localhost:5000/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 350,
          system: sys,
          messages: [...history, { role: "user", content: msg }],
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      const reply = data.content?.map(b => b.text || "").join("") || "Sorry, I couldn't respond right now.";
      setMsgs(p => [...p, { role: "assistant", content: reply }]);
    } catch (e) {
      setMsgs(p => [...p, { role: "assistant", content: "⚠️ Connection issue. Please try again in a moment." }]);
    }
    setLoading(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  }

  function renderMsg(content) {
    return content.split(/(\*\*[^*]+\*\*)/).map((part, i) =>
      part.startsWith("**") && part.endsWith("**")
        ? <strong key={i} style={{ color: "#1d4ed8" }}>{part.slice(2, -2)}</strong>
        : part.split("\n").map((line, j) => <span key={j}>{line}{j < part.split("\n").length - 1 ? <br /> : null}</span>)
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: 500, height: "85vh", display: "flex", flexDirection: "column", overflow: "hidden", padding: 0 }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ padding: "18px 22px", borderBottom: "1px solid var(--border)", display: "flex", gap: 14, alignItems: "center" }}>
          <div style={{ width: 44, height: 44, background: "linear-gradient(135deg, #1d4ed8, #3b82f6)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>🤖</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, color: "var(--text)", fontSize: 15 }}>AI Car Advisor</div>
            <div style={{ color: "var(--text3)", fontSize: 12 }}>{car.year} {car.make} {car.model} · {car.location}</div>
          </div>
          <button onClick={onClose} className="btn-ghost" style={{ fontSize: 22, lineHeight: 1 }}>×</button>
        </div>

        {/* Car quick stats */}
        <div style={{ padding: "12px 22px", background: "var(--blue-pale)", borderBottom: "1px solid var(--border)", display: "flex", gap: 16, overflowX: "auto" }}>
          {[["Bid", fmt(car.currentBid)], ["Power", car.power], ["0-100", car.acceleration], ["Mileage", `${(car.mileage/1000).toFixed(0)}k km`]].map(([k, v]) => (
            <div key={k} style={{ flexShrink: 0 }}>
              <div style={{ fontSize: 10, color: "var(--text4)", textTransform: "uppercase", letterSpacing: 0.5 }}>{k}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--blue)" }}>{v}</div>
            </div>
          ))}
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 22px", display: "flex", flexDirection: "column", gap: 14 }}>
          {msgs.map((m, i) => (
            <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", gap: 10 }}>
              {m.role === "assistant" && (
                <div style={{ width: 30, height: 30, background: "linear-gradient(135deg,#1d4ed8,#3b82f6)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0, marginTop: 2 }}>🤖</div>
              )}
              <div style={{
                maxWidth: "80%", padding: "11px 15px", borderRadius: m.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                background: m.role === "user" ? "linear-gradient(135deg, #1d4ed8, #2563eb)" : "#fff",
                color: m.role === "user" ? "#fff" : "var(--text)",
                fontSize: 13.5, lineHeight: 1.6,
                boxShadow: m.role === "user" ? "0 4px 14px rgba(29,78,216,0.3)" : "var(--shadow-sm)",
                border: m.role === "assistant" ? "1px solid var(--border)" : "none",
              }}>
                {renderMsg(m.content)}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ width: 30, height: 30, background: "linear-gradient(135deg,#1d4ed8,#3b82f6)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>🤖</div>
              <div style={{ padding: "11px 16px", background: "#fff", borderRadius: "18px 18px 18px 4px", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}>
                <div style={{ display: "flex", gap: 4 }}>
                  {[0, 0.2, 0.4].map(d => <div key={d} style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--blue-light)", animation: `pulse 1.2s ${d}s infinite` }} />)}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Suggestions */}
        {msgs.length < 3 && (
          <div style={{ padding: "0 22px 10px", display: "flex", gap: 6, flexWrap: "wrap" }}>
            {SUGGESTIONS.map(s => (
              <button key={s} onClick={() => send(s)} style={{ background: "var(--blue-pale)", border: "1px solid var(--blue-mid)", color: "var(--blue)", padding: "5px 11px", borderRadius: 20, fontSize: 12, cursor: "pointer", fontWeight: 500 }}>{s}</button>
            ))}
          </div>
        )}

        {/* Input */}
        <div style={{ padding: "14px 22px", borderTop: "1px solid var(--border)", display: "flex", gap: 10 }}>
          <input ref={inputRef} className="input-field" value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
            placeholder="Ask about value, inspection, bid strategy..." style={{ flex: 1 }}
          />
          <button className="btn-primary" onClick={() => send()} disabled={loading || !input.trim()} style={{ padding: "11px 18px", fontSize: 16 }}>➤</button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   BID MODAL
═══════════════════════════════════════════════════════════════════════════ */

function BidModal({ car, user, bidHistory, onClose, onConfirm }) {
  const [amount, setAmount] = useState(car.currentBid + 10000);
  const [step, setStep] = useState("form");
  const minBid = car.currentBid + 1000;
  const recentBids = (bidHistory[car.id] || []).slice(0, 5);

  if (!user) return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: 380, padding: 32, textAlign: "center" }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🔐</div>
        <div style={{ fontFamily: "Playfair Display, serif", fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Sign In to Bid</div>
        <div style={{ color: "var(--text3)", fontSize: 14, marginBottom: 24 }}>You need an account to place bids on BidDrive.</div>
        <button className="btn-primary" onClick={onClose} style={{ padding: "12px 32px", fontSize: 14 }}>Sign In / Register</button>
      </div>
    </div>
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: 460, overflow: "hidden", padding: 0 }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontFamily: "Playfair Display, serif", fontWeight: 700, fontSize: 18, color: "var(--text)" }}>
            {step === "success" ? "🎉 Bid Placed!" : step === "confirm" ? "Confirm Bid" : "Place a Bid"}
          </div>
          <button onClick={onClose} className="btn-ghost" style={{ fontSize: 24 }}>×</button>
        </div>

        <div style={{ padding: 24 }}>
          {step === "success" ? (
            <div style={{ textAlign: "center", padding: "16px 0" }}>
              <div style={{ fontSize: 64, marginBottom: 12 }}>🏆</div>
              <div style={{ fontFamily: "Playfair Display, serif", fontSize: 22, fontWeight: 700, color: "var(--green)", marginBottom: 8 }}>You're the Highest Bidder!</div>
              <div style={{ color: "var(--text2)", marginBottom: 6 }}>Your bid of <strong style={{ color: "var(--blue)" }}>{fmtFull(amount)}</strong></div>
              <div style={{ color: "var(--text3)", fontSize: 13 }}>on {car.year} {car.make} {car.model}</div>
              <div style={{ margin: "20px 0", background: "var(--blue-pale)", borderRadius: "var(--radius-sm)", padding: 14 }}>
                <div style={{ color: "var(--text3)", fontSize: 12 }}>You'll be notified if you're outbid</div>
              </div>
              <button className="btn-primary" onClick={onClose} style={{ padding: "12px 36px", fontSize: 15 }}>Done</button>
            </div>
          ) : step === "confirm" ? (
            <div>
              <div style={{ background: "var(--blue-pale)", border: "1px solid var(--blue-mid)", borderRadius: "var(--radius)", padding: 18, marginBottom: 20 }}>
                <div style={{ color: "var(--text3)", fontSize: 12, marginBottom: 2 }}>Vehicle</div>
                <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text)", marginBottom: 14 }}>{car.year} {car.make} {car.model}</div>
                <div style={{ color: "var(--text3)", fontSize: 12, marginBottom: 2 }}>Your Bid Amount</div>
                <div style={{ fontFamily: "Playfair Display, serif", fontSize: 28, fontWeight: 700, color: "var(--blue)" }}>{fmtFull(amount)}</div>
                <div style={{ color: "var(--text3)", fontSize: 12, marginTop: 4 }}>Bidding as: <strong style={{ color: "var(--text)" }}>{user.name}</strong></div>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button className="btn-outline" onClick={() => setStep("form")} style={{ flex: 1, padding: 12 }}>← Back</button>
                <button className="btn-primary" onClick={() => { onConfirm(car.id, amount, user); setStep("success"); }} style={{ flex: 2, padding: 12, fontSize: 15 }}>✓ Confirm Bid</button>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 18, background: "var(--surface2)", borderRadius: "var(--radius-sm)", padding: "14px 16px" }}>
                <div>
                  <div style={{ color: "var(--text3)", fontSize: 12 }}>Current Highest</div>
                  <div style={{ fontFamily: "Playfair Display, serif", fontSize: 22, fontWeight: 700, color: "var(--text)" }}>{fmt(car.currentBid)}</div>
                  <div style={{ color: "var(--text3)", fontSize: 12 }}>{(bidHistory[car.id] || []).length} bids · {recentBids[0]?.userName || "—"} leading</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <Countdown endTime={car.endTime} />
                  <div style={{ color: "var(--text3)", fontSize: 12, marginTop: 2 }}>Min: {fmt(minBid)}</div>
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text2)", marginBottom: 8 }}>Quick bid increments</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {[10000, 25000, 50000, 100000].map(inc => (
                    <button key={inc} onClick={() => setAmount(car.currentBid + inc)} style={{
                      flex: "1 0 calc(25% - 6px)", padding: "7px 4px", borderRadius: "var(--radius-sm)", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "DM Sans, sans-serif",
                      background: amount === car.currentBid + inc ? "var(--blue)" : "var(--surface2)",
                      color: amount === car.currentBid + inc ? "#fff" : "var(--text2)",
                      border: `1.5px solid ${amount === car.currentBid + inc ? "var(--blue)" : "var(--border)"}`,
                    }}>+{fmt(inc).replace("₹", "")}</button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text2)", display: "block", marginBottom: 6 }}>Your Bid Amount (₹)</label>
                <input type="number" value={amount} onChange={e => setAmount(Number(e.target.value))} className="input-field"
                  style={{ fontFamily: "Playfair Display, serif", fontWeight: 700, fontSize: 20, textAlign: "center" }} />
              </div>
              {amount < minBid && <div style={{ color: "var(--red)", fontSize: 12, marginBottom: 10 }}>⚠ Minimum bid is {fmtFull(minBid)}</div>}

              {recentBids.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 12, color: "var(--text3)", fontWeight: 600, marginBottom: 6 }}>Recent bid activity</div>
                  {recentBids.slice(0, 3).map((b, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 12, borderBottom: "1px solid var(--border)" }}>
                      <span style={{ color: "var(--text2)", fontWeight: 500 }}>{b.userName}</span>
                      <span style={{ color: "var(--blue)", fontWeight: 600 }}>{fmt(b.amount)}</span>
                      <span style={{ color: "var(--text4)" }}>{timeAgo(b.time)}</span>
                    </div>
                  ))}
                </div>
              )}

              <button className="btn-primary" onClick={() => setStep("confirm")} disabled={amount < minBid}
                style={{ width: "100%", padding: "14px", fontSize: 15, opacity: amount < minBid ? 0.5 : 1 }}>
                Continue → {fmtFull(amount)}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   CAR DETAIL PAGE
═══════════════════════════════════════════════════════════════════════════ */

function CarDetailPage({ car, user, bidHistory, onBack, onBid, onAI }) {
  const [photoIdx, setPhotoIdx] = useState(0);
  const [showGallery, setShowGallery] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const photos = CAR_PHOTOS[car.id] || [];
  const bids = bidHistory[car.id] || [];

  return (
    <div style={{ animation: "fadeUp 0.3s ease" }}>
      <button onClick={onBack} className="btn-ghost" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 600, color: "var(--blue)", marginBottom: 20, padding: 0 }}>
        ← Back to Listings
      </button>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 28, alignItems: "start" }}>
        {/* LEFT: Photos + Details */}
        <div>
          {/* Main photo */}
          <div style={{ position: "relative", borderRadius: "var(--radius-lg)", overflow: "hidden", aspectRatio: "16/9", background: "#e2e8f0", marginBottom: 10, cursor: "pointer" }} onClick={() => setShowGallery(true)}>
            <img src={photos[photoIdx]} alt={car.make} style={{ width: "100%", height: "100%", objectFit: "cover" }}
              onError={e => { e.target.src = "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=900&q=80"; }} />
            <div style={{ position: "absolute", bottom: 12, right: 12, background: "rgba(0,0,0,0.6)", color: "#fff", padding: "6px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600, backdropFilter: "blur(4px)" }}>
              📷 View All {photos.length} Photos
            </div>
            {car.badge && (
              <div style={{ position: "absolute", top: 12, left: 12, padding: "5px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700, ...(BADGE_STYLE[car.badge] || { bg: "#1d4ed8", color: "#fff" }), background: BADGE_STYLE[car.badge]?.bg }}>
                {car.badge}
              </div>
            )}
          </div>

          {/* Thumbnail strip */}
          <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, marginBottom: 24 }}>
            {photos.map((p, i) => (
              <img key={i} src={p} onClick={() => setPhotoIdx(i)} alt={i}
                style={{ width: 70, height: 50, objectFit: "cover", borderRadius: 8, flexShrink: 0, cursor: "pointer",
                  border: photoIdx === i ? "2.5px solid var(--blue)" : "2.5px solid transparent", opacity: photoIdx === i ? 1 : 0.65, transition: "all 0.15s" }}
                onError={e => { e.target.style.display = "none"; }}
              />
            ))}
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 28, borderBottom: "2px solid var(--border)", marginBottom: 24 }}>
            {["overview", "specs", "features", "history", "bids"].map(t => (
              <button key={t} className={`tab-btn ${activeTab === t ? "active" : ""}`} onClick={() => setActiveTab(t)} style={{ paddingBottom: 12, textTransform: "capitalize" }}>{t}</button>
            ))}
          </div>

          {activeTab === "overview" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {[
                ["Year", car.year], ["Make", car.make], ["Model", car.model],
                ["Color", car.color], ["Fuel Type", car.fuel], ["Transmission", car.transmission],
                ["Mileage", `${car.mileage.toLocaleString()} km`], ["Condition", car.condition],
                ["Seller", car.seller], ["Location", car.location],
              ].map(([k, v]) => (
                <div key={k} style={{ background: "white", borderRadius: "var(--radius-sm)", padding: "12px 16px", border: "1px solid var(--border)" }}>
                  <div style={{ fontSize: 11, color: "var(--text4)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 }}>{k}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{v}</div>
                </div>
              ))}
            </div>
          )}

          {activeTab === "specs" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {[["Engine", car.engine], ["Power Output", car.power], ["Torque", car.torque], ["Top Speed", car.topSpeed], ["0-100 km/h", car.acceleration], ["Fuel Type", car.fuel]].map(([k, v]) => (
                <div key={k} style={{ background: "white", borderRadius: "var(--radius-sm)", padding: "14px 16px", border: "1px solid var(--border)" }}>
                  <div style={{ fontSize: 11, color: "var(--text4)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 }}>{k}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "var(--blue)", fontFamily: "Playfair Display, serif" }}>{v}</div>
                </div>
              ))}
            </div>
          )}

          {activeTab === "features" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {car.features.map(f => (
                <div key={f} style={{ display: "flex", alignItems: "center", gap: 12, background: "white", borderRadius: "var(--radius-sm)", padding: "12px 16px", border: "1px solid var(--border)" }}>
                  <div style={{ width: 24, height: 24, background: "var(--blue-pale)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>✓</div>
                  <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text)" }}>{f}</span>
                </div>
              ))}
            </div>
          )}

          {activeTab === "history" && (
            <div style={{ background: "white", borderRadius: "var(--radius)", border: "1px solid var(--border)", padding: 20 }}>
              <div style={{ fontSize: 14, color: "var(--text)", lineHeight: 1.7 }}>{car.history}</div>
              <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
                {car.verified && <span className="chip" style={{ background: "#dcfce7", color: "#166534" }}>✓ Verified Seller</span>}
                <span className="chip" style={{ background: "var(--blue-pale)", color: "var(--blue)" }}>📋 History Available</span>
              </div>
            </div>
          )}

          {activeTab === "bids" && (
            <div style={{ background: "white", borderRadius: "var(--radius)", border: "1px solid var(--border)", overflow: "hidden" }}>
              <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", fontWeight: 700, fontSize: 15 }}>
                Bid History · {bids.length} bids
              </div>
              {bids.length === 0 ? (
                <div style={{ padding: 32, textAlign: "center", color: "var(--text3)" }}>No bids yet. Be the first!</div>
              ) : (
                bids.map((b, i) => (
                  <div key={b.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 20px", borderBottom: i < bids.length - 1 ? "1px solid var(--border)" : "none", background: i === 0 ? "var(--blue-pale)" : "white" }}>
                    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                      <div style={{ width: 34, height: 34, background: i === 0 ? "var(--blue)" : "var(--surface2)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: i === 0 ? "#fff" : "var(--text2)" }}>
                        {b.userName?.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{b.userName}</div>
                        <div style={{ fontSize: 11, color: "var(--text4)" }}>{timeAgo(b.time)}</div>
                      </div>
                    </div>
                    <div style={{ fontFamily: "Playfair Display, serif", fontSize: 16, fontWeight: 700, color: i === 0 ? "var(--blue)" : "var(--text2)" }}>
                      {fmt(b.amount)} {i === 0 && <span style={{ fontSize: 11, background: "var(--blue)", color: "#fff", padding: "2px 7px", borderRadius: 10, marginLeft: 6 }}>LEAD</span>}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* RIGHT: Bid Panel */}
        <div style={{ position: "sticky", top: 80 }}>
          <div style={{ background: "white", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)", boxShadow: "var(--shadow-lg)", overflow: "hidden" }}>
            <div style={{ background: "linear-gradient(135deg, #1d4ed8, #2563eb)", padding: "20px 22px" }}>
              <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 12, marginBottom: 2 }}>Current Highest Bid</div>
              <div style={{ fontFamily: "Playfair Display, serif", fontSize: 32, fontWeight: 800, color: "#fff" }}>{fmt(car.currentBid)}</div>
              <div style={{ color: "rgba(255,255,255,0.8)", fontSize: 13, marginTop: 4 }}>{bids.length} bids · Started at {fmt(car.startingBid)}</div>
            </div>

            <div style={{ padding: "16px 22px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ color: "var(--text3)", fontSize: 12 }}>Auction ends in</div>
                <Countdown endTime={car.endTime} style={{ fontSize: 16 }} />
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ color: "var(--text3)", fontSize: 12 }}>Leading bidder</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{bids[0]?.userName || "No bids yet"}</div>
              </div>
            </div>

            {/* Live bid feed */}
            {bids.length > 0 && (
              <div style={{ padding: "12px 22px", borderBottom: "1px solid var(--border)", maxHeight: 140, overflowY: "auto" }}>
                <div style={{ fontSize: 11, color: "var(--text4)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                  <span className="live-dot" /> Live Bids
                </div>
                {bids.slice(0, 6).map((b, i) => (
                  <div key={b.id} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 12 }}>
                    <span style={{ color: "var(--text2)", fontWeight: 500 }}>{b.userName}</span>
                    <span style={{ color: i === 0 ? "var(--blue)" : "var(--text3)", fontWeight: i === 0 ? 700 : 400 }}>{fmt(b.amount)}</span>
                  </div>
                ))}
              </div>
            )}

            <div style={{ padding: "18px 22px", display: "flex", flexDirection: "column", gap: 10 }}>
              <button className="btn-primary" onClick={() => onBid(car)} style={{ padding: "14px", fontSize: 16, borderRadius: "var(--radius-sm)" }}>⚡ Place Bid Now</button>
              <button onClick={() => onAI(car)} style={{ padding: "12px", fontSize: 14, borderRadius: "var(--radius-sm)", background: "var(--blue-pale)", color: "var(--blue)", border: "1.5px solid var(--blue-mid)", cursor: "pointer", fontWeight: 600, fontFamily: "DM Sans, sans-serif" }}>🤖 Ask AI Advisor</button>
            </div>

            {car.verified && (
              <div style={{ padding: "0 22px 18px", display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span className="chip" style={{ background: "#dcfce7", color: "#166534", fontSize: 11 }}>✓ Verified Seller</span>
                <span className="chip" style={{ background: "var(--blue-pale)", color: "var(--blue)", fontSize: 11 }}>🔒 Secure Escrow</span>
                <span className="chip" style={{ background: "#fef9c3", color: "#854d0e", fontSize: 11 }}>📋 Service History</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {showGallery && <PhotoGallery photos={photos} carName={`${car.year} ${car.make} ${car.model}`} onClose={() => setShowGallery(false)} />}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   CAR CARD
═══════════════════════════════════════════════════════════════════════════ */

function CarCard({ car, bidHistory, onDetail, onBid, onAI, watchlist, onWatch }) {
  const photos = CAR_PHOTOS[car.id] || [];
  const bids = bidHistory[car.id] || [];
  const isWatched = watchlist.includes(car.id);

  return (
    <div className="card-hover" style={{ background: "white", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)", boxShadow: "var(--shadow)", overflow: "hidden", cursor: "pointer" }} onClick={() => onDetail(car)}>
      {/* Photo */}
      <div style={{ position: "relative", aspectRatio: "16/10", overflow: "hidden", background: "#e2e8f0" }}>
        <img src={photos[0]} alt={car.make} style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.4s ease" }}
          onError={e => { e.target.src = "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=900&q=80"; }}
          onMouseEnter={e => e.target.style.transform = "scale(1.06)"}
          onMouseLeave={e => e.target.style.transform = "scale(1)"}
        />
        {car.badge && (
          <div style={{ position: "absolute", top: 10, left: 10, padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: BADGE_STYLE[car.badge]?.bg || "#1d4ed8", color: BADGE_STYLE[car.badge]?.color || "#fff" }}>{car.badge}</div>
        )}
        <button onClick={e => { e.stopPropagation(); onWatch(car.id); }} style={{
          position: "absolute", top: 10, right: 10, width: 32, height: 32, borderRadius: "50%",
          background: isWatched ? "var(--blue)" : "rgba(255,255,255,0.9)", border: "none",
          cursor: "pointer", fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "var(--shadow-sm)", transition: "all 0.18s",
        }}>{isWatched ? "❤️" : "🤍"}</button>
        <div style={{ position: "absolute", bottom: 10, right: 10, background: "rgba(0,0,0,0.55)", color: "#fff", fontSize: 11, padding: "3px 9px", borderRadius: 12, backdropFilter: "blur(4px)" }}>
          📷 {photos.length}
        </div>
      </div>

      <div style={{ padding: "16px 18px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
          <div>
            <div style={{ fontFamily: "Playfair Display, serif", fontWeight: 700, fontSize: 17, color: "var(--text)" }}>{car.year} {car.make}</div>
            <div style={{ color: "var(--text3)", fontSize: 14 }}>{car.model}</div>
          </div>
          {car.verified && <span style={{ fontSize: 11, color: "var(--green)", fontWeight: 600, background: "#dcfce7", padding: "2px 8px", borderRadius: 10 }}>✓ Verified</span>}
        </div>

        {/* Specs chips */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
          {[car.fuel, car.transmission, `${(car.mileage / 1000).toFixed(0)}k km`, car.condition].map(t => (
            <span key={t} className="chip" style={{ background: "var(--surface2)", color: "var(--text3)", border: "1px solid var(--border)", fontSize: 11 }}>{t}</span>
          ))}
        </div>

        {/* Bid info */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", paddingTop: 14, borderTop: "1px solid var(--border)" }}>
          <div>
            <div style={{ fontSize: 11, color: "var(--text4)" }}>Current Bid</div>
            <div style={{ fontFamily: "Playfair Display, serif", fontSize: 20, fontWeight: 700, color: "var(--text)" }}>{fmt(car.currentBid)}</div>
            <div style={{ fontSize: 11, color: "var(--text4)" }}>{bids.length} bids · {bids[0]?.userName || "No bids"}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <Countdown endTime={car.endTime} />
            <div style={{ fontSize: 11, color: "var(--text4)", marginTop: 2 }}>{car.location}</div>
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", gap: 8, marginTop: 14 }} onClick={e => e.stopPropagation()}>
          <button onClick={() => onAI(car)} style={{ flex: 1, padding: "9px", background: "var(--blue-pale)", border: "1.5px solid var(--blue-mid)", color: "var(--blue)", borderRadius: "var(--radius-sm)", fontWeight: 600, fontSize: 12, cursor: "pointer", fontFamily: "DM Sans,sans-serif" }}>🤖 AI</button>
          <button className="btn-primary" onClick={() => onBid(car)} style={{ flex: 3, padding: "9px", fontSize: 13 }}>⚡ Bid Now</button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   PROFILE PANEL
═══════════════════════════════════════════════════════════════════════════ */

function ProfilePanel({ user, bidHistory, cars, onClose, onLogout }) {
  const myBids = Object.values(bidHistory).flat().filter(b => b.userId === user.id);
  const myLeadCars = cars.filter(c => {
    const bids = bidHistory[c.id] || [];
    return bids.length > 0 && bids[0].userId === user.id;
  });

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", backdropFilter: "blur(4px)", zIndex: 900, display: "flex", justifyContent: "flex-end" }} onClick={onClose}>
      <div style={{ width: "100%", maxWidth: 400, background: "white", height: "100%", overflowY: "auto", animation: "slideIn 0.3s ease", boxShadow: "-20px 0 60px rgba(0,40,120,0.15)" }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ background: "linear-gradient(135deg, #1d4ed8, #2563eb)", padding: "28px 24px 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
              <div style={{ width: 52, height: 52, background: "rgba(255,255,255,0.2)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700, color: "#fff" }}>{user.avatar}</div>
              <div>
                <div style={{ color: "#fff", fontFamily: "Playfair Display, serif", fontWeight: 700, fontSize: 18 }}>{user.name}</div>
                <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 13 }}>{user.email}</div>
                <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 13 }}>📍 {user.city}</div>
              </div>
            </div>
            <button onClick={onClose} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", width: 30, height: 30, borderRadius: "50%", cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
          </div>
          <div style={{ display: "flex", gap: 16, marginTop: 20 }}>
            {[["Bids Placed", myBids.length], ["Auctions Won", user.wonAuctions], ["Watching", 0]].map(([k, v]) => (
              <div key={k} style={{ flex: 1, textAlign: "center" }}>
                <div style={{ fontFamily: "Playfair Display, serif", fontSize: 22, fontWeight: 700, color: "#fff" }}>{v}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.65)" }}>{k}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding: 24 }}>
          {/* Leading bids */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text)", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
              <span className="live-dot" /> Leading Bids ({myLeadCars.length})
            </div>
            {myLeadCars.length === 0 ? (
              <div style={{ color: "var(--text3)", fontSize: 13, padding: "16px", background: "var(--surface2)", borderRadius: "var(--radius-sm)", textAlign: "center" }}>You're not leading any auctions yet</div>
            ) : (
              myLeadCars.map(c => (
                <div key={c.id} style={{ background: "var(--blue-pale)", border: "1px solid var(--blue-mid)", borderRadius: "var(--radius-sm)", padding: "12px 14px", marginBottom: 8 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text)" }}>{c.year} {c.make} {c.model}</div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                    <span style={{ color: "var(--blue)", fontWeight: 700, fontSize: 15, fontFamily: "Playfair Display, serif" }}>{fmt(c.currentBid)}</span>
                    <Countdown endTime={c.endTime} />
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Bid history */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text)", marginBottom: 12 }}>My Bid History ({myBids.length})</div>
            {myBids.length === 0 ? (
              <div style={{ color: "var(--text3)", fontSize: 13, padding: "16px", background: "var(--surface2)", borderRadius: "var(--radius-sm)", textAlign: "center" }}>No bids placed yet</div>
            ) : (
              <div style={{ maxHeight: 240, overflowY: "auto" }}>
                {myBids.map((b, i) => {
                  const c = cars.find(x => x.id === b.carId);
                  return (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--border)", fontSize: 13 }}>
                      <div>
                        <div style={{ fontWeight: 600, color: "var(--text)" }}>{c ? `${c.year} ${c.make} ${c.model}` : "Unknown"}</div>
                        <div style={{ color: "var(--text4)", fontSize: 11 }}>{timeAgo(b.time)}</div>
                      </div>
                      <div style={{ fontFamily: "Playfair Display, serif", fontWeight: 700, color: "var(--blue)", fontSize: 15 }}>{fmt(b.amount)}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <button onClick={onLogout} style={{ width: "100%", padding: 12, background: "none", border: "1.5px solid #fca5a5", color: "#dc2626", borderRadius: "var(--radius-sm)", cursor: "pointer", fontWeight: 600, fontSize: 14, fontFamily: "DM Sans, sans-serif" }}>
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN APP
═══════════════════════════════════════════════════════════════════════════ */

export default function App() {
  const [cars, setCars] = useState(INITIAL_CARS);
  const [bidHistory, setBidHistory] = useState(INITIAL_BID_HISTORY);
  const [user, setUser] = useState(null);
  const [showAuth, setShowAuth] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [detailCar, setDetailCar] = useState(null);
  const [bidCar, setBidCar] = useState(null);
  const [aiCar, setAiCar] = useState(null);
  const [watchlist, setWatchlist] = useState([]);
  const [tab, setTab] = useState("live");
  const [search, setSearch] = useState("");
  const [filterFuel, setFilterFuel] = useState("all");
  const [sortBy, setSortBy] = useState("ending");
  const [toast, setToast] = useState(null);
  const [newBidNotif, setNewBidNotif] = useState(null);

  // Real-time simulation: random bids every 8-20s
  useEffect(() => {
    function simulateBid() {
      const liveCars = cars.filter(c => c.endTime > Date.now());
      if (liveCars.length === 0) return;
      const car = liveCars[Math.floor(Math.random() * liveCars.length)];
      const bidder = SIMULATED_BIDDERS[Math.floor(Math.random() * SIMULATED_BIDDERS.length)];
      const increment = [5000, 10000, 25000, 50000][Math.floor(Math.random() * 4)];
      const amount = car.currentBid + increment;
      const bid = makeBid("bot" + Math.random(), bidder, amount, car.id);

      setCars(prev => prev.map(c => c.id === car.id ? { ...c, currentBid: amount } : c));
      setBidHistory(prev => ({ ...prev, [car.id]: [bid, ...(prev[car.id] || [])] }));

      setNewBidNotif({ car: `${car.year} ${car.make} ${car.model}`, bidder, amount });
      setTimeout(() => setNewBidNotif(null), 4000);
    }

    const iv = setInterval(simulateBid, Math.random() * 12000 + 8000);
    return () => clearInterval(iv);
  }, [cars]);

  function showToast(msg, type = "success") { setToast({ msg, type }); setTimeout(() => setToast(null), 3500); }

  function handleBid(carId, amount, bidUser) {
    const bid = makeBid(bidUser.id, bidUser.name, amount, carId);
    setCars(prev => prev.map(c => c.id === carId ? { ...c, currentBid: amount } : c));
    setBidHistory(prev => ({ ...prev, [carId]: [bid, ...(prev[carId] || [])] }));
    setUser(prev => ({ ...prev, bidsPlaced: (prev?.bidsPlaced || 0) + 1 }));
    showToast(`🏆 Bid of ${fmt(amount)} placed! You're the highest bidder.`);
  }

  function toggleWatch(id) {
    setWatchlist(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  let shown = cars
    .filter(c => filterFuel === "all" || c.fuel === filterFuel)
    .filter(c => tab === "watchlist" ? watchlist.includes(c.id) : true)
    .filter(c => search === "" || `${c.make} ${c.model} ${c.year} ${c.color}`.toLowerCase().includes(search.toLowerCase()));

  if (sortBy === "ending") shown.sort((a, b) => a.endTime - b.endTime);
  else if (sortBy === "price_asc") shown.sort((a, b) => a.currentBid - b.currentBid);
  else if (sortBy === "price_desc") shown.sort((a, b) => b.currentBid - a.currentBid);
  else if (sortBy === "bids") shown.sort((a, b) => (bidHistory[b.id]?.length || 0) - (bidHistory[a.id]?.length || 0));

  const totalBids = Object.values(bidHistory).reduce((s, arr) => s + arr.length, 0);

  return (
    <>
      <style>{GLOBAL_CSS}</style>

      <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
        {/* HEADER */}
        <header style={{ background: "white", borderBottom: "1px solid var(--border)", boxShadow: "var(--shadow-sm)", position: "sticky", top: 0, zIndex: 500 }}>
          <div style={{ maxWidth: 1320, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }} onClick={() => setDetailCar(null)}>
              <div style={{ fontSize: 26 }}>🏁</div>
              <div>
                <div style={{ fontFamily: "Playfair Display, serif", fontWeight: 800, fontSize: 22, color: "var(--blue)", letterSpacing: "-0.5px" }}>{BRAND}</div>
                <div style={{ fontSize: 10, color: "var(--text4)", letterSpacing: 1, textTransform: "uppercase" }}>Premium Car Auctions</div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
              <div style={{ display: "flex", gap: 6, alignItems: "center", background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 20, padding: "6px 14px", fontSize: 12 }}>
                <span className="live-dot" />
                <span style={{ color: "var(--text3)", fontWeight: 600 }}>{cars.filter(c => c.endTime > Date.now()).length} Live</span>
              </div>
              <div style={{ fontSize: 12, color: "var(--text3)" }}>
                <strong style={{ color: "var(--text)", fontWeight: 700 }}>{totalBids}</strong> total bids
              </div>

              {user ? (
                <button onClick={() => setShowProfile(true)} style={{
                  display: "flex", alignItems: "center", gap: 10, background: "var(--blue-pale)",
                  border: "1.5px solid var(--blue-mid)", borderRadius: 24, padding: "7px 16px 7px 8px", cursor: "pointer"
                }}>
                  <div style={{ width: 30, height: 30, background: "var(--blue)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff" }}>{user.avatar}</div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--blue)" }}>{user.name.split(" ")[0]}</span>
                </button>
              ) : (
                <button className="btn-primary" onClick={() => setShowAuth(true)} style={{ padding: "9px 20px", fontSize: 13 }}>Sign In</button>
              )}
            </div>
          </div>
        </header>

        {/* MAIN */}
        <main style={{ maxWidth: 1320, margin: "0 auto", padding: "28px 24px" }}>
          {detailCar ? (
            <CarDetailPage car={detailCar} user={user} bidHistory={bidHistory}
              onBack={() => setDetailCar(null)} onBid={c => { if (!user) setShowAuth(true); else setBidCar(c); }} onAI={setAiCar} />
          ) : (
            <>
              {/* HERO STATS */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 28 }}>
                {[
                  { icon: "🏎️", label: "Live Auctions", val: cars.filter(c => c.endTime > Date.now()).length },
                  { icon: "⚡", label: "Bids Today", val: totalBids },
                  { icon: "💰", label: "Total Value", val: fmt(cars.reduce((s, c) => s + c.currentBid, 0)) },
                  { icon: "👥", label: "Active Bidders", val: new Set(Object.values(bidHistory).flat().map(b => b.userId)).size },
                ].map(s => (
                  <div key={s.label} style={{ background: "white", borderRadius: "var(--radius)", border: "1px solid var(--border)", padding: "18px 22px", boxShadow: "var(--shadow-sm)" }}>
                    <div style={{ fontSize: 22, marginBottom: 6 }}>{s.icon}</div>
                    <div style={{ fontFamily: "Playfair Display, serif", fontWeight: 700, fontSize: 24, color: "var(--text)" }}>{s.val}</div>
                    <div style={{ color: "var(--text3)", fontSize: 13 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* TOOLBAR */}
              <div style={{ background: "white", borderRadius: "var(--radius)", border: "1px solid var(--border)", padding: "16px 20px", marginBottom: 24, display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center", boxShadow: "var(--shadow-sm)" }}>
                <div style={{ display: "flex", gap: 24, borderRight: "1px solid var(--border)", paddingRight: 16 }}>
                  {[["live", "🔴 Live"], ["watchlist", "❤️ Watchlist"]].map(([k, l]) => (
                    <button key={k} className={`tab-btn ${tab === k ? "active" : ""}`} onClick={() => setTab(k)} style={{ paddingBottom: 0 }}>{l}</button>
                  ))}
                </div>
                <input className="input-field" style={{ flex: 1, minWidth: 180 }} value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍  Search make, model, year, color..." />
                <select className="input-field" style={{ width: 130 }} value={filterFuel} onChange={e => setFilterFuel(e.target.value)}>
                  <option value="all">All Fuels</option>
                  <option value="Petrol">Petrol</option>
                  <option value="Diesel">Diesel</option>
                  <option value="Mild Hybrid">Hybrid</option>
                </select>
                <select className="input-field" style={{ width: 160 }} value={sortBy} onChange={e => setSortBy(e.target.value)}>
                  <option value="ending">Ending Soonest</option>
                  <option value="price_asc">Price: Low → High</option>
                  <option value="price_desc">Price: High → Low</option>
                  <option value="bids">Most Bids</option>
                </select>
                <div style={{ color: "var(--text3)", fontSize: 13, whiteSpace: "nowrap" }}>{shown.length} cars</div>
              </div>

              {/* GRID */}
              {shown.length === 0 ? (
                <div style={{ textAlign: "center", padding: "80px 20px", color: "var(--text3)" }}>
                  <div style={{ fontSize: 56, marginBottom: 16 }}>🔍</div>
                  <div style={{ fontFamily: "Playfair Display, serif", fontSize: 20, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>No cars found</div>
                  <div>Try adjusting your filters</div>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 24 }}>
                  {shown.map(car => (
                    <CarCard key={car.id} car={car} bidHistory={bidHistory} watchlist={watchlist}
                      onDetail={setDetailCar}
                      onBid={c => { if (!user) setShowAuth(true); else setBidCar(c); }}
                      onAI={setAiCar} onWatch={toggleWatch}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </main>

        {/* FOOTER */}
        <footer style={{ background: "white", borderTop: "1px solid var(--border)", padding: "28px 24px", marginTop: 48, textAlign: "center" }}>
          <div style={{ fontFamily: "Playfair Display, serif", fontWeight: 700, fontSize: 20, color: "var(--blue)", marginBottom: 6 }}>🏁 BidDrive</div>
          <div style={{ color: "var(--text3)", fontSize: 13 }}>India's Premier Online Car Auction Platform · Secure · Verified · Real-Time</div>
          <div style={{ color: "var(--text4)", fontSize: 12, marginTop: 8 }}>© 2026 BidDrive. All rights reserved. Powered by AI.</div>
        </footer>
      </div>

      {/* MODALS */}
      {showAuth && <AuthModal onAuth={u => { setUser(u); setShowAuth(false); showToast(`Welcome back, ${u.name.split(" ")[0]}! 👋`); }} onClose={() => setShowAuth(false)} />}
      {bidCar && <BidModal car={bidCar} user={user} bidHistory={bidHistory} onClose={() => setBidCar(null)} onConfirm={handleBid} />}
      {aiCar && <AIAdvisor car={aiCar} user={user} onClose={() => setAiCar(null)} />}
      {showProfile && user && <ProfilePanel user={user} bidHistory={bidHistory} cars={cars} onClose={() => setShowProfile(false)} onLogout={() => { setUser(null); setShowProfile(false); showToast("Signed out successfully."); }} />}

      {/* LIVE BID NOTIFICATION */}
      {newBidNotif && (
        <div style={{ position: "fixed", top: 80, right: 20, background: "white", border: "1px solid var(--border)", borderLeft: "4px solid var(--blue)", borderRadius: "var(--radius-sm)", padding: "12px 16px", boxShadow: "var(--shadow-lg)", zIndex: 800, animation: "slideIn 0.3s ease", maxWidth: 300 }}>
          <div style={{ fontSize: 11, color: "var(--text4)", marginBottom: 3, display: "flex", alignItems: "center", gap: 5 }}>
            <span className="live-dot" /> New Bid
          </div>
          <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text)", marginBottom: 2 }}>{newBidNotif.bidder}</div>
          <div style={{ fontSize: 13, color: "var(--text3)" }}>bid <strong style={{ color: "var(--blue)", fontFamily: "Playfair Display, serif" }}>{fmt(newBidNotif.amount)}</strong> on {newBidNotif.car}</div>
        </div>
      )}

      {/* TOAST */}
      {toast && (
        <div style={{ position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", background: toast.type === "error" ? "#dc2626" : "var(--text)", color: "white", padding: "13px 24px", borderRadius: 30, fontWeight: 600, fontSize: 14, zIndex: 9999, boxShadow: "var(--shadow-xl)", animation: "toastIn 0.3s ease", whiteSpace: "nowrap" }}>
          {toast.msg}
        </div>
      )}
    </>
  );
}
