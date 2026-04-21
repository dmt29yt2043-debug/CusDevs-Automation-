"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import ParticipantLayout from "@/components/participant-flow/ParticipantLayout";

type Channel = "email" | "whatsapp" | "both";

export default function ThankYouPage() {
  const params = useParams();
  const projectSlug = params.projectId as string;

  const [dbProjectId, setDbProjectId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [participantId, setParticipantId] = useState<string | null>(null);

  const [channel, setChannel] = useState<Channel>("email");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Resolve DB project id + session from sessionStorage
  useEffect(() => {
    fetch(`/api/projects/${projectSlug}`)
      .then((r) => r.json())
      .then((p) => {
        if (p?.id) setDbProjectId(p.id);
      })
      .catch(() => {});

    try {
      const stored = sessionStorage.getItem(`session-${projectSlug}`);
      if (stored) {
        const info = JSON.parse(stored);
        setSessionId(info.sessionId ?? null);
        setParticipantId(info.participantId ?? null);
      }
    } catch {
      // ignore
    }
  }, [projectSlug]);

  const needsEmail = channel === "email" || channel === "both";
  const needsPhone = channel === "whatsapp" || channel === "both";

  const canSubmit =
    !!dbProjectId &&
    !submitting &&
    (!needsEmail || email.trim().length > 3) &&
    (!needsPhone || phone.trim().replace(/[^\d+]/g, "").length >= 8);

  const handleSubmit = async () => {
    if (!canSubmit || !dbProjectId) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/subscribers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: dbProjectId,
          sessionId,
          participantId,
          channel,
          email: needsEmail ? email.trim() : undefined,
          whatsappE164: needsPhone ? phone.trim() : undefined,
        }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(j?.error || `HTTP ${res.status}`);
      }
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to subscribe");
    } finally {
      setSubmitting(false);
    }
  };

  const channelButtonStyle = (c: Channel) => ({
    padding: "10px 14px",
    background: channel === c ? "linear-gradient(135deg, #e91e63, #ff6090)" : "rgba(255,255,255,0.04)",
    color: channel === c ? "#fff" : "#9ca3af",
    border: `1px solid ${channel === c ? "rgba(233,30,99,0.4)" : "rgba(255,255,255,0.08)"}`,
    borderRadius: 10,
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    flex: 1,
    transition: "all 0.15s",
  });

  const inputStyle = {
    width: "100%",
    background: "#1e1b4b",
    border: "2px solid rgba(255,255,255,0.1)",
    borderRadius: 10,
    padding: "10px 14px",
    fontSize: 14,
    color: "#fff",
    outline: "none",
  };

  return (
    <ParticipantLayout step={5} totalSteps={5}>
      <div className="text-center space-y-5">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto"
          style={{ background: "rgba(233,30,99,0.15)" }}
        >
          <span className="text-2xl">✅</span>
        </div>
        <h1 className="text-2xl font-bold" style={{ color: "#fff" }}>
          Thank You!
        </h1>
        <p className="leading-relaxed text-sm" style={{ color: "#9ca3af" }}>
          Your feedback is super valuable — it&apos;s going to shape what we build next.
        </p>

        {!submitted ? (
          <div
            className="rounded-xl p-5 text-left space-y-4"
            style={{
              background:
                "linear-gradient(135deg, rgba(233,30,99,0.12), rgba(255,96,144,0.06))",
              border: "1px solid rgba(233,30,99,0.25)",
            }}
          >
            <div className="space-y-1">
              <p className="text-base font-semibold" style={{ color: "#fff" }}>
                Get 10 great things to do with your kids every weekend
              </p>
              <p className="text-xs" style={{ color: "#9ca3af" }}>
                No scrolling. No guessing. Just hand-picked ideas for your family —
                once a week, quick to read.
              </p>
            </div>

            {/* Channel selector */}
            <div>
              <p className="text-xs mb-2" style={{ color: "#9ca3af" }}>
                How would you like to receive them?
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setChannel("email")}
                  style={channelButtonStyle("email")}
                >
                  Email
                </button>
                <button
                  type="button"
                  onClick={() => setChannel("whatsapp")}
                  style={channelButtonStyle("whatsapp")}
                >
                  WhatsApp
                </button>
                <button
                  type="button"
                  onClick={() => setChannel("both")}
                  style={channelButtonStyle("both")}
                >
                  Both
                </button>
              </div>
            </div>

            {/* Inputs */}
            <div className="space-y-2">
              {needsEmail && (
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  style={inputStyle}
                />
              )}
              {needsPhone && (
                <div>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 415 555 1234"
                    style={inputStyle}
                  />
                  <p className="text-[11px] mt-1.5" style={{ color: "#6b7280" }}>
                    Include country code (e.g. +1 for US, +7 for RU). We&apos;ll send
                    a weekly WhatsApp message — no spam, unsubscribe anytime.
                  </p>
                </div>
              )}
            </div>

            {error && (
              <p className="text-xs" style={{ color: "#f87171" }}>
                {error}
              </p>
            )}

            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="w-full transition-all hover:opacity-90 disabled:opacity-40"
              style={{
                padding: "12px 20px",
                background: "linear-gradient(135deg, #e91e63, #ff6090)",
                color: "#fff",
                border: "none",
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 600,
                cursor: canSubmit ? "pointer" : "not-allowed",
              }}
            >
              {submitting ? "Saving..." : "Get weekend plans"}
            </button>
          </div>
        ) : (
          <div
            className="rounded-xl p-5 text-sm space-y-2"
            style={{
              background: "rgba(34,197,94,0.1)",
              border: "1px solid rgba(34,197,94,0.25)",
              color: "#4ade80",
            }}
          >
            <p className="font-semibold">🎉 You&apos;re in!</p>
            <p className="text-xs" style={{ color: "#86efac" }}>
              We&apos;ll be in touch by{" "}
              {channel === "email"
                ? "email"
                : channel === "whatsapp"
                ? "WhatsApp"
                : "email and WhatsApp"}
              . The first digest lands this Thursday.
            </p>
          </div>
        )}

        <a
          href="https://pulseup.me/"
          className="block w-full transition-all hover:opacity-90"
          style={{
            padding: "14px 0",
            background: submitted
              ? "linear-gradient(135deg, #e91e63, #ff6090)"
              : "rgba(255,255,255,0.04)",
            color: submitted ? "#fff" : "#9ca3af",
            border: submitted ? "none" : "1px solid rgba(255,255,255,0.08)",
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
