import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// POST /api/jtbd — create a new JTBD interview record
export async function POST(req: NextRequest) {
  const { participantId } = await req.json();

  if (!participantId) {
    return NextResponse.json({ error: "participantId required" }, { status: 400 });
  }

  const interview = await prisma.jtbdInterview.create({
    data: { participantId },
  });

  return NextResponse.json(interview, { status: 201 });
}
