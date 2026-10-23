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

test("accepts image data and rejects remote URLs, video and assistant attachments", () => {
  const image = "data:image/png;base64,aGVsbG8=";
  assert.equal(validateMessages({ messages: [{ role: "user", content: "Describe", image }] })[0].image, image);
  for (const bad of ["https://example.com/photo.png", "data:video/mp4;base64,YQ==", "data:image/svg+xml;base64,YQ==", "data:image/png;base64," + "a".repeat(250001)]) {
    assert.throws(() => validateMessages({ messages: [{ role: "user", content: "Describe", image: bad }] }), ChatValidationError);
  }
  assert.throws(() => validateMessages({ messages: [{ role: "assistant", content: "Hi", image }, { role: "user", content: "Hi" }] }), ChatValidationError);
});

test("extracts and sanitizes model selection from request body", () => {
  const { extractModel } = require("../src/lib/chat");
  assert.equal(extractModel({ messages: [{ role: "user", content: "hi" }], model: "meta/llama-3.2-11b-vision-instruct" }), "meta/llama-3.2-11b-vision-instruct");
  assert.equal(extractModel({ model: "  nvidia/nemotron-3.5-super-vl-120b-a12b  " }), "nvidia/nemotron-3.5-super-vl-120b-a12b");
  assert.throws(() => extractModel({ model: 123 }), ChatValidationError);
  assert.equal(extractModel({}), undefined);
  assert.equal(extractModel(null), undefined);
});
