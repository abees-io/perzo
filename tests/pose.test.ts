import { test } from "node:test";
import assert from "node:assert/strict";
import { parseTrackedBoxes } from "../src/lib/pose";
import { getModel, BODY_POSE_ID } from "../src/lib/models";
import { extractModel, ChatValidationError } from "../src/lib/chat";

test("parses sorted tracked boxes and skips absent bodies", () => {
  assert.deepEqual(parseTrackedBoxes("1\n1 7 1 2 30 40\n0 7 0 1 30 40\n2 7 -1 -1 -1 -1"), [
    { frame_id: 0, boxes: [{ x: 0, y: 1, width: 30, height: 40, tracking_id: 7 }] },
    { frame_id: 1, boxes: [{ x: 1, y: 2, width: 30, height: 40, tracking_id: 7 }] },
  ]);
});
test("rejects invalid tracking data before sending video", () => {
  for (const data of ["", "0\n0 1 0 0 10 10", "1\n300 1 0 0 10 10", "1\n0 1 0 0 -1 10", "1\n0 1 NaN 0 10 10", "1\n0 1 0 0 10 10\n0 1 1 1 10 10"]) assert.throws(() => parseTrackedBoxes(data));
});
test("chat model allowlist excludes video tools and unknown models", () => {
  assert.equal(getModel(BODY_POSE_ID)?.kind, "pose");
  assert.throws(() => extractModel({ model: BODY_POSE_ID }), ChatValidationError);
  assert.throws(() => extractModel({ model: "unknown/model" }), ChatValidationError);
});
