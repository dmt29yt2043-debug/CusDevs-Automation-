import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { existsSync } from "fs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const filePath = searchParams.get("path");

  if (!filePath || !existsSync(filePath)) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const buffer = await readFile(filePath);
  const ext = filePath.split(".").pop();
  const mimeType =
    ext === "webm" ? "audio/webm" : ext === "mp4" ? "audio/mp4" : "audio/ogg";

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": mimeType,
      "Content-Length": buffer.length.toString(),
    },
  });
}
