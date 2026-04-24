import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { saveAudioFile } from "@/lib/storage";

/**
 * POST /api/audio
 *
 * Accepts multipart/form-data with:
 *   file       — audio blob (webm/opus)
 *   sessionId  — research session ID
 *   stepId     — q1_impression | q2_zone_reasoning | q3_event_reasoning | q4_friction | full-session
 *   durationSec — optional float
 *
 * Returns: { url: string; transcript: string | null }
 *
 * Transcription:
 *   If OPENAI_API_KEY is set → uses Whisper API.
 *   Otherwise → returns null (transcript comes from browser SpeechRecognition
 *   and is saved separately via /api/voice-events).
 */

/**
 * Transcribe audio via OpenAI Whisper REST API.
 * Requires OPENAI_API_KEY env variable.
 * If not set, returns null — transcript comes from browser SpeechRecognition instead.
 */
async function transcribeWithWhisper(
  buffer: Buffer,
  mimeType: string,
): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  try {
    const ext      = mimeType.includes("mp4") ? "mp4" : "webm";
    const formData = new FormData();
    const ab       = buffer.buffer instanceof ArrayBuffer
      ? buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
      : Buffer.from(buffer).buffer as ArrayBuffer;
    const blob     = new Blob([ab], { type: mimeType });
    formData.append("file",     new File([blob], `audio.${ext}`, { type: mimeType }));
    formData.append("model",    "whisper-1");
    formData.append("language", "en");

    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method:  "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body:    formData,
    });
    if (!res.ok) return null;
    const data = await res.json() as { text?: string };
    return data.text || null;
  } catch (err) {
    console.warn("[audio] Whisper transcription failed:", err);
    return null;
  }
}

export async function POST(req: Request) {
  const formData   = await req.formData();
  const file       = formData.get("file")       as File   | null;
  const sessionId  = formData.get("sessionId")  as string | null;
  const stepId     = formData.get("stepId")     as string | null;
  const durationSec = formData.get("durationSec") as string | null;

  if (!file || !sessionId || !stepId) {
    return NextResponse.json(
      { error: "file, sessionId, and stepId are required" },
      { status: 400 },
    );
  }

  const buffer   = Buffer.from(await file.arrayBuffer());
  const mimeType = file.type || "audio/webm";

  // Save to disk
  const filePath = await saveAudioFile(sessionId, stepId, buffer, mimeType);

  // Transcribe (Whisper if key available, else null)
  const transcript = await transcribeWithWhisper(buffer, mimeType);

  // Persist asset
  const asset = await prisma.audioAsset.create({
    data: {
      sessionId,
      stepId,
      filePath,
      mimeType,
      durationSec: durationSec ? parseFloat(durationSec) : null,
    },
  });

  // Response record
  await prisma.response.create({
    data: {
      sessionId,
      stepId,
      responseType: "audio",
      valueJson: { audioAssetId: asset.id, filePath, transcript },
    },
  }).catch(() => {});

  await prisma.event.create({
    data: {
      sessionId,
      eventType: "audio_uploaded",
      payloadJson: { stepId, assetId: asset.id, hasTranscript: !!transcript },
    },
  }).catch(() => {});

  // Public URL — served from /uploads/[sessionId]/[stepId].webm
  const url = `/uploads/${sessionId}/${stepId}${getExt(mimeType)}`;

  return NextResponse.json({ url, transcript }, { status: 201 });
}

function getExt(mime: string): string {
  if (mime.includes("mp4"))  return ".mp4";
  if (mime.includes("ogg"))  return ".ogg";
  if (mime.includes("mpeg")) return ".mp3";
  return ".webm";
}
