import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    select: { id: true, deletedAt: true },
  });
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  if (!session.deletedAt) {
    return NextResponse.json({ ok: true, id: session.id, note: "Not in trash" });
  }

  const restored = await prisma.session.update({
    where: { id: sessionId },
    data: { deletedAt: null },
    select: { id: true },
  });
  return NextResponse.json({ ok: true, id: restored.id });
}
