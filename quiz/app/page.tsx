"use client";

import { useState, useEffect, useCallback } from "react";
import type { QuizAnswers, ChildAge, Borough, Interest, Pain, Intent } from "../lib/types";
import { INITIAL_ANSWERS } from "../lib/types";
import {
  childAgeOptions,
  boroughOptions,
  interestOptions,
  painOptions,
  intentOptions,
} from "../lib/options";
import { buildRedirectUrl } from "../lib/url-builder";
import { trackQuizEvent } from "../lib/analytics";

// Step definitions
const TOTAL_STEPS = 5;

const STEP_TITLES = [
  "How old is your child?",
  "Where are you located?",
  "What does your child enjoy?",
  "What frustrates you most?",
  "Want personalized recommendations?",
];

const STEP_SUBTITLES = [
  "We'll tailor activities to their age group",
  "We'll find the best spots near you",
  "Select all that apply",
  "We'll help you avoid this",
  "We'll prepare a custom list just for you",
];

// Chip button component — single select
function Chip<T extends string>({
  label,
  value,
  selected,
  onSelect,
}: {
  label: string;
  value: T;
  selected: boolean;
  onSelect: (v: T) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      className={`px-5 py-3.5 rounded-2xl text-[15px] font-medium border-2 transition-all duration-150 ${
        selected
          ? "bg-blue-600 text-white border-blue-600 shadow-md scale-[1.02]"
          : "bg-white text-gray-700 border-gray-200 hover:border-blue-300 hover:bg-blue-50 active:scale-95"
      }`}
    >
      {selected && <span className="mr-1.5">&#10003;</span>}
      {label}
    </button>
  );
}

// Progress bar
function ProgressBar({ step, total }: { step: number; total: number }) {
  const pct = ((step + 1) / total) * 100;
  return (
    <div className="w-full">
      <div className="flex justify-between text-xs text-gray-400 mb-1.5">
        <span>Step {step + 1} of {total}</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-600 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function QuizPage() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswers>(INITIAL_ANSWERS);
  const [redirecting, setRedirecting] = useState(false);
  const [fadeIn, setFadeIn] = useState(true);

  // Track quiz start
  useEffect(() => {
    trackQuizEvent("quiz_started");
  }, []);

  // Animate step transitions
  const goToStep = useCallback((nextStep: number) => {
    setFadeIn(false);
    setTimeout(() => {
      setStep(nextStep);
      setFadeIn(true);
    }, 200);
  }, []);

  // Auto-advance for single-select steps (except interests which is multi-select)
  const handleSingleSelect = useCallback(
    (field: keyof QuizAnswers, value: string, currentStep: number) => {
      setAnswers((prev) => ({ ...prev, [field]: value }));
      trackQuizEvent("quiz_step_completed", {
        step: currentStep,
        stepName: field,
        data: { [field]: value },
      });
      // Auto-advance after short delay
      setTimeout(() => goToStep(currentStep + 1), 300);
    },
    [goToStep]
  );

  const handleInterestToggle = useCallback((value: Interest) => {
    setAnswers((prev) => ({
      ...prev,
      interests: prev.interests.includes(value)
        ? prev.interests.filter((i) => i !== value)
        : [...prev.interests, value],
    }));
  }, []);

  const handleInterestContinue = useCallback(() => {
    trackQuizEvent("quiz_step_completed", {
      step: 2,
      stepName: "interests",
      data: { interests: answers.interests },
    });
    goToStep(3);
  }, [answers.interests, goToStep]);

  // Handle redirect on last step
  const handleRedirect = useCallback(() => {
    const url = buildRedirectUrl(answers);
    if (!url) return;

    trackQuizEvent("quiz_completed", {
      data: {
        child_age: answers.child_age || "",
        borough: answers.borough || "",
        interests: answers.interests,
        pain: answers.pain || "",
        intent: answers.intent || "",
      },
    });

    setRedirecting(true);

    setTimeout(() => {
      trackQuizEvent("quiz_redirected", { data: { url } });
      window.location.href = url;
    }, 1500);
  }, [answers]);

  // Redirecting screen
  if (redirecting) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6">
        <div className="animate-spin w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full mb-6" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Preparing your personalized results...
        </h2>
        <p className="text-gray-500 text-sm">Just a moment</p>
      </div>
    );
  }

  // Render step content
  const renderStep = () => {
    switch (step) {
      case 0: // Child age
        return (
          <div className="flex flex-wrap gap-3">
            {childAgeOptions.map((opt) => (
              <Chip
                key={opt.value}
                label={opt.label}
                value={opt.value}
                selected={answers.child_age === opt.value}
                onSelect={(v) => handleSingleSelect("child_age", v, 0)}
              />
            ))}
          </div>
        );

      case 1: // Borough
        return (
          <div className="flex flex-wrap gap-3">
            {boroughOptions.map((opt) => (
              <Chip
                key={opt.value}
                label={opt.label}
                value={opt.value}
                selected={answers.borough === opt.value}
                onSelect={(v) => handleSingleSelect("borough", v, 1)}
              />
            ))}
          </div>
        );

      case 2: // Interests (multi-select)
        return (
          <div className="space-y-5">
            <div className="flex flex-wrap gap-3">
              {interestOptions.map((opt) => (
                <Chip
                  key={opt.value}
                  label={opt.label}
                  value={opt.value}
                  selected={answers.interests.includes(opt.value)}
                  onSelect={handleInterestToggle}
                />
              ))}
            </div>
            <button
              onClick={handleInterestContinue}
              className="w-full py-3.5 bg-blue-600 text-white rounded-2xl font-medium hover:bg-blue-700 transition-colors text-[15px]"
            >
              Continue
            </button>
          </div>
        );

      case 3: // Pain
        return (
          <div className="flex flex-wrap gap-3">
            {painOptions.map((opt) => (
              <Chip
                key={opt.value}
                label={opt.label}
                value={opt.value}
                selected={answers.pain === opt.value}
                onSelect={(v) => handleSingleSelect("pain", v, 3)}
              />
            ))}
          </div>
        );

      case 4: // Intent
        return (
          <div className="flex flex-col gap-3">
            {intentOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  setAnswers((prev) => ({ ...prev, intent: opt.value }));
                  trackQuizEvent("quiz_step_completed", {
                    step: 4,
                    stepName: "intent",
                    data: { intent: opt.value },
                  });
                  // Trigger redirect
                  setTimeout(() => {
                    const finalAnswers = { ...answers, intent: opt.value as Intent };
                    const url = buildRedirectUrl(finalAnswers);
                    if (!url) return;

                    trackQuizEvent("quiz_completed", {
                      data: {
                        child_age: finalAnswers.child_age || "",
                        borough: finalAnswers.borough || "",
                        interests: finalAnswers.interests,
                        pain: finalAnswers.pain || "",
                        intent: finalAnswers.intent || "",
                      },
                    });

                    setRedirecting(true);
                    setTimeout(() => {
                      trackQuizEvent("quiz_redirected", { data: { url } });
                      window.location.href = url;
                    }, 1500);
                  }, 300);
                }}
                className={`w-full py-4 rounded-2xl text-[15px] font-medium border-2 transition-all duration-150 ${
                  opt.value === "yes"
                    ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-700"
                    : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-5">
      <div className="w-full max-w-md">
        {/* Progress */}
        <ProgressBar step={step} total={TOTAL_STEPS} />

        {/* Content */}
        <div
          className={`mt-8 transition-all duration-200 ${
            fadeIn ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
          }`}
        >
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {STEP_TITLES[step]}
          </h1>
          <p className="text-gray-500 text-sm mb-8">
            {STEP_SUBTITLES[step]}
          </p>

          {renderStep()}
        </div>

        {/* Back button */}
        {step > 0 && (
          <button
            onClick={() => goToStep(step - 1)}
            className="mt-6 text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            &larr; Back
          </button>
        )}
      </div>
    </div>
  );
}
