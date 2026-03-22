import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ResponseType } from "@prisma/client";

export async function POST(req: Request) {
  const body = await req.json();
  const { sessionId, stepId, responseType, value } = body;

  const response = await prisma.response.create({
    data: {
      sessionId,
      stepId,
      responseType: responseType as ResponseType,
      valueJson: value,
    },
  });

  await prisma.event.create({
    data: {
      sessionId,
      eventType: "step_answered",
      payloadJson: { stepId, responseType },
    },
  });

  return NextResponse.json(response, { status: 201 });
}
