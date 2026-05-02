
import { useCountdown } from "../hooks/index.js";
import React from 'react';

// ── Field ─────────────────────────────────────────────────────
/**
 * Wraps a form control with label, error, success, and hint text.
 * @param {{ label, required, hint, error, success, children, style }} props
 */
export function Field({ label, required, hint, error, success, children, style }) {
  return (
    <div className="field-group" style={style}>
      {label && (
        <label className="field-label">
          {label}
          {required && <span className="req">*</span>}
        </label>
      )}
      {children}
      {error             && <span className="field-error">⚠ {error}</span>}
      {!error && success && <span style={{ fontSize: 12, color: "var(--green)", display: "flex", alignItems: "center", gap: 4 }}>✓ {success}</span>}
      {!error && hint    && <span className="field-hint">{hint}</span>}
    </div>
  );
}

// ── Input ─────────────────────────────────────────────────────
/**
 * Controlled input that reads from and writes to a useForm instance.
 * Applies error/success classes automatically based on touched state.
 * @param {{ field: string, form: object, type?: string, placeholder?: string }} props
 */
export function Input({ field, form, type = "text", placeholder, ...rest }) {
  const hasError   = form.touched[field] && form.errors[field];
  const hasSuccess = form.touched[field] && !form.errors[field] && form.values[field];

  return (
    <input
      className={`field-input${hasError ? " error" : hasSuccess ? " success" : ""}`}
      type={type}
      value={form.values[field] || ""}
      placeholder={placeholder}
      onChange={(e) => form.set(field, e.target.value)}
      onBlur={() => form.touch(field)}
      {...rest}
    />
  );
}

// ── Countdown ─────────────────────────────────────────────────
/**
 * Live countdown timer.
 * Turns red when under 2 hours remaining.
 * @param {{ endTime: number, style?: object }} props
 */
export function Countdown({ endTime, style = {} }) {
  const display = useCountdown(endTime);
  const urgent  = endTime - Date.now() < 7_200_000; // < 2 hours

  return (
    <span style={{
      fontFamily: "monospace", fontWeight: 700, fontSize: 13,
      color: display === "ENDED" ? "var(--text4)" : urgent ? "var(--red)" : "var(--blue)",
      ...style,
    }}>
      {display === "ENDED" ? "Ended" : `⏱ ${display}`}
    </span>
  );
}
