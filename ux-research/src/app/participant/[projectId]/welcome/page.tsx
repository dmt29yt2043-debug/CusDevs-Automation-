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

  if (!project) {
    return (
      <ParticipantLayout>
        <div className="text-center text-gray-400">Loading...</div>
      </ParticipantLayout>
    );
  }

  return (
    <ParticipantLayout step={1} totalSteps={6}>
      <div className="text-center space-y-6">
        <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto">
          <span className="text-2xl">🔬</span>
        </div>
        <h1 className="text-2xl font-semibold">{project.name}</h1>
        <p className="text-gray-600 leading-relaxed">
          {project.description || "Welcome to the study!"}
        </p>
        <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-500 space-y-2">
          <div className="flex items-center gap-2">
            <span>⏱</span>
            <span>Takes ~5-10 minutes</span>
          </div>
          <div className="flex items-center gap-2">
            <span>🎤</span>
            <span>Microphone needed for voice responses</span>
          </div>
          <div className="flex items-center gap-2">
            <span>🖥</span>
            <span>Best experienced on desktop</span>
          </div>
        </div>
        <button
          onClick={() => router.push(`/participant/${projectId}/consent`)}
          className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-500 transition-colors"
        >
          Start Study
        </button>
      </div>
    </ParticipantLayout>
  );
}
