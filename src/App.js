import { useState, useEffect, useRef, useCallback } from "react";

/* ═══════════════════════════════════════════════════════════════════
   FIREBASE CONFIG — Replace with your project credentials
   Get from: Firebase Console → Project Settings → Your Apps
═══════════════════════════════════════════════════════════════════ */
const FIREBASE_CONFIG = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
};

/* ═══════════════════════════════════════════════════════════════════
   RAZORPAY CONFIG — Replace with your key from dashboard.razorpay.com
   Use test key (rzp_test_...) for development
═══════════════════════════════════════════════════════════════════ */
const RAZORPAY_KEY_ID = "rzp_test_YOUR_KEY_HERE";

/* ═══════════════════════════════════════════════════════════════════
   FIREBASE — Lazy-initialized singletons
   Uses dynamic import so Firebase only loads when needed
═══════════════════════════════════════════════════════════════════ */
let _db = null, _auth = null, _fbApp = null;
let _firebaseInitPromise = null;

async function initFirebase() {
  if (_db && _auth) return { db: _db, auth: _auth };
  if (_firebaseInitPromise) return _firebaseInitPromise;

  _firebaseInitPromise = (async () => {
    try {
      const { initializeApp, getApps } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js");
      const { getFirestore, collection, doc, addDoc, updateDoc, getDocs, getDoc, onSnapshot, query, orderBy, where, serverTimestamp, increment }
        = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
      const { getAuth, onAuthStateChanged, signInWithPopup, GoogleAuthProvider,
        signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, updateProfile }
        = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js");

      if (!getApps().length) {
        _fbApp = initializeApp(FIREBASE_CONFIG);
      } else {
        _fbApp = getApps()[0];
      }

      _db = getFirestore(_fbApp);
      _auth = getAuth(_fbApp);

      // Expose Firestore methods globally for use throughout the app
      window._fs = {
        db: _db, auth: _auth,
        collection, doc, addDoc, updateDoc, getDocs, getDoc,
        onSnapshot, query, orderBy, where, serverTimestamp, increment,
        signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword,
        createUserWithEmailAndPassword, signOut, updateProfile, onAuthStateChanged,
      };

      return { db: _db, auth: _auth };
    } catch (e) {
      console.warn("Firebase not configured — running in demo mode.", e.message);
      return { db: null, auth: null };
    }
  })();

  return _firebaseInitPromise;
}

/* ═══════════════════════════════════════════════════════════════════
   FIRESTORE ORM — Clean repository pattern for all DB operations
   This is the "database layer" — all CRUD goes through these methods
═══════════════════════════════════════════════════════════════════ */
const CarsRepo = {
  /** Subscribe to all cars in real-time */
  subscribe(callback) {
    if (!window._fs) return () => {};
    const { db, collection, query, orderBy, onSnapshot } = window._fs;
    const q = query(collection(db, "cars"), orderBy("endTime", "asc"));
    return onSnapshot(q, (snap) => {
      const cars = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      callback(cars);
    }, (err) => console.error("Cars subscription error:", err));
  },

  /** Get a single car by Firestore doc ID */
  async get(id) {
    if (!window._fs) return null;
    const { db, doc, getDoc } = window._fs;
    const snap = await getDoc(doc(db, "cars", String(id)));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  },

  /** Seed initial cars if collection is empty */
  async seedIfEmpty(cars) {
    if (!window._fs) return;
    const { db, collection, getDocs, addDoc } = window._fs;
    const snap = await getDocs(collection(db, "cars"));
    if (snap.empty) {
      for (const car of cars) {
        await addDoc(collection(db, "cars"), { ...car, createdAt: new Date().toISOString() });
      }
    }
  },

  /** Update currentBid and bid count atomically */
  async updateBid(carId, newBid) {
    if (!window._fs) return;
    const { db, doc, updateDoc, increment } = window._fs;
    await updateDoc(doc(db, "cars", carId), {
      currentBid: newBid,
      bidCount: increment(1),
      lastBidAt: new Date().toISOString(),
    });
  },
};

const BidsRepo = {
  /** Subscribe to bids for a car in real-time */
  subscribe(carId, callback) {
    if (!window._fs) return () => {};
    const { db, collection, query, orderBy, where, onSnapshot } = window._fs;
    const q = query(
      collection(db, "bids"),
      where("carId", "==", carId),
      orderBy("amount", "desc")
    );
    return onSnapshot(q, (snap) => {
      callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  },

  /** Get all bids grouped by carId */
  async getAll() {
    if (!window._fs) return {};
    const { db, collection, getDocs } = window._fs;
    const snap = await getDocs(collection(db, "bids"));
    const grouped = {};
    snap.docs.forEach(d => {
      const b = { id: d.id, ...d.data() };
      if (!grouped[b.carId]) grouped[b.carId] = [];
      grouped[b.carId].push(b);
    });
    Object.values(grouped).forEach(arr => arr.sort((a, b) => b.amount - a.amount));
    return grouped;
  },

  /** Create a new bid record */
  async create(bid) {
    if (!window._fs) return null;
    const { db, collection, addDoc, serverTimestamp } = window._fs;
    const ref = await addDoc(collection(db, "bids"), {
      ...bid,
      createdAt: serverTimestamp(),
      time: Date.now(),
    });
    return ref.id;
  },
};

const UsersRepo = {
  /** Get user profile from Firestore */
  async get(uid) {
    if (!window._fs) return null;
    const { db, doc, getDoc } = window._fs;
    const snap = await getDoc(doc(db, "users", uid));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  },

  /** Create or update user profile (upsert) */
  async upsert(uid, data) {
    if (!window._fs) return;
    const { db, doc, updateDoc, collection, addDoc, getDoc } = window._fs;
    const ref = doc(db, "users", uid);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      await updateDoc(ref, { ...data, updatedAt: new Date().toISOString() });
    } else {
      const { setDoc } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
      await setDoc(ref, {
        ...data,
        bidsPlaced: 0,
        wonAuctions: 0,
        verified: false,
        createdAt: new Date().toISOString(),
      });
    }
  },

  /** Increment bidsPlaced counter */
  async incrementBids(uid) {
    if (!window._fs) return;
    const { db, doc, updateDoc, increment } = window._fs;
    await updateDoc(doc(db, "users", uid), { bidsPlaced: increment(1) });
  },
};

const PaymentsRepo = {
  /** Record a payment/deposit in Firestore */
  async create(payment) {
    if (!window._fs) return null;
    const { db, collection, addDoc, serverTimestamp } = window._fs;
    const ref = await addDoc(collection(db, "payments"), {
      ...payment,
      createdAt: serverTimestamp(),
      status: "completed",
    });
    return ref.id;
  },

  /** Get payments for a user */
  async getByUser(userId) {
    if (!window._fs) return [];
    const { db, collection, query, where, getDocs, orderBy } = window._fs;
    const q = query(
      collection(db, "payments"),
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },
};

/* ═══════════════════════════════════════════════════════════════════
   FIREBASE AUTH SERVICE — Wraps all authentication operations
═══════════════════════════════════════════════════════════════════ */
const AuthService = {
  /** Sign in with Google popup — creates/updates Firestore profile */
  async googleSignIn() {
    if (!window._fs) throw new Error("Firebase not initialized");
    const { auth, signInWithPopup, GoogleAuthProvider } = window._fs;
    const provider = new GoogleAuthProvider();
    provider.addScope("profile");
    provider.addScope("email");
    const result = await signInWithPopup(auth, provider);
    const fbUser = result.user;
    const profile = {
      name: fbUser.displayName || "User",
      email: fbUser.email,
      avatar: (fbUser.displayName || "U").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase(),
      photoURL: fbUser.photoURL || null,
      city: "",
      phone: "",
      provider: "google",
    };
    await UsersRepo.upsert(fbUser.uid, profile);
    return { uid: fbUser.uid, ...profile };
  },

  /** Email/password sign-in */
  async emailSignIn(email, password) {
    if (!window._fs) throw new Error("Firebase not initialized");
    const { auth, signInWithEmailAndPassword } = window._fs;
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const profile = await UsersRepo.get(cred.user.uid);
    return { uid: cred.user.uid, ...profile };
  },

  /** Register new account */
  async register({ name, email, password, phone, city }) {
    if (!window._fs) throw new Error("Firebase not initialized");
    const { auth, createUserWithEmailAndPassword, updateProfile } = window._fs;
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: name });
    const profile = {
      name, email, phone, city,
      avatar: name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase(),
      provider: "email",
    };
    await UsersRepo.upsert(cred.user.uid, profile);
    return { uid: cred.user.uid, id: cred.user.uid, ...profile };
  },

  /** Sign out */
  async signOut() {
    if (!window._fs) return;
    await window._fs.signOut(window._fs.auth);
  },

  /** Subscribe to auth state changes */
  onAuthChange(callback) {
    if (!window._fs) { callback(null); return () => {}; }
    return window._fs.onAuthStateChanged(window._fs.auth, async (fbUser) => {
      if (fbUser) {
        const profile = await UsersRepo.get(fbUser.uid);
        callback(profile ? { uid: fbUser.uid, id: fbUser.uid, ...profile } : null);
      } else {
        callback(null);
      }
    });
  },
};

/* ═══════════════════════════════════════════════════════════════════
   RAZORPAY PAYMENT SERVICE
   Bid deposits: user pays 2% of bid amount as refundable security
═══════════════════════════════════════════════════════════════════ */
const RazorpayService = {
  /** Dynamically load Razorpay SDK */
  async loadScript() {
    if (window.Razorpay) return true;
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.head.appendChild(script);
    });
  },

  /**
   * Open Razorpay checkout for bid deposit
   * @param {object} options - { amount, bidAmount, car, user }
   * @returns {Promise<{paymentId, orderId}>}
   *
   * IMPORTANT: In production, create Razorpay orders on your backend:
   * POST /api/create-order → { id, amount, currency }
   * Then pass that order ID here. For demo, we use client-side checkout.
   */
  async collectDeposit({ amount, bidAmount, car, user }) {
    const loaded = await this.loadScript();
    if (!loaded) throw new Error("Razorpay SDK failed to load. Check your network.");

    const depositAmount = Math.round(amount * 0.02); // 2% deposit
    const depositPaise = depositAmount * 100;        // Razorpay uses paise

    return new Promise((resolve, reject) => {
      const options = {
        key: RAZORPAY_KEY_ID,
        amount: depositPaise,
        currency: "INR",
        name: "BidDrive",
        description: `Bid Deposit — ${car.year} ${car.make} ${car.model}`,
        image: "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=100&q=80",
        prefill: {
          name: user.name,
          email: user.email,
          contact: user.phone || "",
        },
        notes: {
          carId: String(car.id),
          carName: `${car.year} ${car.make} ${car.model}`,
          bidAmount: String(bidAmount),
          depositAmount: String(depositAmount),
          userId: user.uid || user.id,
        },
        theme: { color: "#1d4ed8" },
        modal: {
          ondismiss: () => reject(new Error("Payment cancelled by user.")),
        },
        handler: async (response) => {
          // Record successful payment in Firestore
          try {
            const paymentId = await PaymentsRepo.create({
              razorpayPaymentId: response.razorpay_payment_id,
              razorpayOrderId: response.razorpay_order_id || "demo_" + Date.now(),
              razorpaySignature: response.razorpay_signature || "",
              userId: user.uid || user.id,
              userName: user.name,
              carId: String(car.id),
              carName: `${car.year} ${car.make} ${car.model}`,
              bidAmount,
              depositAmount,
              currency: "INR",
            });
            resolve({
              paymentId: response.razorpay_payment_id,
              firestoreId: paymentId,
              depositAmount,
            });
          } catch (e) {
            // Payment succeeded, Firestore recording failed — still resolve
            resolve({
              paymentId: response.razorpay_payment_id,
              depositAmount,
            });
          }
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", (resp) => {
        reject(new Error(resp.error?.description || "Payment failed"));
      });
      rzp.open();
    });
  },
};

/* ═══════════════════════════════════════════════════════════════════
   GLOBAL STYLES
═══════════════════════════════════════════════════════════════════ */
const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700;800;900&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --white: #ffffff;
  --bg: #f0f4ff;
  --surface: #ffffff;
  --surface2: #f0f4ff;
  --border: #dde4f5;
  --border-strong: #b8c8e8;
  --blue: #1d4ed8;
  --blue-hover: #1e40af;
  --blue-light: #3b82f6;
  --blue-pale: #eff6ff;
  --blue-mid: #dbeafe;
  --text: #0f172a;
  --text2: #334155;
  --text3: #64748b;
  --text4: #94a3b8;
  --green: #059669;
  --green-pale: #dcfce7;
  --red: #dc2626;
  --red-pale: #fef2f2;
  --amber: #d97706;
  --amber-pale: #fffbeb;
  --shadow-xs: 0 1px 2px rgba(0,40,120,0.06);
  --shadow-sm: 0 1px 4px rgba(0,40,120,0.08);
  --shadow: 0 4px 16px rgba(0,40,120,0.10);
  --shadow-lg: 0 12px 40px rgba(0,40,120,0.14);
  --shadow-xl: 0 24px 64px rgba(0,40,120,0.18);
  --radius-xs: 6px;
  --radius-sm: 8px;
  --radius: 12px;
  --radius-lg: 18px;
  --radius-xl: 24px;
  --font-display: 'Playfair Display', Georgia, serif;
  --font-body: 'DM Sans', system-ui, sans-serif;
  --header-h: 64px;
  font-family: var(--font-body);
}

html { scroll-behavior: smooth; }
body { background: var(--bg); color: var(--text); -webkit-font-smoothing: antialiased; }

::-webkit-scrollbar { width: 5px; height: 5px; }
::-webkit-scrollbar-track { background: var(--bg); }
::-webkit-scrollbar-thumb { background: var(--border-strong); border-radius: 3px; }

@keyframes fadeUp   { from { opacity:0; transform:translateY(18px); } to { opacity:1; transform:translateY(0); } }
@keyframes fadeIn   { from { opacity:0; } to { opacity:1; } }
@keyframes fadeDown { from { opacity:0; transform:translateY(-10px); } to { opacity:1; transform:translateY(0); } }
@keyframes slideRight { from { transform:translateX(100%); opacity:0; } to { transform:translateX(0); opacity:1; } }
@keyframes pulse    { 0%,100%{opacity:1;} 50%{opacity:.35;} }
@keyframes shake    { 0%,100%{transform:translateX(0);} 20%,60%{transform:translateX(-5px);} 40%,80%{transform:translateX(5px);} }
@keyframes toastIn  { from{transform:translateX(-50%) translateY(20px);opacity:0;} to{transform:translateX(-50%) translateY(0);opacity:1;} }
@keyframes notifIn  { from{transform:translateX(120%);opacity:0;} to{transform:translateX(0);opacity:1;} }
@keyframes spin     { to { transform:rotate(360deg); } }

.btn { font-family:var(--font-body); font-weight:600; cursor:pointer; border:none; display:inline-flex; align-items:center; justify-content:center; gap:6px; transition:all .18s ease; white-space:nowrap; }
.btn:disabled { opacity:.5; cursor:not-allowed; pointer-events:none; }
.btn-primary { background:linear-gradient(135deg,#1d4ed8,#2563eb); color:#fff; border-radius:var(--radius-sm); }
.btn-primary:hover:not(:disabled) { background:linear-gradient(135deg,#1e40af,#1d4ed8); transform:translateY(-1px); box-shadow:0 6px 20px rgba(29,78,216,.3); }
.btn-primary:active { transform:translateY(0); }
.btn-outline { background:white; color:var(--blue); border:2px solid var(--blue); border-radius:var(--radius-sm); }
.btn-outline:hover:not(:disabled) { background:var(--blue-pale); }
.btn-ghost { background:none; border:none; color:var(--text3); border-radius:var(--radius-sm); }
.btn-ghost:hover { color:var(--blue); background:var(--blue-pale); }
.btn-danger { background:none; color:var(--red); border:1.5px solid #fca5a5; border-radius:var(--radius-sm); }
.btn-danger:hover { background:var(--red-pale); }
.btn-green { background:linear-gradient(135deg,#059669,#10b981); color:#fff; border-radius:var(--radius-sm); }
.btn-green:hover:not(:disabled) { background:linear-gradient(135deg,#047857,#059669); transform:translateY(-1px); box-shadow:0 6px 20px rgba(5,150,105,.3); }
.btn-google { background:white; color:#3c4043; border:1.5px solid #dadce0; border-radius:var(--radius-sm); font-weight:600; }
.btn-google:hover { background:#f8f9fa; box-shadow:0 2px 8px rgba(0,0,0,.1); }
.btn-sm  { padding:7px 14px; font-size:13px; }
.btn-md  { padding:11px 20px; font-size:14px; }
.btn-lg  { padding:14px 28px; font-size:15px; }
.btn-xl  { padding:16px 36px; font-size:16px; }
.btn-icon{ width:36px; height:36px; padding:0; border-radius:50%; font-size:16px; }

.field-group { display:flex; flex-direction:column; gap:5px; }
.field-label { font-size:13px; font-weight:600; color:var(--text2); }
.field-label .req { color:var(--red); margin-left:2px; }
.field-input {
  width:100%; padding:11px 14px; border:1.5px solid var(--border);
  border-radius:var(--radius-sm); background:white; color:var(--text);
  font-size:14px; font-family:var(--font-body); outline:none;
  transition:border-color .18s, box-shadow .18s;
}
.field-input::placeholder { color:var(--text4); }
.field-input:focus { border-color:var(--blue-light); box-shadow:0 0 0 3px rgba(59,130,246,.15); }
.field-input.error { border-color:var(--red); box-shadow:0 0 0 3px rgba(220,38,38,.1); animation:shake .35s ease; }
.field-input.success { border-color:var(--green); }
.field-error { font-size:12px; color:var(--red); display:flex; align-items:center; gap:4px; }
.field-hint  { font-size:12px; color:var(--text4); }
.field-strength { height:3px; border-radius:2px; background:var(--border); margin-top:4px; overflow:hidden; }
.field-strength-bar { height:100%; border-radius:2px; transition:width .4s, background .4s; }

.card { background:white; border-radius:var(--radius-lg); border:1px solid var(--border); box-shadow:var(--shadow); overflow:hidden; }
.card-hover { transition:transform .22s ease, box-shadow .22s ease; }
.card-hover:hover { transform:translateY(-5px); box-shadow:var(--shadow-xl); }

.modal-overlay {
  position:fixed; inset:0; background:rgba(15,23,42,.55);
  backdrop-filter:blur(5px); z-index:1000;
  display:flex; align-items:center; justify-content:center; padding:12px;
  animation:fadeIn .2s ease;
}
.modal-box { background:white; border-radius:var(--radius-xl); box-shadow:var(--shadow-xl); width:100%; animation:fadeUp .25s ease; overflow:hidden; }

.chip { display:inline-flex; align-items:center; gap:4px; padding:3px 10px; border-radius:20px; font-size:11px; font-weight:600; white-space:nowrap; }
.badge { display:inline-flex; align-items:center; padding:4px 10px; border-radius:20px; font-size:11px; font-weight:700; white-space:nowrap; }
.live-dot { display:inline-block; width:7px; height:7px; border-radius:50%; background:#ef4444; animation:pulse 1.4s infinite; flex-shrink:0; }

.tab-bar { display:flex; gap:0; border-bottom:2px solid var(--border); }
.tab-btn { background:none; border:none; cursor:pointer; font-family:var(--font-body); font-weight:500; font-size:14px; padding:10px 16px; color:var(--text3); transition:color .15s; position:relative; white-space:nowrap; }
.tab-btn.active { color:var(--blue); font-weight:700; }
.tab-btn.active::after { content:''; position:absolute; bottom:-2px; left:0; right:0; height:2px; background:var(--blue); border-radius:2px; }

.container { max-width:1320px; margin:0 auto; padding:0 16px; }
@media(min-width:640px)  { .container { padding:0 24px; } }
@media(min-width:1024px) { .container { padding:0 32px; } }

.grid-cards { display:grid; grid-template-columns:1fr; gap:20px; }
@media(min-width:480px)  { .grid-cards { grid-template-columns:repeat(2,1fr); gap:16px; } }
@media(min-width:768px)  { .grid-cards { grid-template-columns:repeat(2,1fr); gap:20px; } }
@media(min-width:1100px) { .grid-cards { grid-template-columns:repeat(3,1fr); gap:24px; } }

.grid-detail { display:grid; grid-template-columns:1fr; gap:24px; }
@media(min-width:900px) { .grid-detail { grid-template-columns:1fr 360px; } }
@media(min-width:1100px){ .grid-detail { grid-template-columns:1fr 400px; } }

.grid-stats { display:grid; grid-template-columns:repeat(2,1fr); gap:12px; }
@media(min-width:640px) { .grid-stats { grid-template-columns:repeat(4,1fr); } }

.grid-specs { display:grid; grid-template-columns:1fr 1fr; gap:10px; }

.toolbar { display:flex; flex-direction:column; gap:10px; }
@media(min-width:768px) { .toolbar { flex-direction:row; align-items:center; flex-wrap:wrap; } }

.header-inner { display:flex; align-items:center; justify-content:space-between; height:var(--header-h); gap:12px; }
.header-right { display:flex; align-items:center; gap:8px; }
.header-stat { display:none; }
@media(min-width:600px) { .header-stat { display
:flex; } }
.nav-brand-sub { display:none; }
@media(min-width:420px) { .nav-brand-sub { display:block; } }

.mobile-nav { display:flex; position:fixed; bottom:0; left:0; right:0; background:white; border-top:1px solid var(--border); z-index:400; padding:6px 0 env(safe-area-inset-bottom,8px); }
@media(min-width:640px) { .mobile-nav { display:none; } }
.mobile-nav-btn { flex:1; display:flex; flex-direction:column; align-items:center; gap:2px; padding:6px 4px; background:none; border:none; cursor:pointer; font-family:var(--font-body); font-size:10px; font-weight:500; color:var(--text3); transition:color .15s; }
.mobile-nav-btn.active { color:var(--blue); }
.mobile-nav-btn .icon { font-size:20px; }

.page-content { padding-bottom:24px; }
@media(max-width:639px) { .page-content { padding-bottom:90px; } }

.thumb-strip { display:flex; gap:7px; overflow-x:auto; padding-bottom:4px; }
.thumb-strip::-webkit-scrollbar { height:3px; }

.profile-panel { width:100%; max-width:420px; }
@media(max-width:480px) { .profile-panel { max-width:100%; } }

.bid-modal { max-width:460px; }
@media(max-width:480px) { .bid-modal { border-radius:var(--radius-lg) var(--radius-lg) 0 0; margin-top:auto; } }

.export-modal { max-width:560px; }
.ai-modal { max-width:500px; height:88vh; max-height:680px; }
@media(max-width:540px) { .ai-modal { height:100vh; max-height:none; border-radius:0; } }
.auth-modal { max-width:430px; }

.gallery-overlay { position:fixed; inset:0; background:#050a14; z-index:1100; display:flex; flex-direction:column; animation:fadeIn .2s; }

/* Payment badge */
.payment-badge { display:inline-flex; align-items:center; gap:4px; padding:4px 10px; background:#f0fdf4; border:1px solid #86efac; border-radius:20px; font-size:11px; font-weight:700; color:#166534; }
.razorpay-badge { display:inline-flex; align-items:center; gap:5px; padding:5px 12px; background:white; border:1px solid var(--border); border-radius:20px; font-size:11px; color:var(--text3); }

@media print {
  .no-print { display:none !important; }
  body { background:white; }
  .card { box-shadow:none; border:1px solid #ccc; }
  .modal-overlay, .mobile-nav, header { display:none !important; }
}
.print-only { display:none; }

.sr-only { position:absolute; width:1px; height:1px; overflow:hidden; clip:rect(0,0,0,0); }
.truncate { overflow:hidden; white-space:nowrap; text-overflow:ellipsis; }
.flex { display:flex; }
.items-center { align-items:center; }
.justify-between { justify-content:space-between; }
.gap-4 { gap:4px; }
.gap-8 { gap:8px; }
.gap-12 { gap:12px; }
.wrap { flex-wrap:wrap; }
.w-full { width:100%; }
.mt-auto { margin-top:auto; }

/* Firebase status indicator */
.fb-status { display:flex; align-items:center; gap:5px; font-size:11px; font-weight:600; padding:3px 10px; border-radius:20px; }
.fb-status.live { background:#dcfce7; color:#166534; }
.fb-status.demo { background:#fffbeb; color:#92400e; }
`;

/* ═══════════════════════════════════════════════════════════════════
   STATIC DATA — Seeds Firestore on first run
═══════════════════════════════════════════════════════════════════ */
const SIMULATED_BIDDERS = ["Arjun K.","Sneha R.","Dev P.","Kavya M.","Rohan S.","Ananya T.","Nikhil B.","Shreya G.","Manish V.","Pooja S."];
const BADGE_STYLE = { "HOT":{bg:"#ef4444",color:"#fff"}, "POPULAR":{bg:"#f59e0b",color:"#fff"}, "ENDING SOON":{bg:"#7c3aed",color:"#fff"}, "NEW":{bg:"#10b981",color:"#fff"}, "PREMIUM":{bg:"#1d4ed8",color:"#fff"} };

const CAR_PHOTOS = {
  1:["https://images.unsplash.com/photo-1617531653332-bd46c16f7d5e?w=900&q=80","https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=900&q=80","https://images.unsplash.com/photo-1555215695-3004980ad54e?w=900&q=80","https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=900&q=80","https://images.unsplash.com/photo-1603584173870-7f23fdae1b7a?w=900&q=80"],
  2:["https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=900&q=80","https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?w=900&q=80","https://images.unsplash.com/photo-1529778873920-4da4926a72c2?w=900&q=80","https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=900&q=80","https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=900&q=80"],
  3:["https://images.unsplash.com/photo-1611651338412-8403fa6e3599?w=900&q=80","https://images.unsplash.com/photo-1503736334956-4c8f8e92946d?w=900&q=80","https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=900&q=80","https://images.unsplash.com/photo-1555215695-3004980ad54e?w=900&q=80","https://images.unsplash.com/photo-1617531653332-bd46c16f7d5e?w=900&q=80"],
  4:["https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=900&q=80","https://images.unsplash.com/photo-1617531653332-bd46c16f7d5e?w=900&q=80","https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=900&q=80","https://images.unsplash.com/photo-1489824904134-891ab64532f1?w=900&q=80","https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=900&q=80"],
  5:["https://images.unsplash.com/photo-1503736334956-4c8f8e92946d?w=900&q=80","https://images.unsplash.com/photo-1611651338412-8403fa6e3599?w=900&q=80","https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=900&q=80","https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=900&q=80","https://images.unsplash.com/photo-1603584173870-7f23fdae1b7a?w=900&q=80"],
  6:["https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=900&q=80","https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=900&q=80","https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=900&q=80","https://images.unsplash.com/photo-1490750967868-88df5691f2bf?w=900&q=80","https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=900&q=80"],
};

const SEED_CARS = [
  { numId:1, make:"BMW", model:"M3 Competition", year:2021, mileage:18400, color:"Alpine White", fuel:"Petrol", transmission:"Automatic", condition:"Excellent", engine:"3.0L Twin-Turbo I6", power:"503 hp", torque:"650 Nm", topSpeed:"290 km/h", acceleration:"3.9s", startingBid:4200000, currentBid:5120000, endTime:Date.now()+10800000, badge:"HOT", seller:"Premium Auto Group", location:"Mumbai", verified:true, features:["Harman Kardon Audio","Carbon Fibre Trim","M Sport Seats","Head-Up Display","Parking Assistant Plus"], history:"1 Owner · Full Service History · No Accidents", bidCount:4 },
  { numId:2, make:"Toyota", model:"Land Cruiser VX", year:2020, mileage:34200, color:"Midnight Black", fuel:"Diesel", transmission:"Automatic", condition:"Good", engine:"4.5L V8 Twin-Turbo D", power:"261 hp", torque:"650 Nm", topSpeed:"210 km/h", acceleration:"8.2s", startingBid:3800000, currentBid:4480000, endTime:Date.now()+25200000, badge:"POPULAR", seller:"CarZone Delhi", location:"Delhi", verified:true, features:["7-Seater","Panoramic Roof","4WD Crawl Control","Ventilated Seats","360° Camera"], history:"2 Owners · Toyota Service History · Minor Repair", bidCount:2 },
  { numId:3, make:"Porsche", model:"911 Carrera S", year:2022, mileage:8900, color:"Guards Red", fuel:"Petrol", transmission:"PDK 8-Speed", condition:"Like New", engine:"3.0L Twin-Turbo Flat-6", power:"443 hp", torque:"530 Nm", topSpeed:"308 km/h", acceleration:"3.5s", startingBid:8900000, currentBid:9750000, endTime:Date.now()+5400000, badge:"ENDING SOON", seller:"Luxury Rides", location:"Bangalore", verified:true, features:["Sport Chrono Package","BOSE Surround","PASM Sport","SportDesign Package","Burmester Audio"], history:"1 Owner · Porsche Approved · 0 Accidents", bidCount:3 },
  { numId:4, make:"Mercedes-Benz", model:"GLE 450 AMG", year:2021, mileage:27600, color:"Selenite Grey", fuel:"Mild Hybrid", transmission:"9G-Tronic", condition:"Excellent", engine:"3.0L I6 EQ Boost", power:"367 hp", torque:"500 Nm", topSpeed:"250 km/h", acceleration:"5.7s", startingBid:5800000, currentBid:6320000, endTime:Date.now()+43200000, badge:"NEW", seller:"Star Motors", location:"Hyderabad", verified:true, features:["MBUX Infotainment","Burmester 3D Audio","Air Balance","Panoramic Sunroof","Distronic Plus"], history:"1 Owner · MB Service · No Accidents", bidCount:0 },
  { numId:5, make:"Audi", model:"RS7 Sportback", year:2023, mileage:4100, color:"Nardo Grey", fuel:"Petrol", transmission:"Tiptronic 8-Spd", condition:"Like New", engine:"4.0L V8 TFSI Biturbo", power:"591 hp", torque:"800 Nm", topSpeed:"305 km/h", acceleration:"3.6s", startingBid:9500000, currentBid:10400000, endTime:Date.now()+18000000, badge:"PREMIUM", seller:"Quattro World", location:"Pune", verified:true, features:["Bang & Olufsen 3D Sound","Matrix LED","RS Sport Exhaust","Ceramic Brakes","Night Vision"], history:"1 Owner · Audi Approved · 0 Accidents", bidCount:3 },
  { numId:6, make:"Ford", model:"Mustang GT500", year:2020, mileage:11200, color:"Grabber Blue", fuel:"Petrol", transmission:"Tremec 7-Speed", condition:"Excellent", engine:"5.2L Supercharged V8", power:"760 hp", torque:"847 Nm", topSpeed:"290 km/h", acceleration:"3.3s", startingBid:5500000, currentBid:6140000, endTime:Date.now()+72000000, badge:"", seller:"Muscle Car Hub", location:"Chennai", verified:false, features:["Track Package","Recaro Seats","Carbon Track Pack","MagneRide","Launch Control"], history:"1 Owner · Track Use Noted · Full Service", bidCount:0 },
];

/* ═══════════════════════════════════════════════════════════════════
   HELPERS & HOOKS
═══════════════════════════════════════════════════════════════════ */
const fmt = n => { if(n>=10000000) return "₹"+(n/10000000).toFixed(2)+"Cr"; if(n>=100000) return "₹"+(n/100000).toFixed(1)+"L"; return "₹"+Number(n).toLocaleString("en-IN"); };
const fmtFull = n => "₹"+Number(n).toLocaleString("en-IN");
const timeAgo = ts => { const s=Math.floor((Date.now()-ts)/1000); if(s<60)return s+"s ago"; if(s<3600)return Math.floor(s/60)+"m ago"; return Math.floor(s/3600)+"h ago"; };
const fallbackImg = "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=900&q=80";

function useCountdown(endTime) {
  const [r,setR] = useState(endTime-Date.now());
  useEffect(()=>{ const iv=setInterval(()=>setR(endTime-Date.now()),1000); return()=>clearInterval(iv); },[endTime]);
  if(r<=0) return "ENDED";
  const h=Math.floor(r/3600000), m=Math.floor((r%3600000)/60000), s=Math.floor((r%60000)/1000);
  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
}

function Countdown({endTime,style={}}) {
  const t = useCountdown(endTime);
  const urgent = endTime-Date.now()<7200000;
  return <span style={{fontFamily:"monospace",fontWeight:700,fontSize:13,color:t==="ENDED"?"var(--text4)":urgent?"var(--red)":"var(--blue)",...style}}>{t==="ENDED"?"Ended":`⏱ ${t}`}</span>;
}

/* ═══════════════════════════════════════════════════════════════════
   FORM VALIDATION ENGINE
═══════════════════════════════════════════════════════════════════ */
const VALIDATORS = {
  required: v => !v?.toString().trim() ? "This field is required." : null,
  email: v => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? "Enter a valid email address." : null,
  phone: v => !/^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/.test(v?.replace(/\s/g,"")) ? "Enter a valid phone number." : null,
  name: v => !/^[a-zA-Z\s]{2,50}$/.test(v) ? "Name must be 2-50 letters only." : null,
  city: v => !/^[a-zA-Z\s]{2,30}$/.test(v) ? "Enter a valid city name." : null,
  password: v => {
    if(!v||v.length<8) return "Password must be at least 8 characters.";
    if(!/[A-Z]/.test(v)) return "Must contain at least one uppercase letter.";
    if(!/[0-9]/.test(v)) return "Must contain at least one number.";
    if(!/[^A-Za-z0-9]/.test(v)) return "Must contain at least one special character.";
    return null;
  },
  bidAmount: (min) => v => { const n=Number(v); if(!n||isNaN(n)) return "Enter a valid amount."; if(n<min) return `Minimum bid is ${fmtFull(min)}.`; return null; },
};

function passwordStrength(pwd) {
  let score = 0;
  if(!pwd) return { score:0, label:"", color:"", pct:0 };
  if(pwd.length>=8) score++;
  if(/[A-Z]/.test(pwd)) score++;
  if(/[0-9]/.test(pwd)) score++;
  if(/[^A-Za-z0-9]/.test(pwd)) score++;
  if(pwd.length>=12) score++;
  const levels = [{label:"Very Weak",color:"#ef4444"},{label:"Weak",color:"#f97316"},{label:"Fair",color:"#f59e0b"},{label:"Good",color:"#3b82f6"},{label:"Strong",color:"#10b981"}];
  return { score, label:levels[Math.min(score-1,4)]?.label||"", color:levels[Math.min(score-1,4)]?.color||"", pct:Math.min(score/5*100,100) };
}

function useForm(initialValues, rules) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const rulesRef = useRef(rules);
  rulesRef.current = rules;

  const validate = useCallback((vals) => {
    const errs = {};
    Object.entries(rulesRef.current).forEach(([field, fns]) => {
      for(const fn of fns) {
        const err = fn(vals[field]);
        if(err) { errs[field]=err; break; }
      }
    });
    return errs;
  }, []);

  const set = (field, val) => {
    const newVals = {...values, [field]:val};
    setValues(newVals);
    if(touched[field]) {
      const errs = {};
      (rulesRef.current[field]||[]).forEach(fn => { const e=fn(newVals[field]); if(e&&!errs[field]) errs[field]=e; });
      setErrors(prev => ({...prev, [field]:errs[field]||null}));
    }
  };

  const touch = (field) => {
    setTouched(prev => ({...prev,[field]:true}));
    const errs = {};
    (rulesRef.current[field]||[]).forEach(fn => { const e=fn(values[field]); if(e&&!errs[field]) errs[field]=e; });
    setErrors(prev => ({...prev,[field]:errs[field]||null}));
  };

  const submit = () => {
    const allTouched = Object.fromEntries(Object.keys(rulesRef.current).map(k=>[k,true]));
    setTouched(allTouched);
    const errs = validate(values);
    setErrors(errs);
    return Object.keys(errs).length===0;
  };

  const reset = () => { setValues(initialValues); setErrors({}); setTouched({}); };

  return { values, errors, touched, set, touch, submit, reset };
}

/* ═══════════════════════════════════════════════════════════════════
   FIELD COMPONENT
═══════════════════════════════════════════════════════════════════ */
function Field({ label, required, hint, error, success, children, style }) {
  return (
    <div className="field-group" style={style}>
      {label && <label className="field-label">{label}{required && <span className="req">*</span>}</label>}
      {children}
      {error   && <span className="field-error">⚠ {error}</span>}
      {!error && success && <span style={{fontSize:12,color:"var(--green)",display:"flex",alignItems:"center",gap:4}}>✓ {success}</span>}
      {!error && hint && <span className="field-hint">{typeof hint==="string"?hint:hint}</span>}
    </div>
  );
}

function Input({ field, form, type="text", placeholder, ...rest }) {
  const hasError = form.touched[field] && form.errors[field];
  const hasSuccess = form.touched[field] && !form.errors[field] && form.values[field];
  return (
    <input className={`field-input${hasError?" error":hasSuccess?" success":""}`} type={type}
      value={form.values[field]||""} placeholder={placeholder}
      onChange={e=>form.set(field, e.target.value)}
      onBlur={()=>form.touch(field)} {...rest}
    />
  );
}

/* ═══════════════════════════════════════════════════════════════════
   AUTH MODAL — Firebase Auth + Google SSO
═══════════════════════════════════════════════════════════════════ */
function AuthModal({ onAuth, onClose, firebaseReady }) {
  const [mode, setMode] = useState("login");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [showCPwd, setShowCPwd] = useState(false);
  const [apiError, setApiError] = useState("");

  const loginForm = useForm(
    { email:"", password:"" },
    { email:[VALIDATORS.required, VALIDATORS.email], password:[VALIDATORS.required] }
  );

  const registerForm = useForm(
    { name:"", email:"", password:"", confirmPwd:"", phone:"", city:"", terms:false },
    {
      name:[VALIDATORS.required, VALIDATORS.name],
      email:[VALIDATORS.required, VALIDATORS.email],
      password:[VALIDATORS.required, VALIDATORS.password],
      confirmPwd:[VALIDATORS.required, (v)=>v!==registerForm?.values?.password?"Passwords do not match.":null],
      phone:[VALIDATORS.required, VALIDATORS.phone],
      city:[VALIDATORS.required, VALIDATORS.city],
      terms:[(v)=>!v?"You must accept the terms and conditions.":null],
    }
  );

  const pwdStr = passwordStrength(registerForm.values.password);

  /** Google SSO sign-in */
  async function handleGoogleSignIn() {
    if(!firebaseReady) { setApiError("Firebase not configured. Please add your Firebase credentials."); return; }
    setGoogleLoading(true); setApiError("");
    try {
      const user = await AuthService.googleSignIn();
      onAuth(user);
    } catch(e) {
      setApiError(e.message === "Payment cancelled by user." ? "Google sign-in was cancelled." : e.message || "Google sign-in failed.");
    }
    setGoogleLoading(false);
  }

  /** Email/password login via Firebase Auth */
  async function handleLogin() {
    if(!loginForm.submit()) return;
    setLoading(true); setApiError("");
    try {
      if(firebaseReady) {
        const user = await AuthService.emailSignIn(loginForm.values.email, loginForm.values.password);
        onAuth(user);
      } else {
        // Demo fallback when Firebase not configured
        await new Promise(r=>setTimeout(r,800));
        if(loginForm.values.email==="rahul@example.com" && loginForm.values.password==="Pass@123") {
          onAuth({ id:"demo_u1", uid:"demo_u1", name:"Rahul Sharma", email:"rahul@example.com", avatar:"RS", city:"Mumbai", phone:"+91 98765 43210", bidsPlaced:12, wonAuctions:3, verified:true });
        } else {
          throw new Error("Incorrect email or password. (Demo: rahul@example.com / Pass@123)");
        }
      }
    } catch(e) {
      const msg = e.code==="auth/invalid-credential" ? "Incorrect email or password." :
                  e.code==="auth/user-not-found" ? "No account found with this email." :
                  e.code==="auth/too-many-requests" ? "Too many failed attempts. Try again later." :
                  e.message || "Sign-in failed.";
      setApiError(msg);
    }
    setLoading(false);
  }

  /** Register via Firebase Auth + Firestore profile creation */
  async function handleRegister() {
    if(!registerForm.submit()) return;
    if(!registerForm.values.terms) { registerForm.touch("terms"); return; }
    setLoading(true); setApiError("");
    try {
      if(firebaseReady) {
        const user = await AuthService.register({
          name: registerForm.values.name,
          email: registerForm.values.email,
          password: registerForm.values.password,
          phone: registerForm.values.phone,
          city: registerForm.values.city,
        });
        onAuth(user);
      } else {
        // Demo fallback
        await new Promise(r=>setTimeout(r,1000));
        const nu = {
          id:"demo_"+Date.now(), uid:"demo_"+Date.now(),
          name:registerForm.values.name, email:registerForm.values.email,
          avatar:registerForm.values.name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase(),
          phone:registerForm.values.phone, city:registerForm.values.city,
          bidsPlaced:0, wonAuctions:0, verified:false,
        };
        onAuth(nu);
      }
    } catch(e) {
      const msg = e.code==="auth/email-already-in-use" ? "This email is already registered. Try signing in." :
                  e.code==="auth/weak-password" ? "Password is too weak." :
                  e.message || "Registration failed.";
      setApiError(msg);
    }
    setLoading(false);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box auth-modal" onClick={e=>e.stopPropagation()} style={{overflow:"auto",maxHeight:"95vh"}}>
        <div style={{padding:"28px 28px 0"}}>
          <div style={{textAlign:"center",marginBottom:20}}>
            <div style={{fontSize:36,marginBottom:6}}>🏁</div>
            <div style={{fontFamily:"var(--font-display)",fontWeight:800,fontSize:24,color:"var(--blue)"}}>BidDrive</div>
            <div style={{color:"var(--text3)",fontSize:13}}>India's Premier Car Auction Platform</div>
            {!firebaseReady && (
              <div style={{marginTop:8,background:"var(--amber-pale)",border:"1px solid #fde68a",borderRadius:"var(--radius-sm)",padding:"6px 12px",fontSize:12,color:"#92400e"}}>
                ⚠ Demo mode — Add Firebase config to enable real auth
              </div>
            )}
          </div>

          {/* Google SSO Button */}
          <button className="btn btn-google btn-lg w-full" onClick={handleGoogleSignIn} disabled={googleLoading}
            style={{marginBottom:16,gap:10,width:"100%"}}>
            {googleLoading ? (
              <><span style={{width:16,height:16,border:"2px solid #dadce0",borderTopColor:"#4285f4",borderRadius:"50%",animation:"spin 1s linear infinite",display:"inline-block"}} /> Signing in with Google...</>
            ) : (
              <><svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              Continue with Google</>
            )}
          </button>

          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
            <div style={{flex:1,height:1,background:"var(--border)"}}/>
            <span style={{fontSize:12,color:"var(--text4)",whiteSpace:"nowrap"}}>or continue with email</span>
            <div style={{flex:1,height:1,background:"var(--border)"}}/>
          </div>

          <div className="tab-bar">
            <button className={`tab-btn${mode==="login"?" active":""}`} onClick={()=>{setMode("login");setApiError("");}} style={{flex:1}}>Sign In</button>
            <button className={`tab-btn${mode==="register"?" active":""}`} onClick={()=>{setMode("register");setApiError("");}} style={{flex:1}}>Create Account</button>
          </div>
        </div>

        <div style={{padding:28}}>
          {mode==="login" ? (
            <div style={{display:"flex",flexDirection:"column",gap:16}}>
              <Field label="Email Address" required error={loginForm.touched.email&&loginForm.errors.email}>
                <Input field="email" form={loginForm} type="email" placeholder="your@email.com" />
              </Field>
              <Field label="Password" required error={loginForm.touched.password&&loginForm.errors.password}>
                <div style={{position:"relative"}}>
                  <Input field="password" form={loginForm} type={showPwd?"text":"password"} placeholder="••••••••" />
                  <button type="button" onClick={()=>setShowPwd(p=>!p)} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:"var(--text3)",fontSize:16}}>{showPwd?"🙈":"👁"}</button>
                </div>
              </Field>
              {apiError && <div style={{background:"var(--red-pale)",border:"1px solid #fca5a5",color:"var(--red)",padding:"10px 14px",borderRadius:"var(--radius-sm)",fontSize:13}}>⚠ {apiError}</div>}
              {!firebaseReady && <div style={{background:"var(--blue-pale)",border:"1px solid var(--blue-mid)",borderRadius:"var(--radius-sm)",padding:"10px 14px",fontSize:12,color:"var(--text3)"}}>
                💡 Demo: <strong>rahul@example.com</strong> / <strong>Pass@123</strong>
              </div>}
              <button className="btn btn-primary btn-lg w-full" onClick={handleLogin} disabled={loading}>
                {loading?<><span style={{width:16,height:16,border:"2px solid rgba(255,255,255,.4)",borderTopColor:"white",borderRadius:"50%",animation:"spin 1s linear infinite",display:"inline-block"}} /> Signing in...</>:"Sign In →"}
              </button>
            </div>
          ):(
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <Field label="Full Name" required error={registerForm.touched.name&&registerForm.errors.name}>
                  <Input field="name" form={registerForm} placeholder="Rahul Sharma" />
                </Field>
                <Field label="City" required error={registerForm.touched.city&&registerForm.errors.city}>
                  <Input field="city" form={registerForm} placeholder="Mumbai" />
                </Field>
              </div>
              <Field label="Email Address" required error={registerForm.touched.email&&registerForm.errors.email}>
                <Input field="email" form={registerForm} type="email" placeholder="your@email.com" />
              </Field>
              <Field label="Phone Number" required error={registerForm.touched.phone&&registerForm.errors.phone} hint="+91 98765 43210">
                <Input field="phone" form={registerForm} type="tel" placeholder="+91 98765 43210" />
              </Field>
              <Field label="Password" required error={registerForm.touched.password&&registerForm.errors.password}
                hint={registerForm.values.password&&pwdStr.label?<span style={{color:pwdStr.color,fontWeight:600}}>Strength: {pwdStr.label}</span>:"Min 8 chars + uppercase + number + special"}>
                <div style={{position:"relative"}}>
                  <Input field="password" form={registerForm} type={showPwd?"text":"password"} placeholder="Min 8 chars + special" />
                  <button type="button" onClick={()=>setShowPwd(p=>!p)} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:"var(--text3)",fontSize:16}}>{showPwd?"🙈":"👁"}</button>
                </div>
                {registerForm.values.password && (
                  <div className="field-strength"><div className="field-strength-bar" style={{width:`${pwdStr.pct}%`,background:pwdStr.color}} /></div>
                )}
              </Field>
              <Field label="Confirm Password" required error={registerForm.touched.confirmPwd&&registerForm.errors.confirmPwd}>
                <div style={{position:"relative"}}>
                  <Input field="confirmPwd" form={registerForm} type={showCPwd?"text":"password"} placeholder="Re-enter password" />
                  <button type="button" onClick={()=>setShowCPwd(p=>!p)} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:"var(--text3)",fontSize:16}}>{showCPwd?"🙈":"👁"}</button>
                </div>
              </Field>
              <label style={{display:"flex",gap:10,alignItems:"flex-start",cursor:"pointer",padding:"10px 12px",border:`1.5px solid ${registerForm.touched.terms&&registerForm.errors.terms?"var(--red)":"var(--border)"}`,borderRadius:"var(--radius-sm)",background:registerForm.values.terms?"var(--blue-pale)":"white"}}>
                <input type="checkbox" checked={!!registerForm.values.terms} onChange={e=>registerForm.set("terms",e.target.checked)} onBlur={()=>registerForm.touch("terms")} style={{accentColor:"var(--blue)",marginTop:2,flexShrink:0}} />
                <span style={{fontSize:13,color:"var(--text2)"}}>I agree to BidDrive's <span style={{color:"var(--blue)",fontWeight:600}}>Terms of Service</span> and <span style={{color:"var(--blue)",fontWeight:600}}>Privacy Policy</span></span>
              </label>
              {registerForm.touched.terms&&registerForm.errors.terms && <span className="field-error">⚠ {registerForm.errors.terms}</span>}
              {apiError && <div style={{background:"var(--red-pale)",border:"1px solid #fca5a5",color:"var(--red)",padding:"10px 14px",borderRadius:"var(--radius-sm)",fontSize:13}}>⚠ {apiError}</div>}
              <button className="btn btn-green btn-lg w-full" onClick={handleRegister} disabled={loading}>
                {loading?<><span style={{width:16,height:16,border:"2px solid rgba(255,255,255,.4)",borderTopColor:"white",borderRadius:"50%",animation:"spin 1s linear infinite",display:"inline-block"}} /> Creating Account...</>:"Create Account →"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   BID MODAL — With Razorpay Payment Gateway
═══════════════════════════════════════════════════════════════════ */
function BidModal({ car, user, bidHistory, onClose, onConfirm, razorpayReady }) {
  const [step, setStep] = useState("form"); // form | confirm | paying | success
  const [paymentInfo, setPaymentInfo] = useState(null);
  const [payError, setPayError] = useState("");
  const minBid = car.currentBid + 1000;
  const bids = bidHistory[car.id] || bidHistory[String(car.id)] || [];

  const form = useForm(
    { amount: car.currentBid + 10000 },
    { amount:[VALIDATORS.required, VALIDATORS.bidAmount(minBid)] }
  );

  const quickIncrements = [10000,25000,50000,100000,250000];
  const depositAmount = Math.round(form.values.amount * 0.02);

  if(!user) return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{maxWidth:380,padding:32,textAlign:"center"}} onClick={e=>e.stopPropagation()}>
        <div style={{fontSize:48,marginBottom:12}}>🔐</div>
        <div style={{fontFamily:"var(--font-display)",fontSize:20,fontWeight:700,marginBottom:8}}>Sign In to Bid</div>
        <div style={{color:"var(--text3)",fontSize:14,marginBottom:24}}>Create a free account to participate in auctions.</div>
        <button className="btn btn-primary btn-lg" onClick={onClose}>Sign In / Register</button>
      </div>
    </div>
  );

  /** Step 2: Process Razorpay payment then confirm bid */
  async function handlePayAndBid() {
    setStep("paying"); setPayError("");
    try {
      let payment = null;
      if(razorpayReady && RAZORPAY_KEY_ID !== "rzp_test_YOUR_KEY_HERE") {
        payment = await RazorpayService.collectDeposit({
          amount: form.values.amount,
          bidAmount: form.values.amount,
          car,
          user,
        });
      } else {
        // Simulate payment flow when Razorpay not configured
        await new Promise(r=>setTimeout(r,1200));
        payment = { paymentId: "demo_pay_"+Date.now(), depositAmount };
      }
      setPaymentInfo(payment);
      await onConfirm(car.id, form.values.amount, user, payment);
      setStep("success");
    } catch(e) {
      setPayError(e.message || "Payment failed. Please try again.");
      setStep("confirm");
    }
  }

  return (
    <div className="modal-overlay" style={{alignItems:"flex-end"}} onClick={onClose}>
      <div className="modal-box bid-modal" style={{maxWidth:460,width:"100%"}} onClick={e=>e.stopPropagation()}>
        <div style={{padding:"18px 22px",borderBottom:"1px solid var(--border)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontFamily:"var(--font-display)",fontWeight:700,fontSize:17}}>
            {step==="success"?"🎉 Bid Placed!":step==="paying"?"💳 Processing Payment...":step==="confirm"?"Confirm Your Bid":"Place a Bid"}
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose} style={{fontSize:22,lineHeight:1}}>×</button>
        </div>

        <div style={{padding:22}}>
          {step==="success" ? (
            <div style={{textAlign:"center",padding:"16px 0"}}>
              <div style={{fontSize:60,marginBottom:10}}>🏆</div>
              <div style={{fontFamily:"var(--font-display)",fontSize:22,fontWeight:700,color:"var(--green)",marginBottom:6}}>You're the Highest Bidder!</div>
              <div style={{color:"var(--text2)",marginBottom:4}}>Bid of <strong style={{color:"var(--blue)"}}>{fmtFull(form.values.amount)}</strong></div>
              <div style={{color:"var(--text3)",fontSize:13,marginBottom:16}}>on {car.year} {car.make} {car.model}</div>
              {paymentInfo && (
                <div style={{background:"var(--green-pale)",border:"1px solid #86efac",borderRadius:"var(--radius-sm)",padding:12,marginBottom:16,fontSize:12}}>
                  <div className="payment-badge" style={{marginBottom:6,display:"inline-flex"}}>✓ Payment Confirmed</div>
                  <div style={{color:"var(--text2)"}}>Deposit: <strong>{fmtFull(paymentInfo.depositAmount)}</strong> · ID: <code style={{fontSize:10}}>{paymentInfo.paymentId?.slice(0,20)}...</code></div>
                  <div style={{color:"var(--text3)",marginTop:4,fontSize:11}}>Refundable if you don't win the auction.</div>
                </div>
              )}
              <div style={{background:"var(--blue-pale)",borderRadius:"var(--radius-sm)",padding:14,marginBottom:20,fontSize:13,color:"var(--text2)"}}>
                📧 You'll receive a notification if outbid.<br/>Track your bids in your profile.
              </div>
              <button className="btn btn-primary btn-lg" onClick={onClose}>Done</button>
            </div>
          ) : step==="paying" ? (
            <div style={{textAlign:"center",padding:"32px 0"}}>
              <div style={{width:48,height:48,border:"4px solid var(--blue-mid)",borderTopColor:"var(--blue)",borderRadius:"50%",animation:"spin 1s linear infinite",margin:"0 auto 16px"}}/>
              <div style={{fontFamily:"var(--font-display)",fontSize:17,fontWeight:700,marginBottom:8}}>Processing Payment</div>
              <div style={{color:"var(--text3)",fontSize:13}}>Please complete the Razorpay checkout...</div>
              <div className="razorpay-badge" style={{marginTop:16,display:"inline-flex"}}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="#2D83E5"><path d="M22 12C22 6.48 17.52 2 12 2S2 6.48 2 12s4.48 10 10 10 10-4.48 10-10zm-11-5l1.72 4.28L17 12l-4.28 1.72L11 18l-1.72-4.28L5 12l4.28-1.72L11 7z"/></svg>
                Secured by Razorpay
              </div>
            </div>
          ) : step==="confirm" ? (
            <div style={{display:"flex",flexDirection:"column",gap:16}}>
              <div style={{background:"var(--blue-pale)",border:"1px solid var(--blue-mid)",borderRadius:"var(--radius)",padding:18}}>
                <div style={{fontSize:12,color:"var(--text3)",marginBottom:2}}>Vehicle</div>
                <div style={{fontWeight:700,fontSize:15,marginBottom:12}}>{car.year} {car.make} {car.model}</div>
                <div style={{fontSize:12,color:"var(--text3)",marginBottom:2}}>Your Bid Amount</div>
                <div style={{fontFamily:"var(--font-display)",fontSize:28,fontWeight:700,color:"var(--blue)"}}>{fmtFull(form.values.amount)}</div>
                <div style={{fontSize:12,color:"var(--text3)",marginTop:6}}>Bidding as: <strong style={{color:"var(--text)"}}>{user.name}</strong></div>
              </div>

              {/* Razorpay deposit info */}
              <div style={{background:"#f0fdf4",border:"1px solid #86efac",borderRadius:"var(--radius-sm)",padding:14}}>
                <div style={{fontWeight:700,color:"var(--green)",fontSize:13,marginBottom:6,display:"flex",alignItems:"center",gap:6}}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="#059669"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                  Refundable Bid Deposit: <span style={{fontFamily:"var(--font-display)"}}>{fmtFull(depositAmount)}</span>
                </div>
                <div style={{fontSize:12,color:"var(--text3)"}}>2% of bid amount, fully refunded if you don't win.</div>
                <div className="razorpay-badge" style={{marginTop:8,display:"inline-flex"}}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="#2D83E5"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/></svg>
                  256-bit SSL · Secured by Razorpay
                </div>
              </div>

              <div style={{fontSize:13,color:"var(--text3)",background:"#fffbeb",border:"1px solid #fde68a",borderRadius:"var(--radius-sm)",padding:12}}>
                ⚠ By confirming, you agree to purchase this vehicle if you win the auction.
              </div>
              {payError && <div style={{background:"var(--red-pale)",border:"1px solid #fca5a5",color:"var(--red)",padding:"10px 14px",borderRadius:"var(--radius-sm)",fontSize:13}}>⚠ {payError}</div>}
              <div style={{display:"flex",gap:10}}>
                <button className="btn btn-outline btn-md" onClick={()=>setStep("form")} style={{flex:1}}>← Back</button>
                <button className="btn btn-green btn-md" onClick={handlePayAndBid} style={{flex:2}}>
                  💳 Pay Deposit & Bid
                </button>
              </div>
            </div>
          ) : (
            /* Step 1: Bid Form */
            <div style={{display:"flex",flexDirection:"column",gap:16}}>
              <div style={{display:"flex",justifyContent:"space-between",background:"var(--surface2)",borderRadius:"var(--radius-sm)",padding:"12px 14px"}}>
                <div>
                  <div style={{fontSize:11,color:"var(--text4)"}}>Current Highest Bid</div>
                  <div style={{fontFamily:"var(--font-display)",fontSize:20,fontWeight:700}}>{fmt(car.currentBid)}</div>
                  <div style={{fontSize:11,color:"var(--text4)"}}>{bids.length} bids · {bids[0]?.userName||"No bids"}</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <Countdown endTime={car.endTime} />
                  <div style={{fontSize:11,color:"var(--text4)",marginTop:2}}>Min: {fmt(minBid)}</div>
                </div>
              </div>
              <div>
                <div style={{fontSize:13,fontWeight:600,color:"var(--text2)",marginBottom:8}}>Quick Increments</div>
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  {quickIncrements.map(inc=>(
                    <button key={inc} onClick={()=>form.set("amount",car.currentBid+inc)} style={{
                      padding:"7px 10px",borderRadius:"var(--radius-sm)",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"var(--font-body)",
                      background:form.values.amount===car.currentBid+inc?"var(--blue)":"var(--surface2)",
                      color:form.values.amount===car.currentBid+inc?"white":"var(--text3)",
                      border:`1.5px solid ${form.values.amount===car.currentBid+inc?"var(--blue)":"var(--border)"}`,
                    }}>+{fmt(inc).replace("₹","")}</button>
                  ))}
                </div>
              </div>
              <Field label="Your Bid Amount (₹)" required error={form.touched.amount&&form.errors.amount}
                hint={!form.errors.amount&&form.values.amount>car.currentBid?`+${fmt(form.values.amount-car.currentBid)} above current`:""}>
                <input className={`field-input${form.touched.amount&&form.errors.amount?" error":""}`} type="number"
                  value={form.values.amount} min={minBid}
                  onChange={e=>form.set("amount",Number(e.target.value))}
                  onBlur={()=>form.touch("amount")}
                  style={{fontFamily:"var(--font-display)",fontWeight:700,fontSize:20,textAlign:"center"}}
                />
              </Field>
              {form.values.amount > minBid && (
                <div style={{fontSize:12,color:"var(--text3)",background:"var(--surface2)",borderRadius:"var(--radius-sm)",padding:"8px 12px"}}>
                  💳 Deposit required: <strong style={{color:"var(--blue)"}}>{fmtFull(Math.round(form.values.amount*0.02))}</strong> (2%, refundable)
                </div>
              )}
              <button className="btn btn-primary btn-lg w-full" onClick={()=>{form.touch("amount");if(form.submit())setStep("confirm");}}>
                Review Bid → {form.values.amount?fmtFull(form.values.amount):""}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   PHOTO GALLERY
═══════════════════════════════════════════════════════════════════ */
function Gallery({ photos, title, onClose }) {
  const [idx, setIdx] = useState(0);
  const prev = ()=>setIdx(i=>(i-1+photos.length)%photos.length);
  const next = ()=>setIdx(i=>(i+1)%photos.length);
  useEffect(()=>{
    const fn=e=>{if(e.key==="ArrowLeft")prev();if(e.key==="ArrowRight")next();if(e.key==="Escape")onClose();};
    window.addEventListener("keydown",fn); return()=>window.removeEventListener("keydown",fn);
  },[]);
  return (
    <div className="gallery-overlay">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 18px",borderBottom:"1px solid #1e2d4a",flexShrink:0}}>
        <div style={{fontFamily:"var(--font-display)",color:"white",fontWeight:700,fontSize:16}}>{title}</div>
        <div style={{display:"flex",gap:12,alignItems:"center"}}>
          <span style={{color:"#94a3b8",fontSize:13}}>{idx+1} / {photos.length}</span>
          <button onClick={onClose} style={{background:"rgba(255,255,255,.12)",border:"none",color:"white",width:32,height:32,borderRadius:"50%",cursor:"pointer",fontSize:18}}>×</button>
        </div>
      </div>
      <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",position:"relative",padding:"0 56px",overflow:"hidden"}}>
        <button onClick={prev} style={{position:"absolute",left:10,background:"rgba(255,255,255,.12)",border:"none",color:"white",width:40,height:40,borderRadius:"50%",cursor:"pointer",fontSize:22,backdropFilter:"blur(8px)",zIndex:2}}>‹</button>
        <img src={photos[idx]} alt="" style={{maxWidth:"100%",maxHeight:"100%",objectFit:"contain",borderRadius:8,userSelect:"none"}} onError={e=>{e.target.src=fallbackImg;}} />
        <button onClick={next} style={{position:"absolute",right:10,background:"rgba(255,255,255,.12)",border:"none",color:"white",width:40,height:40,borderRadius:"50%",cursor:"pointer",fontSize:22,backdropFilter:"blur(8px)",zIndex:2}}>›</button>
      </div>
      <div className="thumb-strip" style={{padding:"10px 14px",borderTop:"1px solid #1e2d4a",flexShrink:0}}>
        {photos.map((p,i)=>(
          <img key={i} src={p} onClick={()=>setIdx(i)} style={{width:60,height:42,objectFit:"cover",borderRadius:6,flexShrink:0,cursor:"pointer",border:idx===i?"2.5px solid #3b82f6":"2.5px solid transparent",opacity:idx===i?1:.55,transition:"all .15s"}} onError={e=>{e.target.style.display="none";}} />
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   AI ADVISOR — Claude API integration
═══════════════════════════════════════════════════════════════════ */
function AIAdvisor({ car, user, onClose }) {
  const [msgs, setMsgs] = useState([{role:"assistant",content:`Hello${user?" "+user.name.split(" ")[0]:""}! 👋 I'm your AI advisor for the **${car.year} ${car.make} ${car.model}**.\n\nCurrent bid: **${fmt(car.currentBid)}** · ${car.mileage?.toLocaleString()} km · ${car.condition} condition.\n\nAsk me about market value, inspection tips, bid strategy, or known issues!`}]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(); const inputRef = useRef();
  useEffect(()=>{bottomRef.current?.scrollIntoView({behavior:"smooth"});},[msgs]);
  const TIPS = ["Is this price fair?","What to inspect?","Bid strategy?","Resale value?"];

  async function send(text) {
    const msg=(text||input).trim(); if(!msg||loading) return;
    setInput(""); setMsgs(p=>[...p,{role:"user",content:msg}]); setLoading(true);
    try {
      const sys=`You are an expert used-car advisor for BidDrive, India's premium auction platform.
Car: ${car.year} ${car.make} ${car.model} | Color: ${car.color} | Fuel: ${car.fuel} | Trans: ${car.transmission}
Engine: ${car.engine} | Power: ${car.power} | Torque: ${car.torque} | 0-100: ${car.acceleration} | Top: ${car.topSpeed}
Mileage: ${car.mileage?.toLocaleString()} km | Condition: ${car.condition} | Features: ${(car.features||[]).join(", ")}
History: ${car.history} | Starting Bid: ${fmt(car.startingBid)} | Current Bid: ${fmt(car.currentBid)} | Seller: ${car.seller}, ${car.location} | Verified: ${car.verified}
${user?`User: ${user.name} from ${user.city} | Bids placed: ${user.bidsPlaced}`:""}
Rules: Use ₹ and Indian market context. Max 130 words. Be direct and practical. Use **bold** for key figures.`;
      const history=msgs.map(m=>({role:m.role==="assistant"?"assistant":"user",content:m.content}));
      const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:350,system:sys,messages:[...history,{role:"user",content:msg}]})});
      const data=await res.json();
      if(data.error) throw new Error(data.error.message);
      setMsgs(p=>[...p,{role:"assistant",content:data.content?.map(b=>b.text||"").join("")||"Sorry, I couldn't respond."}]);
    } catch { setMsgs(p=>[...p,{role:"assistant",content:"⚠️ Connection issue. Please try again."}]); }
    setLoading(false); setTimeout(()=>inputRef.current?.focus(),80);
  }

  const renderMsg = t => t.split(/(\*\*[^*]+\*\*)/).map((p,i)=>p.startsWith("**")&&p.endsWith("**")?<strong key={i} style={{color:"var(--blue)"}}>{p.slice(2,-2)}</strong>:p.split("\n").map((l,j)=><span key={j}>{l}{j<p.split("\n").length-1?<br/>:null}</span>));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box ai-modal" style={{display:"flex",flexDirection:"column",padding:0}} onClick={e=>e.stopPropagation()}>
        <div style={{padding:"16px 20px",borderBottom:"1px solid var(--border)",display:"flex",gap:12,alignItems:"center",flexShrink:0}}>
          <div style={{width:40,height:40,background:"linear-gradient(135deg,#1d4ed8,#3b82f6)",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>🤖</div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontWeight:700,fontSize:14}}>AI Car Advisor</div>
            <div style={{color:"var(--text3)",fontSize:12,overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis"}}>{car.year} {car.make} {car.model} · {car.location}</div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose} style={{fontSize:22}}>×</button>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"14px 18px",display:"flex",flexDirection:"column",gap:12}}>
          {msgs.map((m,i)=>(
            <div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start",gap:8}}>
              {m.role==="assistant"&&<div style={{width:28,height:28,background:"linear-gradient(135deg,#1d4ed8,#3b82f6)",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,flexShrink:0,marginTop:2}}>🤖</div>}
              <div style={{maxWidth:"82%",padding:"10px 14px",borderRadius:m.role==="user"?"18px 18px 4px 18px":"18px 18px 18px 4px",background:m.role==="user"?"linear-gradient(135deg,#1d4ed8,#2563eb)":"white",color:m.role==="user"?"white":"var(--text)",fontSize:13.5,lineHeight:1.6,boxShadow:m.role==="user"?"0 4px 14px rgba(29,78,216,.3)":"var(--shadow-sm)",border:m.role==="assistant"?"1px solid var(--border)":"none"}}>
                {renderMsg(m.content)}
              </div>
            </div>
          ))}
          {loading&&<div style={{display:"flex",gap:8}}><div style={{width:28,height:28,background:"linear-gradient(135deg,#1d4ed8,#3b82f6)",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13}}>🤖</div><div style={{padding:"10px 14px",background:"white",borderRadius:"18px 18px 18px 4px",border:"1px solid var(--border)",boxShadow:"var(--shadow-sm)"}}><div style={{display:"flex",gap:4}}>{[0,.2,.4].map(d=><div key={d} style={{width:6,height:6,borderRadius:"50%",background:"var(--blue-light)",animation:`pulse 1.2s ${d}s infinite`}}/>)}</div></div></div>}
          <div ref={bottomRef}/>
        </div>
        {msgs.length<3&&<div style={{padding:"0 18px 8px",display:"flex",gap:6,flexWrap:"wrap",flexShrink:0}}>{TIPS.map(t=><button key={t} onClick={()=>send(t)} style={{background:"var(--blue-pale)",border:"1px solid var(--blue-mid)",color:"var(--blue)",padding:"4px 10px",borderRadius:20,fontSize:12,cursor:"pointer",fontFamily:"var(--font-body)",fontWeight:500}}>{t}</button>)}</div>}
        <div style={{padding:"12px 18px",borderTop:"1px solid var(--border)",display:"flex",gap:8,flexShrink:0}}>
          <input ref={inputRef} className="field-input" value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&send()} placeholder="Ask about valuation, inspection, bids..." style={{flex:1}} />
          <button className="btn btn-primary btn-md" onClick={()=>send()} disabled={loading||!input.trim()} style={{padding:"11px 16px",fontSize:18}}>➤</button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   CAR CARD
═══════════════════════════════════════════════════════════════════ */
function CarCard({ car, bids, watched, onDetail, onBid, onAI, onWatch }) {
  const photos = CAR_PHOTOS[car.numId || car.id] || CAR_PHOTOS[1];
  return (
    <div className="card card-hover" style={{cursor:"pointer"}} onClick={()=>onDetail(car)}>
      <div style={{position:"relative",aspectRatio:"16/10",overflow:"hidden",background:"#e2e8f0"}}>
        <img src={photos[0]} alt={car.make} style={{width:"100%",height:"100%",objectFit:"cover",transition:"transform .4s ease"}} onError={e=>{e.target.src=fallbackImg;}} onMouseEnter={e=>e.target.style.transform="scale(1.06)"} onMouseLeave={e=>e.target.style.transform="scale(1)"} />
        {car.badge&&<div className="badge" style={{position:"absolute",top:10,left:10,...(BADGE_STYLE[car.badge]||{})}}>{car.badge}</div>}
        <button onClick={e=>{e.stopPropagation();onWatch(car.id);}} className="btn btn-icon" style={{position:"absolute",top:10,right:10,background:watched?"var(--blue)":"rgba(255,255,255,.9)",border:"none",boxShadow:"var(--shadow-sm)",fontSize:14,transition:"all .18s"}}>{watched?"❤️":"🤍"}</button>
        <div style={{position:"absolute",bottom:10,right:10,background:"rgba(0,0,0,.55)",color:"white",fontSize:11,padding:"3px 9px",borderRadius:12,backdropFilter:"blur(4px)"}}>📷 {photos.length}</div>
      </div>
      <div style={{padding:"14px 16px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
          <div>
            <div style={{fontFamily:"var(--font-display)",fontWeight:700,fontSize:16,lineHeight:1.2}}>{car.year} {car.make}</div>
            <div style={{color:"var(--text3)",fontSize:13}}>{car.model}</div>
          </div>
          {car.verified&&<span className="chip" style={{background:"var(--green-pale)",color:"#166534"}}>✓ Verified</span>}
        </div>
        <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:12}}>
          {[car.fuel,car.transmission,`${((car.mileage||0)/1000).toFixed(0)}k km`,car.condition].map(t=><span key={t} className="chip" style={{background:"var(--surface2)",color:"var(--text3)",border:"1px solid var(--border)"}}>{t}</span>)}
        </div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",paddingTop:12,borderTop:"1px solid var(--border)"}}>
          <div>
            <div style={{fontSize:11,color:"var(--text4)"}}>Current Bid</div>
            <div style={{fontFamily:"var(--font-display)",fontSize:19,fontWeight:700}}>{fmt(car.currentBid)}</div>
            <div style={{fontSize:11,color:"var(--text4)"}}>{bids.length} bids · {bids[0]?.userName||"No bids"}</div>
          </div>
          <div style={{textAlign:"right"}}>
            <Countdown endTime={car.endTime}/>
            <div style={{fontSize:11,color:"var(--text4)",marginTop:2}}>{car.location}</div>
          </div>
        </div>
        <div style={{display:"flex",gap:8,marginTop:12}} onClick={e=>e.stopPropagation()}>
          <button className="btn btn-outline btn-sm" onClick={()=>onAI(car)} style={{flex:"0 0 auto",padding:"8px 12px"}}>🤖 AI</button>
          <button className="btn btn-primary btn-sm" onClick={()=>onBid(car)} style={{flex:1}}>⚡ Bid Now</button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   CAR DETAIL PAGE
═══════════════════════════════════════════════════════════════════ */
function DetailPage({ car, bids, user, onBack, onBid, onAI }) {
  const photos = CAR_PHOTOS[car.numId || car.id] || CAR_PHOTOS[1];
  const [photoIdx, setPhotoIdx] = useState(0);
  const [gallery, setGallery] = useState(false);
  const [tab, setTab] = useState("overview");

  return (
    <div style={{animation:"fadeUp .3s ease"}}>
      <button className="btn btn-ghost btn-sm" onClick={onBack} style={{marginBottom:18,color:"var(--blue)",fontWeight:600,padding:"6px 0",gap:4}}>← Back to Listings</button>
      <div className="grid-detail">
        <div>
          <div style={{position:"relative",borderRadius:"var(--radius-lg)",overflow:"hidden",aspectRatio:"16/9",background:"#e2e8f0",marginBottom:10,cursor:"pointer"}} onClick={()=>setGallery(true)}>
            <img src={photos[photoIdx]} alt={car.make} style={{width:"100%",height:"100%",objectFit:"cover"}} onError={e=>{e.target.src=fallbackImg;}}/>
            {car.badge&&<div className="badge" style={{position:"absolute",top:12,left:12,...(BADGE_STYLE[car.badge]||{})}}>{car.badge}</div>}
            <div style={{position:"absolute",bottom:12,right:12,background:"rgba(0,0,0,.6)",color:"white",padding:"6px 14px",borderRadius:20,fontSize:12,fontWeight:600,backdropFilter:"blur(4px)"}}>📷 View All {photos.length} Photos</div>
          </div>
          <div className="thumb-strip" style={{marginBottom:20}}>
            {photos.map((p,i)=><img key={i} src={p} onClick={()=>setPhotoIdx(i)} style={{width:66,height:46,objectFit:"cover",borderRadius:8,flexShrink:0,cursor:"pointer",border:photoIdx===i?"2.5px solid var(--blue)":"2.5px solid transparent",opacity:photoIdx===i?1:.6,transition:"all .15s"}} onError={e=>{e.target.style.display="none";}}/>)}
          </div>
          <div className="tab-bar" style={{marginBottom:20,overflowX:"auto"}}>
            {["overview","specs","features","history","bids"].map(t=><button key={t} className={`tab-btn${tab===t?" active":""}`} onClick={()=>setTab(t)} style={{textTransform:"capitalize",paddingBottom:12}}>{t}</button>)}
          </div>
          {tab==="overview"&&<div className="grid-specs">{[["Year",car.year],["Make",car.make],["Model",car.model],["Color",car.color],["Fuel",car.fuel],["Transmission",car.transmission],["Mileage",`${(car.mileage||0).toLocaleString()} km`],["Condition",car.condition],["Seller",car.seller],["Location",car.location]].map(([k,v])=><div key={k} style={{background:"white",borderRadius:"var(--radius-sm)",padding:"12px 14px",border:"1px solid var(--border)"}}><div style={{fontSize:10,color:"var(--text4)",textTransform:"uppercase",letterSpacing:.5,marginBottom:3}}>{k}</div><div style={{fontSize:13,fontWeight:600}}>{v}</div></div>)}</div>}
          {tab==="specs"&&<div className="grid-specs">{[["Engine",car.engine],["Power",car.power],["Torque",car.torque],["Top Speed",car.topSpeed],["0-100 km/h",car.acceleration],["Fuel",car.fuel]].map(([k,v])=><div key={k} style={{background:"white",borderRadius:"var(--radius-sm)",padding:"14px",border:"1px solid var(--border)"}}><div style={{fontSize:10,color:"var(--text4)",textTransform:"uppercase",letterSpacing:.5,marginBottom:4}}>{k}</div><div style={{fontFamily:"var(--font-display)",fontSize:15,fontWeight:700,color:"var(--blue)"}}>{v}</div></div>)}</div>}
          {tab==="features"&&<div style={{display:"flex",flexDirection:"column",gap:8}}>{(car.features||[]).map(f=><div key={f} style={{display:"flex",alignItems:"center",gap:10,background:"white",borderRadius:"var(--radius-sm)",padding:"11px 14px",border:"1px solid var(--border)"}}><div style={{width:22,height:22,background:"var(--blue-pale)",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:"var(--blue)",fontWeight:700,flexShrink:0}}>✓</div><span style={{fontSize:13,fontWeight:500}}>{f}</span></div>)}</div>}
          {tab==="history"&&<div style={{background:"white",borderRadius:"var(--radius)",border:"1px solid var(--border)",padding:20}}><div style={{fontSize:14,color:"var(--text)",lineHeight:1.7,marginBottom:14}}>{car.history}</div><div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{car.verified&&<span className="chip" style={{background:"var(--green-pale)",color:"#166534"}}>✓ Verified Seller</span>}<span className="chip" style={{background:"var(--blue-pale)",color:"var(--blue)"}}>📋 Service History</span></div></div>}
          {tab==="bids"&&(
            <div className="card" style={{overflow:"hidden"}}>
              <div style={{padding:"14px 18px",borderBottom:"1px solid var(--border)",fontWeight:700,fontSize:14}}>Bid History · {bids.length} bids</div>
              {bids.length===0?<div style={{padding:28,textAlign:"center",color:"var(--text3)"}}>No bids yet — be the first!</div>:
              bids.map((b,i)=><div key={b.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"11px 18px",borderBottom:i<bids.length-1?"1px solid var(--border)":"none",background:i===0?"var(--blue-pale)":"white"}}>
                <div style={{display:"flex",gap:10,alignItems:"center"}}>
                  <div style={{width:32,height:32,background:i===0?"var(--blue)":"var(--surface2)",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:i===0?"white":"var(--text2)",flexShrink:0}}>{(b.userName||"?").slice(0,2).toUpperCase()}</div>
                  <div><div style={{fontSize:13,fontWeight:600}}>{b.userName}</div><div style={{fontSize:11,color:"var(--text4)"}}>{timeAgo(b.time||Date.now())}</div></div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontFamily:"var(--font-display)",fontSize:15,fontWeight:700,color:i===0?"var(--blue)":"var(--text2)"}}>{fmt(b.amount)}</span>
                  {i===0&&<span className="chip" style={{background:"var(--blue)",color:"white",fontSize:10}}>LEAD</span>}
                  {b.paymentId && <span className="payment-badge" style={{fontSize:9}}>✓ Paid</span>}
                </div>
              </div>)}
            </div>
          )}
        </div>

        {/* Sticky Bid Panel */}
        <div style={{position:"sticky",top:"calc(var(--header-h) + 16px)"}}>
          <div className="card" style={{overflow:"hidden"}}>
            <div style={{background:"linear-gradient(135deg,#1d4ed8,#2563eb)",padding:"18px 20px"}}>
              <div style={{color:"rgba(255,255,255,.7)",fontSize:11,marginBottom:2}}>Current Highest Bid</div>
              <div style={{fontFamily:"var(--font-display)",fontSize:28,fontWeight:800,color:"white"}}>{fmt(car.currentBid)}</div>
              <div style={{color:"rgba(255,255,255,.75)",fontSize:12,marginTop:3}}>{bids.length} bids · Started at {fmt(car.startingBid)}</div>
            </div>
            <div style={{padding:"14px 18px",borderBottom:"1px solid var(--border)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div><div style={{fontSize:11,color:"var(--text4)"}}>Ends in</div><Countdown endTime={car.endTime} style={{fontSize:15}}/></div>
              <div style={{textAlign:"right"}}><div style={{fontSize:11,color:"var(--text4)"}}>Leading</div><div style={{fontSize:13,fontWeight:600}}>{bids[0]?.userName||"No bids"}</div></div>
            </div>
            {bids.length>0&&<div style={{padding:"10px 18px",borderBottom:"1px solid var(--border)",maxHeight:120,overflowY:"auto"}}>
              <div style={{fontSize:10,color:"var(--text4)",textTransform:"uppercase",letterSpacing:.5,marginBottom:6,display:"flex",alignItems:"center",gap:5}}><span className="live-dot"/>Live Bids</div>
              {bids.slice(0,5).map((b,i)=><div key={b.id} style={{display:"flex",justifyContent:"space-between",padding:"3px 0",fontSize:12}}><span style={{color:"var(--text2)",fontWeight:500}}>{b.userName}</span><span style={{color:i===0?"var(--blue)":"var(--text3)",fontWeight:i===0?700:400}}>{fmt(b.amount)}</span></div>)}
            </div>}
            <div style={{padding:"16px 18px",display:"flex",flexDirection:"column",gap:8}}>
              <button className="btn btn-primary btn-lg w-full" onClick={()=>onBid(car)}>⚡ Place Bid Now</button>
              <button className="btn btn-outline btn-md w-full" onClick={()=>onAI(car)}>🤖 Ask AI Advisor</button>
            </div>
            {car.verified&&<div style={{padding:"0 18px 16px",display:"flex",gap:6,flexWrap:"wrap"}}>
              <span className="chip" style={{background:"var(--green-pale)",color:"#166534",fontSize:10}}>✓ Verified</span>
              <span className="chip" style={{background:"var(--blue-pale)",color:"var(--blue)",fontSize:10}}>🔒 Secure</span>
              <div className="razorpay-badge" style={{fontSize:10,padding:"3px 8px"}}>💳 Razorpay</div>
            </div>}
          </div>
        </div>
      </div>
      {gallery&&<Gallery photos={photos} title={`${car.year} ${car.make} ${car.model}`} onClose={()=>setGallery(false)}/>}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   PROFILE PANEL
═══════════════════════════════════════════════════════════════════ */
function ProfilePanel({ user, bidHistory, cars, onClose, onLogout }) {
  const myBids = Object.values(bidHistory).flat().filter(b=>b.userId===user.id||b.userId===user.uid);
  const leading = cars.filter(c=>{
    const carBids = bidHistory[c.id]||bidHistory[String(c.id)]||[];
    return carBids[0]?.userId===user.id||carBids[0]?.userId===user.uid;
  });
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(15,23,42,.45)",backdropFilter:"blur(4px)",zIndex:900,display:"flex",justifyContent:"flex-end"}} onClick={onClose}>
      <div className="profile-panel" style={{background:"white",height:"100%",overflowY:"auto",animation:"slideRight .3s ease",boxShadow:"-20px 0 60px rgba(0,40,120,.15)"}} onClick={e=>e.stopPropagation()}>
        <div style={{background:"linear-gradient(135deg,#1d4ed8,#2563eb)",padding:"28px 22px 22px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
            <div style={{display:"flex",gap:12,alignItems:"center"}}>
              {user.photoURL ? (
                <img src={user.photoURL} style={{width:50,height:50,borderRadius:"50%",border:"2px solid rgba(255,255,255,.4)",objectFit:"cover"}} alt={user.name}/>
              ) : (
                <div style={{width:50,height:50,background:"rgba(255,255,255,.22)",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,fontWeight:700,color:"white"}}>{user.avatar||"?"}</div>
              )}
              <div>
                <div style={{fontFamily:"var(--font-display)",fontWeight:700,fontSize:17,color:"white"}}>{user.name}</div>
                <div style={{color:"rgba(255,255,255,.7)",fontSize:12}}>{user.email}</div>
                {user.phone&&<div style={{color:"rgba(255,255,255,.7)",fontSize:12}}>{user.phone}</div>}
                <div style={{color:"rgba(255,255,255,.7)",fontSize:12}}>📍 {user.city||"India"}</div>
                {user.provider==="google" && <div style={{marginTop:3}}><span style={{background:"rgba(255,255,255,.15)",color:"white",fontSize:10,padding:"2px 8px",borderRadius:20}}>G Google Account</span></div>}
              </div>
            </div>
            <button onClick={onClose} style={{background:"rgba(255,255,255,.15)",border:"none",color:"white",width:30,height:30,borderRadius:"50%",cursor:"pointer",fontSize:18}}>×</button>
          </div>
          <div style={{display:"flex",gap:12,marginTop:18}}>
            {[["Bids",myBids.length],["Leading",leading.length],["Won",user.wonAuctions||0]].map(([k,v])=><div key={k} style={{flex:1,textAlign:"center",background:"rgba(255,255,255,.12)",borderRadius:10,padding:"10px 4px"}}><div style={{fontFamily:"var(--font-display)",fontSize:20,fontWeight:700,color:"white"}}>{v}</div><div style={{fontSize:11,color:"rgba(255,255,255,.65)"}}>{k}</div></div>)}
          </div>
        </div>
        <div style={{padding:20}}>
          {leading.length>0&&<div style={{marginBottom:20}}>
            <div style={{fontWeight:700,fontSize:14,marginBottom:10,display:"flex",alignItems:"center",gap:6}}><span className="live-dot"/>Leading Bids ({leading.length})</div>
            {leading.map(c=>{
              const carBids = bidHistory[c.id]||bidHistory[String(c.id)]||[];
              return <div key={c.id} style={{background:"var(--blue-pale)",border:"1px solid var(--blue-mid)",borderRadius:"var(--radius-sm)",padding:"11px 13px",marginBottom:6}}><div style={{fontWeight:600,fontSize:13}}>{c.year} {c.make} {c.model}</div><div style={{display:"flex",justifyContent:"space-between",marginTop:3}}><span style={{color:"var(--blue)",fontWeight:700,fontFamily:"var(--font-display)",fontSize:14}}>{fmt(c.currentBid)}</span><Countdown endTime={c.endTime}/></div></div>;
            })}
          </div>}
          <div style={{marginBottom:20}}>
            <div style={{fontWeight:700,fontSize:14,marginBottom:10}}>My Bids ({myBids.length})</div>
            {myBids.length===0?<div style={{color:"var(--text3)",fontSize:13,padding:14,background:"var(--surface2)",borderRadius:"var(--radius-sm)",textAlign:"center"}}>No bids yet</div>:
            <div style={{maxHeight:260,overflowY:"auto"}}>
              {myBids.sort((a,b)=>(b.time||0)-(a.time||0)).map((b,i)=>{const c=cars.find(x=>x.id===b.carId||String(x.id)===b.carId); return(
                <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"9px 0",borderBottom:"1px solid var(--border)",fontSize:13}}>
                  <div>
                    <div style={{fontWeight:600}}>{c?`${c.year} ${c.make} ${c.model}`:"Unknown"}</div>
                    <div style={{color:"var(--text4)",fontSize:11,display:"flex",gap:6,alignItems:"center"}}>
                      {timeAgo(b.time||Date.now())}
                      {b.paymentId && <span className="payment-badge" style={{fontSize:9}}>✓ Paid</span>}
                    </div>
                  </div>
                  <div style={{fontFamily:"var(--font-display)",fontWeight:700,color:"var(--blue)",fontSize:14}}>{fmt(b.amount)}</div>
                </div>);
              })}
            </div>}
          </div>
          <button className="btn btn-danger btn-md w-full" onClick={onLogout}>Sign Out</button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   EXPORT/IMPORT ENGINE
═══════════════════════════════════════════════════════════════════ */
function exportToCSV(data, filename) {
  if(!data.length) return;
  const keys = Object.keys(data[0]);
  const csv = [keys.join(","), ...data.map(row => keys.map(k => `"${String(row[k]||"").replace(/"/g,'""')}"`).join(","))].join("\n");
  const blob = new Blob([csv], {type:"text/csv;charset=utf-8;"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href=url; a.download=filename+".csv"; a.click();
  URL.revokeObjectURL(url);
}

function exportToJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {type:"application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href=url; a.download=filename+".json"; a.click();
  URL.revokeObjectURL(url);
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN APP
═══════════════════════════════════════════════════════════════════ */
export default function App() {
  const [cars, setCars] = useState(SEED_CARS);
  const [bidHistory, setBidHistory] = useState({});
  const [user, setUser] = useState(null);
  const [modal, setModal] = useState(null);
  const [bidCar, setBidCar] = useState(null);
  const [aiCar, setAiCar] = useState(null);
  const [detailCar, setDetailCar] = useState(null);
  const [watchlist, setWatchlist] = useState([]);
  const [tab, setTab] = useState("live");
  const [search, setSearch] = useState("");
  const [filterFuel, setFilterFuel] = useState("all");
  const [sortBy, setSortBy] = useState("ending");
  const [toast, setToast] = useState(null);
  const [notif, setNotif] = useState(null);
  const [firebaseReady, setFirebaseReady] = useState(false);
  const [fbLoading, setFbLoading] = useState(true);

  /* ── Initialize Firebase on mount ── */
  useEffect(() => {
    async function boot() {
      try {
        const { db, auth } = await initFirebase();
        if(db && auth) {
          setFirebaseReady(true);

          // Seed Firestore with initial cars if empty
          await CarsRepo.seedIfEmpty(SEED_CARS);

          // Subscribe to real-time car updates from Firestore
          const unsubCars = CarsRepo.subscribe((firestoreCars) => {
            if(firestoreCars.length > 0) setCars(firestoreCars);
          });

          // Load all bids from Firestore
          const allBids = await BidsRepo.getAll();
          setBidHistory(allBids);

          // Subscribe to auth state
          const unsubAuth = AuthService.onAuthChange((u) => {
            setUser(u);
          });

          return () => { unsubCars(); unsubAuth(); };
        }
      } catch(e) {
        console.warn("Firebase boot error:", e.message);
      }
      setFbLoading(false);
    }
    boot().then(cleanup => {
      setFbLoading(false);
      return cleanup;
    });
  }, []);

  /* ── Real-time bid simulation (supplements real bids) ── */
  useEffect(()=>{
    function sim(){
      const live=cars.filter(c=>c.endTime>Date.now());
      if(!live.length) return;
      const car=live[Math.floor(Math.random()*live.length)];
      const bidder=SIMULATED_BIDDERS[Math.floor(Math.random()*SIMULATED_BIDDERS.length)];
      const inc=[5000,10000,25000,50000][Math.floor(Math.random()*4)];
      const amount=car.currentBid+inc;
      const bid={ id:Math.random().toString(36).slice(2), userId:"bot"+Math.random(), userName:bidder, amount, carId:String(car.id), time:Date.now() };
      setCars(p=>p.map(c=>c.id===car.id?{...c,currentBid:amount}:c));
      setBidHistory(p=>({...p,[String(car.id)]:[bid,...(p[String(car.id)]||[])]}));
      setNotif({car:`${car.year} ${car.make} ${car.model}`,bidder,amount});
      setTimeout(()=>setNotif(null),4500);
    }
    const iv=setInterval(sim, Math.random()*12000+9000);
    return()=>clearInterval(iv);
  },[cars]);

  function showToast(msg,type="success"){setToast({msg,type});setTimeout(()=>setToast(null),3500);}

  /** Handle bid — writes to Firestore and updates local state */
  async function handleBid(carId, amount, bidUser, payment) {
    const carIdStr = String(carId);
    const bid = {
      userId: bidUser.uid || bidUser.id,
      userName: bidUser.name,
      amount,
      carId: carIdStr,
      time: Date.now(),
      paymentId: payment?.paymentId || null,
      depositAmount: payment?.depositAmount || null,
    };

    // Optimistic UI update
    setCars(p=>p.map(c=>String(c.id)===carIdStr?{...c,currentBid:amount}:c));
    setBidHistory(p=>({...p,[carIdStr]:[bid,...(p[carIdStr]||[])]}));
    setUser(p=>({...p,bidsPlaced:(p?.bidsPlaced||0)+1}));
    showToast(`🏆 Bid of ${fmt(amount)} placed! You're the highest bidder.`);

    // Write to Firestore if available
    if(firebaseReady) {
      try {
        await BidsRepo.create(bid);
        await CarsRepo.updateBid(carIdStr, amount);
        await UsersRepo.incrementBids(bidUser.uid || bidUser.id);
      } catch(e) {
        console.error("Firestore bid write error:", e);
      }
    }
  }

  function openBid(car){
    if(!user){setModal("auth");return;}
    setBidCar(car);setModal("bid");
  }

  function toggleWatch(id){setWatchlist(p=>p.includes(id)?p.filter(x=>x!==id):[...p,id]);}

  async function handleLogout() {
    await AuthService.signOut();
    setUser(null);
    setModal(null);
    showToast("Signed out successfully.");
  }

  let shown = cars
    .filter(c=>filterFuel==="all"||c.fuel===filterFuel)
    .filter(c=>tab==="watchlist"?watchlist.includes(c.id):true)
    .filter(c=>search===""||`${c.make} ${c.model} ${c.year} ${c.color} ${c.location}`.toLowerCase().includes(search.toLowerCase()));
  if(sortBy==="ending") shown.sort((a,b)=>a.endTime-b.endTime);
  else if(sortBy==="price_asc") shown.sort((a,b)=>a.currentBid-b.currentBid);
  else if(sortBy==="price_desc") shown.sort((a,b)=>b.currentBid-a.currentBid);
  else if(sortBy==="bids") shown.sort((a,b)=>(Object.values(bidHistory).flat().filter(x=>String(x.carId)===String(b.id)).length)-(Object.values(bidHistory).flat().filter(x=>String(x.carId)===String(a.id)).length));

  const totalBids = Object.values(bidHistory).reduce((s,arr)=>s+arr.length,0);

  const getBids = (carId) => bidHistory[carId] || bidHistory[String(carId)] || [];

  return (
    <>
      <style>{GLOBAL_CSS}</style>

      {/* ── HEADER ── */}
      <header style={{background:"white",borderBottom:"1px solid var(--border)",boxShadow:"var(--shadow-sm)",position:"sticky",top:0,zIndex:500}} className="no-print">
        <div className="container">
          <div className="header-inner">
            <div style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer"}} onClick={()=>setDetailCar(null)}>
              <span style={{fontSize:24}}>🏁</span>
              <div>
                <div style={{fontFamily:"var(--font-display)",fontWeight:800,fontSize:20,color:"var(--blue)",lineHeight:1.1}}>BidDrive</div>
                <div className="nav-brand-sub" style={{fontSize:10,color:"var(--text4)",letterSpacing:1,textTransform:"uppercase"}}>Premium Car Auctions</div>
              </div>
            </div>
            <div className="header-right">
              {/* Firebase status badge */}
              <div className={`fb-status ${firebaseReady?"live":"demo"} header-stat`}>
                <span style={{width:6,height:6,borderRadius:"50%",background:firebaseReady?"#22c55e":"#f59e0b",display:"inline-block"}}/>
                {firebaseReady?"🔥 Firebase Live":"Demo Mode"}
              </div>
              <div className="header-stat flex items-center gap-4" style={{background:"var(--surface2)",border:"1px solid var(--border)",borderRadius:20,padding:"5px 12px",fontSize:12}}>
                <span className="live-dot"/><span style={{color:"var(--text3)",fontWeight:600}}>{cars.filter(c=>c.endTime>Date.now()).length} Live</span>
              </div>
              <div className="header-stat" style={{fontSize:12,color:"var(--text3)"}}><strong style={{color:"var(--text)"}}>{totalBids}</strong> bids</div>
              {user?(
                <button onClick={()=>setModal("profile")} style={{display:"flex",alignItems:"center",gap:8,background:"var(--blue-pale)",border:"1.5px solid var(--blue-mid)",borderRadius:24,padding:"6px 14px 6px 8px",cursor:"pointer"}}>
                  {user.photoURL ? (
                    <img src={user.photoURL} style={{width:28,height:28,borderRadius:"50%",objectFit:"cover",flexShrink:0}} alt={user.name}/>
                  ) : (
                    <div style={{width:28,height:28,background:"var(--blue)",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:"white",flexShrink:0}}>{user.avatar||"?"}</div>
                  )}
                  <span style={{fontSize:13,fontWeight:600,color:"var(--blue)",display:"none"}} className="header-stat">{user.name?.split(" ")[0]}</span>
                </button>
              ):(
                <button className="btn btn-primary btn-sm" onClick={()=>setModal("auth")}>Sign In</button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ── MAIN ── */}
      <main className="container page-content" style={{paddingTop:24}}>
        {detailCar ? (
          <DetailPage car={detailCar} bids={getBids(detailCar.id)} user={user} onBack={()=>setDetailCar(null)} onBid={openBid} onAI={c=>{setAiCar(c);setModal("ai");}}/>
        ):(
          <>
            {/* Stats */}
            <div className="grid-stats" style={{marginBottom:22}}>
              {[
                {icon:"🏎️",label:"Live Auctions",val:cars.filter(c=>c.endTime>Date.now()).length},
                {icon:"⚡",label:"Bids Today",val:totalBids},
                {icon:"💰",label:"Total Value",val:fmt(cars.reduce((s,c)=>s+c.currentBid,0))},
                {icon:"👥",label:"Active Bidders",val:new Set(Object.values(bidHistory).flat().map(b=>b.userId)).size},
              ].map(s=>(
                <div key={s.label} className="card" style={{padding:"16px 18px"}}>
                  <div style={{fontSize:20,marginBottom:4}}>{s.icon}</div>
                  <div style={{fontFamily:"var(--font-display)",fontWeight:700,fontSize:22}}>{s.val}</div>
                  <div style={{color:"var(--text3)",fontSize:12}}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Toolbar */}
            <div className="card toolbar no-print" style={{padding:"14px 16px",marginBottom:20}}>
              <div className="tab-bar" style={{display:"flex",gap:20,borderBottom:"none",paddingRight:12,marginRight:4,borderRight:"1px solid var(--border)"}}>
                {[["live","🔴 Live"],["watchlist","❤️ Saved"]].map(([k,l])=>(
                  <button key={k} className={`tab-btn${tab===k?" active":""}`} onClick={()=>setTab(k)} style={{paddingBottom:0,fontSize:13}}>{l}</button>
                ))}
              </div>
              <input className="field-input" style={{flex:1,minWidth:140}} value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Search make, model, color, city..."/>
              <select className="field-input" style={{width:"auto",minWidth:120}} value={filterFuel} onChange={e=>setFilterFuel(e.target.value)}>
                <option value="all">All Fuels</option>
                <option value="Petrol">Petrol</option>
                <option value="Diesel">Diesel</option>
                <option value="Mild Hybrid">Hybrid</option>
              </select>
              <select className="field-input" style={{width:"auto",minWidth:150}} value={sortBy} onChange={e=>setSortBy(e.target.value)}>
                <option value="ending">Ending Soonest</option>
                <option value="price_asc">Price: Low → High</option>
                <option value="price_desc">Price: High → Low</option>
                <option value="bids">Most Bids</option>
              </select>
              <div style={{color:"var(--text3)",fontSize:13,whiteSpace:"nowrap"}}>{shown.length} cars</div>
            </div>

            {/* Grid */}
            {shown.length===0?(
              <div style={{textAlign:"center",padding:"60px 20px",color:"var(--text3)"}}>
                <div style={{fontSize:48,marginBottom:12}}>🔍</div>
                <div style={{fontFamily:"var(--font-display)",fontSize:18,fontWeight:700,color:"var(--text)",marginBottom:6}}>No cars found</div>
                <div>Try adjusting your search or filters</div>
              </div>
            ):(
              <div className="grid-cards">
                {shown.map(car=>(
                  <CarCard key={car.id} car={car} bids={getBids(car.id)} watched={watchlist.includes(car.id)}
                    onDetail={setDetailCar} onBid={openBid}
                    onAI={c=>{setAiCar(c);setModal("ai");}} onWatch={toggleWatch}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {/* ── FOOTER ── */}
      <footer className="no-print" style={{background:"white",borderTop:"1px solid var(--border)",padding:"24px 16px",textAlign:"center",marginTop:32}}>
        <div style={{fontFamily:"var(--font-display)",fontWeight:700,fontSize:18,color:"var(--blue)",marginBottom:4}}>🏁 BidDrive</div>
        <div style={{color:"var(--text3)",fontSize:13}}>India's Premier Car Auction Platform · Secure · Verified · Real-Time</div>
        <div style={{display:"flex",justifyContent:"center",gap:12,marginTop:8,flexWrap:"wrap"}}>
          <div className="razorpay-badge">💳 Razorpay Payments</div>
          <div className={`fb-status ${firebaseReady?"live":"demo"}`} style={{fontSize:11}}>
            <span style={{width:6,height:6,borderRadius:"50%",background:firebaseReady?"#22c55e":"#f59e0b",display:"inline-block"}}/>
            {firebaseReady?"Firebase Firestore":"Demo Mode"}
          </div>
          <div style={{background:"var(--surface2)",border:"1px solid var(--border)",borderRadius:20,padding:"3px 10px",fontSize:11,color:"var(--text3)"}}>🔐 Google SSO</div>
        </div>
        <div style={{color:"var(--text4)",fontSize:12,marginTop:8}}>© 2026 BidDrive. All rights reserved.</div>
      </footer>

      {/* ── MOBILE BOTTOM NAV ── */}
      <nav className="mobile-nav no-print">
        {[["live","🏎","Live"],["watchlist","❤️","Saved"],["profile","👤","Account"]].map(([k,icon,label])=>(
          <button key={k} className={`mobile-nav-btn${tab===k?"active":""}`}
            onClick={()=>{
              if(k==="live"||k==="watchlist"){setTab(k);setDetailCar(null);}
              else if(k==="profile"){if(!user)setModal("auth"); else setModal("profile");}
            }}>
            <span className="icon">{icon}</span>
            <span>{label}</span>
          </button>
        ))}
      </nav>

      {/* ── MODALS ── */}
      {modal==="auth" && <AuthModal firebaseReady={firebaseReady} onAuth={u=>{setUser(u);setModal(null);showToast(`Welcome, ${u.name?.split(" ")[0]}! 👋`);}} onClose={()=>setModal(null)}/>}
      {modal==="bid" && bidCar && <BidModal car={bidCar} user={user} bidHistory={bidHistory} razorpayReady={true} onClose={()=>{setModal(null);setBidCar(null);}} onConfirm={handleBid}/>}
      {modal==="ai" && aiCar && <AIAdvisor car={aiCar} user={user} onClose={()=>{setModal(null);setAiCar(null);}}/>}
      {modal==="profile" && user && <ProfilePanel user={user} bidHistory={bidHistory} cars={cars} onClose={()=>setModal(null)} onLogout={handleLogout}/>}

      {/* ── LIVE BID NOTIFICATION ── */}
      {notif&&(
        <div style={{position:"fixed",top:80,right:16,background:"white",border:"1px solid var(--border)",borderLeft:"4px solid var(--blue)",borderRadius:"var(--radius-sm)",padding:"11px 14px",boxShadow:"var(--shadow-lg)",zIndex:800,animation:"notifIn .3s ease",maxWidth:280}} className="no-print">
          <div style={{fontSize:10,color:"var(--text4)",marginBottom:2,display:"flex",alignItems:"center",gap:4}}><span className="live-dot"/>New Bid</div>
          <div style={{fontWeight:700,fontSize:13}}>{notif.bidder}</div>
          <div style={{fontSize:12,color:"var(--text3)"}}>bid <strong style={{color:"var(--blue)",fontFamily:"var(--font-display)"}}>{fmt(notif.amount)}</strong> on {notif.car}</div>
        </div>
      )}

      {/* ── TOAST ── */}
      {toast&&(
        <div style={{position:"fixed",bottom:80,left:"50%",transform:"translateX(-50%)",background:toast.type==="error"?"var(--red)":"var(--text)",color:"white",padding:"12px 22px",borderRadius:30,fontWeight:600,fontSize:13,zIndex:9999,boxShadow:"var(--shadow-xl)",animation:"toastIn .3s ease",whiteSpace:"nowrap"}} className="no-print">
          {toast.msg}
        </div>
      )}
    </>
  );
}
