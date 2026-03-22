"use client";

export interface AudioRecorderState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  error: string | null;
}

export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private startTime = 0;
  private timerInterval: ReturnType<typeof setInterval> | null = null;
  private maxDuration: number;
  private onStateChange: (state: AudioRecorderState) => void;
  private _duration = 0;

  constructor(
    onStateChange: (state: AudioRecorderState) => void,
    maxDuration = 90
  ) {
    this.onStateChange = onStateChange;
    this.maxDuration = maxDuration;
  }

  async start(): Promise<void> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      this.onStateChange({
        isRecording: false,
        isPaused: false,
        duration: 0,
        error: "Microphone access denied. Please allow microphone access in your browser.",
      });
      return;
    }

    this.chunks = [];
    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : "audio/webm";

    this.mediaRecorder = new MediaRecorder(this.stream, { mimeType });

    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data);
    };

    this.mediaRecorder.onstop = () => {
      this.stopTimer();
    };

    this.mediaRecorder.start(1000);
    this.startTime = Date.now();
    this.startTimer();

    this.onStateChange({
      isRecording: true,
      isPaused: false,
      duration: 0,
      error: null,
    });
  }

  stop(): Blob | null {
    if (!this.mediaRecorder || this.mediaRecorder.state === "inactive") return null;

    this.mediaRecorder.stop();
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stopTimer();

    const blob = new Blob(this.chunks, { type: this.mediaRecorder.mimeType });

    this.onStateChange({
      isRecording: false,
      isPaused: false,
      duration: this._duration,
      error: null,
    });

    return blob;
  }

  getDuration(): number {
    return this._duration;
  }

  private startTimer() {
    this.timerInterval = setInterval(() => {
      this._duration = Math.round((Date.now() - this.startTime) / 1000);

      if (this._duration >= this.maxDuration) {
        this.stop();
        return;
      }

      this.onStateChange({
        isRecording: true,
        isPaused: false,
        duration: this._duration,
        error: null,
      });
    }, 500);
  }

  private stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }
}

export async function uploadAudio(
  blob: Blob,
  sessionId: string,
  stepId: string,
  durationSec: number
): Promise<{ id: string }> {
  const formData = new FormData();
  formData.append("file", blob, `recording-${stepId}.webm`);
  formData.append("sessionId", sessionId);
  formData.append("stepId", stepId);
  formData.append("durationSec", String(durationSec));

  const res = await fetch("/api/audio", { method: "POST", body: formData });
  if (!res.ok) throw new Error("Audio upload failed");
  return res.json();
}
