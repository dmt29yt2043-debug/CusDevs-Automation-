"use client";

import { useParams, useRouter } from "next/navigation";
import ParticipantLayout from "@/components/participant-flow/ParticipantLayout";

export default function TaskPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  return (
    <ParticipantLayout step={4} totalSteps={6}>
      <div className="text-center space-y-6">
        <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto">
          <span className="text-2xl">📋</span>
        </div>
        <h1 className="text-2xl font-semibold">Your Task</h1>
        <div className="bg-gray-50 rounded-xl p-6 text-left space-y-3">
          <p className="text-gray-700 leading-relaxed">
            Imagine the weekend is coming and you want to find something to do
            with your child on <strong>Saturday morning</strong>.
          </p>
          <p className="text-gray-700 leading-relaxed">
            You will now see a website. Try to find a suitable activity.
            Interact with it as you normally would.
          </p>
          <p className="text-gray-500 text-sm">
            A research assistant will appear in the bottom right corner — it
            will ask you questions along the way.
          </p>
        </div>
        <button
          onClick={() => router.push(`/participant/${projectId}/test`)}
          className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-500 transition-colors"
        >
          Go to Test
        </button>
      </div>
    </ParticipantLayout>
  );
}
