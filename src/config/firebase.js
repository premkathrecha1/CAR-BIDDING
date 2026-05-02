

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDE-aBnNvDf1EAQ27gAbdR_18uFr5B55Io",
  authDomain: "biddrive-2963d.firebaseapp.com",
  projectId: "biddrive-2963d",
  storageBucket: "biddrive-2963d.firebasestorage.app",
  messagingSenderId: "847123797896",
  appId: "1:847123797896:web:3fd1238e83460684f74c3d",
};


let _db   = null;
let _auth = null;
let _firebaseInitPromise = null;

/**

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
