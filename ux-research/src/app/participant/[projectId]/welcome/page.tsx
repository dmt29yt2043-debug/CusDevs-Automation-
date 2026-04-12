"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ParticipantLayout from "@/components/participant-flow/ParticipantLayout";

interface ProjectData {
  id: string;
  name: string;
  description: string | null;
}

export default function WelcomePage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  const [project, setProject] = useState<ProjectData | null>(null);

  useEffect(() => {
    fetch(`/api/projects/${projectId}`)
      .then((r) => r.json())
      .then(setProject);
  }, [projectId]);

  const handleAccept = () => {
    sessionStorage.setItem(
      `consent-${projectId}`,
      JSON.stringify({ participation: true, tracking: true, audio: true })
    );
    router.push(`/participant/${projectId}/screener`);
  };

  // Secret shortcut: Ctrl+Shift+K → skip welcome, go to screener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === "K") {
        e.preventDefault();
        handleAccept();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  if (!project) {
    return (
      <ParticipantLayout>
        <div className="text-center" style={{ color: "#6b7280" }}>Loading...</div>
      </ParticipantLayout>
    );
  }

  return (
    <ParticipantLayout step={1} totalSteps={5}>
      <div className="space-y-6">
        {/* Welcome */}
        <div className="text-center space-y-3">
          <h1 className="text-2xl font-bold" style={{ color: "#fff" }}>
            {project.name}
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: "#9ca3af" }}>
            {project.description || "Welcome to the study!"}
          </p>
        </div>

        {/* Info — prominent */}
        <div
          className="rounded-xl p-5 text-sm space-y-3"
          style={{
            background: "linear-gradient(135deg, rgba(233,30,99,0.12), rgba(255,96,144,0.08))",
            border: "1px solid rgba(233,30,99,0.25)",
          }}
        >
          <div className="flex items-center gap-3" style={{ color: "#fff" }}>
            <span className="text-lg">⏱</span>
            <span className="font-medium">Takes ~5-10 minutes</span>
          </div>
          <div className="flex items-center gap-3" style={{ color: "#fff" }}>
            <span className="text-lg">🎤</span>
            <span className="font-medium">Microphone needed for voice responses</span>
          </div>
          <div className="flex items-center gap-3" style={{ color: "#fff" }}>
            <span className="text-lg">🖥</span>
            <span className="font-medium">Best experienced on desktop</span>
          </div>
        </div>

        {/* Consent — subtle */}
        <div className="space-y-2">
          <p className="text-xs" style={{ color: "#6b7280" }}>By continuing, you agree to:</p>
          <div className="space-y-1.5">
            {[
              "Voluntary participation — you can stop at any time",
              "Activity recording — clicks, scrolls, and navigation",
              "Voice responses — recorded through browser microphone",
            ].map((text) => (
              <div key={text} className="flex items-center gap-2 px-1">
                <span style={{ color: "#4b5563", fontSize: 10 }}>&#10003;</span>
                <span className="text-xs" style={{ color: "#6b7280" }}>{text}</span>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={handleAccept}
          className="w-full py-3.5 rounded-xl font-medium text-sm transition-all hover:opacity-90"
          style={{ background: "linear-gradient(135deg, #e91e63, #ff6090)", color: "#fff", border: "none" }}
        >
          I Accept & Start Study
        </button>
      </div>
    </ParticipantLayout>
  );
}
