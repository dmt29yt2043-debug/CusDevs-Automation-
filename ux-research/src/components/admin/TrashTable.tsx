"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export interface TrashRow {
  id: string;
  code: string;
  projectName: string;
  status: string;
  startedAt: string;
  deletedAt: string;
  daysLeft: number;
  audioCount: number;
  responsesCount: number;
}

interface TrashTableProps {
  rows: TrashRow[];
  retentionDays: number;
}

export default function TrashTable({ rows, retentionDays }: TrashTableProps) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const restore = async (id: string) => {
    setBusyId(id);
    try {
      const res = await fetch(`/api/sessions/${id}/restore`, { method: "POST" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      startTransition(() => router.refresh());
    } catch (err) {
      alert(err instanceof Error ? err.message : "Restore failed");
    } finally {
      setBusyId(null);
    }
  };

  const purge = async (id: string) => {
    setBusyId(id);
    try {
      const res = await fetch(`/api/sessions/${id}?purge=1`, { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      startTransition(() => router.refresh());
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-100 text-sm text-gray-500">
            <th className="text-left px-4 py-3 font-medium">#</th>
            <th className="text-left px-4 py-3 font-medium">Project</th>
            <th className="text-left px-4 py-3 font-medium">Started</th>
            <th className="text-left px-4 py-3 font-medium">Deleted</th>
            <th className="text-left px-4 py-3 font-medium">Expires in</th>
            <th className="text-left px-4 py-3 font-medium">Data</th>
            <th className="text-right px-4 py-3 font-medium w-64">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s) => {
            const isBusy = busyId === s.id;
            const expiresSoon = s.daysLeft <= 3;
            return (
              <tr key={s.id} className="border-b border-gray-50">
                <td className="px-4 py-3">
                  <span className="text-sm font-mono font-medium text-gray-700">
                    {s.code}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  {s.projectName}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {new Date(s.startedAt).toLocaleString("en-US", {
                    month: "short", day: "numeric",
                    hour: "2-digit", minute: "2-digit", hour12: false,
                  })}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {new Date(s.deletedAt).toLocaleString("en-US", {
                    month: "short", day: "numeric",
                    hour: "2-digit", minute: "2-digit", hour12: false,
                  })}
                </td>
                <td className="px-4 py-3 text-sm">
                  <span className={expiresSoon ? "text-red-600 font-medium" : "text-gray-600"}>
                    {s.daysLeft > 0 ? `${s.daysLeft} day${s.daysLeft === 1 ? "" : "s"}` : "today"}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {s.responsesCount} resp · {s.audioCount} audio
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => restore(s.id)}
                      disabled={isBusy}
                      className="text-sm px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                      {isBusy ? "…" : "Restore"}
                    </button>
                    <button
                      onClick={() => purge(s.id)}
                      disabled={isBusy}
                      title="Delete permanently now"
                      className="text-sm px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
                    >
                      Delete now
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {rows.length === 0 && (
        <p className="text-gray-400 text-center py-12 text-sm">
          Bin is empty. Deleted sessions auto-purge after {retentionDays} days.
        </p>
      )}
    </div>
  );
}
