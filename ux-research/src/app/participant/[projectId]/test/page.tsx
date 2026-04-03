"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useRef } from "react";
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
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const lastMousePos = useRef({ x: 0, y: 0 });

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

  // Track mouse position globally so we know where user clicked when iframe steals focus
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      lastMousePos.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Detect clicks inside iframe via blur: when user clicks iframe, window loses focus
  // Re-arm detection when mouse moves back to parent (no window.focus() to avoid stealing input focus)
  const blurArmed = useRef(true);

  useEffect(() => {
    if (!testSiteUrl) return;

    const handleBlur = () => {
      if (!blurArmed.current) return;
      blurArmed.current = false; // prevent duplicate fires until mouse re-enters parent

      setTimeout(() => {
        if (document.activeElement === iframeRef.current) {
          const iframe = iframeRef.current;
          if (!iframe) return;

          const rect = iframe.getBoundingClientRect();
          const { x, y } = lastMousePos.current;
          const relX = ((x - rect.left) / rect.width) * 100;
          const relY = ((y - rect.top) / rect.height) * 100;

          if (relX >= 0 && relX <= 100 && relY >= 0 && relY <= 100) {
            trackEvent({
              eventType: "click",
              pageUrl: testSiteUrl,
              x,
              y,
              payloadJson: {
                relativeX: Math.round(relX * 100) / 100,
                relativeY: Math.round(relY * 100) / 100,
                viewportWidth: rect.width,
                viewportHeight: rect.height,
              },
            });
          }
        }
      }, 0);
    };

    // Re-arm blur detection when mouse moves back over the parent page
    const handleMouseMove = () => {
      blurArmed.current = true;
    };

    window.addEventListener("blur", handleBlur);
    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [testSiteUrl]);

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
        ref={iframeRef}
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
