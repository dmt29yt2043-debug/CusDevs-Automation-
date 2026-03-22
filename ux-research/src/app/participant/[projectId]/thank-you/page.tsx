"use client";

import ParticipantLayout from "@/components/participant-flow/ParticipantLayout";

export default function ThankYouPage() {
  return (
    <ParticipantLayout step={6} totalSteps={6}>
      <div className="text-center space-y-6">
        <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto">
          <span className="text-2xl">✅</span>
        </div>
        <h1 className="text-2xl font-semibold">Thank You!</h1>
        <p className="text-gray-600 leading-relaxed">
          You have completed the study. Your responses are very valuable
          and will help us improve the product.
        </p>
        <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-500">
          You can close this tab.
        </div>
      </div>
    </ParticipantLayout>
  );
}
