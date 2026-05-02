/**
 * src/services/adminRepositories.js
 * ─────────────────────────────────────────────────────────────
 * Admin-only Firestore CRUD operations.
 * All destructive ops (delete, bulk-update) live here, separate
 * from the user-facing repositories.js.
 * ─────────────────────────────────────────────────────────────
 */

// ── AdminCarsRepo ─────────────────────────────────────────────
export const AdminCarsRepo = {
  /** Real-time all-cars stream, no ordering restriction */
  subscribe(callback) {
    if (!window._fs) return () => {};
    const { db, collection, onSnapshot } = window._fs;
    return onSnapshot(
      collection(db, "cars"),
      (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (err) => console.error("AdminCarsRepo.subscribe:", err)
    );
  },

  /** Create new car listing */
  async create(data) {
    if (!window._fs) return null;
    const { db, collection, addDoc, serverTimestamp } = window._fs;
    const ref = await addDoc(collection(db, "cars"), {
      ...data,
      currentBid: data.startingBid,
      bidCount: 0,
      createdAt: serverTimestamp(),
    });
    return ref.id;
  },

  /** Update any car fields */
  async update(id, data) {
    if (!window._fs) return;
    const { db, doc, updateDoc, serverTimestamp } = window._fs;
    await updateDoc(doc(db, "cars", id), { ...data, updatedAt: serverTimestamp() });
  },

  /** Delete car + all its bids */
  async delete(id) {
    if (!window._fs) return;
    const { db, doc, deleteDoc, collection, query, where, getDocs } = window._fs;
    // delete bids first
    const bidsSnap = await getDocs(query(collection(db, "bids"), where("carId", "==", id)));
    for (const b of bidsSnap.docs) await deleteDoc(b.ref);
    await deleteDoc(doc(db, "cars", id));
  },

  /** Extend auction end time by hours */
  async extendAuction(id, extraHours) {
    if (!window._fs) return;
    const { db, doc, getDoc, updateDoc } = window._fs;
    const snap = await getDoc(doc(db, "cars", id));
    if (!snap.exists()) return;
    const current = snap.data().endTime || Date.now();
    await updateDoc(doc(db, "cars", id), {
      endTime: current + extraHours * 3_600_000,
    });
  },
};

// ── AdminUsersRepo ────────────────────────────────────────────
export const AdminUsersRepo = {
  /** Real-time all-users stream */
  subscribe(callback) {
    if (!window._fs) return () => {};
    const { db, collection, onSnapshot } = window._fs;
    return onSnapshot(
      collection(db, "users"),
      (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (err) => console.error("AdminUsersRepo.subscribe:", err)
    );
  },

  /** Toggle verified flag */
  async setVerified(uid, verified) {
    if (!window._fs) return;
    const { db, doc, updateDoc } = window._fs;
    await updateDoc(doc(db, "users", uid), { verified });
  },

  /** Soft-ban: set banned=true */
  async setBanned(uid, banned) {
    if (!window._fs) return;
    const { db, doc, updateDoc } = window._fs;
    await updateDoc(doc(db, "users", uid), { banned });
  },

  /** Update any user fields */
  async update(uid, data) {
    if (!window._fs) return;
    const { db, doc, updateDoc } = window._fs;
    await updateDoc(doc(db, "users", uid), data);
  },
};

// ── AdminBidsRepo ─────────────────────────────────────────────
export const AdminBidsRepo = {
  /** All bids, newest first */
  async getAll() {
    if (!window._fs) return [];
    const { db, collection, getDocs } = window._fs;
    const snap = await getDocs(collection(db, "bids"));
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.time || 0) - (a.time || 0));
  },

  /** Delete a single bid */
  async delete(bidId) {
    if (!window._fs) return;
    const { db, doc, deleteDoc } = window._fs;
    await deleteDoc(doc(db, "bids", bidId));
  },
};

// ── AdminPaymentsRepo ─────────────────────────────────────────
export const AdminPaymentsRepo = {
  /** All payments, newest first */
  subscribe(callback) {
    if (!window._fs) return () => {};
    const { db, collection, query, orderBy, onSnapshot } = window._fs;
    return onSnapshot(
      query(collection(db, "payments"), orderBy("createdAt", "desc")),
      (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (err) => console.error("AdminPaymentsRepo.subscribe:", err)
    );
  },

  /** Mark refunded */
  async markRefunded(paymentId) {
    if (!window._fs) return;
    const { db, doc, updateDoc } = window._fs;
    await updateDoc(doc(db, "payments", paymentId), {
      status: "refunded",
      refundedAt: new Date().toISOString(),
    });
  },
};

// ── AdminStatsRepo ────────────────────────────────────────────
export const AdminStatsRepo = {
  /** Aggregate dashboard stats from Firestore */
  async getDashboard() {
    if (!window._fs) return null;
    const { db, collection, getDocs } = window._fs;
    const [carsSnap, bidsSnap, usersSnap, paymentsSnap] = await Promise.all([
      getDocs(collection(db, "cars")),
      getDocs(collection(db, "bids")),
      getDocs(collection(db, "users")),
      getDocs(collection(db, "payments")),
    ]);

    const cars     = carsSnap.docs.map((d) => d.data());
    const bids     = bidsSnap.docs.map((d) => d.data());
    const payments = paymentsSnap.docs.map((d) => d.data());

    const totalRevenue = payments
      .filter((p) => p.status === "completed")
      .reduce((s, p) => s + (p.depositAmount || 0), 0);

    const liveAuctions = cars.filter((c) => (c.endTime || 0) > Date.now()).length;
    const topCar = cars.sort((a, b) => (b.currentBid || 0) - (a.currentBid || 0))[0];

    return {
      totalCars:     carsSnap.size,
      totalBids:     bidsSnap.size,
      totalUsers:    usersSnap.size,
      totalPayments: paymentsSnap.size,
      totalRevenue,
      liveAuctions,
      topCar:        topCar ? `${topCar.year} ${topCar.make} ${topCar.model}` : "—",
      topBid:        topCar?.currentBid || 0,
      bidsToday:     bids.filter((b) => b.time > Date.now() - 86_400_000).length,
    };
  },
};