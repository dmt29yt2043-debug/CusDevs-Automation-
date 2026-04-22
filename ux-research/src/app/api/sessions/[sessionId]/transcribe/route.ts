import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { readFile } from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes for batch transcription

async function transcribeAudio(filePath: string, mimeType: string | null): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not configured");

  const fileBuffer = await readFile(filePath);
  const ext = path.extname(filePath).slice(1) || "webm";
  const effectiveMime = mimeType || `audio/${ext}`;
  const blob = new Blob([new Uint8Array(fileBuffer)], { type: effectiveMime });

  const form = new FormData();
  form.append("file", blob, `audio.${ext}`);
  form.append("model", "whisper-1");
  // Let Whisper auto-detect language; works for Russian & English.

  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Whisper API error ${res.status}: ${errText.slice(0, 300)}`);
  }

  const data = (await res.json()) as { text?: string };
  return (data.text || "").trim();
}

async function summarizeTranscript(transcript: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not configured");
  if (!transcript.trim()) return "";

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content:
            "You are a UX research assistant. Summarize the participant's voice response in 2-3 concise sentences. Preserve the original language of the transcript (Russian stays Russian, English stays English). Focus on: what they did, why, what worked or didn't. No preamble.",
        },
        {
          role: "user",
          content: `Transcript:\n"""${transcript}"""\n\nReturn the summary only.`,
        },
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`GPT API error ${res.status}: ${errText.slice(0, 300)}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return (data.choices?.[0]?.message?.content || "").trim();
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    select: { id: true },
  });
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  // Grab all audio for this session that doesn't yet have both transcript & summary
  const assets = await prisma.audioAsset.findMany({
    where: { sessionId },
    orderBy: { createdAt: "asc" },
  });

  const results: Array<{
    id: string;
    stepId: string;
    status: "done" | "skipped" | "error";
    error?: string;
  }> = [];

  for (const asset of assets) {
    if (asset.transcript && asset.summary) {
      results.push({ id: asset.id, stepId: asset.stepId, status: "skipped" });
      continue;
    }
    try {
      const transcript =
        asset.transcript || (await transcribeAudio(asset.filePath, asset.mimeType));
      const summary = transcript
        ? asset.summary || (await summarizeTranscript(transcript))
        : "";

      await prisma.audioAsset.update({
        where: { id: asset.id },
        data: { transcript, summary },
      });

      results.push({ id: asset.id, stepId: asset.stepId, status: "done" });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`Transcription failed for ${asset.id}:`, message);
      results.push({
        id: asset.id,
        stepId: asset.stepId,
        status: "error",
        error: message,
      });
    }
  }

  return NextResponse.json({
    sessionId,
    totalAssets: assets.length,
    processed: results.filter((r) => r.status === "done").length,
    skipped: results.filter((r) => r.status === "skipped").length,
    errors: results.filter((r) => r.status === "error").length,
    results,
  });
}
