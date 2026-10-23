import { test } from "node:test";
import assert from "node:assert/strict";
import { captureScreenFrame } from "../src/lib/screen-capture";
import { MAX_IMAGE_URL_LENGTH } from "../src/lib/chat";

const video = { readyState: 2, videoWidth: 3840, videoHeight: 2160 } as HTMLVideoElement;
const stream = (readyState = "live", muted = false) => ({ getVideoTracks: () => [{ readyState, muted }] }) as unknown as MediaStream;

test("does not capture ended, muted or not-yet-ready screen streams", () => {
  assert.throws(() => captureScreenFrame(video, null), /sharing has ended/);
  assert.throws(() => captureScreenFrame(video, stream("ended")), /sharing has ended/);
  assert.throws(() => captureScreenFrame(video, stream("live", true)), /temporarily unavailable/);
  assert.throws(() => captureScreenFrame(null, stream()), /isn’t ready/);
});
test("screen frames preserve aspect ratio and stay within the image request budget", () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, "document");
  let drawn = false, attempts = 0;
  const canvas = { width: 0, height: 0, getContext: () => ({ drawImage: () => { drawn = true; } }), toDataURL: () => ++attempts === 1 ? "x".repeat(MAX_IMAGE_URL_LENGTH + 1) : "data:image/jpeg;base64,YQ==" };
  Object.defineProperty(globalThis, "document", { configurable: true, value: { createElement: () => canvas } });
  try {
    assert.equal(captureScreenFrame(video, stream()), "data:image/jpeg;base64,YQ==");
    assert.equal(canvas.width, 1280); assert.equal(canvas.height, 720); assert.ok(drawn);
    canvas.toDataURL = () => "x".repeat(MAX_IMAGE_URL_LENGTH + 1);
    assert.throws(() => captureScreenFrame(video, stream()), /too detailed/);
  } finally { if (original) Object.defineProperty(globalThis, "document", original); else Reflect.deleteProperty(globalThis, "document"); }
});
