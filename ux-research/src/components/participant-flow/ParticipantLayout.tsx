"use client";

export default function ParticipantLayout({
  children,
  step,
  totalSteps,
}: {
  children: React.ReactNode;
  step?: number;
  totalSteps?: number;
}) {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-lg">
        {step && totalSteps && (
          <div className="mb-6">
            <div className="flex justify-between text-sm text-gray-400 mb-2">
              <span>Step {step} of {totalSteps}</span>
            </div>
            <div className="h-1 bg-gray-100 rounded-full">
              <div
                className="h-1 bg-blue-500 rounded-full transition-all"
                style={{ width: `${(step / totalSteps) * 100}%` }}
              />
            </div>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
