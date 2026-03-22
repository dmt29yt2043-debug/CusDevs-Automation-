"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import ParticipantLayout from "@/components/participant-flow/ParticipantLayout";

export default function ConsentPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  const handleAccept = () => {
    sessionStorage.setItem(
      `consent-${projectId}`,
      JSON.stringify({ participation: true, tracking: true, audio: true })
    );
    router.push(`/participant/${projectId}/screener`);
  };

  return (
    <ParticipantLayout step={2} totalSteps={6}>
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Consent to Participate</h1>
        <p className="text-gray-600 text-sm">
          By continuing, you agree to the following:
        </p>

        <div className="space-y-3">
          <div className="flex items-start gap-3 p-4 rounded-xl border border-gray-200 bg-gray-50">
            <span className="text-green-500 mt-0.5">&#10003;</span>
            <div>
              <div className="font-medium text-sm">Voluntary Participation</div>
              <div className="text-xs text-gray-500 mt-1">
                You voluntarily participate in this study and can stop at any time.
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 rounded-xl border border-gray-200 bg-gray-50">
            <span className="text-green-500 mt-0.5">&#10003;</span>
            <div>
              <div className="font-medium text-sm">Activity Recording</div>
              <div className="text-xs text-gray-500 mt-1">
                Your clicks, scrolls, and site navigation will be recorded as
                part of the study.
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 rounded-xl border border-gray-200 bg-gray-50">
            <span className="text-green-500 mt-0.5">&#10003;</span>
            <div>
              <div className="font-medium text-sm">Voice Responses</div>
              <div className="text-xs text-gray-500 mt-1">
                Your voice responses will be recorded through the browser
                microphone.
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={handleAccept}
          className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-500 transition-colors"
        >
          I Accept
        </button>
      </div>
    </ParticipantLayout>
  );
}
