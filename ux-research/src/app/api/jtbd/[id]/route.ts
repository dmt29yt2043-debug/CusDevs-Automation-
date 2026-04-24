import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// PATCH /api/jtbd/[id] — partial update of a JTBD interview
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const {
    situation,
    action,
    outcome,
    jtbdValidated,
    triggers,
    currentSolution,
    forces,
    rawAnswers,
  } = body;

  const data: Record<string, unknown> = {};
  if (situation !== undefined) data.situation = situation;
  if (action !== undefined) data.action = action;
  if (outcome !== undefined) data.outcome = outcome;
  if (jtbdValidated !== undefined) data.jtbdValidated = jtbdValidated;
  if (triggers !== undefined) data.triggers = triggers;
  if (currentSolution !== undefined) data.currentSolution = currentSolution;
  if (forces !== undefined) data.forces = forces;
  if (rawAnswers !== undefined) data.rawAnswers = rawAnswers;

  const interview = await prisma.jtbdInterview.update({
    where: { id },
    data,
  });

  return NextResponse.json(interview);
}

// GET /api/jtbd/[id] — fetch a JTBD interview by id
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const interview = await prisma.jtbdInterview.findUnique({ where: { id } });
  if (!interview) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(interview);
}
