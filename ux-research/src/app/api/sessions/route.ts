import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  const body = await req.json();
  const { projectId, scenarioId, participantId, metadata } = body;

  const session = await prisma.session.create({
    data: {
      projectId,
      scenarioId,
      participantId: participantId || null,
      status: "started",
      metadataJson: metadata || null,
    },
  });

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
