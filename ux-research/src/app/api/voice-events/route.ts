import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { sessionId, question, audioUrl, transcript, timestampStart, timestampEnd, sequenceIndex, contextEvent } = body;

  if (!sessionId) return NextResponse.json({ error: "sessionId required" }, { status: 400 });

  const voiceEvent = await prisma.voiceEvent.create({
    data: {
      sessionId,
      question:       question       || null,
      audioUrl:       audioUrl       || null,
      transcript:     transcript     || null,
      timestampStart: timestampStart ? new Date(timestampStart) : new Date(),
      timestampEnd:   timestampEnd   ? new Date(timestampEnd)   : null,
      sequenceIndex:  sequenceIndex  ?? null,
      contextEvent:   contextEvent
        ? (contextEvent as unknown as Prisma.InputJsonValue)
        : Prisma.JsonNull,
    },
  });

  return NextResponse.json(voiceEvent, { status: 201 });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId");

  const voiceEvents = await prisma.voiceEvent.findMany({
    where: sessionId ? { sessionId } : {},
    orderBy: { timestampStart: "asc" },
  });

  return NextResponse.json(voiceEvents);
}
