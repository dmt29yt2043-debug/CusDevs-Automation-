"use client";

import { useParams, useRouter } from "next/navigation";
import Image from "next/image";

export default function TaskPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6 relative"
      style={{ background: "#0f0d2e" }}
    >
      {/* Background image */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: "url(/task-bg.png)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          opacity: 0.7,
        }}
      />

      {/* Dark overlay for readability */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(180deg, rgba(15,13,46,0.1) 0%, rgba(15,13,46,0.6) 100%)",
        }}
      />

      {/* Content */}
      <div className="w-full max-w-xl relative z-10">
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

        {/* Progress */}
        <div className="mb-8">
          <div className="flex justify-between text-xs mb-2" style={{ color: "rgba(255,255,255,0.5)" }}>
            <span>3 / 5</span>
          </div>
          <div style={{ height: 4, background: "rgba(255,255,255,0.1)", borderRadius: 99, overflow: "hidden" }}>
            <div
              style={{
                height: "100%",
                width: "60%",
                background: "linear-gradient(135deg, #e91e63, #ff6090)",
                borderRadius: 99,
              }}
            />
          </div>
        </div>

        <div className="text-center space-y-6">
          <h1 className="text-3xl font-bold" style={{ color: "#fff" }}>Your Task</h1>

          <div
            className="rounded-xl p-8 text-left space-y-4"
            style={{
              background: "rgba(30,27,75,0.6)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <p className="leading-relaxed text-base" style={{ color: "#d1d5db" }}>
              You want to find something fun to do with your child
              in the <strong style={{ color: "#fff" }}>next few days</strong>.
            </p>
            <p className="leading-relaxed text-base" style={{ color: "#d1d5db" }}>
              You will now see a website. Try to find a suitable activity.
              Interact with it as you normally would.
            </p>
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
              A research assistant will appear in the bottom right corner — it
              will ask you questions along the way.
            </p>
          </div>

          <button
            onClick={() => router.push(`/participant/${projectId}/test`)}
            className="w-full transition-all hover:opacity-90"
            style={{
              padding: "16px 0",
              background: "linear-gradient(135deg, #e91e63, #ff6090)",
              color: "#fff",
              border: "none",
              borderRadius: 14,
              fontSize: 16,
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 4px 20px rgba(233,30,99,0.3)",
            }}
          >
            Go to Test
          </button>
        </div>
      </div>
    </div>
  );
}
