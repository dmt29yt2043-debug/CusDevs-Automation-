"use client";

import Image from "next/image";

export default function ParticipantLayout({
  children,
  step,
  totalSteps,
}: {
  children: React.ReactNode;
  step?: number;
  totalSteps?: number;
}) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{ background: "#0f0d2e", color: "#fff" }}
    >
      <div className="w-full max-w-2xl">
        {/* Logo */}
        <div className="flex items-center justify-center mb-8">
          <Image
            src="/logo.png"
            alt="PulseUP"
            width={120}
            height={40}
            priority
            style={{ height: "auto" }}
          />
        </div>

        {/* Progress bar */}
        {step && totalSteps && (
          <div className="mb-8">
            <div className="flex justify-between text-xs mb-2" style={{ color: "#6b7280" }}>
              <span>{step} / {totalSteps}</span>
            </div>
            <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 99, overflow: "hidden" }}>
              <div
                className="transition-all duration-500 ease-out"
                style={{
                  height: "100%",
                  width: `${(step / totalSteps) * 100}%`,
                  background: "linear-gradient(135deg, #e91e63, #ff6090)",
                  borderRadius: 99,
                }}
              />
            </div>
          </div>
        )}

        {children}
      </div>
    </div>
  );
}
