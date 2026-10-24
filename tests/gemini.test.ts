import { test } from "node:test";
import assert from "node:assert/strict";
import {
  getGeminiReply,
  GeminiAPIError,
  GeminiConfigurationError,
  GEMINI_BASE_URL,
} from "../src/lib/server/gemini";
import { GEMINI_MODEL_ID } from "../src/lib/models";
import { getNvidiaReply, NvidiaConfigurationError } from "../src/lib/server/nvidia";
const messages = [
  { role: "user" as const, content: "What is in this photo?", image: "data:image/png;base64,YQ==" },
];
test("Gemini sends photos, context and system instructions to Google only", async () => {
  const reply = await getGeminiReply({
    messages,
    instructions: "You are Perzo.",
    apiKey: "test-google-key",
    model: GEMINI_MODEL_ID,
    fetcher: async (url, init) => {
      assert.equal(String(url), `${GEMINI_BASE_URL}/chat/completions`);
      assert.equal(new Headers(init?.headers).get("authorization"), "Bearer test-google-key");
      const body = JSON.parse(String(init?.body));
      assert.equal(body.model, GEMINI_MODEL_ID);
      assert.equal(body.reasoning_effort, "low");
      assert.equal(body.messages[0].role, "system");
      assert.equal(body.messages[1].content[1].image_url.url, messages[0].image);
      return Response.json({ choices: [{ message: { content: "A photo." } }] });
    },
  });
  assert.equal(reply, "A photo.");
});
test("providers reject models belonging to the other provider", async () => {
  await assert.rejects(
    getGeminiReply({ messages: [], model: "meta/llama-3.2-11b-vision-instruct", apiKey: "test" }),
    GeminiConfigurationError,
  );
  await assert.rejects(
    getNvidiaReply({ messages: [], model: GEMINI_MODEL_ID, apiKey: "test" }),
    NvidiaConfigurationError,
  );
});
test("Gemini authentication and quota errors hide upstream details", async () => {
  for (const status of [401, 429])
    await assert.rejects(
      getGeminiReply({
        messages,
        apiKey: "test",
        fetcher: async () =>
          Response.json({ error: { message: "private provider details" } }, { status }),
      }),
      (error: unknown) =>
        error instanceof GeminiAPIError &&
        error.status === status &&
        !error.message.includes("private provider"),
    );
});
test("Gemini streams visible answer text", async () => {
  const deltas: string[] = [];
  const reply = await getGeminiReply({
    messages,
    apiKey: "test",
    onDelta: (text) => deltas.push(text),
    fetcher: async () =>
      new Response(
        'data: {"choices":[{"delta":{"content":"Got "}}]}\n\ndata: {"choices":[{"delta":{"content":"you."}}]}\n\ndata: [DONE]\n\n',
        { headers: { "Content-Type": "text/event-stream" } },
      ),
  });
  assert.equal(reply, "Got you.");
  assert.deepEqual(deltas, ["Got ", "you."]);
});
