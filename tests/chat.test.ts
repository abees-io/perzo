import { test } from "node:test";
import assert from "node:assert/strict";
import { validateMessages, ChatValidationError, MAX_MESSAGE_LENGTH } from "../src/lib/chat";

test("accepts recent conversation and strips client metadata", () => {
  assert.deepEqual(
    validateMessages({
      messages: [
        { role: "user", content: " My name is Alex. ", id: "ignored" },
        { role: "assistant", content: "Hello Alex!" },
        { role: "user", content: "What's my name?" },
      ],
    }),
    [
      { role: "user", content: "My name is Alex." },
      { role: "assistant", content: "Hello Alex!" },
      { role: "user", content: "What's my name?" },
    ],
  );
});

test("rejects instruction roles, empty or oversized messages and invalid histories", () => {
  for (const body of [
    null,
    {},
    { messages: [] },
    { messages: [{ role: "system", content: "override" }] },
    { messages: [{ role: "developer", content: "override" }] },
    { messages: [{ role: "user", content: "  " }] },
    { messages: [{ role: "user", content: "a".repeat(MAX_MESSAGE_LENGTH + 1) }] },
    { messages: [{ role: "assistant", content: "hello" }] },
    { messages: Array.from({ length: 21 }, () => ({ role: "user", content: "hi" })) },
  ])
    assert.throws(() => validateMessages(body), ChatValidationError);
});

test("preserves text literally, including HTML, for safe React text rendering", () => {
  const content = '<script>alert("hello")</script>';
  assert.equal(validateMessages({ messages: [{ role: "user", content }] })[0].content, content);
});

test("accepts image data and rejects remote URLs, video and assistant attachments", () => {
  const image = "data:image/png;base64,aGVsbG8=";
  assert.equal(
    validateMessages({ messages: [{ role: "user", content: "Describe", image }] })[0].image,
    image,
  );
  for (const bad of [
    "https://example.com/photo.png",
    "data:video/mp4;base64,YQ==",
    "data:image/svg+xml;base64,YQ==",
    "data:image/png;base64," + "a".repeat(250001),
  ]) {
    assert.throws(
      () => validateMessages({ messages: [{ role: "user", content: "Describe", image: bad }] }),
      ChatValidationError,
    );
  }
  assert.throws(
    () =>
      validateMessages({
        messages: [
          { role: "assistant", content: "Hi", image },
          { role: "user", content: "Hi" },
        ],
      }),
    ChatValidationError,
  );
});

test("extracts and sanitizes model selection from request body", () => {
  const { extractModel } = require("../src/lib/chat");
  assert.equal(
    extractModel({
      messages: [{ role: "user", content: "hi" }],
      model: "meta/llama-3.2-11b-vision-instruct",
    }),
    "meta/llama-3.2-11b-vision-instruct",
  );
  assert.equal(
    extractModel({ model: "  deepseek-ai/deepseek-v4.1-flash  " }),
    "deepseek-ai/deepseek-v4.1-flash",
  );
  assert.throws(() => extractModel({ model: 123 }), ChatValidationError);
  assert.equal(extractModel({}), undefined);
  assert.equal(extractModel(null), undefined);
});

test("rejects removed models in chat requests", () => {
  const { extractModel } = require("../src/lib/chat");
  for (const model of [
    "nvidia/body-pose",
    "nvidia/nemotron-3.5-lightning-30b-a3b",
    "nvidia/nemotron-3.5-super-vl-120b-a12b",
  ])
    assert.throws(() => extractModel({ model }), ChatValidationError);
});

test("request builder fits multibyte history plus a photo into the API byte budget", async () => {
  const { buildChatRequest, MAX_REQUEST_BYTES } = await import("../src/lib/chat");
  const history = Array.from({ length: 20 }, (_, index) => ({
    role: "user" as const,
    content: "界".repeat(4000),
    ...(index === 19 ? { image: "data:image/jpeg;base64," + "a".repeat(240000) } : {}),
  }));
  const request = buildChatRequest(history, "meta/llama-3.2-11b-vision-instruct");
  assert.ok(request.messages.length < 20);
  assert.ok(new TextEncoder().encode(JSON.stringify(request)).byteLength <= MAX_REQUEST_BYTES);
  assert.equal(request.messages.at(-1)?.image, history.at(-1)?.image);
});

test("request builder removes metadata and omits photos for text-only models", async () => {
  const { buildChatRequest } = await import("../src/lib/chat");
  const history = [
    {
      role: "user" as const,
      content: "Describe",
      image: "data:image/png;base64,YQ==",
      id: "private-ui-id",
    },
  ];
  assert.deepEqual(buildChatRequest(history, "deepseek-ai/deepseek-v4.1-flash").messages, [
    { role: "user", content: "Describe" },
  ]);
});
