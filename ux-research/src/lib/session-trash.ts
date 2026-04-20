import { prisma } from "@/lib/db";
import { unlink, rm } from "fs/promises";
import path from "path";

export const TRASH_RETENTION_DAYS = 14;

/**
 * Hard-delete a single session and its related rows + audio files on disk.
 * Safe to call on a session that is already gone (noop).
 */
export async function purgeSession(sessionId: string): Promise<boolean> {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { audioAssets: { select: { filePath: true } } },
  });
  if (!session) return false;

  await prisma.$transaction([
    prisma.event.deleteMany({ where: { sessionId } }),
    prisma.response.deleteMany({ where: { sessionId } }),
    prisma.audioAsset.deleteMany({ where: { sessionId } }),
    prisma.session.delete({ where: { id: sessionId } }),
  ]);

  // Best-effort remove audio files
  for (const asset of session.audioAssets) {
    try {
      await unlink(asset.filePath);
    } catch {
      /* file already gone */
    }
  }
  const uploadDir = process.env.UPLOAD_DIR || "./uploads";
  try {
    await rm(path.join(uploadDir, "audio", sessionId), {
      recursive: true,
      force: true,
    });
  } catch {
    /* dir missing */
  }
  return true;
}

/** Purge every session whose deletedAt is older than the retention window. */
export async function purgeExpiredTrash(
  retentionDays = TRASH_RETENTION_DAYS
): Promise<{ purged: number; ids: string[] }> {
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
  const expired = await prisma.session.findMany({
    where: { deletedAt: { lt: cutoff } },
    select: { id: true },
  });
  let purged = 0;
  for (const s of expired) {
    if (await purgeSession(s.id)) purged++;
  }
  return { purged, ids: expired.map((s) => s.id) };
}
