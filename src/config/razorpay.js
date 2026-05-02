/**
 * src/config/razorpay.js
 * ─────────────────────────────────────────────────────────────
 * Razorpay configuration constants.
 * The Key ID is safe to include in frontend bundles.
 * NEVER expose your Key Secret here — that belongs on the backend.
 * ─────────────────────────────────────────────────────────────
 */

/** Razorpay publishable key — use rzp_test_... for dev, rzp_live_... for prod */
export const RAZORPAY_KEY_ID =
  import.meta.env.VITE_RAZORPAY_KEY_ID ?? "rzp_test_YOUR_KEY_HERE";

/** Deposit percentage charged as refundable security on each bid */
export const DEPOSIT_PERCENT = 0.02; // 2%
