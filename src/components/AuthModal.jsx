import { useState, useMemo } from "react";
import { Field, Input }  from "./UI.jsx";
import AuthService        from "../services/AuthService.js";
import { useForm }        from "../hooks/index.js";
import { VALIDATORS, getPasswordStrength } from "../utils/index.js";
import React from "react";

/** @param {{ onAuth, onClose, firebaseReady }} props */
export default function AuthModal({ onAuth, onClose, firebaseReady }) {
  const [mode,          setMode]          = useState("login");
  const [loading,       setLoading]       = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPwd,       setShowPwd]       = useState(false);
  const [showCPwd,      setShowCPwd]      = useState(false);
  const [apiError,      setApiError]      = useState("");

  // ── Login form ────────────────────────────────────────────
  const loginForm = useForm(
    { email: "", password: "" },
    {
      email:    [VALIDATORS.required, VALIDATORS.email],
      password: [VALIDATORS.required],
    }
  );

  // ── Register form — password needed for confirmPwd rule ───
  // We keep password in plain state so the confirmPwd rule can
  // close over the current value without going stale.
  const [regValues, setRegValues] = useState({
    name: "", email: "", password: "", confirmPwd: "",
    phone: "", city: "", terms: false,
  });

  // FIX: rebuild rules whenever password changes so confirmPwd
  // always compares against the CURRENT password value.
  const registerRules = useMemo(() => ({
    name:       [VALIDATORS.required, VALIDATORS.name],
    email:      [VALIDATORS.required, VALIDATORS.email],
    password:   [VALIDATORS.required, VALIDATORS.password],
    confirmPwd: [
      VALIDATORS.required,
      // Cross-field: compare against live password
      (v) => v !== regValues.password ? "Passwords do not match." : null,
    ],
    phone:      [VALIDATORS.required, VALIDATORS.phone],
    city:       [VALIDATORS.required, VALIDATORS.city],
    terms:      [VALIDATORS.checked],
  }), [regValues.password]);   // rebuild whenever password changes

  const registerForm = useForm(regValues, registerRules);

  // Sync regValues so memos stay current
  function setReg(field, value) {
    setRegValues((prev) => ({ ...prev, [field]: value }));
    registerForm.set(field, value);
  }

  const pwdStr = getPasswordStrength(regValues.password);

  const Spinner = () => (
    <span style={{
      width: 16, height: 16,
      border: "2px solid rgba(255,255,255,.4)",
      borderTopColor: "white",
      borderRadius: "50%",
      animation: "spin 1s linear infinite",
      display: "inline-block",
    }} />
  );

  // ── Google SSO ────────────────────────────────────────────
  async function handleGoogleSignIn() {
    if (!firebaseReady) {
      setApiError("Firebase not configured. Add your credentials to .env.local");
      return;
    }
    setGoogleLoading(true);
    setApiError("");
    try {
      const user = await AuthService.googleSignIn();
      onAuth(user);
    } catch (e) {
      setApiError(e.message || "Google sign-in failed.");
    }
    setGoogleLoading(false);
  }

  // ── Email login ───────────────────────────────────────────
  async function handleLogin() {
    if (!loginForm.submit()) return;           // validate all fields
    setLoading(true);
    setApiError("");
    try {
      if (firebaseReady) {
        const user = await AuthService.emailSignIn(
          loginForm.values.email,
          loginForm.values.password
        );
        onAuth(user);                          // ← closes modal + opens bid if pending
      } else {
        // Demo mode fallback
        await new Promise((r) => setTimeout(r, 800));
        if (
          loginForm.values.email    === "rahul@example.com" &&
          loginForm.values.password === "Pass@123"
        ) {
          onAuth({
            id: "demo_u1", uid: "demo_u1",
            name: "Rahul Sharma", email: "rahul@example.com",
            avatar: "RS", city: "Mumbai", phone: "+91 98765 43210",
            bidsPlaced: 12, wonAuctions: 3, verified: true,
          });
        } else {
          throw new Error("Incorrect email or password.\n(Demo: rahul@example.com / Pass@123)");
        }
      }
    } catch (e) {
      const msg =
        e.code === "auth/invalid-credential"  ? "Incorrect email or password."              :
        e.code === "auth/user-not-found"       ? "No account found with this email."         :
        e.code === "auth/too-many-requests"    ? "Too many failed attempts. Try again later.":
        e.message || "Sign-in failed.";
      setApiError(msg);
    }
    setLoading(false);
  }

  // ── Registration ──────────────────────────────────────────
  async function handleRegister() {
    if (!registerForm.submit()) return;        // validate all fields
    setLoading(true);
    setApiError("");
    try {
      if (firebaseReady) {
        const user = await AuthService.register({
          name:     regValues.name,
          email:    regValues.email,
          password: regValues.password,
          phone:    regValues.phone,
          city:     regValues.city,
        });
        onAuth(user);
      } else {
        await new Promise((r) => setTimeout(r, 1000));
        onAuth({
          id:          "demo_" + Date.now(),
          uid:         "demo_" + Date.now(),
          name:        regValues.name,
          email:       regValues.email,
          avatar:      regValues.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase(),
          phone:       regValues.phone,
          city:        regValues.city,
          bidsPlaced:  0,
          wonAuctions: 0,
          verified:    false,
        });
      }
    } catch (e) {
      const msg =
        e.code === "auth/email-already-in-use" ? "This email is already registered. Try signing in." :
        e.code === "auth/weak-password"         ? "Password is too weak."                             :
        e.message || "Registration failed.";
      setApiError(msg);
    }
    setLoading(false);
  }

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-box auth-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ overflow: "auto", maxHeight: "95vh" }}
      >
        {/* ── Header ── */}
        <div style={{ padding: "28px 28px 0" }}>
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <div style={{ fontSize: 36, marginBottom: 6 }}>🏁</div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 24, color: "var(--blue)" }}>BidDrive</div>
            <div style={{ color: "var(--text3)", fontSize: 13 }}>India's Premier Car Auction Platform</div>
            {!firebaseReady && (
              <div style={{ marginTop: 8, background: "var(--amber-pale)", border: "1px solid #fde68a", borderRadius: "var(--radius-sm)", padding: "6px 12px", fontSize: 12, color: "#92400e" }}>
                ⚠ Demo mode — add Firebase config to enable real auth
              </div>
            )}
          </div>

          {/* Google SSO */}
          <button
            className="btn btn-google btn-lg w-full"
            onClick={handleGoogleSignIn}
            disabled={googleLoading}
            style={{ marginBottom: 16, gap: 10, width: "100%" }}
          >
            {googleLoading ? (
              <>
                <span style={{ width: 16, height: 16, border: "2px solid #dadce0", borderTopColor: "#4285f4", borderRadius: "50%", animation: "spin 1s linear infinite", display: "inline-block" }} />
                Signing in with Google...
              </>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </>
            )}
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
            <span style={{ fontSize: 12, color: "var(--text4)", whiteSpace: "nowrap" }}>or continue with email</span>
            <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
          </div>

          <div className="tab-bar">
            <button className={`tab-btn${mode === "login" ? " active" : ""}`} onClick={() => { setMode("login"); setApiError(""); }} style={{ flex: 1 }}>Sign In</button>
            <button className={`tab-btn${mode === "register" ? " active" : ""}`} onClick={() => { setMode("register"); setApiError(""); }} style={{ flex: 1 }}>Create Account</button>
          </div>
        </div>

        {/* ── Form body ── */}
        <div style={{ padding: 28 }}>

          {/* ── LOGIN ── */}
          {mode === "login" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <Field label="Email Address" required error={loginForm.touched.email && loginForm.errors.email}>
                <Input field="email" form={loginForm} type="email" placeholder="your@email.com" />
              </Field>
              <Field label="Password" required error={loginForm.touched.password && loginForm.errors.password}>
                <div style={{ position: "relative" }}>
                  <Input field="password" form={loginForm} type={showPwd ? "text" : "password"} placeholder="••••••••" />
                  <button type="button" onClick={() => setShowPwd((p) => !p)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text3)", fontSize: 16 }}>
                    {showPwd ? "🙈" : "👁"}
                  </button>
                </div>
              </Field>

              {apiError && (
                <div style={{ background: "var(--red-pale)", border: "1px solid #fca5a5", color: "var(--red)", padding: "10px 14px", borderRadius: "var(--radius-sm)", fontSize: 13 }}>
                  ⚠ {apiError}
                </div>
              )}

              {!firebaseReady && (
                <div style={{ background: "var(--blue-pale)", border: "1px solid var(--blue-mid)", borderRadius: "var(--radius-sm)", padding: "10px 14px", fontSize: 12, color: "var(--text3)" }}>
                  💡 Demo: <strong>rahul@example.com</strong> / <strong>Pass@123</strong>
                </div>
              )}

              <button className="btn btn-primary btn-lg w-full" onClick={handleLogin} disabled={loading}>
                {loading ? <><Spinner /> Signing in...</> : "Sign In →"}
              </button>
            </div>
          )}

          {/* ── REGISTER ── */}
          {mode === "register" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="Full Name" required error={registerForm.touched.name && registerForm.errors.name}>
                  {/* FIX: use setReg to keep regValues in sync */}
                  <input
                    className={`field-input${registerForm.touched.name && registerForm.errors.name ? " error" : ""}`}
                    value={regValues.name}
                    placeholder="Rahul Sharma"
                    onChange={(e) => setReg("name", e.target.value)}
                    onBlur={() => registerForm.touch("name")}
                  />
                </Field>
                <Field label="City" required error={registerForm.touched.city && registerForm.errors.city}>
                  <input
                    className={`field-input${registerForm.touched.city && registerForm.errors.city ? " error" : ""}`}
                    value={regValues.city}
                    placeholder="Mumbai"
                    onChange={(e) => setReg("city", e.target.value)}
                    onBlur={() => registerForm.touch("city")}
                  />
                </Field>
              </div>

              <Field label="Email Address" required error={registerForm.touched.email && registerForm.errors.email}>
                <input
                  className={`field-input${registerForm.touched.email && registerForm.errors.email ? " error" : ""}`}
                  type="email" value={regValues.email} placeholder="your@email.com"
                  onChange={(e) => setReg("email", e.target.value)}
                  onBlur={() => registerForm.touch("email")}
                />
              </Field>

              <Field label="Phone Number" required error={registerForm.touched.phone && registerForm.errors.phone} hint="+91 98765 43210">
                <input
                  className={`field-input${registerForm.touched.phone && registerForm.errors.phone ? " error" : ""}`}
                  type="tel" value={regValues.phone} placeholder="+91 98765 43210"
                  onChange={(e) => setReg("phone", e.target.value)}
                  onBlur={() => registerForm.touch("phone")}
                />
              </Field>

              <Field
                label="Password" required
                error={registerForm.touched.password && registerForm.errors.password}
                hint={
                  regValues.password && pwdStr.label
                    ? <span style={{ color: pwdStr.color, fontWeight: 600 }}>Strength: {pwdStr.label}</span>
                    : "Min 8 chars + uppercase + number + special"
                }
              >
                <div style={{ position: "relative" }}>
                  <input
                    className={`field-input${registerForm.touched.password && registerForm.errors.password ? " error" : ""}`}
                    type={showPwd ? "text" : "password"}
                    value={regValues.password}
                    placeholder="Min 8 chars + special"
                    onChange={(e) => setReg("password", e.target.value)}
                    onBlur={() => registerForm.touch("password")}
                  />
                  <button type="button" onClick={() => setShowPwd((p) => !p)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text3)", fontSize: 16 }}>
                    {showPwd ? "🙈" : "👁"}
                  </button>
                </div>
                {regValues.password && (
                  <div className="field-strength">
                    <div className="field-strength-bar" style={{ width: `${pwdStr.percent}%`, background: pwdStr.color }} />
                  </div>
                )}
              </Field>

              {/* FIX: confirmPwd uses setReg so cross-field rule sees current password */}
              <Field
                label="Confirm Password" required
                error={registerForm.touched.confirmPwd && registerForm.errors.confirmPwd}
                success={
                  registerForm.touched.confirmPwd && !registerForm.errors.confirmPwd && regValues.confirmPwd
                    ? "Passwords match ✓" : ""
                }
              >
                <div style={{ position: "relative" }}>
                  <input
                    className={`field-input${registerForm.touched.confirmPwd && registerForm.errors.confirmPwd ? " error" : registerForm.touched.confirmPwd && !registerForm.errors.confirmPwd && regValues.confirmPwd ? " success" : ""}`}
                    type={showCPwd ? "text" : "password"}
                    value={regValues.confirmPwd}
                    placeholder="Re-enter password"
                    onChange={(e) => setReg("confirmPwd", e.target.value)}
                    onBlur={() => registerForm.touch("confirmPwd")}
                  />
                  <button type="button" onClick={() => setShowCPwd((p) => !p)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text3)", fontSize: 16 }}>
                    {showCPwd ? "🙈" : "👁"}
                  </button>
                </div>
              </Field>

              <label style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer", padding: "10px 12px", border: `1.5px solid ${registerForm.touched.terms && registerForm.errors.terms ? "var(--red)" : "var(--border)"}`, borderRadius: "var(--radius-sm)", background: regValues.terms ? "var(--blue-pale)" : "white" }}>
                <input
                  type="checkbox"
                  checked={!!regValues.terms}
                  onChange={(e) => setReg("terms", e.target.checked)}
                  onBlur={() => registerForm.touch("terms")}
                  style={{ accentColor: "var(--blue)", marginTop: 2, flexShrink: 0 }}
                />
                <span style={{ fontSize: 13, color: "var(--text2)" }}>
                  I agree to BidDrive's{" "}
                  <span style={{ color: "var(--blue)", fontWeight: 600 }}>Terms of Service</span>
                  {" "}and{" "}
                  <span style={{ color: "var(--blue)", fontWeight: 600 }}>Privacy Policy</span>
                </span>
              </label>
              {registerForm.touched.terms && registerForm.errors.terms && (
                <span className="field-error">⚠ {registerForm.errors.terms}</span>
              )}

              {apiError && (
                <div style={{ background: "var(--red-pale)", border: "1px solid #fca5a5", color: "var(--red)", padding: "10px 14px", borderRadius: "var(--radius-sm)", fontSize: 13 }}>
                  ⚠ {apiError}
                </div>
              )}

              <button className="btn btn-green btn-lg w-full" onClick={handleRegister} disabled={loading}>
                {loading ? <><Spinner /> Creating Account...</> : "Create Account →"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}