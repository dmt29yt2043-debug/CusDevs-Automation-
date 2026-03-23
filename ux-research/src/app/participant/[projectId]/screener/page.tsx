"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import ParticipantLayout from "@/components/participant-flow/ParticipantLayout";

// Reusable chip button for single-select
function ChipGroup({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(value === opt.value ? "" : opt.value)}
          className={`px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${
            value === opt.value
              ? "bg-blue-600 text-white border-blue-600 shadow-sm"
              : "bg-white text-gray-700 border-gray-200 hover:border-blue-300 hover:bg-blue-50"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// Multi-select chip group
function MultiChipGroup({
  options,
  values,
  onChange,
}: {
  options: { value: string; label: string }[];
  values: string[];
  onChange: (v: string[]) => void;
}) {
  const toggle = (val: string) => {
    onChange(
      values.includes(val) ? values.filter((v) => v !== val) : [...values, val]
    );
  };

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const selected = values.includes(opt.value);
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => toggle(opt.value)}
            className={`px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${
              selected
                ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                : "bg-white text-gray-700 border-gray-200 hover:border-blue-300 hover:bg-blue-50"
            }`}
          >
            {selected && <span className="mr-1.5">✓</span>}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export default function ScreenerPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  const [submitting, setSubmitting] = useState(false);

  const [answers, setAnswers] = useState({
    isParent: "",
    childAge: "",
    city: "",
    searchMethod: [] as string[],
    frequency: "",
  });

  const isValid = answers.isParent && answers.city;

  const handleSubmit = async () => {
    if (!isValid || submitting) return;
    setSubmitting(true);

    try {
      const submitData = {
        ...answers,
        searchMethod: answers.searchMethod.join(", "),
      };

      const pRes = await fetch("/api/participants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          screenerAnswers: submitData,
        }),
      });
      const participant = await pRes.json();

      const sRes = await fetch(`/api/projects/${projectId}/scenario`);
      const scenario = await sRes.json();

      const sessionRes = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: scenario.projectId,
          scenarioId: scenario.id,
          participantId: participant.id,
        }),
      });
      const session = await sessionRes.json();

      sessionStorage.setItem(
        `session-${projectId}`,
        JSON.stringify({
          sessionId: session.id,
          scenarioId: scenario.id,
          participantId: participant.id,
        })
      );

      await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: session.id,
          eventType: "consent_accepted",
        }),
      });

      await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: session.id,
          eventType: "screener_submitted",
          payloadJson: submitData,
        }),
      });

      router.push(`/participant/${projectId}/task`);
    } catch (err) {
      console.error("Error creating session:", err);
      setSubmitting(false);
    }
  };

  return (
    <ParticipantLayout step={3} totalSteps={6}>
      <div className="space-y-7">
        <div>
          <h1 className="text-2xl font-semibold">A few questions about you</h1>
          <p className="text-gray-500 text-sm mt-2">
            This helps us understand the context of your experience.
          </p>
        </div>

        <div className="space-y-6">
          {/* Are you a parent? */}
          <div>
            <label className="block text-sm font-medium mb-2.5">
              Are you a parent?
            </label>
            <ChipGroup
              options={[
                { value: "yes", label: "Yes" },
                { value: "no", label: "No" },
              ]}
              value={answers.isParent}
              onChange={(v) => setAnswers((p) => ({ ...p, isParent: v }))}
            />
          </div>

          {/* Child age */}
          <div>
            <label className="block text-sm font-medium mb-2.5">
              Age of your child / children
            </label>
            <input
              type="text"
              value={answers.childAge}
              onChange={(e) =>
                setAnswers((p) => ({ ...p, childAge: e.target.value }))
              }
              placeholder="e.g. 3 years, 7 years"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* City */}
          <div>
            <label className="block text-sm font-medium mb-2.5">City</label>
            <input
              type="text"
              value={answers.city}
              onChange={(e) =>
                setAnswers((p) => ({ ...p, city: e.target.value }))
              }
              placeholder="New York"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* How do you find activities — MULTI SELECT */}
          <div>
            <label className="block text-sm font-medium mb-1">
              How do you usually find activities for kids?
            </label>
            <p className="text-xs text-gray-400 mb-2.5">Select all that apply</p>
            <MultiChipGroup
              options={[
                { value: "search_engine", label: "Google / Search" },
                { value: "social", label: "Social media" },
                { value: "apps", label: "Apps & websites" },
                { value: "friends", label: "Friends" },
                { value: "chats", label: "Parent chats" },
                { value: "other", label: "Other" },
              ]}
              values={answers.searchMethod}
              onChange={(v) => setAnswers((p) => ({ ...p, searchMethod: v }))}
            />
          </div>

          {/* Frequency */}
          <div>
            <label className="block text-sm font-medium mb-2.5">
              How often do you go to events with kids?
            </label>
            <ChipGroup
              options={[
                { value: "weekly", label: "Every week" },
                { value: "biweekly", label: "Every 2 weeks" },
                { value: "monthly", label: "Once a month" },
                { value: "rarely", label: "Less often" },
              ]}
              value={answers.frequency}
              onChange={(v) => setAnswers((p) => ({ ...p, frequency: v }))}
            />
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={!isValid || submitting}
          className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-500 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed text-sm"
        >
          {submitting ? "Creating session..." : "Continue"}
        </button>
      </div>
    </ParticipantLayout>
  );
}
