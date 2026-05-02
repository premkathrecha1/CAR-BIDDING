

import { UsersRepo } from "./repositories.js";
import { getInitials } from "../utils/index.js";

const AuthService = {
  /**
   * Sign in with Google popup (OAuth 2.0).
   * Creates or updates the Firestore user profile on success.
   * @returns {Promise<UserModel>}
   */
  async googleSignIn() {
    if (!window._fs) throw new Error("Firebase not initialised");
    const { auth, signInWithPopup, GoogleAuthProvider } = window._fs;
    const provider = new GoogleAuthProvider();
    provider.addScope("profile");
    provider.addScope("email");

    const result = await signInWithPopup(auth, provider);
    const fbUser  = result.user;

    const profile = {
      name:     fbUser.displayName || "User",
      email:    fbUser.email,
      avatar:   getInitials(fbUser.displayName || "U"),
      photoURL: fbUser.photoURL || null,
      city:     "",
      phone:    "",
      provider: "google",
    };

    await UsersRepo.upsert(fbUser.uid, profile);
    return { uid: fbUser.uid, id: fbUser.uid, ...profile };
  },

  /**
   * Sign in with email and password.
   * Fetches the Firestore profile after authentication.
   * @param {string} email
   * @param {string} password
   * @returns {Promise<UserModel>}
   */
  async emailSignIn(email, password) {
    if (!window._fs) throw new Error("Firebase not initialised");
    const { auth, signInWithEmailAndPassword } = window._fs;
    const cred    = await signInWithEmailAndPassword(auth, email, password);
    const profile = await UsersRepo.get(cred.user.uid);
    return { uid: cred.user.uid, id: cred.user.uid, ...profile };
  },

  /**
   * Register a new user with email and password.
   * Creates the Firebase Auth account, sets displayName,
   * then creates a Firestore user profile document.
   * @param {{ name, email, password, phone, city }} fields
   * @returns {Promise<UserModel>}
   */
  async register({ name, email, password, phone, city }) {
    if (!window._fs) throw new Error("Firebase not initialised");
    const { auth, createUserWithEmailAndPassword, updateProfile } = window._fs;

    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: name });

    const profile = {
      name, email, phone, city,
      avatar:   getInitials(name),
      provider: "email",
    };

    await UsersRepo.upsert(cred.user.uid, profile);
    return { uid: cred.user.uid, id: cred.user.uid, ...profile };
  },

  /**
   * Sign the current user out of Firebase Auth.
   */
  async signOut() {
    if (!window._fs) return;
    await window._fs.signOut(window._fs.auth);
  },

  /**
   * Subscribe to Firebase Auth state changes.
   * Fetches the Firestore profile on every sign-in event.
   * @param {Function} callback - Called with UserModel|null
   * @returns {Function} unsubscribe
   */
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

export default AuthService;
