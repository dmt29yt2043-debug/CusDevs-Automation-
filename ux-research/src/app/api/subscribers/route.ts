import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

type Channel = "email" | "whatsapp" | "both";

function normalizeEmail(raw: string): string | null {
  const s = raw.trim().toLowerCase();
  if (!s) return null;
  // basic email sanity
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) return null;
  return s;
}

function normalizePhoneE164(raw: string): string | null {
  // strip everything except digits and leading "+"
  const cleaned = raw.trim().replace(/[^\d+]/g, "");
  if (!cleaned) return null;
  // require a + prefix so we don't guess country codes
  if (!cleaned.startsWith("+")) return null;
  const digits = cleaned.slice(1);
  if (digits.length < 8 || digits.length > 15) return null;
  return `+${digits}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      projectId?: string;
      sessionId?: string | null;
      participantId?: string | null;
      channel?: Channel;
      email?: string;
      whatsappE164?: string;
      notes?: string;
    };

    const { projectId, channel } = body;
    if (!projectId || !channel) {
      return NextResponse.json(
        { error: "projectId and channel are required" },
        { status: 400 }
      );
    }
    if (!["email", "whatsapp", "both"].includes(channel)) {
      return NextResponse.json(
        { error: "channel must be email|whatsapp|both" },
        { status: 400 }
      );
    }

    // validate project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true },
    });
    if (!project) {
      return NextResponse.json({ error: "project not found" }, { status: 404 });
    }

    const email = body.email ? normalizeEmail(body.email) : null;
    const whatsappE164 = body.whatsappE164
      ? normalizePhoneE164(body.whatsappE164)
      : null;

    // channel-specific required fields
    if ((channel === "email" || channel === "both") && !email) {
      return NextResponse.json(
        { error: "valid email required for this channel" },
        { status: 400 }
      );
    }
    if ((channel === "whatsapp" || channel === "both") && !whatsappE164) {
      return NextResponse.json(
        { error: "valid WhatsApp number required (E.164 format, e.g. +14155551234)" },
        { status: 400 }
      );
    }

    const sessionId = body.sessionId || null;
    const participantId = body.participantId || null;

    const subscriber = await prisma.subscriber.create({
      data: {
        projectId,
        sessionId,
        participantId,
        channel,
        email,
        whatsappE164,
        notes: body.notes?.trim() || null,
      },
      select: { id: true, channel: true, createdAt: true },
    });

    return NextResponse.json({ subscriber }, { status: 201 });
  } catch (err) {
    console.error("[subscribers.POST] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "unknown error" },
      { status: 500 }
    );
  }
}
