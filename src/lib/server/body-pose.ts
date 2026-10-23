import * as grpc from "@grpc/grpc-js";
import { loadSync } from "@grpc/proto-loader";
import path from "node:path";
import type { FrameBoxes, PoseFrame, PoseResult } from "../pose";
import { NvidiaAPIError, NvidiaConfigurationError } from "./nvidia";

type PoseResponse = PoseFrame & { ready?: boolean; stream_flushed?: boolean };
type PoseRequest = { config?: object; tracked_bboxes?: FrameBoxes[]; video_data?: Buffer };
type PoseClient = grpc.Client & { estimateBodyPose(metadata: grpc.Metadata, options: grpc.CallOptions): grpc.ClientDuplexStream<PoseRequest, PoseResponse> };

export async function estimateBodyPose(video: Buffer, boxes: FrameBoxes[], signal: AbortSignal, options: { apiKey?: string; target?: string; credentials?: grpc.ChannelCredentials } = {}): Promise<PoseResult> {
  const key = options.apiKey ?? process.env.NVIDIA_API_KEY?.trim();
  if (!key || key.startsWith("replace_")) throw new NvidiaConfigurationError("Add NVIDIA_API_KEY to your server settings to use Body Pose.");
  const root = path.join(process.cwd(), "src/lib/server/protos");
  const definition = loadSync(path.join(root, "nvidia/ai4m/body_pose/v1/body_pose.proto"), { keepCase: true, defaults: true, includeDirs: [root] });
  const service = definition["nvidia.ai4m.body_pose.v1.BodyPoseService"];
  const Constructor = grpc.makeGenericClientConstructor(service as grpc.ServiceDefinition, "BodyPoseService") as unknown as new (target: string, credentials: grpc.ChannelCredentials) => PoseClient;
  const client = new Constructor(options.target || "grpc.nvcf.nvidia.com:443", options.credentials || grpc.credentials.createSsl());
  const metadata = new grpc.Metadata();
  metadata.set("authorization", `Bearer ${key}`);
  metadata.set("function-id", process.env.NVIDIA_BODY_POSE_FUNCTION_ID?.trim() || "254b3621-bb66-4b7b-9c89-621c352b4d91");
  return new Promise((resolve, reject) => {
    const call = client.estimateBodyPose(metadata, { deadline: Date.now() + 50_000 });
    const frames: PoseFrame[] = [], warnings: string[] = [];
    let flushed = false, size = 0, settled = false;
    const cancel = () => call.cancel();
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true; signal.removeEventListener("abort", cancel); client.close();
      if (error) reject(error); else resolve({ frames, warnings });
    };
    signal.addEventListener("abort", cancel, { once: true });
    call.on("metadata", value => { for (const warning of value.get("warning")) warnings.push(String(warning)); });
    call.on("data", (response: PoseResponse) => {
      if (response.ready) {
        const frame = { frame_id: response.frame_id, bodies: response.bodies };
        size += Buffer.byteLength(JSON.stringify(frame));
        if (frames.length >= 300 || size > 8_000_000) { finish(new NvidiaAPIError("Pose output is too large. Use a shorter video with fewer people.", 413)); call.cancel(); return; }
        frames.push(frame);
      }
      if (response.stream_flushed) flushed = true;
    });
    call.on("error", (error: grpc.ServiceError) => {
      const message = signal.aborted ? "Pose analysis was cancelled or timed out." : error.code === grpc.status.UNAUTHENTICATED || error.code === grpc.status.PERMISSION_DENIED
        ? "Your NVIDIA key cannot access Body Pose. Check access on NVIDIA’s Body Pose page."
        : error.code === grpc.status.INVALID_ARGUMENT ? "NVIDIA rejected the clip or tracking data. Use constant-frame-rate H.264 MP4 and matching boxes for every frame."
        : error.code === grpc.status.UNIMPLEMENTED || error.code === grpc.status.NOT_FOUND ? "This NVIDIA Body Pose endpoint is unavailable or uses a different API version. Check NVIDIA_BODY_POSE_FUNCTION_ID against NVIDIA’s Try API page."
        : error.code === grpc.status.DEADLINE_EXCEEDED ? "Body Pose took too long. Try a smaller clip or retry later."
        : "Couldn’t reach NVIDIA Body Pose. Check your connection and NVIDIA endpoint availability.";
      finish(new NvidiaAPIError(message));
    });
    call.on("end", () => finish(!flushed || !frames.some(frame => frame.bodies.length) ? new NvidiaAPIError("NVIDIA returned no complete pose result. Check the clip and tracked boxes.") : undefined));
    if (signal.aborted) { call.cancel(); return; }
    // Callback pacing honors gRPC backpressure without buffering another video copy.
    call.write({ config: {}, tracked_bboxes: boxes }, () => {
      let offset = 0;
      function next() {
        if (settled || signal.aborted) return;
        if (offset >= video.length) { call.end(); return; }
        const chunk = video.subarray(offset, offset + 262144); offset += chunk.length;
        call.write({ video_data: chunk }, (error: Error | null | undefined) => { if (!error) next(); });
      }
      next();
    });
  });
}
