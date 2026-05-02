

import { initializeApp, getApps } from "firebase/app";
import {
  getFirestore, collection, doc, addDoc, updateDoc,
  getDocs, getDoc, onSnapshot, query, orderBy, where,
  serverTimestamp, increment,
} from "firebase/firestore";
import {
  getAuth, onAuthStateChanged, signInWithPopup, GoogleAuthProvider,
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signOut, updateProfile,
} from "firebase/auth";

// ── Replace with YOUR Firebase project config ─────────────────
// Firebase Console → Project Settings → Your Apps → Config
export const FIREBASE_CONFIG = {
apiKey: "AIzaSyDE-aBnNvDf1EAQ27gAbdR_18uFr5B55Io",
  authDomain: "biddrive-2963d.firebaseapp.com",
  projectId: "biddrive-2963d",
  storageBucket: "biddrive-2963d.firebasestorage.app",
  messagingSenderId: "847123797896",
  appId: "1:847123797896:web:3fd1238e83460684f74c3d",
};

let _db   = null;
let _auth = null;
let _initDone = false;

/**
 * Initialise Firebase once. Safe to call multiple times.
 * Exposes all Firestore + Auth methods on window._fs.
 */
export async function initFirebase() {
  if (_initDone) return { db: _db, auth: _auth };

  try {
    const isPlaceholder = FIREBASE_CONFIG.apiKey === "YOUR_API_KEY";
    if (isPlaceholder) {
      console.warn("Firebase: using placeholder config — running in demo mode. Add real keys to .env.local");
      _initDone = true;
      return { db: null, auth: null };
    }

    const app = getApps().length ? getApps()[0] : initializeApp(FIREBASE_CONFIG);
    _db   = getFirestore(app);
    _auth = getAuth(app);

    // Expose on window so repositories can access without re-importing
    window._fs = {
      db: _db, auth: _auth,
      collection, doc, addDoc, updateDoc, getDocs, getDoc,
      onSnapshot, query, orderBy, where, serverTimestamp, increment,
      signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword,
      createUserWithEmailAndPassword, signOut, updateProfile, onAuthStateChanged,
    };

    _initDone = true;
    return { db: _db, auth: _auth };
  } catch (err) {
    console.error("Firebase init error:", err.message);
    _initDone = true;
    return { db: null, auth: null };
  }
}

