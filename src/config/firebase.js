/**
 * src/config/firebase.js
 * ─────────────────────────────────────────────────────────────
 * Firebase initialisation — lazy singleton pattern.
 * All Firebase SDK methods are exposed via window._fs after init.
 *
 * Usage:
 *   import { initFirebase } from '../config/firebase';
 *   const { db, auth } = await initFirebase();
 * ─────────────────────────────────────────────────────────────
 */

export const FIREBASE_CONFIG = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY            ?? "YOUR_API_KEY",
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN        ?? "YOUR_PROJECT.firebaseapp.com",
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID         ?? "YOUR_PROJECT_ID",
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET     ?? "YOUR_PROJECT.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? "YOUR_SENDER_ID",
  appId:             import.meta.env.VITE_FIREBASE_APP_ID             ?? "YOUR_APP_ID",
};

let _db   = null;
let _auth = null;
let _firebaseInitPromise = null;

/**
 * Lazily initialises Firebase App, Firestore, and Auth.
 * Safe to call multiple times — returns cached singletons.
 * @returns {Promise<{ db: Firestore|null, auth: Auth|null }>}
 */
export async function initFirebase() {
  if (_db && _auth) return { db: _db, auth: _auth };
  if (_firebaseInitPromise) return _firebaseInitPromise;

  _firebaseInitPromise = (async () => {
    try {
      const { initializeApp, getApps } =
        await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js");

      const {
        getFirestore, collection, doc, addDoc, updateDoc,
        getDocs, getDoc, onSnapshot, query, orderBy, where,
        serverTimestamp, increment,
      } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");

      const {
        getAuth, onAuthStateChanged, signInWithPopup, GoogleAuthProvider,
        signInWithEmailAndPassword, createUserWithEmailAndPassword,
        signOut, updateProfile,
      } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js");

      const app = getApps().length ? getApps()[0] : initializeApp(FIREBASE_CONFIG);

      _db   = getFirestore(app);
      _auth = getAuth(app);

      // Expose all Firestore + Auth methods globally so repository files
      // can import them without re-initialising Firebase each time.
      window._fs = {
        db: _db, auth: _auth,
        collection, doc, addDoc, updateDoc, getDocs, getDoc,
        onSnapshot, query, orderBy, where, serverTimestamp, increment,
        signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword,
        createUserWithEmailAndPassword, signOut, updateProfile, onAuthStateChanged,
      };

      return { db: _db, auth: _auth };
    } catch (err) {
      console.warn("Firebase not configured — running in demo mode.", err.message);
      return { db: null, auth: null };
    }
  })();

  return _firebaseInitPromise;
}
