import { writeFile, mkdir } from "fs/promises";
import path from "path";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";

export async function saveAudioFile(
  sessionId: string,
  stepId: string,
  buffer: Buffer,
  mimeType: string
): Promise<string> {
  const ext = mimeType.includes("webm") ? "webm" : mimeType.includes("mp4") ? "mp4" : "ogg";
  const dir = path.join(UPLOAD_DIR, "audio", sessionId);
  await mkdir(dir, { recursive: true });

  const filename = `${stepId}-${Date.now()}.${ext}`;
  const filePath = path.join(dir, filename);
  await writeFile(filePath, buffer);

  return filePath;
}

export function getAudioUrl(filePath: string): string {
  return `/api/audio/stream?path=${encodeURIComponent(filePath)}`;
}
