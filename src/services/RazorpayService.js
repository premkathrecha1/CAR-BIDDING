/**
 * src/services/RazorpayService.js
 * ─────────────────────────────────────────────────────────────
 * Razorpay payment gateway service.
 *
 * Flow:
 *   1. Load Razorpay checkout.js SDK dynamically (once)
 *   2. Open the Razorpay modal for bid deposit collection
 *   3. On success, write a payment record to Firestore
 *   4. Resolve with { paymentId, depositAmount }
 *
 * NOTE: In production, create a Razorpay Order on your backend
 * (POST /api/orders) and pass the orderId here for proper
 * signature verification. See: https://razorpay.com/docs/payments/orders/
 * ─────────────────────────────────────────────────────────────
 */

import { RAZORPAY_KEY_ID, DEPOSIT_PERCENT } from "../config/razorpay.js";
import { PaymentsRepo }                      from "./repositories.js";
import { formatCurrencyFull }               from "../utils/index.js";

const RazorpayService = {
  /**
   * Dynamically loads the Razorpay Checkout SDK.
   * Safe to call multiple times — resolves immediately if already loaded.
   * @returns {Promise<boolean>} true if script loaded successfully
   */
  async loadScript() {
    if (window.Razorpay) return true;
    return new Promise((resolve) => {
      const script    = document.createElement("script");
      script.src      = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload   = () => resolve(true);
      script.onerror  = () => resolve(false);
      document.head.appendChild(script);
    });
  },

  /**
   * Opens the Razorpay modal and collects the bid deposit.
   * Charges DEPOSIT_PERCENT (2%) of the bid amount as a refundable security.
   *
   * @param {{ amount: number, bidAmount: number, car: CarModel, user: UserModel }} opts
   * @returns {Promise<{ paymentId: string, depositAmount: number, firestoreId?: string }>}
   */
  async collectDeposit({ amount, bidAmount, car, user }) {
    const loaded = await this.loadScript();
    if (!loaded) throw new Error("Razorpay SDK failed to load. Check your network.");

    const depositAmount = Math.round(amount * DEPOSIT_PERCENT); // e.g. ₹10,240 on ₹5,12,000
    const depositPaise  = depositAmount * 100;                  // Razorpay works in paise

    return new Promise((resolve, reject) => {
      const options = {
        key:         RAZORPAY_KEY_ID,
        amount:      depositPaise,
        currency:    "INR",
        name:        "BidDrive",
        description: `Bid Deposit — ${car.year} ${car.make} ${car.model}`,
        image:       "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=100&q=80",
        prefill: {
          name:    user.name,
          email:   user.email,
          contact: user.phone || "",
        },
        notes: {
          carId:         String(car.id),
          carName:       `${car.year} ${car.make} ${car.model}`,
          bidAmount:     String(bidAmount),
          depositAmount: String(depositAmount),
          userId:        user.uid || user.id,
        },
        theme: { color: "#1d4ed8" },
        modal: {
          ondismiss: () => reject(new Error("Payment cancelled by user.")),
        },

        /**
         * Success handler — fires after Razorpay confirms payment.
         * We immediately record the payment in Firestore, then resolve.
         */
        handler: async (response) => {
          try {
            const firestoreId = await PaymentsRepo.create({
              razorpayPaymentId: response.razorpay_payment_id,
              razorpayOrderId:   response.razorpay_order_id  || "demo_" + Date.now(),
              razorpaySignature: response.razorpay_signature || "",
              userId:            user.uid || user.id,
              userName:          user.name,
              carId:             String(car.id),
              carName:           `${car.year} ${car.make} ${car.model}`,
              bidAmount,
              depositAmount,
              currency:          "INR",
            });
            resolve({
              paymentId:    response.razorpay_payment_id,
              depositAmount,
              firestoreId,
            });
          } catch {
            // Payment succeeded even if Firestore recording failed
            resolve({ paymentId: response.razorpay_payment_id, depositAmount });
          }
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", (resp) =>
        reject(new Error(resp.error?.description || "Payment failed"))
      );
      rzp.open();
    });
  },
};

export default RazorpayService;
