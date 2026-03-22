"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import ParticipantLayout from "@/components/participant-flow/ParticipantLayout";

export default function ConsentPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  const [consents, setConsents] = useState({
    participation: false,
    tracking: false,
    audio: false,
  });

  const allChecked = consents.participation && consents.tracking && consents.audio;

  const toggle = (key: keyof typeof consents) => {
    setConsents((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleContinue = () => {
    sessionStorage.setItem(`consent-${projectId}`, JSON.stringify(consents));
    router.push(`/participant/${projectId}/screener`);
  };

  return (
    <ParticipantLayout step={2} totalSteps={6}>
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Consent to Participate</h1>
        <p className="text-gray-600 text-sm">
          Before we begin, we need your consent. Please review the terms
          and check all boxes.
        </p>

        <div className="space-y-4">
          <label className="flex items-start gap-3 p-4 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-50">
            <input
              type="checkbox"
              checked={consents.participation}
              onChange={() => toggle("participation")}
              className="mt-0.5 w-5 h-5 rounded"
            />
            <div>
              <div className="font-medium text-sm">Participation Consent</div>
              <div className="text-xs text-gray-500 mt-1">
                I voluntarily participate in this study and understand that I can
                stop at any time.
              </div>
            </div>
          </label>

          <label className="flex items-start gap-3 p-4 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-50">
            <input
              type="checkbox"
              checked={consents.tracking}
              onChange={() => toggle("tracking")}
              className="mt-0.5 w-5 h-5 rounded"
            />
            <div>
              <div className="font-medium text-sm">Activity Recording</div>
              <div className="text-xs text-gray-500 mt-1">
                I agree that my clicks, scrolls, and site navigation will be
                recorded as part of the study.
              </div>
            </div>
          </label>

          <label className="flex items-start gap-3 p-4 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-50">
            <input
              type="checkbox"
              checked={consents.audio}
              onChange={() => toggle("audio")}
              className="mt-0.5 w-5 h-5 rounded"
            />
            <div>
              <div className="font-medium text-sm">Voice Responses</div>
              <div className="text-xs text-gray-500 mt-1">
                I agree to have my voice responses recorded through the browser
                microphone.
              </div>
            </div>
          </label>
        </div>

        <button
          onClick={handleContinue}
          disabled={!allChecked}
          className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-500 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          Continue
        </button>
      </div>
    </ParticipantLayout>
  );
}
