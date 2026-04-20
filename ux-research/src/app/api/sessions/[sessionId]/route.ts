import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { unlink, rm } from "fs/promises";
import path from "path";

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

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { audioAssets: { select: { filePath: true } } },
  });
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  // Delete DB rows (children first — no cascade defined in schema)
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
  // Remove the per-session audio folder (ignore errors)
  const uploadDir = process.env.UPLOAD_DIR || "./uploads";
  try {
    await rm(path.join(uploadDir, "audio", sessionId), {
      recursive: true,
      force: true,
    });
  } catch {
    /* dir missing */
  }

  return NextResponse.json({ ok: true, id: sessionId });
}
