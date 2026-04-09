"use client";

import ParticipantLayout from "@/components/participant-flow/ParticipantLayout";

export default function ThankYouPage() {
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
        <div
          className="rounded-xl p-4 text-sm"
          style={{ background: "#1e1b4b", color: "#6b7280" }}
        >
          You can close this tab.
        </div>
      </div>
    </ParticipantLayout>
  );
}
