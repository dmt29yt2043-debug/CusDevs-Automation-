import { prisma } from "@/lib/db";
import Link from "next/link";

export const dynamic = "force-dynamic";

const channelColors: Record<string, string> = {
  email: "bg-blue-100 text-blue-700",
  whatsapp: "bg-green-100 text-green-700",
  both: "bg-purple-100 text-purple-700",
};

export default async function SubscribersPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string }>;
}) {
  const { project: projectFilter } = await searchParams;

  const projects = await prisma.project.findMany({
    select: { id: true, name: true },
    orderBy: { createdAt: "asc" },
  });

  const subscribers = await prisma.subscriber.findMany({
    where: {
      unsubscribedAt: null,
      ...(projectFilter ? { projectId: projectFilter } : {}),
    },
    include: {
      project: { select: { name: true, shortCode: true, slug: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  // Pull session codes for each subscriber (if linked)
  const sessionIds = subscribers
    .map((s) => s.sessionId)
    .filter((id): id is string => !!id);
  const sessions = sessionIds.length
    ? await prisma.session.findMany({
        where: { id: { in: sessionIds } },
        select: {
          id: true,
          seqNumber: true,
          project: { select: { shortCode: true, slug: true } },
        },
      })
    : [];
  const sessionMap = new Map(
    sessions.map((s) => [
      s.id,
      {
        code:
          s.seqNumber != null
            ? `${s.project.shortCode || s.project.slug.slice(0, 3).toUpperCase()}-${s.seqNumber}`
            : null,
      },
    ])
  );

  const activeProject = projects.find((p) => p.id === projectFilter);

  // Counters
  const total = subscribers.length;
  const emailCount = subscribers.filter((s) => s.channel === "email").length;
  const whatsappCount = subscribers.filter((s) => s.channel === "whatsapp").length;
  const bothCount = subscribers.filter((s) => s.channel === "both").length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">
          Subscribers
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
          href="/admin/subscribers"
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
            href={`/admin/subscribers?project=${p.id}`}
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

      {/* Counters */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-xs text-gray-500 uppercase tracking-wide">Total</div>
          <div className="text-2xl font-bold mt-1">{total}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-xs text-gray-500 uppercase tracking-wide">Email only</div>
          <div className="text-2xl font-bold mt-1 text-blue-700">{emailCount}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-xs text-gray-500 uppercase tracking-wide">WhatsApp only</div>
          <div className="text-2xl font-bold mt-1 text-green-700">{whatsappCount}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-xs text-gray-500 uppercase tracking-wide">Both</div>
          <div className="text-2xl font-bold mt-1 text-purple-700">{bothCount}</div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 text-sm text-gray-500">
              <th className="text-left px-4 py-3 font-medium">Channel</th>
              <th className="text-left px-4 py-3 font-medium">Email</th>
              <th className="text-left px-4 py-3 font-medium">WhatsApp</th>
              {!projectFilter && (
                <th className="text-left px-4 py-3 font-medium">Project</th>
              )}
              <th className="text-left px-4 py-3 font-medium">Session</th>
              <th className="text-left px-4 py-3 font-medium">Signed up</th>
            </tr>
          </thead>
          <tbody>
            {subscribers.map((s) => {
              const sessionCode = s.sessionId
                ? sessionMap.get(s.sessionId)?.code
                : null;
              return (
                <tr
                  key={s.id}
                  className="border-b border-gray-50 hover:bg-gray-50"
                >
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-1 rounded-full font-medium ${
                        channelColors[s.channel] || "bg-gray-100"
                      }`}
                    >
                      {s.channel}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 font-mono">
                    {s.email ? (
                      <a
                        href={`mailto:${s.email}`}
                        className="hover:text-blue-600 hover:underline"
                      >
                        {s.email}
                      </a>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 font-mono">
                    {s.whatsappE164 ? (
                      <a
                        href={`https://wa.me/${s.whatsappE164.replace(/^\+/, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-green-600 hover:underline"
                      >
                        {s.whatsappE164}
                      </a>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  {!projectFilter && (
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {s.project.name}
                    </td>
                  )}
                  <td className="px-4 py-3 text-sm">
                    {s.sessionId && sessionCode ? (
                      <Link
                        href={`/admin/sessions/${s.sessionId}`}
                        className="text-blue-600 hover:underline font-mono font-medium"
                      >
                        {sessionCode}
                      </Link>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(s.createdAt).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: false,
                    })}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {subscribers.length === 0 && (
          <p className="text-gray-400 text-center py-12 text-sm">
            No subscribers yet. They&apos;ll show up here once participants opt in on the thank-you page.
          </p>
        )}
      </div>
    </div>
  );
}
