import { test } from "node:test";
import assert from "node:assert/strict";
import {
  getNvidiaReply,
  NvidiaConfigurationError,
  NvidiaAPIError,
  NVIDIA_BASE_URL,
  NVIDIA_DEFAULT_MODEL,
} from "../src/lib/server/nvidia";

const baseRequest = {
  instructions: "You are Perzo.",
  messages: [
    { role: "user" as const, content: "Hello NVIDIA" },
    { role: "assistant" as const, content: "Hello!" },
    { role: "user" as const, content: "What model are you?" },
  ],
  apiKey: "nvapi-test-valid-key",
};

test("NVIDIA API client sends correct payload, authorization header, and endpoint", async () => {
  let capturedUrl: string | undefined;
  let capturedOptions: RequestInit | undefined;

  const mockFetcher: typeof fetch = async (url, options) => {
    capturedUrl = String(url);
    capturedOptions = options;

    return Response.json({
      id: "chatcmpl-test",
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: " I am Nemotron 3.5 Super VL running on NVIDIA NIM. ",
          },
          finish_reason: "stop",
        },
      ],
    });
  };

  const reply = await getNvidiaReply({
    ...baseRequest,
    fetcher: mockFetcher,
  });

  assert.equal(capturedUrl, `${NVIDIA_BASE_URL}/chat/completions`);
  assert.equal(capturedOptions?.method, "POST");

  const headers = new Headers(capturedOptions?.headers);
  assert.equal(headers.get("Authorization"), "Bearer nvapi-test-valid-key");
  assert.ok(headers.get("Content-Type")?.includes("application/json"));

  const body = JSON.parse(String(capturedOptions?.body));
  assert.equal(body.model, NVIDIA_DEFAULT_MODEL);
  assert.equal(body.temperature, 0.2);
  assert.deepEqual(body.messages, [
    { role: "system", content: "You are Perzo." },
    { role: "user", content: "Hello NVIDIA" },
    { role: "assistant", content: "Hello!" },
    { role: "user", content: "What model are you?" },
  ]);

  assert.equal(reply, "I am Nemotron 3.5 Super VL running on NVIDIA NIM.");
});

test("throws NvidiaConfigurationError when API key is missing or is placeholder", async () => {
  for (const emptyKey of ["", "   ", "replace_with_your_nvidia_api_key"]) {
    await assert.rejects(
      getNvidiaReply({
        ...baseRequest,
        apiKey: emptyKey,
      }),
      (err: unknown) => err instanceof NvidiaConfigurationError
    );
  }
});

test("handles NVIDIA upstream HTTP error responses with clear status", async () => {
  const unauthorizedFetcher: typeof fetch = async () => {
    return new Response(JSON.stringify({ error: { message: "Invalid API Key" } }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  };

  await assert.rejects(
    getNvidiaReply({
      ...baseRequest,
      fetcher: unauthorizedFetcher,
    }),
    (err: unknown) => err instanceof NvidiaAPIError && (err.status === 401 || err.status === 502)
  );

  const rateLimitFetcher: typeof fetch = async () => {
    return new Response(JSON.stringify({ error: { message: "Too many requests" } }), {
      status: 429,
      headers: { "Content-Type": "application/json" },
    });
  };

  await assert.rejects(
    getNvidiaReply({
      ...baseRequest,
      fetcher: rateLimitFetcher,
    }),
    (err: unknown) => err instanceof NvidiaAPIError && err.status === 429
  );
});

test("rejects empty or malformed model responses", async () => {
  const emptyFetcher: typeof fetch = async () => {
    return Response.json({
      choices: [{ message: { content: "   " } }],
    });
  };

  await assert.rejects(
    getNvidiaReply({
      ...baseRequest,
      fetcher: emptyFetcher,
    }),
    (err: unknown) => err instanceof NvidiaAPIError
  );
});

test("sends photo as multimodal content rather than text", async () => {
  const image = "data:image/png;base64,aGVsbG8=";
  await getNvidiaReply({ ...baseRequest, messages: [{ role: "user", content: "Describe", image }], fetcher: async (_url, options) => {
    const body = JSON.parse(String(options?.body));
    assert.deepEqual(body.messages[1], { role: "user", content: [{ type: "text", text: "Describe" }, { type: "image_url", image_url: { url: image } }] });
    return Response.json({ choices: [{ message: { content: "A photo." } }] });
  } });
});

test("streams answer text and excludes reasoning deltas", async () => {
  const updates: string[] = [];
  const reply = await getNvidiaReply({ ...baseRequest, onDelta: value => updates.push(value), fetcher: async (_url, options) => {
    assert.equal(JSON.parse(String(options?.body)).stream, true);
    const chunks = [{ reasoning_content: "private reasoning" }, { content: "Hey" }, { content: " there!" }];
    return new Response(chunks.map(delta => "data: " + JSON.stringify({ choices: [{ delta }] }) + "\n\n").join("") + "data: [DONE]\n\n", { headers: { "Content-Type": "text/event-stream" } });
  } });
  assert.deepEqual(updates, ["Hey", " there!"]);
  assert.equal(reply, "Hey there!");
});

test("text-only models reject photo requests before calling NVIDIA", async () => {
  let called = false;
  await assert.rejects(getNvidiaReply({ ...baseRequest, model: "deepseek-ai/deepseek-v4.1-flash", messages: [{ role: "user", content: "Describe", image: "data:image/png;base64,YQ==" }], fetcher: async () => { called = true; return Response.json({}); } }), /accepts text only/);
  assert.equal(called, false);
});
