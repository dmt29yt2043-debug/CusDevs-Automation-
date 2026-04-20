import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  const body = await req.json();
  const { projectId, scenarioId, participantId, metadata } = body;

  // Atomically assign next seqNumber per project. @@unique([projectId, seqNumber])
  // protects against races; on conflict we retry with a fresh MAX + 1.
  let session: Awaited<ReturnType<typeof prisma.session.create>> | null = null;
  for (let attempt = 0; attempt < 5 && !session; attempt++) {
    const maxRow = await prisma.session.findFirst({
      where: { projectId },
      orderBy: { seqNumber: "desc" },
      select: { seqNumber: true },
    });
    const nextSeq = (maxRow?.seqNumber ?? 0) + 1;
    try {
      session = await prisma.session.create({
        data: {
          projectId,
          scenarioId,
          participantId: participantId || null,
          seqNumber: nextSeq,
          status: "started",
          metadataJson: metadata || null,
        },
      });
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code !== "P2002") throw err; // retry only on unique conflict
    }
  }

  if (!session) {
    return NextResponse.json(
      { error: "Failed to assign session number" },
      { status: 500 }
    );
  }

  await prisma.event.create({
    data: {
      sessionId: session.id,
      eventType: "session_started",
    },
  });

  return NextResponse.json(session, { status: 201 });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");

  const where = projectId ? { projectId } : {};

  const sessions = await prisma.session.findMany({
    where,
    include: {
      project: { select: { name: true, slug: true } },
      participant: { select: { id: true, screenerAnswersJson: true } },
      _count: { select: { events: true, responses: true, audioAssets: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json(sessions);
}
