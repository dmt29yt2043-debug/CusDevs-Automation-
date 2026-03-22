"use client";

import { useState, useEffect, useCallback } from "react";
import type { ScenarioDefinition, ScenarioStep } from "@/lib/types/scenario";
import { parseScenario, getStep } from "@/lib/scenario-engine";
import StepRenderer from "./StepRenderer";

interface ResearchWidgetProps {
  scenarioJson: unknown;
  sessionId: string;
  onComplete: () => void;
}

export default function ResearchWidget({
  scenarioJson,
  sessionId,
  onComplete,
}: ResearchWidgetProps) {
  const [scenario, setScenario] = useState<ScenarioDefinition | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    try {
      setScenario(parseScenario(scenarioJson));
    } catch (err) {
      console.error("Failed to parse scenario:", err);
    }
  }, [scenarioJson]);

  const currentStep: ScenarioStep | null = scenario
    ? getStep(scenario, currentIndex)
    : null;

  const handleStepComplete = useCallback(
    async (response?: { responseType: string; value: unknown }) => {
      if (!scenario) return;

      // Save response if provided
      if (response && currentStep) {
        try {
          await fetch("/api/responses", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sessionId,
              stepId: currentStep.id,
              responseType: response.responseType,
              value: response.value,
            }),
          });
        } catch (err) {
          console.error("Failed to save response:", err);
        }
      }

      const nextIndex = currentIndex + 1;
      if (nextIndex >= scenario.steps.length) {
        // Scenario finished
        onComplete();
        return;
      }

      setCurrentIndex(nextIndex);
    },
    [scenario, currentIndex, currentStep, sessionId, onComplete]
  );

  if (!scenario || !currentStep) return null;

  // Minimized launcher
  if (!isOpen || isMinimized) {
    return (
      <div data-rw-widget className="rw-fixed rw-bottom-6 rw-right-6 rw-z-[9999]">
        <button
          onClick={() => {
            setIsOpen(true);
            setIsMinimized(false);
          }}
          className="rw-w-14 rw-h-14 rw-bg-blue-600 rw-rounded-full rw-shadow-lg rw-flex rw-items-center rw-justify-center hover:rw-bg-blue-500 rw-transition-colors hover:rw-scale-105 rw-transform"
        >
          <svg
            className="rw-w-6 rw-h-6 rw-text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
            />
          </svg>
          {/* Notification dot */}
          <span className="rw-absolute rw-top-0 rw-right-0 rw-w-3 rw-h-3 rw-bg-red-500 rw-rounded-full rw-border-2 rw-border-white" />
        </button>
      </div>
    );
  }

  // Expanded panel
  return (
    <div
      data-rw-widget
      className="rw-fixed rw-bottom-6 rw-right-6 rw-z-[9999] rw-w-80 rw-max-h-[500px] rw-flex rw-flex-col rw-bg-white rw-rounded-2xl rw-shadow-2xl rw-border rw-border-gray-200 rw-overflow-hidden"
    >
      {/* Header */}
      <div className="rw-flex rw-items-center rw-justify-between rw-px-4 rw-py-3 rw-bg-gray-50 rw-border-b rw-border-gray-100">
        <div className="rw-flex rw-items-center rw-gap-2">
          <span className="rw-w-2 rw-h-2 rw-bg-green-500 rw-rounded-full" />
          <span className="rw-text-sm rw-font-medium rw-text-gray-700">
            Study
          </span>
        </div>
        <div className="rw-flex rw-items-center rw-gap-1">
          <span className="rw-text-xs rw-text-gray-400">
            {currentIndex + 1}/{scenario.steps.length}
          </span>
          <button
            onClick={() => setIsMinimized(true)}
            className="rw-p-1 rw-text-gray-400 hover:rw-text-gray-600 rw-rounded"
            title="Minimize"
          >
            <svg className="rw-w-4 rw-h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="rw-p-4 rw-overflow-y-auto rw-flex-1">
        <StepRenderer
          key={currentStep.id}
          step={currentStep}
          sessionId={sessionId}
          onComplete={handleStepComplete}
        />
      </div>

      {/* Progress bar */}
      <div className="rw-h-1 rw-bg-gray-100">
        <div
          className="rw-h-1 rw-bg-blue-500 rw-transition-all rw-duration-300"
          style={{
            width: `${((currentIndex + 1) / scenario.steps.length) * 100}%`,
          }}
        />
      </div>
    </div>
  );
}
