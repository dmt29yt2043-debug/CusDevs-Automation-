import { prisma } from "@/lib/db";
import Link from "next/link";
import TrashTable, { type TrashRow } from "@/components/admin/TrashTable";
import { TRASH_RETENTION_DAYS } from "@/lib/session-trash";

export const dynamic = "force-dynamic";

export default async function TrashPage() {
  const sessions = await prisma.session.findMany({
    where: { deletedAt: { not: null } },
    include: {
      project: { select: { name: true, shortCode: true, slug: true } },
      _count: { select: { responses: true, audioAssets: true } },
    },
    orderBy: { deletedAt: "desc" },
  });

  const now = Date.now();
  const retentionMs = TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000;

  const rows: TrashRow[] = sessions.map((s) => {
    const code =
      s.project.shortCode || s.project.slug.slice(0, 3).toUpperCase();
    const deletedAtMs = s.deletedAt ? s.deletedAt.getTime() : now;
    const expiresAt = deletedAtMs + retentionMs;
    const daysLeft = Math.max(0, Math.ceil((expiresAt - now) / (24 * 60 * 60 * 1000)));
    return {
      id: s.id,
      code: s.seqNumber != null ? `${code}-${s.seqNumber}` : "—",
      projectName: s.project.name,
      status: s.status,
      startedAt: s.startedAt.toISOString(),
      deletedAt: (s.deletedAt ?? new Date()).toISOString(),
      daysLeft,
      audioCount: s._count.audioAssets,
      responsesCount: s._count.responses,
    };
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link
            href="/admin/sessions"
            className="text-sm text-gray-400 hover:text-gray-600 mb-2 block"
          >
            ← All Sessions
          </Link>
          <h1 className="text-2xl font-bold">Bin</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Deleted sessions are auto-purged after {TRASH_RETENTION_DAYS} days.
            Restore to get them back before then.
          </p>
        </div>
      </div>

      <TrashTable rows={rows} retentionDays={TRASH_RETENTION_DAYS} />
    </div>
  );
}
