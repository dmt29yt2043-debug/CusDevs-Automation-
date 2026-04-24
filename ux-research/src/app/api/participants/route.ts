import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { scoreSegments } from "@/lib/segmentation";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { projectId, screenerAnswers, email, source, name } = body;

    const project = await prisma.project.findFirst({
      where: { OR: [{ id: projectId }, { slug: projectId }] },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const segmentResult = screenerAnswers ? scoreSegments(screenerAnswers) : null;
    const segmentJson = segmentResult
      ? (segmentResult as unknown as Prisma.InputJsonValue)
      : Prisma.JsonNull;

    const participant = await prisma.participant.create({
      data: {
        projectId:  project.id,
        externalId: name   || null,
        email:      email  || null,
        source:     source || "direct",
        screenerAnswersJson: screenerAnswers
          ? (screenerAnswers as unknown as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        segmentJson,
      },
    });

    return NextResponse.json(participant, { status: 201 });
  } catch (err) {
    console.error("POST /api/participants error:", err);
    return NextResponse.json(
      { error: "Failed to create participant", detail: String(err) },
      { status: 500 }
    );
  }
}
