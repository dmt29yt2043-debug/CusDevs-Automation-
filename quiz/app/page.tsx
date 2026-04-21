"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import type {
  QuizAnswers,
  ParentStatus,
  Gender,
  ChildAge,
  Borough,
  Interest,
  ChildInfo,
} from "../lib/types";
import { INITIAL_ANSWERS, newChild } from "../lib/types";
import {
  parentOptions,
  genderOptions,
  childAgeOptions,
  boroughOptions,
  interestOptions,
} from "../lib/options";
import { buildRedirectUrl } from "../lib/url-builder";
import { trackQuizEvent } from "../lib/analytics";

const TOTAL_STEPS = 4;

const STEP_TITLES = [
  "Are you a parent?",
  "Tell us about your kids",
  "Where do you live?",
  "What do your kids enjoy?",
];

const STEP_SUBTITLES = [
  "This quiz helps parents find activities for their kids",
  "Add each child — we'll tailor activities to their age",
  "We'll find the best spots near you",
  "Select all that apply",
];

// Chip button — dark theme
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
      className="transition-all duration-150 active:scale-95"
      style={{
        padding: "12px 20px",
        borderRadius: "14px",
        fontSize: "15px",
        fontWeight: 500,
        border: selected ? "2px solid #e91e63" : "2px solid rgba(255,255,255,0.1)",
        background: selected
          ? "linear-gradient(135deg, rgba(233,30,99,0.2), rgba(255,96,144,0.15))"
          : "#1e1b4b",
        color: selected ? "#fff" : "#9ca3af",
        cursor: "pointer",
      }}
    >
      {selected && <span style={{ marginRight: 6 }}>✓</span>}
      {label}
    </button>
  );
}

// Compact chip — same look as Chip but smaller padding for tight rows
function MiniChip<T extends string>({
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
      className="transition-all duration-150 active:scale-95"
      style={{
        padding: "8px 14px",
        borderRadius: 10,
        fontSize: 14,
        fontWeight: 500,
        border: selected ? "2px solid #e91e63" : "2px solid rgba(255,255,255,0.1)",
        background: selected
          ? "linear-gradient(135deg, rgba(233,30,99,0.2), rgba(255,96,144,0.15))"
          : "#1e1b4b",
        color: selected ? "#fff" : "#9ca3af",
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

// Section label inside a multi-question step
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 12,
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        color: "#9ca3af",
        marginBottom: 8,
      }}
    >
      {children}
    </div>
  );
}

// Primary CTA button (gradient)
function PrimaryButton({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full transition-all duration-150 hover:opacity-90"
      style={{
        padding: "14px 0",
        background: disabled
          ? "rgba(233,30,99,0.3)"
          : "linear-gradient(135deg, #e91e63, #ff6090)",
        color: "#fff",
        border: "none",
        borderRadius: 14,
        fontSize: 15,
        fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {children}
    </button>
  );
}

// One child block: gender chips row + age chips row + optional remove button
function ChildRow({
  index,
  child,
  canRemove,
  onChange,
  onRemove,
}: {
  index: number;
  child: ChildInfo;
  canRemove: boolean;
  onChange: (patch: Partial<ChildInfo>) => void;
  onRemove: () => void;
}) {
  return (
    <div
      style={{
        padding: 14,
        borderRadius: 14,
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
        <SectionLabel>Child {index + 1}</SectionLabel>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Remove child ${index + 1}`}
            style={{
              marginLeft: "auto",
              background: "none",
              border: "none",
              color: "#6b7280",
              fontSize: 12,
              cursor: "pointer",
              padding: "2px 6px",
              borderRadius: 6,
            }}
          >
            × Remove
          </button>
        )}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
        {genderOptions.map((opt) => (
          <MiniChip<Gender>
            key={opt.value}
            label={opt.label}
            value={opt.value}
            selected={child.gender === opt.value}
            onSelect={(v) => onChange({ gender: v })}
          />
        ))}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {childAgeOptions.map((opt) => (
          <MiniChip<ChildAge>
            key={opt.value}
            label={opt.label}
            value={opt.value}
            selected={child.child_age === opt.value}
            onSelect={(v) => onChange({ child_age: v })}
          />
        ))}
      </div>
    </div>
  );
}

// Progress bar — pink gradient
function ProgressBar({ step, total }: { step: number; total: number }) {
  const pct = ((step + 1) / total) * 100;
  return (
    <div className="w-full">
      <div className="flex justify-between mb-2" style={{ fontSize: 12, color: "#6b7280" }}>
        <span>{step + 1} / {total}</span>
      </div>
      <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 99, overflow: "hidden" }}>
        <div
          className="transition-all duration-500 ease-out"
          style={{
            height: "100%",
            width: `${pct}%`,
            background: "linear-gradient(135deg, #e91e63, #ff6090)",
            borderRadius: 99,
          }}
        />
      </div>
    </div>
  );
}

export default function QuizPage() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswers>(INITIAL_ANSWERS);
  const [redirecting, setRedirecting] = useState(false);
  const [notParent, setNotParent] = useState(false);
  const [fadeIn, setFadeIn] = useState(true);

  useEffect(() => {
    trackQuizEvent("quiz_started");
  }, []);

  const goToStep = useCallback((nextStep: number) => {
    setFadeIn(false);
    setTimeout(() => {
      setStep(nextStep);
      setFadeIn(true);
    }, 200);
  }, []);

  // Step 0: Parent check
  const handleParentSelect = useCallback(
    (value: ParentStatus) => {
      setAnswers((prev) => ({ ...prev, parent: value }));
      trackQuizEvent("quiz_step_completed", {
        step: 0,
        stepName: "parent",
        data: { parent: value },
      });

      if (value === "no") {
        trackQuizEvent("quiz_exited_not_parent");
        setTimeout(() => setNotParent(true), 200);
      } else {
        setTimeout(() => goToStep(1), 300);
      }
    },
    [goToStep]
  );

  // Step 1: Children list
  const updateChild = useCallback((id: string, patch: Partial<ChildInfo>) => {
    setAnswers((prev) => ({
      ...prev,
      children: prev.children.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }));
  }, []);

  const addChild = useCallback(() => {
    setAnswers((prev) => ({ ...prev, children: [...prev.children, newChild()] }));
    trackQuizEvent("quiz_child_added", { data: {} });
  }, []);

  const removeChild = useCallback((id: string) => {
    setAnswers((prev) => ({
      ...prev,
      children: prev.children.filter((c) => c.id !== id),
    }));
  }, []);

  const handleChildContinue = useCallback(() => {
    const allFilled =
      answers.children.length > 0 &&
      answers.children.every((c) => c.gender && c.child_age);
    if (!allFilled) return;

    trackQuizEvent("quiz_step_completed", {
      step: 1,
      stepName: "children",
      data: {
        count: String(answers.children.length),
        children: answers.children.map((c) => `${c.gender}:${c.child_age}`),
      },
    });
    goToStep(2);
  }, [answers.children, goToStep]);

  // Step 2: Borough
  const handleBoroughSelect = useCallback((value: Borough) => {
    setAnswers((prev) => ({ ...prev, borough: value }));
  }, []);

  const handleCustomAreaChange = useCallback((value: string) => {
    setAnswers((prev) => ({ ...prev, custom_area: value }));
  }, []);

  const handleBoroughContinue = useCallback(() => {
    if (!answers.borough) return;
    if (answers.borough === "other" && !answers.custom_area.trim()) return;
    trackQuizEvent("quiz_step_completed", {
      step: 2,
      stepName: "borough",
      data: {
        borough: answers.borough,
        custom_area: answers.custom_area || "",
      },
    });
    goToStep(3);
  }, [answers.borough, answers.custom_area, goToStep]);

  // Step 3: Interests
  const handleInterestToggle = useCallback((value: Interest) => {
    setAnswers((prev) => ({
      ...prev,
      interests: prev.interests.includes(value)
        ? prev.interests.filter((i) => i !== value)
        : [...prev.interests, value],
    }));
  }, []);

  const handleFinish = useCallback(() => {
    trackQuizEvent("quiz_step_completed", {
      step: 3,
      stepName: "interests",
      data: { interests: answers.interests },
    });

    const url = buildRedirectUrl(answers);
    if (!url) return;

    trackQuizEvent("quiz_completed", {
      data: {
        children: answers.children.map((c) => `${c.gender}:${c.child_age}`),
        borough: answers.borough || "",
        custom_area: answers.custom_area || "",
        interests: answers.interests,
      },
    });

    setRedirecting(true);
    setTimeout(() => {
      trackQuizEvent("quiz_redirected", { data: { url } });
      window.location.href = url;
    }, 1500);
  }, [answers]);

  // Not-a-parent screen
  if (notParent) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: "#0f0d2e" }}>
        <div className="w-full max-w-md text-center">
          <div style={{ fontSize: 56, marginBottom: 16 }}>👋</div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: "#fff", marginBottom: 12 }}>
            Thanks for stopping by!
          </h2>
          <p style={{ fontSize: 15, color: "#9ca3af", lineHeight: 1.5 }}>
            This quiz is designed for parents looking for activities for their kids.
            We hope to see you again soon!
          </p>
        </div>
      </div>
    );
  }

  // Redirecting screen
  if (redirecting) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: "#0f0d2e" }}>
        <div
          className="animate-spin mb-6"
          style={{
            width: 36,
            height: 36,
            border: "3px solid rgba(255,255,255,0.1)",
            borderTopColor: "#e91e63",
            borderRadius: "50%",
          }}
        />
        <h2 style={{ fontSize: 20, fontWeight: 600, color: "#fff", marginBottom: 8 }}>
          Preparing your personalized results...
        </h2>
        <p style={{ fontSize: 14, color: "#6b7280" }}>Just a moment</p>
      </div>
    );
  }

  const renderStep = () => {
    switch (step) {
      // Step 0 — Parent check
      case 0:
        return (
          <div className="flex flex-col gap-3">
            {parentOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleParentSelect(opt.value)}
                className="w-full transition-all duration-150 active:scale-95"
                style={{
                  padding: "16px 0",
                  borderRadius: 14,
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: "pointer",
                  border: "none",
                  ...(opt.value === "yes"
                    ? { background: "linear-gradient(135deg, #e91e63, #ff6090)", color: "#fff" }
                    : { background: "#1e1b4b", color: "#9ca3af", border: "2px solid rgba(255,255,255,0.08)" }),
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        );

      // Step 1 — Children list (one row per child)
      case 1: {
        const canContinue =
          answers.children.length > 0 &&
          answers.children.every((c) => c.gender && c.child_age);
        return (
          <div className="space-y-5">
            <div className="space-y-4">
              {answers.children.map((child, i) => (
                <ChildRow
                  key={child.id}
                  index={i}
                  child={child}
                  canRemove={answers.children.length > 1}
                  onChange={(patch) => updateChild(child.id, patch)}
                  onRemove={() => removeChild(child.id)}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={addChild}
              className="w-full transition-all duration-150 hover:opacity-90"
              style={{
                padding: "12px 0",
                background: "transparent",
                border: "2px dashed rgba(233,30,99,0.4)",
                borderRadius: 14,
                color: "#f48fb1",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              + Add another child
            </button>

            <PrimaryButton onClick={handleChildContinue} disabled={!canContinue}>
              Continue
            </PrimaryButton>
          </div>
        );
      }

      // Step 2 — Borough (with optional custom area input)
      case 2: {
        const isOther = answers.borough === "other";
        const canContinue =
          !!answers.borough && (!isOther || answers.custom_area.trim().length > 0);
        return (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3">
              {boroughOptions.map((opt) => (
                <Chip
                  key={opt.value}
                  label={opt.label}
                  value={opt.value}
                  selected={answers.borough === opt.value}
                  onSelect={handleBoroughSelect}
                />
              ))}
            </div>
            {isOther && (
              <input
                type="text"
                placeholder="Enter your area"
                value={answers.custom_area}
                onChange={(e) => handleCustomAreaChange(e.target.value)}
                autoFocus
                style={{
                  width: "100%",
                  padding: "14px 18px",
                  borderRadius: 14,
                  fontSize: 15,
                  background: "#1e1b4b",
                  border: "2px solid rgba(255,255,255,0.1)",
                  color: "#fff",
                  outline: "none",
                }}
              />
            )}
            <PrimaryButton onClick={handleBoroughContinue} disabled={!canContinue}>
              Continue
            </PrimaryButton>
          </div>
        );
      }

      // Step 3 — Interests (multi-select) → Finish
      case 3:
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
            <PrimaryButton onClick={handleFinish}>
              Show my recommendations
            </PrimaryButton>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-5" style={{ background: "#0f0d2e" }}>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center mb-10">
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
        <ProgressBar step={step} total={TOTAL_STEPS} />

        {/* Content */}
        <div
          className={`mt-8 transition-all duration-200 ${
            fadeIn ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
          }`}
        >
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "#fff", marginBottom: 8 }}>
            {STEP_TITLES[step]}
          </h1>
          <p style={{ fontSize: 14, color: "#6b7280", marginBottom: 32 }}>
            {STEP_SUBTITLES[step]}
          </p>

          {renderStep()}
        </div>

        {/* Back button */}
        {step > 0 && (
          <button
            onClick={() => goToStep(step - 1)}
            className="transition-colors"
            style={{
              marginTop: 24,
              fontSize: 13,
              color: "#6b7280",
              background: "none",
              border: "none",
              cursor: "pointer",
            }}
          >
            ← Back
          </button>
        )}
      </div>
    </div>
  );
}
