/**
 * src/components/BidModal.jsx
 * ─────────────────────────────────────────────────────────────
 * BidDrive — Bid Flow with ₹20 Fixed Deposit Gate
 *
 * Steps (in order):
 *   Step 1 — "deposit"  : Show ₹20 deposit prompt (first visit)
 *   Step 2 — "paying"   : Processing Razorpay / simulated payment
 *   Step 3 — "form"     : Enter bid amount (unlocked after deposit)
 *   Step 4 — "confirm"  : Review bid summary
 *   Step 5 — "success"  : Confirmation + receipt
 *
 * Logic:
 *   - If user has already paid the ₹20 deposit (depositPaid === true),
 *     skip step 1 and go straight to "form".
 *   - Deposit is a one-time ₹20 access fee per session.
 *     In production, persist `depositPaid` to the user's Firestore doc.
 * ─────────────────────────────────────────────────────────────
 */

import { useState } from "react";
import { Field, Countdown } from "./UI.jsx";
import RazorpayService      from "../services/RazorpayService.js";
import { RAZORPAY_KEY_ID }  from "../config/razorpay.js";
import { useForm }          from "../hooks/index.js";
import {
  VALIDATORS,
  formatCurrency,
  formatCurrencyFull,
} from "../utils/index.js";

/* ─── Constants ────────────────────────────────────────────── */
const DEPOSIT_AMOUNT     = 20;      // Fixed ₹20 deposit
const DEPOSIT_PAISE      = 2000;    // Razorpay uses paise (₹20 = 2000 paise)
const DEPOSIT_STORAGE_KEY = "bd_deposit_paid"; // sessionStorage key

/* ─── Helpers ───────────────────────────────────────────────── */
function hasUserPaidDeposit() {
  // In production: check user.depositPaid from Firestore/backend
  return sessionStorage.getItem(DEPOSIT_STORAGE_KEY) === "true";
}
function markDepositPaid() {
  sessionStorage.setItem(DEPOSIT_STORAGE_KEY, "true");
}

/**
 * BidModal — complete bid flow with ₹20 deposit gate.
 *
 * @param {{
 *   car:        CarModel,
 *   user:       UserModel,
 *   bidHistory: Object,
 *   onClose:    Function,
 *   onConfirm:  Function(carId, amount, user, payment)
 * }} props
 */
export default function BidModal({ car, user, bidHistory, onClose, onConfirm }) {
  /* ── Determine starting step ──────────────────────────── */
  const alreadyPaid = hasUserPaidDeposit();

  const [step,         setStep]         = useState(alreadyPaid ? "form" : "deposit");
  const [depositInfo,  setDepositInfo]  = useState(null);  // { paymentId, amount }
  const [payError,     setPayError]     = useState("");
  const [bidPayInfo,   setBidPayInfo]   = useState(null);  // bid payment receipt
  const [processing,   setProcessing]   = useState(false);

  /* ── Bid form ─────────────────────────────────────────── */
  const minBid = car.currentBid + 1000;
  const bids   = bidHistory[car.id] || bidHistory[String(car.id)] || [];

  const form = useForm(
    { amount: car.currentBid + 10000 },
    { amount: [VALIDATORS.required, VALIDATORS.bidAmount(minBid)] }
  );

  const quickIncrements = [10000, 25000, 50000, 100000, 250000];

  /* ── Step progress indicator ──────────────────────────── */
  const STEPS = alreadyPaid
    ? ["form", "confirm", "success"]
    : ["deposit", "form", "confirm", "success"];
  const stepIndex  = STEPS.indexOf(step === "paying" ? "deposit" : step);
  const totalSteps = STEPS.length;

  /* ─────────────────────────────────────────────────────── */
  /* STEP HANDLERS                                           */
  /* ─────────────────────────────────────────────────────── */

  /**
   * handlePayDeposit — collects the ₹20 access deposit.
   * Uses Razorpay if configured, otherwise simulates payment.
   */
  async function handlePayDeposit() {
    setProcessing(true);
    setPayError("");
    setStep("paying");

    try {
      let payment;

      if (RAZORPAY_KEY_ID && RAZORPAY_KEY_ID !== "rzp_test_YOUR_KEY_HERE") {
        /* ── Live Razorpay path ─────────────────────── */
        const loaded = await RazorpayService.loadScript();
        if (!loaded) throw new Error("Razorpay SDK failed to load. Check your connection.");

        payment = await new Promise((resolve, reject) => {
          const rzp = new window.Razorpay({
            key:         RAZORPAY_KEY_ID,
            amount:      DEPOSIT_PAISE,
            currency:    "INR",
            name:        "BidDrive",
            description: "Bidding Access Deposit (Refundable)",
            image:       "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=100&q=80",
            prefill: {
              name:    user.name  || "",
              email:   user.email || "",
              contact: user.phone || "",
            },
            notes: {
              purpose: "bidding_deposit",
              userId:  user.uid || user.id,
            },
            theme: { color: "#1d4ed8" },
            modal: {
              ondismiss: () => reject(new Error("Payment cancelled.")),
            },
            handler: (response) => {
              resolve({
                paymentId: response.razorpay_payment_id,
                amount:    DEPOSIT_AMOUNT,
              });
            },
          });
          rzp.on("payment.failed", (resp) =>
            reject(new Error(resp.error?.description || "Payment failed."))
          );
          rzp.open();
        });

      } else {
        /* ── Demo / simulated payment path ─────────── */
        await new Promise((r) => setTimeout(r, 1400));
        payment = {
          paymentId: "demo_dep_" + Date.now(),
          amount:    DEPOSIT_AMOUNT,
        };
      }

      /* ── Deposit succeeded ──────────────────────── */
      markDepositPaid();
      setDepositInfo(payment);
      setStep("form");

    } catch (err) {
      setPayError(err.message || "Payment was not completed. Please try again.");
      setStep("deposit");
    } finally {
      setProcessing(false);
    }
  }

  /**
   * handleConfirmBid — fires after user reviews and confirms bid.
   * Calls the parent onConfirm callback with bid + payment details.
   */
  async function handleConfirmBid() {
    setProcessing(true);
    setStep("paying");
    setPayError("");

    try {
      await onConfirm(car.id, form.values.amount, user, {
        paymentId:     depositInfo?.paymentId || "demo_dep_session",
        depositAmount: DEPOSIT_AMOUNT,
      });
      setBidPayInfo({ amount: form.values.amount });
      setStep("success");
    } catch (err) {
      setPayError(err.message || "Bid submission failed. Please try again.");
      setStep("confirm");
    } finally {
      setProcessing(false);
    }
  }

  /* ─────────────────────────────────────────────────────── */
  /* RENDER                                                  */
  /* ─────────────────────────────────────────────────────── */
  return (
    <div
      className="modal-overlay"
      style={{ alignItems: "flex-end" }}
      onClick={onClose}
    >
      <div
        className="modal-box bid-modal"
        style={{ maxWidth: 460, width: "100%", overflow: "hidden" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Modal header ──────────────────────────────── */}
        <div style={{
          padding: "16px 22px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}>
          <div>
            <div style={{
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: 16,
              color: "var(--text)",
            }}>
              {step === "deposit" && "🔓 Unlock Bidding"}
              {step === "paying"  && "💳 Processing..."}
              {step === "form"    && "⚡ Place a Bid"}
              {step === "confirm" && "✅ Confirm Bid"}
              {step === "success" && "🎉 Bid Placed!"}
            </div>
            <div style={{ fontSize: 11, color: "var(--text4)", marginTop: 2 }}>
              {car.year} {car.make} {car.model}
            </div>
          </div>
          <button
            className="btn btn-ghost btn-icon"
            onClick={onClose}
            style={{ fontSize: 22, lineHeight: 1 }}
            aria-label="Close"
          >×</button>
        </div>

        {/* ── Step progress bar ─────────────────────────── */}
        {step !== "paying" && (
          <div style={{
            display: "flex",
            gap: 4,
            padding: "10px 22px 0",
          }}>
            {STEPS.map((s, i) => (
              <div
                key={s}
                style={{
                  flex: 1,
                  height: 3,
                  borderRadius: 2,
                  background: i <= stepIndex ? "var(--blue)" : "var(--border)",
                  transition: "background 0.3s",
                }}
              />
            ))}
          </div>
        )}

        {/* ── Body ──────────────────────────────────────── */}
        <div style={{ padding: "20px 22px 24px" }}>

          {/* ════════════════════════════════════════════
              STEP 1 — DEPOSIT GATE
              ════════════════════════════════════════════ */}
          {step === "deposit" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

              {/* Hero icon + headline */}
              <div style={{ textAlign: "center", padding: "8px 0" }}>
                <div style={{
                  width: 72, height: 72,
                  background: "linear-gradient(135deg, #1d4ed8, #3b82f6)",
                  borderRadius: "50%",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 32, margin: "0 auto 14px",
                  boxShadow: "0 8px 24px rgba(29,78,216,0.25)",
                }}>🔒</div>
                <div style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 22, fontWeight: 700,
                  color: "var(--text)", marginBottom: 8,
                }}>
                  Pay ₹20 to Start Bidding
                </div>
                <div style={{ color: "var(--text3)", fontSize: 14, lineHeight: 1.6 }}>
                  A one-time refundable deposit of{" "}
                  <strong style={{ color: "var(--blue)" }}>₹20</strong>{" "}
                  is required to participate in any auction on BidDrive.
                </div>
              </div>

              {/* Deposit amount card */}
              <div style={{
                background: "linear-gradient(135deg, #1d4ed8, #2563eb)",
                borderRadius: "var(--radius)",
                padding: "20px 22px",
                color: "white",
                textAlign: "center",
              }}>
                <div style={{ fontSize: 13, opacity: 0.8, marginBottom: 4 }}>
                  Bidding Access Deposit
                </div>
                <div style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 42, fontWeight: 800,
                  letterSpacing: "-1px",
                }}>₹20</div>
                <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>
                  One-time · 100% Refundable
                </div>
              </div>

              {/* Benefits list */}
              <div style={{
                background: "var(--blue-pale)",
                border: "1px solid var(--blue-mid)",
                borderRadius: "var(--radius-sm)",
                padding: "14px 16px",
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}>
                {[
                  ["🏁", "Bid on any car in this auction"],
                  ["🔄", "Fully refunded if you don't win"],
                  ["🔒", "Prevents fake / spam bids"],
                  ["⚡", "Instantly activated — bid right away"],
                ].map(([icon, text]) => (
                  <div key={text} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    fontSize: 13, color: "var(--text2)",
                  }}>
                    <span style={{ fontSize: 16, flexShrink: 0 }}>{icon}</span>
                    {text}
                  </div>
                ))}
              </div>

              {/* Error */}
              {payError && (
                <div style={{
                  background: "var(--red-pale)",
                  border: "1px solid #fca5a5",
                  color: "var(--red)",
                  padding: "10px 14px",
                  borderRadius: "var(--radius-sm)",
                  fontSize: 13,
                }}>⚠ {payError}</div>
              )}

              {/* Razorpay badge */}
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                fontSize: 12,
                color: "var(--text4)",
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="#2D83E5">
                  <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
                </svg>
                Secured by Razorpay · 256-bit SSL encryption
              </div>

              {/* CTA */}
              <button
                className="btn btn-primary btn-xl w-full"
                onClick={handlePayDeposit}
                disabled={processing}
                style={{ borderRadius: "var(--radius-sm)", fontSize: 16 }}
              >
                {processing ? (
                  <>
                    <span style={{
                      width: 18, height: 18,
                      border: "2.5px solid rgba(255,255,255,.4)",
                      borderTopColor: "white",
                      borderRadius: "50%",
                      animation: "spin 1s linear infinite",
                      display: "inline-block",
                    }}/>
                    Processing...
                  </>
                ) : (
                  "💳 Pay ₹20 & Unlock Bidding"
                )}
              </button>

              <div style={{
                textAlign: "center",
                fontSize: 12,
                color: "var(--text4)",
              }}>
                By proceeding, you agree to BidDrive's{" "}
                <span style={{ color: "var(--blue)", cursor: "pointer" }}>Terms of Service</span>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════
              STEP 1b — PROCESSING PAYMENT SPINNER
              ════════════════════════════════════════════ */}
          {step === "paying" && (
            <div style={{ textAlign: "center", padding: "36px 0" }}>
              <div style={{
                width: 56, height: 56,
                border: "5px solid var(--blue-mid)",
                borderTopColor: "var(--blue)",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
                margin: "0 auto 20px",
              }}/>
              <div style={{
                fontFamily: "var(--font-display)",
                fontSize: 18, fontWeight: 700, marginBottom: 8,
              }}>
                {depositInfo ? "Placing Your Bid..." : "Processing ₹20 Deposit..."}
              </div>
              <div style={{ color: "var(--text3)", fontSize: 13, marginBottom: 20 }}>
                {depositInfo
                  ? "Submitting your bid securely..."
                  : "Please complete payment in the Razorpay window."}
              </div>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                background: "var(--blue-pale)", border: "1px solid var(--blue-mid)",
                borderRadius: 20, padding: "6px 14px",
                fontSize: 12, color: "var(--blue)", fontWeight: 600,
              }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="#2D83E5">
                  <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
                </svg>
                Secured by Razorpay
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════
              STEP 2 — BID AMOUNT FORM
              ════════════════════════════════════════════ */}
          {step === "form" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

              {/* Deposit paid banner */}
              {depositInfo && (
                <div style={{
                  display: "flex", alignItems: "center", gap: 10,
                  background: "var(--green-pale)",
                  border: "1px solid #86efac",
                  borderRadius: "var(--radius-sm)",
                  padding: "10px 14px",
                }}>
                  <div style={{
                    width: 28, height: 28,
                    background: "var(--green)",
                    borderRadius: "50%",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 14, color: "white", flexShrink: 0,
                  }}>✓</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--green)" }}>
                      ₹20 Deposit Paid — Bidding Unlocked!
                    </div>
                    <div style={{ fontSize: 11, color: "#166534" }}>
                      ID: {depositInfo.paymentId}
                    </div>
                  </div>
                </div>
              )}

              {/* Current bid + countdown */}
              <div style={{
                display: "flex", justifyContent: "space-between",
                background: "var(--surface2)",
                borderRadius: "var(--radius-sm)", padding: "12px 14px",
              }}>
                <div>
                  <div style={{ fontSize: 11, color: "var(--text4)" }}>Current Highest Bid</div>
                  <div style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 20, fontWeight: 700,
                  }}>
                    {formatCurrency(car.currentBid)}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text4)" }}>
                    {bids.length} bids · {bids[0]?.userName || "No bids"}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <Countdown endTime={car.endTime}/>
                  <div style={{ fontSize: 11, color: "var(--text4)", marginTop: 2 }}>
                    Min: {formatCurrency(minBid)}
                  </div>
                </div>
              </div>

              {/* Quick increment buttons */}
              <div>
                <div style={{
                  fontSize: 12, fontWeight: 600,
                  color: "var(--text3)", marginBottom: 8,
                }}>Quick Increments</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {quickIncrements.map((inc) => (
                    <button
                      key={inc}
                      onClick={() => form.set("amount", car.currentBid + inc)}
                      style={{
                        padding: "6px 10px",
                        borderRadius: "var(--radius-sm)",
                        fontSize: 12, fontWeight: 600,
                        cursor: "pointer",
                        fontFamily: "var(--font-body)",
                        background: form.values.amount === car.currentBid + inc
                          ? "var(--blue)" : "var(--surface2)",
                        color: form.values.amount === car.currentBid + inc
                          ? "white" : "var(--text3)",
                        border: `1.5px solid ${form.values.amount === car.currentBid + inc
                          ? "var(--blue)" : "var(--border)"}`,
                        transition: "all 0.15s",
                      }}
                    >
                      +{formatCurrency(inc).replace("₹", "")}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bid amount input */}
              <Field
                label="Your Bid Amount (₹)"
                required
                error={form.touched.amount && form.errors.amount}
                hint={
                  !form.errors.amount && form.values.amount > car.currentBid
                    ? `+${formatCurrency(form.values.amount - car.currentBid)} above current bid`
                    : ""
                }
              >
                <input
                  className={`field-input${
                    form.touched.amount && form.errors.amount ? " error" : ""
                  }`}
                  type="number"
                  value={form.values.amount}
                  min={minBid}
                  onChange={(e) => form.set("amount", Number(e.target.value))}
                  onBlur={() => form.touch("amount")}
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: 700, fontSize: 22, textAlign: "center",
                  }}
                />
              </Field>

              {/* CTA */}
              <button
                className="btn btn-primary btn-lg w-full"
                onClick={() => {
                  form.touch("amount");
                  if (form.submit()) setStep("confirm");
                }}
              >
                Review Bid → {form.values.amount ? formatCurrencyFull(form.values.amount) : ""}
              </button>
            </div>
          )}

          {/* ════════════════════════════════════════════
              STEP 3 — CONFIRM BID
              ════════════════════════════════════════════ */}
          {step === "confirm" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

              {/* Bid summary card */}
              <div style={{
                background: "var(--blue-pale)",
                border: "1px solid var(--blue-mid)",
                borderRadius: "var(--radius)",
                padding: 20,
              }}>
                <div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 2 }}>Vehicle</div>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>
                  {car.year} {car.make} {car.model}
                </div>
                <div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 2 }}>Your Bid</div>
                <div style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 30, fontWeight: 800,
                  color: "var(--blue)",
                }}>
                  {formatCurrencyFull(form.values.amount)}
                </div>
                <div style={{
                  display: "flex", justifyContent: "space-between",
                  marginTop: 12, fontSize: 12, color: "var(--text3)",
                }}>
                  <span>Bidding as: <strong style={{ color: "var(--text)" }}>{user.name}</strong></span>
                  <span style={{ color: "var(--blue)", fontWeight: 600 }}>
                    +{formatCurrency(form.values.amount - car.currentBid)} over current
                  </span>
                </div>
              </div>

              {/* Deposit already paid badge */}
              <div style={{
                display: "flex", alignItems: "center", gap: 10,
                background: "var(--green-pale)",
                border: "1px solid #86efac",
                borderRadius: "var(--radius-sm)",
                padding: "10px 14px",
              }}>
                <div style={{
                  width: 26, height: 26,
                  background: "var(--green)",
                  borderRadius: "50%",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 13, color: "white", flexShrink: 0,
                }}>✓</div>
                <div style={{ fontSize: 13 }}>
                  <strong style={{ color: "var(--green)" }}>₹20 deposit already paid</strong>
                  <span style={{ color: "var(--text3)" }}>
                    {" "}· Refundable if you don't win
                  </span>
                </div>
              </div>

              {/* Warning */}
              <div style={{
                fontSize: 13, color: "var(--text3)",
                background: "#fffbeb",
                border: "1px solid #fde68a",
                borderRadius: "var(--radius-sm)",
                padding: "10px 14px",
              }}>
                ⚠ By confirming, you agree to purchase this vehicle if you win the auction.
              </div>

              {/* Error */}
              {payError && (
                <div style={{
                  background: "var(--red-pale)",
                  border: "1px solid #fca5a5",
                  color: "var(--red)",
                  padding: "10px 14px",
                  borderRadius: "var(--radius-sm)",
                  fontSize: 13,
                }}>⚠ {payError}</div>
              )}

              {/* Actions */}
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  className="btn btn-outline btn-md"
                  onClick={() => setStep("form")}
                  style={{ flex: 1 }}
                  disabled={processing}
                >← Back</button>
                <button
                  className="btn btn-green btn-md"
                  onClick={handleConfirmBid}
                  style={{ flex: 2 }}
                  disabled={processing}
                >
                  {processing ? (
                    <>
                      <span style={{
                        width: 15, height: 15,
                        border: "2px solid rgba(255,255,255,.4)",
                        borderTopColor: "white",
                        borderRadius: "50%",
                        animation: "spin 1s linear infinite",
                        display: "inline-block",
                      }}/>
                      Placing Bid...
                    </>
                  ) : "✓ Confirm & Place Bid"}
                </button>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════
              STEP 4 — SUCCESS
              ════════════════════════════════════════════ */}
          {step === "success" && (
            <div style={{ textAlign: "center", padding: "12px 0" }}>
              <div style={{ fontSize: 64, marginBottom: 12 }}>🏆</div>
              <div style={{
                fontFamily: "var(--font-display)",
                fontSize: 22, fontWeight: 700,
                color: "var(--green)", marginBottom: 6,
              }}>
                You're the Highest Bidder!
              </div>
              <div style={{ color: "var(--text2)", marginBottom: 4 }}>
                Bid of{" "}
                <strong style={{ color: "var(--blue)" }}>
                  {formatCurrencyFull(form.values.amount)}
                </strong>
              </div>
              <div style={{ color: "var(--text3)", fontSize: 13, marginBottom: 20 }}>
                on {car.year} {car.make} {car.model}
              </div>

              {/* Receipt */}
              <div style={{
                background: "var(--blue-pale)",
                border: "1px solid var(--blue-mid)",
                borderRadius: "var(--radius)",
                padding: "16px 18px",
                marginBottom: 20,
                textAlign: "left",
              }}>
                <div style={{
                  fontSize: 12, fontWeight: 700,
                  color: "var(--blue)", marginBottom: 10,
                  display: "flex", alignItems: "center", gap: 6,
                }}>
                  📋 Bid Receipt
                </div>
                {[
                  ["Bid Amount",     formatCurrencyFull(form.values.amount)],
                  ["Deposit Paid",   "₹20 (refundable)"],
                  ["Bidder",         user.name],
                  ["Auction Ends",   new Date(car.endTime).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    style={{
                      display: "flex", justifyContent: "space-between",
                      padding: "5px 0",
                      borderBottom: "1px solid var(--blue-mid)",
                      fontSize: 12,
                    }}
                  >
                    <span style={{ color: "var(--text3)" }}>{label}</span>
                    <span style={{ fontWeight: 600, color: "var(--text)" }}>{value}</span>
                  </div>
                ))}
              </div>

              <div style={{
                fontSize: 13, color: "var(--text3)",
                marginBottom: 20, lineHeight: 1.6,
              }}>
                📧 You'll be notified instantly if you're outbid.
                <br />Track all bids in your profile.
              </div>

              <button className="btn btn-primary btn-lg" onClick={onClose}>
                Done
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}