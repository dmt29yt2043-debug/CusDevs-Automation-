"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface SessionActionsProps {
  sessionId: string;
  initialIsFavorite: boolean;
}

export default function SessionActions({
  sessionId,
  initialIsFavorite,
}: SessionActionsProps) {
  const router = useRouter();
  const [isFavorite, setIsFavorite] = useState(initialIsFavorite);
  const [deleting, setDeleting] = useState(false);

  const toggleFavorite = async () => {
    const next = !isFavorite;
    setIsFavorite(next); // optimistic
    try {
      const res = await fetch(`/api/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFavorite: next }),
      });
      if (!res.ok) throw new Error("failed");
    } catch {
      setIsFavorite(!next); // revert
    }
  };

  const handleDelete = async () => {
    if (
      !confirm(
        "Delete this session? This will also remove all events, responses, and audio recordings. This cannot be undone."
      )
    ) {
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      router.push("/admin/sessions");
      router.refresh();
    } catch (err) {
      setDeleting(false);
      alert(
        err instanceof Error ? `Delete failed: ${err.message}` : "Delete failed"
      );
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={toggleFavorite}
        title={isFavorite ? "Remove from favorites" : "Mark as favorite"}
        aria-label="Toggle favorite"
        className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill={isFavorite ? "#f59e0b" : "none"}
          stroke={isFavorite ? "#f59e0b" : "#6b7280"}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      </button>
      <button
        onClick={handleDelete}
        disabled={deleting}
        title="Delete session"
        aria-label="Delete session"
        className="p-2 rounded-lg border border-red-200 bg-white text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
          <path d="M10 11v6" />
          <path d="M14 11v6" />
          <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
        </svg>
        <span className="text-sm font-medium">
          {deleting ? "Deleting…" : "Delete"}
        </span>
      </button>
    </div>
  );
}
