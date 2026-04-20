import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { purgeSession } from "@/lib/session-trash";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: {
      project: true,
      scenario: true,
      participant: true,
      events: { orderBy: { createdAt: "asc" } },
      responses: { orderBy: { createdAt: "asc" } },
      audioAssets: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  return NextResponse.json(session);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const body = await req.json();
  const { status, isFavorite } = body;

  const updateData: Record<string, unknown> = {};

  if (typeof status === "string") {
    updateData.status = status;
    if (status === "completed") {
      const session = await prisma.session.findUnique({ where: { id: sessionId } });
      if (session) {
        updateData.endedAt = new Date();
        updateData.durationSec = Math.round(
          (Date.now() - session.startedAt.getTime()) / 1000
        );
      }
    }
  }

  if (typeof isFavorite === "boolean") {
    updateData.isFavorite = isFavorite;
  }

  const updated = await prisma.session.update({
    where: { id: sessionId },
    data: updateData,
  });

  return NextResponse.json(updated);
}

/**
 * DELETE = soft-delete (move to trash). Supports ?purge=1 for hard delete
 * (used from the trash UI when user clicks "Delete permanently").
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const { searchParams } = new URL(req.url);
  const purge = searchParams.get("purge") === "1";

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    select: { id: true },
  });
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  if (purge) {
    await purgeSession(sessionId);
    return NextResponse.json({ ok: true, id: sessionId, purged: true });
  }

  // soft delete
  const updated = await prisma.session.update({
    where: { id: sessionId },
    data: { deletedAt: new Date() },
    select: { id: true, deletedAt: true },
  });
  return NextResponse.json({ ok: true, id: updated.id, deletedAt: updated.deletedAt });
}
