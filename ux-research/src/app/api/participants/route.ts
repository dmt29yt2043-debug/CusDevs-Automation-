import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  const body = await req.json();
  const { projectId, screenerAnswers, email, source } = body;

  const project = await prisma.project.findFirst({
    where: { OR: [{ id: projectId }, { slug: projectId }] },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const participant = await prisma.participant.create({
    data: {
      projectId: project.id,
      email: email || null,
      source: source || "direct",
      screenerAnswersJson: screenerAnswers || null,
    },
  });

  return NextResponse.json(participant, { status: 201 });
}
