import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

export async function POST(req: Request) {
  const body = await req.json();

  // Support batch events
  const events = Array.isArray(body) ? body : [body];

  const created = await prisma.event.createMany({
    data: events.map((e: Record<string, unknown>) => ({
      sessionId: e.sessionId as string,
      eventType: e.eventType as string,
      pageUrl: (e.pageUrl as string) || null,
      elementSelector: (e.elementSelector as string) || null,
      x: (e.x as number) || null,
      y: (e.y as number) || null,
      payloadJson: (e.payloadJson ?? Prisma.JsonNull) as Prisma.InputJsonValue,
    })),
  });

  return NextResponse.json({ count: created.count }, { status: 201 });
}
