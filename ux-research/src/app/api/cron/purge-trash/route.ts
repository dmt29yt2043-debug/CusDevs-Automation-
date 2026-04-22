import { NextResponse } from "next/server";
import { purgeExpiredTrash, TRASH_RETENTION_DAYS } from "@/lib/session-trash";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Deletes sessions whose deletedAt is older than TRASH_RETENTION_DAYS.
 * Protected by CRON_SECRET (bearer token). Trigger from VPS crontab:
 *   curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://host/api/cron/purge-trash
 */
async function handle(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured" },
      { status: 500 }
    );
  }
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (token !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await purgeExpiredTrash();
  return NextResponse.json({
    ok: true,
    retentionDays: TRASH_RETENTION_DAYS,
    purged: result.purged,
    ids: result.ids,
  });
}

export async function GET(req: Request) {
  return handle(req);
}
export async function POST(req: Request) {
  return handle(req);
}
