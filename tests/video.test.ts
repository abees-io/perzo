import { test } from "node:test";
import assert from "node:assert/strict";
import { validateVideoPreview, MAX_VIDEO_PREVIEW_BYTES } from "../src/lib/video";
import { extractModel, ChatValidationError } from "../src/lib/chat";
import { getModel, VSR_MODEL_ID } from "../src/lib/models";

test("VSR is a video tool and cannot be sent to chat completion", () => {
  assert.equal(getModel(VSR_MODEL_ID)?.mode, "video");
  assert.throws(() => extractModel({ model: VSR_MODEL_ID }), ChatValidationError);
});

test("local video picker accepts supported containers without requiring a MIME hint", () => {
  assert.equal(validateVideoPreview({ name: "clip.MP4", size: 1000, type: "video/mp4" }), null);
  assert.equal(validateVideoPreview({ name: "clip.mov", size: 1000, type: "" }), null);
});

test("local video picker rejects empty, oversized, or unsupported files", () => {
  for (const file of [
    { name: "image.png", size: 100, type: "image/png" },
    { name: "clip.mp4", size: 100, type: "text/html" },
    { name: "clip.mp4", size: 0, type: "video/mp4" },
    { name: "clip.mp4", size: MAX_VIDEO_PREVIEW_BYTES + 1, type: "video/mp4" },
  ])
    assert.ok(validateVideoPreview(file));
});
