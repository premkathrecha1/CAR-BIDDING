/**
 * src/components/AIAdvisor.jsx
 * ─────────────────────────────────────────────────────────────
 * Chat interface powered by the Claude API.
 * Gives car-specific advice: valuation, inspection, bid strategy.
 * ─────────────────────────────────────────────────────────────
 */
import React from 'react';
import { useState, useRef, useEffect } from "react";
import { formatCurrency } from "../utils/index.js";

const QUICK_TIPS = ["Is this price fair?", "What to inspect?", "Bid strategy?", "Resale value?"];

/**
 * @param {{ car: CarModel, user: UserModel|null, onClose: Function }} props
 */
export default function AIAdvisor({ car, user, onClose }) {
  const [msgs,    setMsgs]    = useState([{
    role: "assistant",
    content: `Hello${user ? " " + user.name.split(" ")[0] : ""}! 👋 I'm your AI advisor for the **${car.year} ${car.make} ${car.model}**.\n\nCurrent bid: **${formatCurrency(car.currentBid)}** · ${car.mileage?.toLocaleString()} km · ${car.condition} condition.\n\nAsk me about market value, inspection tips, bid strategy, or known issues!`,
  }]);
  const [input,   setInput]   = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef();
  const inputRef  = useRef();

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  async function send(text) {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput("");
    setMsgs((p) => [...p, { role: "user", content: msg }]);
    setLoading(true);

    try {
      const systemPrompt = `You are an expert used-car advisor for BidDrive, India's premium auction platform.
Car: ${car.year} ${car.make} ${car.model} | Color: ${car.color} | Fuel: ${car.fuel} | Trans: ${car.transmission}
Engine: ${car.engine} | Power: ${car.power} | Torque: ${car.torque} | 0-100: ${car.acceleration} | Top: ${car.topSpeed}
Mileage: ${car.mileage?.toLocaleString()} km | Condition: ${car.condition} | Features: ${(car.features || []).join(", ")}
History: ${car.history} | Starting Bid: ${formatCurrency(car.startingBid)} | Current Bid: ${formatCurrency(car.currentBid)}
Seller: ${car.seller}, ${car.location} | Verified: ${car.verified}
${user ? `User: ${user.name} from ${user.city || "India"} | Bids placed: ${user.bidsPlaced}` : ""}
Rules: Use ₹ and Indian market context. Max 130 words. Be direct and practical. Use **bold** for key figures.`;

      const history = msgs.map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content }));
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 350, system: systemPrompt, messages: [...history, { role: "user", content: msg }] }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      setMsgs((p) => [...p, { role: "assistant", content: data.content?.map((b) => b.text || "").join("") || "Sorry, I couldn't respond." }]);
    } catch {
      setMsgs((p) => [...p, { role: "assistant", content: "⚠️ Connection issue. Please try again." }]);
    }
    setLoading(false);
    setTimeout(() => inputRef.current?.focus(), 80);
  }

  const renderMsg = (text) =>
    text.split(/(\*\*[^*]+\*\*)/).map((part, i) =>
      part.startsWith("**") && part.endsWith("**")
        ? <strong key={i} style={{ color: "var(--blue)" }}>{part.slice(2, -2)}</strong>
        : part.split("\n").map((line, j) => <span key={j}>{line}{j < part.split("\n").length - 1 ? <br /> : null}</span>)
    );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box ai-modal" style={{ display: "flex", flexDirection: "column", padding: 0 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", gap: 12, alignItems: "center", flexShrink: 0 }}>
          <div style={{ width: 40, height: 40, background: "linear-gradient(135deg,#1d4ed8,#3b82f6)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🤖</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>AI Car Advisor</div>
            <div style={{ color: "var(--text3)", fontSize: 12, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{car.year} {car.make} {car.model} · {car.location}</div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose} style={{ fontSize: 22 }}>×</button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "14px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
          {msgs.map((m, i) => (
            <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", gap: 8 }}>
              {m.role === "assistant" && <div style={{ width: 28, height: 28, background: "linear-gradient(135deg,#1d4ed8,#3b82f6)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0, marginTop: 2 }}>🤖</div>}
              <div style={{ maxWidth: "82%", padding: "10px 14px", borderRadius: m.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px", background: m.role === "user" ? "linear-gradient(135deg,#1d4ed8,#2563eb)" : "white", color: m.role === "user" ? "white" : "var(--text)", fontSize: 13.5, lineHeight: 1.6, boxShadow: m.role === "user" ? "0 4px 14px rgba(29,78,216,.3)" : "var(--shadow-sm)", border: m.role === "assistant" ? "1px solid var(--border)" : "none" }}>
                {renderMsg(m.content)}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ width: 28, height: 28, background: "linear-gradient(135deg,#1d4ed8,#3b82f6)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>🤖</div>
              <div style={{ padding: "10px 14px", background: "white", borderRadius: "18px 18px 18px 4px", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}>
                <div style={{ display: "flex", gap: 4 }}>{[0, 0.2, 0.4].map((d) => <div key={d} style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--blue-light)", animation: `pulse 1.2s ${d}s infinite` }} />)}</div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {msgs.length < 3 && (
          <div style={{ padding: "0 18px 8px", display: "flex", gap: 6, flexWrap: "wrap", flexShrink: 0 }}>
            {QUICK_TIPS.map((t) => (
              <button key={t} onClick={() => send(t)} style={{ background: "var(--blue-pale)", border: "1px solid var(--blue-mid)", color: "var(--blue)", padding: "4px 10px", borderRadius: 20, fontSize: 12, cursor: "pointer", fontFamily: "var(--font-body)", fontWeight: 500 }}>{t}</button>
            ))}
          </div>
        )}

        <div style={{ padding: "12px 18px", borderTop: "1px solid var(--border)", display: "flex", gap: 8, flexShrink: 0 }}>
          <input ref={inputRef} className="field-input" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()} placeholder="Ask about valuation, inspection, bids..." style={{ flex: 1 }} />
          <button className="btn btn-primary btn-md" onClick={() => send()} disabled={loading || !input.trim()} style={{ padding: "11px 16px", fontSize: 18 }}>➤</button>
        </div>
      </div>
    </div>
  );
}
