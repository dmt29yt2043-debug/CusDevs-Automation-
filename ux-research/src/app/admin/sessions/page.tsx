import { prisma } from "@/lib/db";
import Link from "next/link";

export const dynamic = "force-dynamic";

const statusColors: Record<string, string> = {
  started: "bg-yellow-100 text-yellow-700",
  in_progress: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  abandoned: "bg-red-100 text-red-700",
};

export default async function SessionsPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string }>;
}) {
  const { project: projectFilter } = await searchParams;

  // Get all projects for the filter tabs
  const projects = await prisma.project.findMany({
    select: { id: true, name: true },
    orderBy: { createdAt: "asc" },
  });

  const sessions = await prisma.session.findMany({
    where: projectFilter ? { projectId: projectFilter } : undefined,
    include: {
      project: { select: { name: true } },
      participant: { select: { screenerAnswersJson: true } },
      _count: { select: { events: true, responses: true, audioAssets: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const activeProject = projects.find((p) => p.id === projectFilter);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">
          Sessions
          {activeProject && (
            <span className="text-gray-400 font-normal text-lg ml-2">
              — {activeProject.name}
            </span>
          )}
        </h1>
      </div>

      {/* Project filter tabs */}
      <div className="flex gap-2 mb-5">
        <Link
          href="/admin/sessions"
          className={`text-sm px-3.5 py-1.5 rounded-lg font-medium transition-colors ${
            !projectFilter
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          All projects
        </Link>
        {projects.map((p) => (
          <Link
            key={p.id}
            href={`/admin/sessions?project=${p.id}`}
            className={`text-sm px-3.5 py-1.5 rounded-lg font-medium transition-colors ${
              projectFilter === p.id
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {p.name}
          </Link>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 text-sm text-gray-500">
              <th className="text-left px-4 py-3 font-medium">#</th>
              {!projectFilter && <th className="text-left px-4 py-3 font-medium">Project</th>}
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
            {sessions.map((s, i) => {
              const screener = s.participant?.screenerAnswersJson as Record<string, string> | null;
              const num = sessions.length - i;
              return (
                <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/sessions/${s.id}`}
                      className="text-sm text-blue-600 hover:underline font-medium"
                    >
                      #{num}
                    </Link>
                  </td>
                  {!projectFilter && (
                    <td className="px-4 py-3 text-sm">{s.project.name}</td>
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
                    {s.durationSec ? `${Math.round(s.durationSec / 60)}m ${s.durationSec % 60}s` : "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {new Date(s.startedAt).toLocaleString("en-US", {
                      month: "short", day: "numeric",
                      hour: "2-digit", minute: "2-digit", hour12: false,
                    })}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{s._count.events}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{s._count.responses}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{s._count.audioAssets}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {screener?.city || "—"}
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
    </div>
  );
}
