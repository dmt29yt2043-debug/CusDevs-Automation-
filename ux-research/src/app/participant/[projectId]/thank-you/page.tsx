"use client";

import { useState } from "react";
import ParticipantLayout from "@/components/participant-flow/ParticipantLayout";

export default function ThankYouPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmitEmail = async () => {
    if (!email.trim() || submitting) return;
    setSubmitting(true);
    // Store email — can be sent to API later
    try {
      await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: "email-capture",
          eventType: "email_submitted",
          payloadJson: { email: email.trim() },
        }),
      });
    } catch {
      // silent fail
    }
    setSubmitted(true);
    setSubmitting(false);
  };

  return (
    <ParticipantLayout step={5} totalSteps={5}>
      <div className="text-center space-y-6">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto"
          style={{ background: "rgba(233,30,99,0.15)" }}
        >
          <span className="text-2xl">✅</span>
        </div>
        <h1 className="text-2xl font-bold" style={{ color: "#fff" }}>Thank You!</h1>
        <p className="leading-relaxed text-sm" style={{ color: "#9ca3af" }}>
          You have completed the study. Your responses are very valuable
          and will help us improve the product.
        </p>

        {/* Email capture */}
        {!submitted ? (
          <div
            className="rounded-xl p-5 text-left space-y-4"
            style={{
              background: "linear-gradient(135deg, rgba(233,30,99,0.1), rgba(255,96,144,0.06))",
              border: "1px solid rgba(233,30,99,0.2)",
            }}
          >
            <div>
              <p className="text-sm font-medium" style={{ color: "#fff" }}>
                Want a weekly digest of the best events for your kids?
              </p>
              <p className="text-xs mt-1" style={{ color: "#6b7280" }}>
                We'll send you personalized picks based on your preferences. No spam, unsubscribe anytime.
              </p>
            </div>
            <div className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                onKeyDown={(e) => e.key === "Enter" && handleSubmitEmail()}
                style={{
                  flex: 1,
                  background: "#1e1b4b",
                  border: "2px solid rgba(255,255,255,0.1)",
                  borderRadius: 10,
                  padding: "10px 14px",
                  fontSize: 14,
                  color: "#fff",
                  outline: "none",
                }}
              />
              <button
                onClick={handleSubmitEmail}
                disabled={!email.trim() || submitting}
                className="transition-all hover:opacity-90 disabled:opacity-40"
                style={{
                  padding: "10px 20px",
                  background: "linear-gradient(135deg, #e91e63, #ff6090)",
                  color: "#fff",
                  border: "none",
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {submitting ? "..." : "Subscribe"}
              </button>
            </div>
          </div>
        ) : (
          <div
            className="rounded-xl p-4 text-sm"
            style={{
              background: "rgba(34,197,94,0.1)",
              border: "1px solid rgba(34,197,94,0.2)",
              color: "#4ade80",
            }}
          >
            🎉 You're subscribed! We'll send you the best picks soon.
          </div>
        )}

        <a
          href="https://pulseup-v2.srv1362562.hstgr.cloud/"
          className="block w-full transition-all hover:opacity-90"
          style={{
            padding: "14px 0",
            background: "linear-gradient(135deg, #e91e63, #ff6090)",
            color: "#fff",
            border: "none",
            borderRadius: 12,
            fontSize: 14,
            fontWeight: 600,
            textAlign: "center",
            textDecoration: "none",
          }}
        >
          Back to PulseUP
        </a>

        <p className="text-xs" style={{ color: "#6b7280" }}>
          Or you can close this tab.
        </p>
      </div>
    </ParticipantLayout>
  );
}
