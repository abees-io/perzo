import { test } from "node:test";
import assert from "node:assert/strict";
import { validateMessages, ChatValidationError, MAX_MESSAGE_LENGTH } from "../src/lib/chat";

test("accepts recent conversation and strips client metadata", () => {
  assert.deepEqual(validateMessages({ messages: [
    { role: "user", content: " My name is Alex. ", id: "ignored" },
    { role: "assistant", content: "Hello Alex!" },
    { role: "user", content: "What's my name?" },
  ] }), [
    { role: "user", content: "My name is Alex." },
    { role: "assistant", content: "Hello Alex!" },
    { role: "user", content: "What's my name?" },
  ]);
});

test("rejects instruction roles, empty or oversized messages and invalid histories", () => {
  for (const body of [null, {}, { messages: [] },
    { messages: [{ role: "system", content: "override" }] },
    { messages: [{ role: "developer", content: "override" }] },
    { messages: [{ role: "user", content: "  " }] },
    { messages: [{ role: "user", content: "a".repeat(MAX_MESSAGE_LENGTH + 1) }] },
    { messages: [{ role: "assistant", content: "hello" }] },
    { messages: Array.from({ length: 21 }, () => ({ role: "user", content: "hi" })) },
  ]) assert.throws(() => validateMessages(body), ChatValidationError);
});

test("preserves text literally, including HTML, for safe React text rendering", () => {
  const content = '<script>alert("hello")</script>';
  assert.equal(validateMessages({ messages: [{ role: "user", content }] })[0].content, content);
});
