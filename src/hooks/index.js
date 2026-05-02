/**
 * src/hooks/index.js
 * ============================================================
 * Custom React hooks for BidDrive.
 *
 * Hooks:
 *  - useCountdown     : Live countdown from a future timestamp
 *  - useForm          : Form state + per-field validation
 *  - useRealTimeBids  : Simulates live bid updates every N seconds
 *  - useToast         : Toast notification state manager
 *  - useMediaQuery    : Responsive breakpoint detection
 *  - useLocalStorage  : Persisted state via localStorage
 * ============================================================
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { formatCountdown }                           from "../utils/index.js";
import { createBidModel, SIMULATED_BIDDERS }         from "../models/index.js";

// ── useCountdown ──────────────────────────────────────────────
/**
 * Returns a live countdown string that updates every second.
 * Returns "ENDED" once the target time has passed.
 *
 * @param {number} endTime - Future Unix timestamp in ms
 * @returns {string}  e.g. "02:34:11" or "ENDED"
 *
 * @example
 * const timer = useCountdown(car.endTime);
 * return <span>{timer}</span>;
 */
export function useCountdown(endTime) {
  const [display, setDisplay] = useState(formatCountdown(endTime));

  useEffect(() => {
    setDisplay(formatCountdown(endTime));
    const interval = setInterval(() => {
      setDisplay(formatCountdown(endTime));
    }, 1000);
    return () => clearInterval(interval);
  }, [endTime]);

  return display;
}

// ── useForm ───────────────────────────────────────────────────
/**
 * Manages form values, per-field validation, and touched state.
 * Supports inline validation on blur + full-form validation on submit.
 *
 * @param {Object} initialValues - Initial { field: value } map
 * @param {Object} rules         - { field: [validatorFn, ...] } map
 * @returns {{ values, errors, touched, set, touch, submit, reset }}
 *
 * @example
 * const form = useForm({ email: "" }, { email: [VALIDATORS.required, VALIDATORS.email] });
 * <input value={form.values.email} onChange={e => form.set("email", e.target.value)} />
 */
export function useForm(initialValues, rules) {
  const [values,  setValues]  = useState(initialValues);
  const [errors,  setErrors]  = useState({});
  const [touched, setTouched] = useState({});

  /** Validate all fields and return error map */
  const validateAll = useCallback(
    (vals = values) => {
      const errs = {};
      Object.entries(rules).forEach(([field, fns]) => {
        for (const fn of fns) {
          const err = fn(vals[field]);
          if (err) { errs[field] = err; break; }
        }
      });
      return errs;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [values, rules]
  );

  /** Validate a single field value */
  const validateField = useCallback(
    (field, val) => {
      for (const fn of (rules[field] || [])) {
        const err = fn(val);
        if (err) return err;
      }
      return null;
    },
    [rules]
  );

  /**
   * Set a field value and re-validate if already touched.
   * @param {string} field
   * @param {*}      value
   */
  const set = useCallback(
    (field, value) => {
      const newValues = { ...values, [field]: value };
      setValues(newValues);
      if (touched[field]) {
        setErrors((prev) => ({
          ...prev,
          [field]: validateField(field, newValues[field]) || null,
        }));
      }
    },
    [values, touched, validateField]
  );

  /**
   * Mark a field as touched and run its validation.
   * Call this in onBlur handlers.
   * @param {string} field
   */
  const touch = useCallback(
    (field) => {
      setTouched((prev) => ({ ...prev, [field]: true }));
      setErrors((prev) => ({
        ...prev,
        [field]: validateField(field, values[field]) || null,
      }));
    },
    [values, validateField]
  );

  /**
   * Runs full-form validation, marks all fields touched.
   * @returns {boolean} true if the form is valid
   */
  const submit = useCallback(() => {
    const allTouched = Object.fromEntries(Object.keys(rules).map((k) => [k, true]));
    setTouched(allTouched);
    const errs = validateAll();
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [rules, validateAll]);

  /** Resets form to initial state */
  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  }, [initialValues]);

  return { values, errors, touched, set, touch, submit, reset };
}

// ── useRealTimeBids ───────────────────────────────────────────
/**
 * Simulates live bid activity — randomly picks a live car and
 * places a bid from a simulated bidder every 9–21 seconds.
 * In production, replace with a Firestore onSnapshot subscription.
 *
 * @param {CarModel[]} cars
 * @param {Function}   onNewBid - Called with (carId, amount, bid)
 * @param {Function}   onNotif  - Called with { car, bidder, amount }
 */
export function useRealTimeBids(cars, onNewBid, onNotif) {
  const carsRef = useRef(cars);
  useEffect(() => { carsRef.current = cars; }, [cars]);

  useEffect(() => {
    function simulateBid() {
      const liveCars = carsRef.current.filter((c) => c.endTime > Date.now());
      if (!liveCars.length) return;

      const car    = liveCars[Math.floor(Math.random() * liveCars.length)];
      const bidder = SIMULATED_BIDDERS[Math.floor(Math.random() * SIMULATED_BIDDERS.length)];
      const inc    = [5000, 10000, 25000, 50000][Math.floor(Math.random() * 4)];
      const amount = car.currentBid + inc;
      const bid    = createBidModel("bot_" + Math.random().toString(36).slice(2), bidder, amount, car.id);

      onNewBid(car.id, amount, bid);
      onNotif({ car: `${car.year} ${car.make} ${car.model}`, bidder, amount });
    }

    const delay = Math.random() * 12_000 + 9_000;
    const timer = setInterval(simulateBid, delay);
    return () => clearInterval(timer);
  }, []); // intentionally empty — carsRef stays current
}

// ── useToast ──────────────────────────────────────────────────
/**
 * Manages a temporary toast notification.
 * Auto-dismisses after `duration` ms.
 *
 * @param {number} [duration=3500]
 * @returns {{ toast, showToast, clearToast }}
 *
 * @example
 * const { toast, showToast } = useToast();
 * showToast("Bid placed!", "success");
 */
export function useToast(duration = 3500) {
  const [toast,  setToast]  = useState(null);
  const timerRef            = useRef(null);

  const showToast = useCallback(
    (message, type = "success") => {
      if (timerRef.current) clearTimeout(timerRef.current);
      setToast({ message, type });
      timerRef.current = setTimeout(() => setToast(null), duration);
    },
    [duration]
  );

  const clearToast = useCallback(() => {
    setToast(null);
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  return { toast, showToast, clearToast };
}

// ── useMediaQuery ─────────────────────────────────────────────
/**
 * Tracks whether a CSS media query is currently matched.
 *
 * @param {string} query - e.g. "(min-width: 768px)"
 * @returns {boolean}
 *
 * @example
 * const isDesktop = useMediaQuery("(min-width: 1024px)");
 */
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);

  useEffect(() => {
    const mql     = window.matchMedia(query);
    const handler = (e) => setMatches(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [query]);

  return matches;
}

// ── useLocalStorage ───────────────────────────────────────────
/**
 * Persists state to localStorage with automatic JSON serialisation.
 *
 * @param {string} key          - localStorage key
 * @param {*}      initialValue - Default if key doesn't exist
 * @returns {[*, Function]}     [storedValue, setValue]
 *
 * @example
 * const [watchlist, setWatchlist] = useLocalStorage("bd_watchlist", []);
 */
export function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setStoredValue = useCallback(
    (newValue) => {
      try {
        setValue(newValue);
        window.localStorage.setItem(key, JSON.stringify(newValue));
      } catch (err) {
        console.warn(`useLocalStorage: failed to set "${key}"`, err);
      }
    },
    [key]
  );

  return [value, setStoredValue];
}
