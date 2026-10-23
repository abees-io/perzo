import { test } from "node:test";
import assert from "node:assert/strict";
import * as grpc from "@grpc/grpc-js";
import { loadSync } from "@grpc/proto-loader";
import path from "node:path";
import { estimateBodyPose } from "../src/lib/server/body-pose";

test("Body Pose client sends config, boxes and video to gRPC and requires complete output", async () => {
  const root = path.join(process.cwd(), "src/lib/server/protos");
  const definition = loadSync(path.join(root, "nvidia/ai4m/body_pose/v1/body_pose.proto"), { keepCase: true, defaults: true, includeDirs: [root] });
  const server = new grpc.Server();
  let complete = true;
  server.addService(definition["nvidia.ai4m.body_pose.v1.BodyPoseService"] as grpc.ServiceDefinition, {
    EstimateBodyPose(call: grpc.ServerDuplexStream<Record<string, any>, Record<string, any>>) {
      const requests: Record<string, any>[] = [];
      call.on("data", request => requests.push(request));
      call.on("end", () => {
        assert.equal(call.metadata.get("authorization")[0], "Bearer test-key");
        assert.ok(requests[0].config);
        assert.equal(requests[0].tracked_bboxes[0].boxes[0].tracking_id, 1);
        assert.equal(Buffer.concat(requests.slice(1).map(r => r.video_data)).toString(), "synthetic-test-video");
        call.write({ ready: true, frame_id: 0, bodies: [{ bbox: { tracking_id: 1 }, keypoints_3d: [{ x: 1, y: 2, z: 3 }] }] });
        if (complete) call.write({ stream_flushed: true });
        call.end();
      });
    },
  });
  const port = await new Promise<number>((resolve, reject) => server.bindAsync("127.0.0.1:0", grpc.ServerCredentials.createInsecure(), (error, port) => error ? reject(error) : resolve(port)));
  const options = { target: `127.0.0.1:${port}`, credentials: grpc.credentials.createInsecure(), apiKey: "test-key" };
  const boxes = [{ frame_id: 0, boxes: [{ x: 0, y: 0, width: 10, height: 20, tracking_id: 1 }] }];
  try {
    const result = await estimateBodyPose(Buffer.from("synthetic-test-video"), boxes, new AbortController().signal, options);
    assert.deepEqual(result.frames[0].bodies[0].keypoints_3d, [{ x: 1, y: 2, z: 3 }]);
    complete = false;
    await assert.rejects(estimateBodyPose(Buffer.from("synthetic-test-video"), boxes, new AbortController().signal, options), /no complete pose result/);
  } finally { server.forceShutdown(); }
});
