import { test } from "node:test";
import assert from "node:assert/strict";
import { readReplyStream } from "../src/lib/reply-stream";
function stream(text: string) {
  const bytes = new TextEncoder().encode(text);
  return new ReadableStream<Uint8Array>({
    start(c) {
      for (const byte of bytes) c.enqueue(Uint8Array.of(byte));
      c.close();
    },
  });
}
test("renders deltas before completion across fragmented UTF-8 and JSON", async () => {
  const updates: string[] = [];
  const result = await readReplyStream(
    stream('{"delta":"Hey 👋"}\n{"delta":" there"}\n{"done":true,"reply":"Hey 👋 there"}\n'),
    (value) => updates.push(value),
  );
  assert.deepEqual(updates, ["Hey 👋", "Hey 👋 there"]);
  assert.equal(result, "Hey 👋 there");
});
test("rejects interrupted replies and server error events", async () => {
  await assert.rejects(
    readReplyStream(stream('{"delta":"partial"}\n'), () => {}),
    /connection ended/,
  );
  await assert.rejects(
    readReplyStream(stream('{"error":"Try again"}\n'), () => {}),
    /Try again/,
  );
});

test("rejects malformed or oversized reply events with clear errors", async () => {
  await assert.rejects(
    readReplyStream(stream("null\n"), () => {}),
    /invalid reply/,
  );
  await assert.rejects(
    readReplyStream(stream("not-json\n"), () => {}),
    /invalid reply/,
  );
  const body = new ReadableStream<Uint8Array>({
    start(c) {
      c.enqueue(new TextEncoder().encode("a".repeat(350001)));
      c.close();
    },
  });
  await assert.rejects(
    readReplyStream(body, () => {}),
    /oversized reply/,
  );
});
