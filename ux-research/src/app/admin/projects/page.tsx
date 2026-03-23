import { prisma } from "@/lib/db";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const projects = await prisma.project.findMany({
    include: {
      _count: { select: { sessions: true, scenarios: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Projects</h1>
      <div className="grid gap-4">
        {projects.map((project) => (
          <div
            key={project.id}
            className="bg-white rounded-xl border border-gray-200 p-6"
          >
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold">{project.name}</h2>
                <p className="text-sm text-gray-500 mt-1">
                  {project.description}
                </p>
                <div className="flex gap-4 mt-3 text-sm text-gray-400">
                  <span>{project._count.scenarios} scenarios</span>
                  <span>{project._count.sessions} sessions</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Link
                  href={`/participant/${project.slug}/welcome`}
                  className="text-sm px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100"
                >
                  Participant Link
                </Link>
                <Link
                  href={`/admin/sessions?project=${project.id}`}
                  className="text-sm px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  Sessions
                </Link>
              </div>
            </div>
          </div>
        ))}
        {projects.length === 0 && (
          <p className="text-gray-400 text-center py-12">
            No projects. Run seed: npm run db:seed
          </p>
        )}
      </div>
    </div>
  );
}
