

// ── CarsRepo ─────────────────────────────────────────────────
export const CarsRepo = {
  /**
   * Subscribe to all cars, ordered by soonest-ending first.
   * @param {Function} callback - Receives CarModel[]
   * @returns {Function} unsubscribe
   */
  subscribe(callback) {
    if (!window._fs) return () => {};
    const { db, collection, query, orderBy, onSnapshot } = window._fs;
    const q = query(collection(db, "cars"), orderBy("endTime", "asc"));
    return onSnapshot(
      q,
      (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (err)  => console.error("CarsRepo.subscribe error:", err)
    );
  },

  /**
   * Fetch a single car document by Firestore ID.
   * @param {string} id
   * @returns {Promise<CarModel|null>}
   */
  async get(id) {
    if (!window._fs) return null;
    const { db, doc, getDoc } = window._fs;
    const snap = await getDoc(doc(db, "cars", String(id)));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  },

  /**
   * Seeds the cars collection if it is empty.
   * Called once on first boot to populate demo data.
   * @param {CarModel[]} cars
   */
  async seedIfEmpty(cars) {
    if (!window._fs) return;
    const { db, collection, getDocs, addDoc } = window._fs;
    const snap = await getDocs(collection(db, "cars"));
    if (!snap.empty) return;
    for (const car of cars) {
      await addDoc(collection(db, "cars"), { ...car, createdAt: new Date().toISOString() });
    }
  },

  /**
   * Atomically increases currentBid and bidCount for a car.
   * Uses Firestore increment() to avoid race conditions.
   * @param {string} carId
   * @param {number} newBid
   */
  async updateBid(carId, newBid) {
    if (!window._fs) return;
    const { db, doc, updateDoc, increment } = window._fs;
    await updateDoc(doc(db, "cars", carId), {
      currentBid: newBid,
      bidCount:   increment(1),
      lastBidAt:  new Date().toISOString(),
    });
  },
};

// ── BidsRepo ──────────────────────────────────────────────────
export const BidsRepo = {
  /**
   * Subscribe to bids for a specific car, highest first.
   * @param {string}   carId
   * @param {Function} callback - Receives BidModel[]
   * @returns {Function} unsubscribe
   */
  subscribe(carId, callback) {
    if (!window._fs) return () => {};
    const { db, collection, query, orderBy, where, onSnapshot } = window._fs;
    const q = query(
      collection(db, "bids"),
      where("carId", "==", carId),
      orderBy("amount", "desc")
    );
    return onSnapshot(q, (snap) =>
      callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
  },

  /**
   * Loads all bids and groups them by carId.
   * Used for initial page load.
   * @returns {Promise<Object>} { [carId]: BidModel[] }
   */
  async getAll() {
    if (!window._fs) return {};
    const { db, collection, getDocs } = window._fs;
    const snap = await getDocs(collection(db, "bids"));
    const grouped = {};
    snap.docs.forEach((d) => {
      const bid = { id: d.id, ...d.data() };
      if (!grouped[bid.carId]) grouped[bid.carId] = [];
      grouped[bid.carId].push(bid);
    });
    // Sort each group: highest bid first
    Object.values(grouped).forEach((arr) =>
      arr.sort((a, b) => b.amount - a.amount)
    );
    return grouped;
  },

  /**
   * Persists a new bid to Firestore.
   * @param {BidModel} bid
   * @returns {Promise<string>} Firestore document ID
   */
  async create(bid) {
    if (!window._fs) return null;
    const { db, collection, addDoc, serverTimestamp } = window._fs;
    const ref = await addDoc(collection(db, "bids"), {
      ...bid,
      createdAt: serverTimestamp(),
      time:      Date.now(),
    });
    return ref.id;
  },
};

// ── UsersRepo ─────────────────────────────────────────────────
export const UsersRepo = {
  /**
   * Fetches a user profile from Firestore by Firebase Auth UID.
   * @param {string} uid
   * @returns {Promise<UserModel|null>}
   */
  async get(uid) {
    if (!window._fs) return null;
    const { db, doc, getDoc } = window._fs;
    const snap = await getDoc(doc(db, "users", uid));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  },

  /**
   * Creates or updates a user profile (upsert).
   * On first login (Google or email), creates a full profile document.
   * On subsequent logins, updates only the changed fields.
   * @param {string}    uid
   * @param {UserModel} data
   */
  async upsert(uid, data) {
    if (!window._fs) return;
    const { db, doc, updateDoc, getDoc } = window._fs;
    const ref  = doc(db, "users", uid);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      await updateDoc(ref, { ...data, updatedAt: new Date().toISOString() });
    } else {
      const { setDoc } = await import("firebase/firestore");
      await setDoc(ref, {
        ...data,
        bidsPlaced:  0,
        wonAuctions: 0,
        verified:    false,
        createdAt:   new Date().toISOString(),
      });
    }
  },

  /**
   * Increments the bidsPlaced counter for a user.
   * Called after every successful bid submission.
   * @param {string} uid
   */
  async incrementBids(uid) {
    if (!window._fs) return;
    const { db, doc, updateDoc, increment } = window._fs;
    await updateDoc(doc(db, "users", uid), { bidsPlaced: increment(1) });
  },
};

// ── PaymentsRepo ──────────────────────────────────────────────
export const PaymentsRepo = {
  /**
   * Records a completed Razorpay payment in Firestore.
   * Called from RazorpayService after a successful payment.
   * @param {Object} payment
   * @returns {Promise<string>} Firestore document ID
   */
  async create(payment) {
    if (!window._fs) return null;
    const { db, collection, addDoc, serverTimestamp } = window._fs;
    const ref = await addDoc(collection(db, "payments"), {
      ...payment,
      status:    "completed",
      createdAt: serverTimestamp(),
    });
    return ref.id;
  },

  /**
   * Retrieves all payments for a given user, newest first.
   * @param {string} userId
   * @returns {Promise<Object[]>}
   */
  async getByUser(userId) {
    if (!window._fs) return [];
    const { db, collection, query, where, getDocs, orderBy } = window._fs;
    const q = query(
      collection(db, "payments"),
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },
};
