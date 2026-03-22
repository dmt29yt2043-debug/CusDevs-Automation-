"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import ParticipantLayout from "@/components/participant-flow/ParticipantLayout";

export default function ScreenerPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  const [submitting, setSubmitting] = useState(false);

  const [answers, setAnswers] = useState({
    isParent: "",
    childAge: "",
    city: "",
    searchMethod: "",
    frequency: "",
  });

  const update = (key: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  };

  const isValid = answers.isParent && answers.city;

  const handleSubmit = async () => {
    if (!isValid || submitting) return;
    setSubmitting(true);

    try {
      // Create participant
      const pRes = await fetch("/api/participants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          screenerAnswers: answers,
        }),
      });
      const participant = await pRes.json();

      // Get active scenario
      const sRes = await fetch(`/api/projects/${projectId}/scenario`);
      const scenario = await sRes.json();

      // Create session
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

      // Store session info
      sessionStorage.setItem(`session-${projectId}`, JSON.stringify({
        sessionId: session.id,
        scenarioId: scenario.id,
        participantId: participant.id,
      }));

      // Log consent event
      await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: session.id,
          eventType: "consent_accepted",
        }),
      });

      // Log screener event
      await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: session.id,
          eventType: "screener_submitted",
          payloadJson: answers,
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
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">A few questions about you</h1>
        <p className="text-gray-600 text-sm">
          This will help us better understand the context of your experience.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Are you a parent?
            </label>
            <select
              value={answers.isParent}
              onChange={(e) => update("isParent", e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm"
            >
              <option value="">Select</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">
              Age of your child / children
            </label>
            <input
              type="text"
              value={answers.childAge}
              onChange={(e) => update("childAge", e.target.value)}
              placeholder="e.g. 3 years, 7 years"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">City</label>
            <input
              type="text"
              value={answers.city}
              onChange={(e) => update("city", e.target.value)}
              placeholder="New York"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">
              How do you usually find activities for kids?
            </label>
            <select
              value={answers.searchMethod}
              onChange={(e) => update("searchMethod", e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm"
            >
              <option value="">Select</option>
              <option value="search_engine">Search engine (Google, Bing)</option>
              <option value="social">Social media & chats</option>
              <option value="apps">Apps & aggregator websites</option>
              <option value="friends">Friend recommendations</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">
              How often do you go to events with kids?
            </label>
            <select
              value={answers.frequency}
              onChange={(e) => update("frequency", e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm"
            >
              <option value="">Select</option>
              <option value="weekly">Every week</option>
              <option value="biweekly">Every 2 weeks</option>
              <option value="monthly">Once a month</option>
              <option value="rarely">Less often</option>
            </select>
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={!isValid || submitting}
          className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-500 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {submitting ? "Creating session..." : "Continue"}
        </button>
      </div>
    </ParticipantLayout>
  );
}
