"use client";

import { useState, useCallback, useRef, useEffect, CSSProperties } from "react";
import type { ScenarioStep } from "@/lib/types/scenario";
import { AudioRecorder, AudioRecorderState, uploadAudio } from "@/lib/audio";
import { trackEvent } from "@/lib/event-tracking";

// Shared styles
const styles = {
  container: { display: "flex", flexDirection: "column", gap: "12px" } as CSSProperties,
  text: { fontSize: "14px", lineHeight: "1.6", color: "#374151", margin: 0 } as CSSProperties,
  textSmall: { fontSize: "12px", color: "#9ca3af", margin: 0 } as CSSProperties,
  btn: {
    width: "100%",
    padding: "10px 16px",
    backgroundColor: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
    transition: "background-color 0.15s",
    fontFamily: "inherit",
  } as CSSProperties,
  btnSecondary: {
    width: "100%",
    padding: "10px 16px",
    backgroundColor: "#f3f4f6",
    color: "#374151",
    border: "1px solid #e5e7eb",
    borderRadius: "10px",
    fontSize: "14px",
    fontWeight: 500,
    cursor: "pointer",
    transition: "background-color 0.15s",
    fontFamily: "inherit",
  } as CSSProperties,
  btnDanger: {
    width: "100%",
    padding: "10px 16px",
    backgroundColor: "#ef4444",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    fontFamily: "inherit",
  } as CSSProperties,
  btnDark: {
    width: "100%",
    padding: "10px 16px",
    backgroundColor: "#1f2937",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit",
  } as CSSProperties,
  btnSuccess: {
    width: "100%",
    padding: "10px 16px",
    backgroundColor: "#16a34a",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit",
  } as CSSProperties,
  btnDisabled: { opacity: 0.5, cursor: "not-allowed" } as CSSProperties,
  ratingGrid: { display: "flex", flexWrap: "wrap", gap: "6px" } as CSSProperties,
  ratingBtn: (selected: boolean) => ({
    width: "32px",
    height: "32px",
    borderRadius: "8px",
    fontSize: "12px",
    fontWeight: 600,
    border: selected ? "2px solid #2563eb" : "1px solid #e5e7eb",
    backgroundColor: selected ? "#2563eb" : "#fff",
    color: selected ? "#fff" : "#374151",
    cursor: "pointer",
    transition: "all 0.15s",
    fontFamily: "inherit",
  }) as CSSProperties,
  ratingLabels: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "11px",
    color: "#9ca3af",
  } as CSSProperties,
  textarea: {
    width: "100%",
    border: "1px solid #e5e7eb",
    borderRadius: "10px",
    padding: "10px 12px",
    fontSize: "14px",
    resize: "none" as const,
    fontFamily: "inherit",
    outline: "none",
    boxSizing: "border-box" as const,
  } as CSSProperties,
  errorBox: {
    backgroundColor: "#fef2f2",
    color: "#dc2626",
    fontSize: "12px",
    borderRadius: "8px",
    padding: "8px 12px",
  } as CSSProperties,
  recordingBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fef2f2",
    borderRadius: "10px",
    padding: "12px",
  } as CSSProperties,
  recordingDot: {
    width: "10px",
    height: "10px",
    backgroundColor: "#ef4444",
    borderRadius: "50%",
    animation: "pulse 1.5s infinite",
  } as CSSProperties,
  successBox: {
    backgroundColor: "#f0fdf4",
    borderRadius: "10px",
    padding: "12px",
    fontSize: "14px",
    color: "#15803d",
  } as CSSProperties,
  progressBg: {
    height: "6px",
    backgroundColor: "#f3f4f6",
    borderRadius: "999px",
    overflow: "hidden",
  } as CSSProperties,
  progressFill: (pct: number) => ({
    height: "6px",
    backgroundColor: "#2563eb",
    borderRadius: "999px",
    transition: "width 0.3s",
    width: `${pct}%`,
  }) as CSSProperties,
};

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
      return <div style={{ fontSize: "13px", color: "#ef4444" }}>Unknown step type</div>;
  }
}

function MessageRenderer({ step, onComplete }: { step: ScenarioStep; onComplete: () => void }) {
  return (
    <div style={styles.container}>
      <p style={styles.text}>{step.text}</p>
      <button style={styles.btn} onClick={onComplete}>Next</button>
    </div>
  );
}

function ButtonRenderer({ step, onComplete }: { step: ScenarioStep; onComplete: () => void }) {
  return (
    <div style={styles.container}>
      <button style={styles.btn} onClick={onComplete}>{step.text}</button>
    </div>
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
    <div style={styles.container}>
      <p style={styles.text}>{step.text}</p>
      <div style={styles.ratingGrid}>
        {values.map((v) => (
          <button key={v} onClick={() => setSelected(v)} style={styles.ratingBtn(selected === v)}>
            {v}
          </button>
        ))}
      </div>
      <div style={styles.ratingLabels}>
        <span>Not clear at all</span>
        <span>Very clear</span>
      </div>
      {selected !== null && (
        <button
          style={styles.btn}
          onClick={() => onComplete({ responseType: "rating", value: { rating: selected } })}
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
    <div style={styles.container}>
      <p style={styles.text}>{step.text}</p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={step.placeholder || "Your answer..."}
        rows={3}
        style={styles.textarea}
      />
      <button
        style={{ ...styles.btn, ...(text.trim() ? {} : styles.btnDisabled) }}
        onClick={() => text.trim() && onComplete({ responseType: "text", value: { text } })}
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

  const handleStateChange = useCallback((s: AudioRecorderState) => setState(s), []);

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

  const fmt = (sec: number) => `${Math.floor(sec / 60)}:${(sec % 60).toString().padStart(2, "0")}`;

  return (
    <div style={styles.container}>
      <p style={styles.text}>{step.text}</p>

      {state.error && <div style={styles.errorBox}>{state.error}</div>}

      {!state.isRecording && !blobRef.current && (
        <button style={styles.btnDanger} onClick={startRecording}>
          <span style={{ width: 12, height: 12, backgroundColor: "#fff", borderRadius: "50%", display: "inline-block" }} />
          Start Recording
        </button>
      )}

      {state.isRecording && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <div style={styles.recordingBar}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={styles.recordingDot} />
              <span style={{ fontSize: "14px", color: "#b91c1c" }}>Recording</span>
            </div>
            <span style={{ fontSize: "14px", fontFamily: "monospace", color: "#b91c1c" }}>
              {fmt(state.duration)} / {fmt(maxDuration)}
            </span>
          </div>
          <button style={styles.btnDark} onClick={stopRecording}>Stop Recording</button>
        </div>
      )}

      {!state.isRecording && blobRef.current && !uploaded && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <div style={styles.successBox}>Recorded: {fmt(state.duration)}</div>
          <button
            style={{ ...styles.btn, ...(uploading ? styles.btnDisabled : {}) }}
            onClick={handleUpload}
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
        if (prev + 1 >= duration) clearInterval(interval);
        return prev + 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [duration]);

  const canSkip = elapsed >= Math.min(10, duration);
  const pct = Math.min((elapsed / duration) * 100, 100);

  return (
    <div style={styles.container}>
      <p style={styles.text}>{step.text}</p>
      <div style={styles.progressBg}>
        <div style={styles.progressFill(pct)} />
      </div>
      <p style={{ ...styles.textSmall, textAlign: "center" }}>
        {elapsed >= duration ? "Time is up" : `${duration - elapsed}s remaining`}
      </p>
      {canSkip && (
        <button style={styles.btnSecondary} onClick={onComplete}>
          {elapsed >= duration ? "Next" : "Skip ahead"}
        </button>
      )}
    </div>
  );
}

function EndRenderer({ step, onComplete }: { step: ScenarioStep; onComplete: () => void }) {
  return (
    <div style={styles.container}>
      <div style={{ textAlign: "center", fontSize: "28px" }}>🎉</div>
      <p style={{ ...styles.text, textAlign: "center" }}>{step.text}</p>
      <button style={styles.btnSuccess} onClick={onComplete}>Finish</button>
    </div>
  );
}
