"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const statusColors: Record<string, string> = {
  started: "bg-yellow-100 text-yellow-700",
  in_progress: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  abandoned: "bg-red-100 text-red-700",
};

export interface SessionRow {
  id: string;
  code: string;
  status: string;
  startedAt: string;
  durationSec: number | null;
  isFavorite: boolean;
  projectName: string;
  eventsCount: number;
  responsesCount: number;
  audioCount: number;
  participantCity: string | null;
}

interface SessionsTableProps {
  sessions: SessionRow[];
  showProjectColumn: boolean;
}

export default function SessionsTable({
  sessions,
  showProjectColumn,
}: SessionsTableProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [favorites, setFavorites] = useState<Set<string>>(
    new Set(sessions.filter((s) => s.isFavorite).map((s) => s.id))
  );
  const [isPending, startTransition] = useTransition();
  const [deleting, setDeleting] = useState(false);

  const allSelected =
    sessions.length > 0 && sessions.every((s) => selected.has(s.id));
  const someSelected = selected.size > 0 && !allSelected;

  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(sessions.map((s) => s.id)));
    }
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleFavorite = async (id: string) => {
    const isFav = favorites.has(id);
    // optimistic update
    setFavorites((prev) => {
      const next = new Set(prev);
      if (isFav) next.delete(id);
      else next.add(id);
      return next;
    });
    try {
      await fetch(`/api/sessions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFavorite: !isFav }),
      });
    } catch {
      // revert on error
      setFavorites((prev) => {
        const next = new Set(prev);
        if (isFav) next.add(id);
        else next.delete(id);
        return next;
      });
    }
  };

  const deleteSelected = async () => {
    const count = selected.size;
    if (count === 0) return;
    if (
      !confirm(
        `Delete ${count} session${count === 1 ? "" : "s"}? This will also remove all events, responses, and audio recordings. This cannot be undone.`
      )
    ) {
      return;
    }
    setDeleting(true);
    try {
      const ids = Array.from(selected);
      const results = await Promise.allSettled(
        ids.map((id) =>
          fetch(`/api/sessions/${id}`, { method: "DELETE" }).then((res) => {
            if (!res.ok) throw new Error(`Failed ${id}`);
          })
        )
      );
      const failed = results.filter((r) => r.status === "rejected").length;
      if (failed > 0) {
        alert(`${failed} session${failed === 1 ? "" : "s"} failed to delete.`);
      }
      setSelected(new Set());
      startTransition(() => {
        router.refresh();
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      {/* Action bar */}
      <div className="flex items-center justify-between mb-3 min-h-[36px]">
        <div className="text-sm text-gray-500">
          {selected.size > 0
            ? `${selected.size} selected`
            : `${sessions.length} session${sessions.length === 1 ? "" : "s"}`}
        </div>
        {selected.size > 0 && (
          <button
            onClick={deleteSelected}
            disabled={deleting || isPending}
            className="px-3 py-1.5 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {deleting ? "Deleting…" : `Delete ${selected.size}`}
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 text-sm text-gray-500">
              <th className="px-4 py-3 w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected;
                  }}
                  onChange={toggleAll}
                  className="w-4 h-4 cursor-pointer accent-blue-600"
                />
              </th>
              <th className="px-2 py-3 w-8" aria-label="Favorite" />
              <th className="text-left px-4 py-3 font-medium">#</th>
              {showProjectColumn && (
                <th className="text-left px-4 py-3 font-medium">Project</th>
              )}
              <th className="text-left px-4 py-3 font-medium">Status</th>
              <th className="text-left px-4 py-3 font-medium">Duration</th>
              <th className="text-left px-4 py-3 font-medium">Started</th>
              <th className="text-left px-4 py-3 font-medium">Events</th>
              <th className="text-left px-4 py-3 font-medium">Responses</th>
              <th className="text-left px-4 py-3 font-medium">Audio</th>
              <th className="text-left px-4 py-3 font-medium">Participant</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s) => {
              const isSelected = selected.has(s.id);
              const isFav = favorites.has(s.id);
              return (
                <tr
                  key={s.id}
                  className={`border-b border-gray-50 hover:bg-gray-50 ${
                    isSelected ? "bg-blue-50/50" : ""
                  }`}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleOne(s.id)}
                      className="w-4 h-4 cursor-pointer accent-blue-600"
                    />
                  </td>
                  <td className="px-2 py-3">
                    <button
                      onClick={() => toggleFavorite(s.id)}
                      className="p-1 rounded hover:bg-gray-100 transition-colors"
                      title={isFav ? "Remove from favorites" : "Mark as favorite"}
                      aria-label="Toggle favorite"
                    >
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill={isFav ? "#f59e0b" : "none"}
                        stroke={isFav ? "#f59e0b" : "#9ca3af"}
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/sessions/${s.id}`}
                      className="text-sm text-blue-600 hover:underline font-medium font-mono"
                    >
                      {s.code}
                    </Link>
                  </td>
                  {showProjectColumn && (
                    <td className="px-4 py-3 text-sm">{s.projectName}</td>
                  )}
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        statusColors[s.status] || "bg-gray-100"
                      }`}
                    >
                      {s.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {s.durationSec
                      ? `${Math.round(s.durationSec / 60)}m ${s.durationSec % 60}s`
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {new Date(s.startedAt).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: false,
                    })}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {s.eventsCount}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {s.responsesCount}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {s.audioCount}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {s.participantCity || "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {sessions.length === 0 && (
          <p className="text-gray-400 text-center py-12">
            No sessions yet. Complete the participant flow to create one.
          </p>
        )}
      </div>
    </>
  );
}
