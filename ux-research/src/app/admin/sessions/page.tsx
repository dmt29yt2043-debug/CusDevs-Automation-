import { prisma } from "@/lib/db";
import Link from "next/link";
import SessionsTable, {
  type SessionRow,
} from "@/components/admin/SessionsTable";

export const dynamic = "force-dynamic";

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

  const rows: SessionRow[] = sessions.map((s) => {
    const screener = s.participant?.screenerAnswersJson as
      | Record<string, string>
      | null;
    return {
      id: s.id,
      status: s.status,
      startedAt: s.startedAt.toISOString(),
      durationSec: s.durationSec,
      isFavorite: s.isFavorite,
      projectName: s.project.name,
      eventsCount: s._count.events,
      responsesCount: s._count.responses,
      audioCount: s._count.audioAssets,
      participantCity: screener?.city ?? null,
    };
  });

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

      <SessionsTable sessions={rows} showProjectColumn={!projectFilter} />
    </div>
  );
}
