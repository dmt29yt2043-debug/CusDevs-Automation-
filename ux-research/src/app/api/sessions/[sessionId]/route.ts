import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

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
  const { status } = body;

  const updateData: Record<string, unknown> = { status };

  if (status === "completed") {
    const session = await prisma.session.findUnique({ where: { id: sessionId } });
    if (session) {
      updateData.endedAt = new Date();
      updateData.durationSec = Math.round(
        (Date.now() - session.startedAt.getTime()) / 1000
      );
    }
  }

  const updated = await prisma.session.update({
    where: { id: sessionId },
    data: updateData,
  });

  return NextResponse.json(updated);
}
