"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import ResearchWidget from "@/components/research-widget/ResearchWidget";
import { initTracking, trackPageView, stopTracking, trackEvent } from "@/lib/event-tracking";

interface SessionInfo {
  sessionId: string;
  scenarioId: string;
}

export default function TestPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [scenarioJson, setScenarioJson] = useState<Record<string, unknown> | null>(null);
  const [testSiteUrl, setTestSiteUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = sessionStorage.getItem(`session-${projectId}`);
    if (!stored) {
      router.push(`/participant/${projectId}/welcome`);
      return;
    }

    const info = JSON.parse(stored) as SessionInfo;
    setSessionInfo(info);

    initTracking(info.sessionId);

    fetch(`/api/sessions/${info.sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "in_progress" }),
    });

    // Fetch project (for testSiteUrl) and scenario in parallel
    Promise.all([
      fetch(`/api/projects/${projectId}`).then((r) => r.json()),
      fetch(`/api/projects/${projectId}/scenario`).then((r) => r.json()),
    ]).then(([project, scenario]) => {
      setTestSiteUrl(project.testSiteUrl || null);
      setScenarioJson(scenario.definitionJson);
      trackPageView(project.testSiteUrl);
      setLoading(false);
    });

    return () => stopTracking();
  }, [projectId, router]);

  const handleComplete = useCallback(async () => {
    if (!sessionInfo) return;

    trackEvent({ eventType: "session_completed" });

    await fetch(`/api/sessions/${sessionInfo.sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "completed" }),
    });

    stopTracking();
    router.push(`/participant/${projectId}/thank-you`);
  }, [sessionInfo, projectId, router]);

  if (loading || !sessionInfo || !testSiteUrl) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400">Loading test...</div>
      </div>
    );
  }

  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh", overflow: "hidden" }}>
      <iframe
        src={testSiteUrl}
        title="Product under test"
        style={{
          width: "100%",
          height: "100%",
          border: "none",
          display: "block",
        }}
        sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
      />

      {scenarioJson && (
        <ResearchWidget
          scenarioJson={scenarioJson}
          sessionId={sessionInfo.sessionId}
          onComplete={handleComplete}
        />
      )}
    </div>
  );
}
