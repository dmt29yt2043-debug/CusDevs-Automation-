"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface TranscribeButtonProps {
  sessionId: string;
  audioCount: number;
  pendingCount: number;
}

export default function TranscribeButton({
  sessionId,
  audioCount,
  pendingCount,
}: TranscribeButtonProps) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">(
    "idle"
  );
  const [message, setMessage] = useState("");

  if (audioCount === 0) return null;

  const handleClick = async () => {
    if (status === "loading") return;
    setStatus("loading");
    setMessage("");
    try {
      const res = await fetch(`/api/sessions/${sessionId}/transcribe`, {
        method: "POST",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as {
        processed: number;
        skipped: number;
        errors: number;
      };
      setStatus("done");
      const parts: string[] = [];
      if (data.processed) parts.push(`${data.processed} transcribed`);
      if (data.skipped) parts.push(`${data.skipped} already done`);
      if (data.errors) parts.push(`${data.errors} errors`);
      setMessage(parts.join(" · ") || "No audio to process");
      router.refresh();
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Transcription failed");
    }
  };

  const label =
    status === "loading"
      ? "Transcribing…"
      : status === "done"
        ? "Transcribe again"
        : pendingCount > 0
          ? `Transcribe ${pendingCount} voice response${pendingCount === 1 ? "" : "s"}`
          : "Re-transcribe all";

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleClick}
        disabled={status === "loading"}
        className="px-4 py-2 text-sm font-medium rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
      >
        {status === "loading" && (
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
            />
          </svg>
        )}
        {label}
      </button>
      {message && (
        <span
          className={`text-xs ${
            status === "error" ? "text-red-600" : "text-gray-500"
          }`}
        >
          {message}
        </span>
      )}
    </div>
  );
}
