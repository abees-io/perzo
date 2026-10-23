import OpenAI from "openai";
import type { ChatMessage } from "../chat";

export const NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1";
export const NVIDIA_DEFAULT_MODEL = "meta/llama-3.2-11b-vision-instruct";

export class NvidiaConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NvidiaConfigurationError";
  }
}

export class NvidiaAPIError extends Error {
  constructor(message: string, public readonly status: number = 502) {
    super(message);
    this.name = "NvidiaAPIError";
  }
}

export interface NvidiaReplyOptions {
  messages: ChatMessage[];
  instructions?: string;
  model?: string;
  apiKey?: string;
  baseUrl?: string;
  signal?: AbortSignal;
  fetcher?: typeof fetch;
  onDelta?: (text: string) => void;
}

/**
 * Calls NVIDIA NIM API using OpenAI-compatible SDK.
 * Reads NVIDIA_API_KEY strictly on the server-side.
 */
export async function getNvidiaReply({
  messages,
  instructions,
  model = process.env.NVIDIA_MODEL?.trim() || NVIDIA_DEFAULT_MODEL,
  apiKey = process.env.NVIDIA_API_KEY?.trim(),
  baseUrl = process.env.NVIDIA_BASE_URL?.trim() || NVIDIA_BASE_URL,
  signal,
  fetcher,
  onDelta,
}: NvidiaReplyOptions): Promise<string> {
  const resolvedApiKey = (apiKey ?? process.env.NVIDIA_API_KEY)?.trim();
  if (!resolvedApiKey || resolvedApiKey.startsWith("replace_")) {
    throw new NvidiaConfigurationError(
      "NVIDIA API key is missing. Add NVIDIA_API_KEY to your server-side environment (.env.local) and restart the app."
    );
  }

  const client = new OpenAI({
    apiKey: resolvedApiKey,
    baseURL: baseUrl,
    timeout: 60_000,
    maxRetries: 0,
    ...(fetcher ? { fetch: fetcher } : {}),
  });

  const chatMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];

  if (instructions?.trim()) {
    chatMessages.push({ role: "system", content: instructions.trim() });
  }

  for (const m of messages) {
    if (m.role === "user" && m.image) {
      chatMessages.push({ role: "user", content: [{ type: "text", text: m.content }, { type: "image_url", image_url: { url: m.image } }] });
      continue;
    }
    chatMessages.push({
      role: m.role as "user" | "assistant",
      content: m.content,
    });
  }

  try {
    if (onDelta) {
      const stream = await client.chat.completions.create({ model, messages: chatMessages, temperature: 0.2, top_p: 0.7, max_tokens: 1024, stream: true }, { signal });
      let reply = "";
      try {
        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta.content;
          if (!text) continue;
          const delta = text.slice(0, 4000 - reply.length);
          reply += delta;
          if (delta) onDelta(delta);
          if (reply.length >= 4000) break;
        }
      } finally { stream.controller.abort(); }
      if (!reply.trim()) throw new NvidiaAPIError("NVIDIA returned no answer text. Please try again.");
      return reply.trim();
    }
    const completion = await client.chat.completions.create(
      {
        model,
        messages: chatMessages,
        temperature: 0.2,
        top_p: 0.7,
        max_tokens: 1024,
      },
      { signal }
    );

    const message = completion.choices?.[0]?.message as
      | (OpenAI.Chat.Completions.ChatCompletionMessage & { reasoning_content?: string })
      | undefined;
    const reply = message?.content?.trim();
    if (!reply) {
      throw new NvidiaAPIError("NVIDIA API returned an empty response. Please try again.", 502);
    }
    return reply;
  } catch (error) {
    if (error instanceof NvidiaConfigurationError || error instanceof NvidiaAPIError) {
      throw error;
    }
    if (error instanceof OpenAI.APIError) {
      const status = error.status ?? 502;
      const message =
        status === 401 || status === 403
          ? "NVIDIA API authentication failed. Verify NVIDIA_API_KEY in your server settings."
          : status === 429
          ? "NVIDIA API rate limit reached. Please wait a moment and try again."
          : status === 404
          ? `NVIDIA model "${model}" is unavailable. Check model name or NVIDIA account access.`
          : `NVIDIA API error (${status}): ${error.message || "Failed to communicate with NVIDIA API."}`;
      throw new NvidiaAPIError(message, status === 429 ? 429 : status === 401 || status === 403 ? 401 : 502);
    }
    if (error instanceof Error && error.name === "AbortError") {
      throw error;
    }
    throw new NvidiaAPIError(
      error instanceof Error ? error.message : "Could not reach NVIDIA API. Please try again.",
      502
    );
  }
}
