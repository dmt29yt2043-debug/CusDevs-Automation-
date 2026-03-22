import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { saveAudioFile } from "@/lib/storage";

export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get("file") as File;
  const sessionId = formData.get("sessionId") as string;
  const stepId = formData.get("stepId") as string;
  const durationSec = formData.get("durationSec") as string;

  if (!file || !sessionId || !stepId) {
    return NextResponse.json(
      { error: "file, sessionId, and stepId are required" },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const mimeType = file.type || "audio/webm";
  const filePath = await saveAudioFile(sessionId, stepId, buffer, mimeType);

  const asset = await prisma.audioAsset.create({
    data: {
      sessionId,
      stepId,
      filePath,
      mimeType,
      durationSec: durationSec ? parseFloat(durationSec) : null,
    },
  });

  // Also create a response record
  await prisma.response.create({
    data: {
      sessionId,
      stepId,
      responseType: "audio",
      valueJson: { audioAssetId: asset.id, filePath },
    },
  });

  await prisma.event.create({
    data: {
      sessionId,
      eventType: "audio_uploaded",
      payloadJson: { stepId, assetId: asset.id },
    },
  });

  return NextResponse.json(asset, { status: 201 });
}
