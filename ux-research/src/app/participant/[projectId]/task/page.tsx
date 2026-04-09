"use client";

import { useParams, useRouter } from "next/navigation";
import ParticipantLayout from "@/components/participant-flow/ParticipantLayout";

export default function TaskPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  return (
    <ParticipantLayout step={3} totalSteps={5}>
      <div className="text-center space-y-6">
        <h1 className="text-2xl font-bold" style={{ color: "#fff" }}>Your Task</h1>
        <div
          className="rounded-xl p-6 text-left space-y-3"
          style={{ background: "#1e1b4b" }}
        >
          <p className="leading-relaxed text-sm" style={{ color: "#d1d5db" }}>
            Imagine the weekend is coming and you want to find something to do
            with your child on <strong style={{ color: "#fff" }}>Saturday morning</strong>.
          </p>
          <p className="leading-relaxed text-sm" style={{ color: "#d1d5db" }}>
            You will now see a website. Try to find a suitable activity.
            Interact with it as you normally would.
          </p>
          <p className="text-xs" style={{ color: "#6b7280" }}>
            A research assistant will appear in the bottom right corner — it
            will ask you questions along the way.
          </p>
        </div>
        <button
          onClick={() => router.push(`/participant/${projectId}/test`)}
          className="w-full transition-all hover:opacity-90"
          style={{
            padding: "14px 0",
            background: "linear-gradient(135deg, #e91e63, #ff6090)",
            color: "#fff",
            border: "none",
            borderRadius: 12,
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Go to Test
        </button>
      </div>
    </ParticipantLayout>
  );
}
