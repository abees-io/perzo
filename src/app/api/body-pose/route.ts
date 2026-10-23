import { MAX_POSE_REQUEST_BYTES, MAX_POSE_VIDEO_BYTES, parseTrackedBoxes } from "@/lib/pose";
import { estimateBodyPose } from "@/lib/server/body-pose";
import { NvidiaAPIError, NvidiaConfigurationError } from "@/lib/server/nvidia";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const origin = request.headers.get("origin"), host = request.headers.get("host");
  try { if (origin && host && new URL(origin).host !== host) return Response.json({ error: "Use the Perzo app to analyze video." }, { status: 403 }); }
  catch { return Response.json({ error: "Invalid request origin." }, { status: 403 }); }
  if (!request.headers.get("content-type")?.startsWith("multipart/form-data")) return Response.json({ error: "Upload a video and tracking file." }, { status: 415 });
  const reader = request.body?.getReader();
  try {
    if (!reader) throw new Error("Your upload is missing.");
    const chunks: Uint8Array[] = []; let length = 0;
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      length += value.length;
      if (length > MAX_POSE_REQUEST_BYTES) { await reader.cancel(); return Response.json({ error: "Use a video under 3 MB and tracking data under 150 KB." }, { status: 413 }); }
      chunks.push(value);
    }
    const form = await new Response(Buffer.concat(chunks), { headers: { "Content-Type": request.headers.get("content-type")! } }).formData();
    const video = form.get("video"), annotation = form.get("boxes");
    if (!(video instanceof File) || !video.size || video.size > MAX_POSE_VIDEO_BYTES || video.type !== "video/mp4") throw new Error("Choose an H.264 MP4 video under 3 MB.");
    if (!(annotation instanceof File) || annotation.size > 150_000) throw new Error("Add a tracking-box text file under 150 KB.");
    const boxes = parseTrackedBoxes(await annotation.text());
    const bytes = Buffer.from(await video.arrayBuffer());
    if (bytes.length < 12 || bytes.toString("ascii", 4, 8) !== "ftyp") throw new Error("This file isn’t a valid MP4 video.");
    const result = await estimateBodyPose(bytes, boxes, request.signal);
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const status = error instanceof NvidiaConfigurationError ? 503 : error instanceof NvidiaAPIError ? error.status : 400;
    return Response.json({ error: error instanceof Error ? error.message : "Pose analysis failed." }, { status });
  } finally { reader?.releaseLock(); }
}
