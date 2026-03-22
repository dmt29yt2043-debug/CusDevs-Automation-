import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;

  const project = await prisma.project.findFirst({
    where: { OR: [{ id: projectId }, { slug: projectId }] },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const scenario = await prisma.scenario.findFirst({
    where: { projectId: project.id, isActive: true },
    orderBy: { version: "desc" },
  });

  if (!scenario) {
    return NextResponse.json({ error: "No active scenario" }, { status: 404 });
  }

  return NextResponse.json(scenario);
}
