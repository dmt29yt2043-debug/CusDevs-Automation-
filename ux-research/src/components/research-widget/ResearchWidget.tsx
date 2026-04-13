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
    width: "56px", height: "56px", backgroundColor: "#e91e63", borderRadius: "50%",
    border: "none", cursor: "pointer", display: "flex", alignItems: "center",
    justifyContent: "center", boxShadow: "0 4px 24px rgba(233,30,99,0.3)",
    transition: "transform 0.15s, background-color 0.15s", position: "relative" as const,
  } as CSSProperties,
  notifDot: {
    position: "absolute" as const, top: "-2px", right: "-2px", width: "12px", height: "12px",
    backgroundColor: "#22c55e", borderRadius: "50%", border: "2px solid #1e1b4b",
  } as CSSProperties,
  panel: {
    position: "fixed" as const, bottom: "24px", right: "24px", zIndex: 9999,
    width: "340px", maxHeight: "500px", display: "flex", flexDirection: "column" as const,
    backgroundColor: "#1e1b4b", borderRadius: "16px",
    boxShadow: "0 8px 40px rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.1)",
    overflow: "hidden", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    animation: "widgetSlideIn 0.4s ease-out",
  } as CSSProperties,
  header: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "12px 16px", backgroundColor: "rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.06)",
  } as CSSProperties,
  headerLeft: { display: "flex", alignItems: "center", gap: "8px" } as CSSProperties,
  headerDot: {
    width: "8px", height: "8px", backgroundColor: "#22c55e", borderRadius: "50%",
  } as CSSProperties,
  headerTitle: { fontSize: "14px", fontWeight: 600, color: "#fff" } as CSSProperties,
  headerRight: { display: "flex", alignItems: "center", gap: "4px" } as CSSProperties,
  headerCounter: { fontSize: "12px", color: "#6b7280" } as CSSProperties,
  minimizeBtn: {
    padding: "4px", border: "none", backgroundColor: "transparent", cursor: "pointer",
    color: "#6b7280", borderRadius: "4px", display: "flex",
  } as CSSProperties,
  content: { padding: "16px", overflowY: "auto" as const, flex: 1 } as CSSProperties,
  progressBg: { height: "3px", backgroundColor: "rgba(255,255,255,0.06)" } as CSSProperties,
  progressFill: (pct: number) => ({
    height: "3px", background: "linear-gradient(135deg, #e91e63, #ff6090)", transition: "width 0.3s", width: `${pct}%`,
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
  const [delayDone, setDelayDone] = useState(true);
  const [waiting, setWaiting] = useState(false);

  // Add CSS animation for widget slide-in
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      @keyframes widgetSlideIn {
        from { transform: translateY(20px) scale(0.95); opacity: 0; }
        to { transform: translateY(0) scale(1); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
    return () => { document.head.removeChild(style); };
  }, []);

  useEffect(() => {
    try {
      const parsed = parseScenario(scenarioJson);
      setScenario(parsed);
      setCurrentIndex(0);
    } catch (err) { console.error("Failed to parse scenario:", err); }
  }, [scenarioJson]);

  const currentStep: ScenarioStep | null = scenario ? getStep(scenario, currentIndex) : null;

  // Count only interactive steps for progress display
  const interactiveTypes = ["audio_prompt", "rating"];
  const interactiveSteps = scenario ? scenario.steps.filter((s) => interactiveTypes.includes(s.type)) : [];
  const currentInteractiveIndex = currentStep
    ? interactiveSteps.findIndex((s) => s.id === currentStep.id)
    : 0;
  const interactiveTotal = interactiveSteps.length || 1;

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

      // If next step is wait_for_time → hide widget, wait, then skip to step after
      const nextStep = scenario.steps[nextIndex];
      if (nextStep.type === "wait_for_time") {
        const delaySec = (nextStep as { durationSec?: number }).durationSec || 60;
        setWaiting(true);
        setIsOpen(false);
        setDelayDone(false);
        setTimeout(() => {
          // Skip wait step, go to the one after it
          const afterWaitIndex = nextIndex + 1;
          if (afterWaitIndex >= scenario.steps.length) { onComplete(); return; }
          setCurrentIndex(afterWaitIndex);
          setWaiting(false);
          setDelayDone(true);
          setIsOpen(true);
          // Play subtle notification sound
          try {
            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = 800;
            gain.gain.value = 0.1;
            osc.start();
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
            osc.stop(ctx.currentTime + 0.3);
          } catch { /* audio not available */ }
        }, delaySec * 1000);
        return;
      }

      setCurrentIndex(nextIndex);
    },
    [scenario, currentIndex, currentStep, sessionId, onComplete]
  );

  if (!scenario || !currentStep || !delayDone) return null;

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

  const displayStep = Math.max(currentInteractiveIndex + 1, 1);
  const progressPct = (displayStep / interactiveTotal) * 100;

  return (
    <div data-rw-widget style={w.panel}>
      <div style={w.header}>
        <div style={w.headerLeft}>
          <span style={w.headerDot} />
          <span style={w.headerTitle}>Study</span>
        </div>
        <div style={w.headerRight}>
          <span style={w.headerCounter}>{displayStep}/{interactiveTotal}</span>
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
