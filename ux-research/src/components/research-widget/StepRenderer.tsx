"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { ScenarioStep } from "@/lib/types/scenario";
import { AudioRecorder, AudioRecorderState, uploadAudio } from "@/lib/audio";
import { trackEvent } from "@/lib/event-tracking";

interface StepRendererProps {
  step: ScenarioStep;
  sessionId: string;
  onComplete: (response?: { responseType: string; value: unknown }) => void;
}

export default function StepRenderer({ step, sessionId, onComplete }: StepRendererProps) {
  useEffect(() => {
    trackEvent({ eventType: "step_viewed", payloadJson: { stepId: step.id, type: step.type } });
  }, [step.id, step.type]);

  switch (step.type) {
    case "message":
      return <MessageRenderer step={step} onComplete={onComplete} />;
    case "button":
      return <ButtonRenderer step={step} onComplete={onComplete} />;
    case "rating":
      return <RatingRenderer step={step} onComplete={onComplete} />;
    case "text_input":
      return <TextInputRenderer step={step} onComplete={onComplete} />;
    case "audio_prompt":
      return <AudioPromptRenderer step={step} sessionId={sessionId} onComplete={onComplete} />;
    case "wait_for_time":
      return <WaitRenderer step={step} onComplete={onComplete} />;
    case "end":
      return <EndRenderer step={step} onComplete={onComplete} />;
    default:
      return <div className="rw-text-sm rw-text-red-500">Unknown step type</div>;
  }
}

function MessageRenderer({
  step,
  onComplete,
}: {
  step: ScenarioStep;
  onComplete: () => void;
}) {
  return (
    <div className="rw-space-y-3">
      <p className="rw-text-sm rw-leading-relaxed">{step.text}</p>
      <button
        onClick={onComplete}
        className="rw-w-full rw-py-2 rw-bg-blue-600 rw-text-white rw-rounded-lg rw-text-sm rw-font-medium hover:rw-bg-blue-500"
      >
        Next
      </button>
    </div>
  );
}

function ButtonRenderer({
  step,
  onComplete,
}: {
  step: ScenarioStep;
  onComplete: () => void;
}) {
  return (
    <button
      onClick={onComplete}
      className="rw-w-full rw-py-2.5 rw-bg-blue-600 rw-text-white rw-rounded-lg rw-text-sm rw-font-medium hover:rw-bg-blue-500"
    >
      {step.text}
    </button>
  );
}

function RatingRenderer({
  step,
  onComplete,
}: {
  step: ScenarioStep & { type: "rating" };
  onComplete: (r: { responseType: string; value: unknown }) => void;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const min = step.min ?? 1;
  const max = step.max ?? 10;
  const values = Array.from({ length: max - min + 1 }, (_, i) => min + i);

  return (
    <div className="rw-space-y-3">
      <p className="rw-text-sm rw-leading-relaxed">{step.text}</p>
      <div className="rw-flex rw-flex-wrap rw-gap-1.5">
        {values.map((v) => (
          <button
            key={v}
            onClick={() => setSelected(v)}
            className={`rw-w-8 rw-h-8 rw-rounded-lg rw-text-xs rw-font-medium rw-border ${
              selected === v
                ? "rw-bg-blue-600 rw-text-white rw-border-blue-600"
                : "rw-bg-white rw-text-gray-700 rw-border-gray-200 hover:rw-border-blue-300"
            }`}
          >
            {v}
          </button>
        ))}
      </div>
      <div className="rw-flex rw-justify-between rw-text-xs rw-text-gray-400">
        <span>Not clear at all</span>
        <span>Very clear</span>
      </div>
      {selected !== null && (
        <button
          onClick={() => onComplete({ responseType: "rating", value: { rating: selected } })}
          className="rw-w-full rw-py-2 rw-bg-blue-600 rw-text-white rw-rounded-lg rw-text-sm rw-font-medium hover:rw-bg-blue-500"
        >
          Confirm
        </button>
      )}
    </div>
  );
}

function TextInputRenderer({
  step,
  onComplete,
}: {
  step: ScenarioStep & { type: "text_input" };
  onComplete: (r: { responseType: string; value: unknown }) => void;
}) {
  const [text, setText] = useState("");

  return (
    <div className="rw-space-y-3">
      <p className="rw-text-sm rw-leading-relaxed">{step.text}</p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={step.placeholder || "Your answer..."}
        rows={3}
        className="rw-w-full rw-border rw-border-gray-200 rw-rounded-lg rw-px-3 rw-py-2 rw-text-sm rw-resize-none"
      />
      <button
        onClick={() => onComplete({ responseType: "text", value: { text } })}
        disabled={!text.trim()}
        className="rw-w-full rw-py-2 rw-bg-blue-600 rw-text-white rw-rounded-lg rw-text-sm rw-font-medium hover:rw-bg-blue-500 disabled:rw-bg-gray-300"
      >
        Submit
      </button>
    </div>
  );
}

function AudioPromptRenderer({
  step,
  sessionId,
  onComplete,
}: {
  step: ScenarioStep & { type: "audio_prompt" };
  sessionId: string;
  onComplete: (r: { responseType: string; value: unknown }) => void;
}) {
  const [state, setState] = useState<AudioRecorderState>({
    isRecording: false,
    isPaused: false,
    duration: 0,
    error: null,
  });
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const recorderRef = useRef<AudioRecorder | null>(null);
  const blobRef = useRef<Blob | null>(null);

  const maxDuration = step.maxDurationSec || 90;

  const handleStateChange = useCallback((s: AudioRecorderState) => {
    setState(s);
    if (!s.isRecording && s.duration > 0) {
      // Recording stopped (possibly auto by max duration)
    }
  }, []);

  const startRecording = async () => {
    recorderRef.current = new AudioRecorder(handleStateChange, maxDuration);
    await recorderRef.current.start();
    trackEvent({ eventType: "audio_record_started", payloadJson: { stepId: step.id } });
  };

  const stopRecording = () => {
    if (!recorderRef.current) return;
    const blob = recorderRef.current.stop();
    blobRef.current = blob;
    trackEvent({ eventType: "audio_record_stopped", payloadJson: { stepId: step.id } });
  };

  const handleUpload = async () => {
    if (!blobRef.current) return;
    setUploading(true);
    try {
      const result = await uploadAudio(blobRef.current, sessionId, step.id, state.duration);
      setUploaded(true);
      onComplete({ responseType: "audio", value: { audioAssetId: result.id } });
    } catch {
      setState((s) => ({ ...s, error: "Upload failed. Please try again." }));
    } finally {
      setUploading(false);
    }
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="rw-space-y-3">
      <p className="rw-text-sm rw-leading-relaxed">{step.text}</p>

      {state.error && (
        <div className="rw-bg-red-50 rw-text-red-600 rw-text-xs rw-rounded-lg rw-p-2">
          {state.error}
        </div>
      )}

      {!state.isRecording && !blobRef.current && (
        <button
          onClick={startRecording}
          className="rw-w-full rw-py-2.5 rw-bg-red-500 rw-text-white rw-rounded-lg rw-text-sm rw-font-medium hover:rw-bg-red-400 rw-flex rw-items-center rw-justify-center rw-gap-2"
        >
          <span className="rw-w-3 rw-h-3 rw-bg-white rw-rounded-full" />
          Start Recording
        </button>
      )}

      {state.isRecording && (
        <div className="rw-space-y-2">
          <div className="rw-flex rw-items-center rw-justify-between rw-bg-red-50 rw-rounded-lg rw-p-3">
            <div className="rw-flex rw-items-center rw-gap-2">
              <span className="rw-w-2.5 rw-h-2.5 rw-bg-red-500 rw-rounded-full rw-animate-pulse" />
              <span className="rw-text-sm rw-text-red-700">Recording</span>
            </div>
            <span className="rw-text-sm rw-font-mono rw-text-red-700">
              {formatTime(state.duration)} / {formatTime(maxDuration)}
            </span>
          </div>
          <button
            onClick={stopRecording}
            className="rw-w-full rw-py-2 rw-bg-gray-800 rw-text-white rw-rounded-lg rw-text-sm rw-font-medium hover:rw-bg-gray-700"
          >
            Stop Recording
          </button>
        </div>
      )}

      {!state.isRecording && blobRef.current && !uploaded && (
        <div className="rw-space-y-2">
          <div className="rw-bg-green-50 rw-rounded-lg rw-p-3 rw-text-sm rw-text-green-700">
            Recorded: {formatTime(state.duration)}
          </div>
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="rw-w-full rw-py-2 rw-bg-blue-600 rw-text-white rw-rounded-lg rw-text-sm rw-font-medium hover:rw-bg-blue-500 disabled:rw-bg-gray-300"
          >
            {uploading ? "Uploading..." : "Submit Recording"}
          </button>
        </div>
      )}
    </div>
  );
}

function WaitRenderer({
  step,
  onComplete,
}: {
  step: ScenarioStep & { type: "wait_for_time" };
  onComplete: () => void;
}) {
  const [elapsed, setElapsed] = useState(0);
  const duration = step.durationSec;

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed((prev) => {
        if (prev + 1 >= duration) {
          clearInterval(interval);
        }
        return prev + 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [duration]);

  const canSkip = elapsed >= Math.min(10, duration);
  const pct = Math.min((elapsed / duration) * 100, 100);

  return (
    <div className="rw-space-y-3">
      <p className="rw-text-sm rw-leading-relaxed">{step.text}</p>
      <div className="rw-h-1.5 rw-bg-gray-100 rw-rounded-full">
        <div
          className="rw-h-1.5 rw-bg-blue-500 rw-rounded-full rw-transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="rw-text-xs rw-text-gray-400 rw-text-center">
        {elapsed >= duration
          ? "Time is up"
          : `${duration - elapsed}s remaining`}
      </div>
      {canSkip && (
        <button
          onClick={onComplete}
          className="rw-w-full rw-py-2 rw-bg-gray-200 rw-text-gray-700 rw-rounded-lg rw-text-sm hover:rw-bg-gray-300"
        >
          {elapsed >= duration ? "Next" : "Skip ahead"}
        </button>
      )}
    </div>
  );
}

function EndRenderer({
  step,
  onComplete,
}: {
  step: ScenarioStep;
  onComplete: () => void;
}) {
  return (
    <div className="rw-space-y-3">
      <div className="rw-text-center">
        <span className="rw-text-2xl">🎉</span>
      </div>
      <p className="rw-text-sm rw-leading-relaxed rw-text-center">{step.text}</p>
      <button
        onClick={onComplete}
        className="rw-w-full rw-py-2 rw-bg-green-600 rw-text-white rw-rounded-lg rw-text-sm rw-font-medium hover:rw-bg-green-500"
      >
        Finish
      </button>
    </div>
  );
}
