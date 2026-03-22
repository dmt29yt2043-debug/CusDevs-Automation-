"use client";

import { useState, useEffect, useCallback, CSSProperties } from "react";
import type { ScenarioDefinition, ScenarioStep } from "@/lib/types/scenario";
import { parseScenario, getStep } from "@/lib/scenario-engine";
import StepRenderer from "./StepRenderer";

const w = {
  launcher: {
    position: "fixed", bottom: "24px", right: "24px", zIndex: 9999,
  } as CSSProperties,
  launcherBtn: {
    width: "56px", height: "56px", backgroundColor: "#2563eb", borderRadius: "50%",
    border: "none", cursor: "pointer", display: "flex", alignItems: "center",
    justifyContent: "center", boxShadow: "0 4px 24px rgba(0,0,0,0.18)",
    transition: "transform 0.15s, background-color 0.15s", position: "relative" as const,
  } as CSSProperties,
  notifDot: {
    position: "absolute" as const, top: "-2px", right: "-2px", width: "12px", height: "12px",
    backgroundColor: "#ef4444", borderRadius: "50%", border: "2px solid #fff",
  } as CSSProperties,
  panel: {
    position: "fixed" as const, bottom: "24px", right: "24px", zIndex: 9999,
    width: "320px", maxHeight: "500px", display: "flex", flexDirection: "column" as const,
    backgroundColor: "#fff", borderRadius: "16px",
    boxShadow: "0 8px 40px rgba(0,0,0,0.16)", border: "1px solid #e5e7eb",
    overflow: "hidden", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  } as CSSProperties,
  header: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "12px 16px", backgroundColor: "#f9fafb", borderBottom: "1px solid #f3f4f6",
  } as CSSProperties,
  headerLeft: { display: "flex", alignItems: "center", gap: "8px" } as CSSProperties,
  headerDot: {
    width: "8px", height: "8px", backgroundColor: "#22c55e", borderRadius: "50%",
  } as CSSProperties,
  headerTitle: { fontSize: "14px", fontWeight: 600, color: "#374151" } as CSSProperties,
  headerRight: { display: "flex", alignItems: "center", gap: "4px" } as CSSProperties,
  headerCounter: { fontSize: "12px", color: "#9ca3af" } as CSSProperties,
  minimizeBtn: {
    padding: "4px", border: "none", backgroundColor: "transparent", cursor: "pointer",
    color: "#9ca3af", borderRadius: "4px", display: "flex",
  } as CSSProperties,
  content: { padding: "16px", overflowY: "auto" as const, flex: 1 } as CSSProperties,
  progressBg: { height: "3px", backgroundColor: "#f3f4f6" } as CSSProperties,
  progressFill: (pct: number) => ({
    height: "3px", backgroundColor: "#2563eb", transition: "width 0.3s", width: `${pct}%`,
  }) as CSSProperties,
};

interface ResearchWidgetProps {
  scenarioJson: unknown;
  sessionId: string;
  onComplete: () => void;
}

export default function ResearchWidget({ scenarioJson, sessionId, onComplete }: ResearchWidgetProps) {
  const [scenario, setScenario] = useState<ScenarioDefinition | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    try { setScenario(parseScenario(scenarioJson)); }
    catch (err) { console.error("Failed to parse scenario:", err); }
  }, [scenarioJson]);

  const currentStep: ScenarioStep | null = scenario ? getStep(scenario, currentIndex) : null;

  const handleStepComplete = useCallback(
    async (response?: { responseType: string; value: unknown }) => {
      if (!scenario) return;
      if (response && currentStep) {
        try {
          await fetch("/api/responses", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sessionId, stepId: currentStep.id,
              responseType: response.responseType, value: response.value,
            }),
          });
        } catch (err) { console.error("Failed to save response:", err); }
      }
      const nextIndex = currentIndex + 1;
      if (nextIndex >= scenario.steps.length) { onComplete(); return; }
      setCurrentIndex(nextIndex);
    },
    [scenario, currentIndex, currentStep, sessionId, onComplete]
  );

  if (!scenario || !currentStep) return null;

  if (!isOpen || isMinimized) {
    return (
      <div data-rw-widget style={w.launcher}>
        <button
          onClick={() => { setIsOpen(true); setIsMinimized(false); }}
          style={w.launcherBtn}
          onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.08)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
        >
          <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="#fff" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
          <span style={w.notifDot} />
        </button>
      </div>
    );
  }

  const progressPct = ((currentIndex + 1) / scenario.steps.length) * 100;

  return (
    <div data-rw-widget style={w.panel}>
      <div style={w.header}>
        <div style={w.headerLeft}>
          <span style={w.headerDot} />
          <span style={w.headerTitle}>Study</span>
        </div>
        <div style={w.headerRight}>
          <span style={w.headerCounter}>{currentIndex + 1}/{scenario.steps.length}</span>
          <button onClick={() => setIsMinimized(true)} style={w.minimizeBtn} title="Minimize">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      <div style={w.content}>
        <StepRenderer key={currentStep.id} step={currentStep} sessionId={sessionId} onComplete={handleStepComplete} />
      </div>

      <div style={w.progressBg}>
        <div style={w.progressFill(progressPct)} />
      </div>
    </div>
  );
}
