import { test } from "node:test";
import assert from "node:assert/strict";
import {
  getGroqReply,
  GroqAPIError,
  GroqConfigurationError,
  GROQ_BASE_URL,
} from "../src/lib/server/groq";
import { GROQ_MODEL_ID, GEMINI_MODEL_ID } from "../src/lib/models";

const messages = [{ role: "user" as const, content: "Hello Groq!" }];

test("Groq sends context and system instructions to Groq endpoint", async () => {
  const reply = await getGroqReply({
    messages,
    instructions: "You are Perzo.",
    apiKey: "test-groq-key",
    model: GROQ_MODEL_ID,
    fetcher: async (url, init) => {
      assert.equal(String(url), `${GROQ_BASE_URL}/chat/completions`);
      assert.equal(new Headers(init?.headers).get("authorization"), "Bearer test-groq-key");
      const body = JSON.parse(String(init?.body));
      assert.equal(body.model, GROQ_MODEL_ID);
      assert.equal(body.messages[0].role, "system");
      assert.equal(body.messages[1].content, "Hello Groq!");
      return Response.json({ choices: [{ message: { content: "Hey there!" } }] });
    },
  });
  assert.equal(reply, "Hey there!");
});

test("Groq rejects models belonging to other providers", async () => {
  await assert.rejects(
    getGroqReply({ messages, model: GEMINI_MODEL_ID, apiKey: "test" }),
    GroqConfigurationError,
  );
});

test("Groq rejects photos when model does not support vision", async () => {
  await assert.rejects(
    getGroqReply({
      messages: [{ role: "user", content: "What is this?", image: "data:image/png;base64,YQ==" }],
      model: GROQ_MODEL_ID,
      apiKey: "test",
    }),
    (error: unknown) => error instanceof GroqAPIError && error.status === 400,
  );
});

test("Groq authentication and quota errors hide upstream details", async () => {
  for (const status of [401, 429]) {
    await assert.rejects(
      getGroqReply({
        messages,
        apiKey: "test",
        fetcher: async () =>
          Response.json({ error: { message: "private provider details" } }, { status }),
      }),
      (error: unknown) =>
        error instanceof GroqAPIError &&
        error.status === status &&
        !error.message.includes("private provider"),
    );
  }
});

test("Groq streams visible answer text", async () => {
  const deltas: string[] = [];
  const reply = await getGroqReply({
    messages,
    apiKey: "test",
    onDelta: (text) => deltas.push(text),
    fetcher: async () =>
      new Response(
        'data: {"choices":[{"delta":{"content":"Fast "}}]}\n\ndata: {"choices":[{"delta":{"content":"reply!"}}]}\n\ndata: [DONE]\n\n',
        { headers: { "Content-Type": "text/event-stream" } },
      ),
  });
  assert.equal(reply, "Fast reply!");
  assert.deepEqual(deltas, ["Fast ", "reply!"]);
});

