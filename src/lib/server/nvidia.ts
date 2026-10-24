import OpenAI from "openai";
import { MAX_REPLY_LENGTH, type ChatMessage } from "../chat";
import { DEFAULT_MODEL_ID, getModel } from "../models";

export const NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1";
export const NVIDIA_DEFAULT_MODEL = DEFAULT_MODEL_ID;

export class NvidiaConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NvidiaConfigurationError";
  }
}

export class NvidiaAPIError extends Error {
  constructor(
    message: string,
    public readonly status: number = 502,
  ) {
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
  model,
  apiKey,
  baseUrl = process.env.NVIDIA_BASE_URL?.trim() || NVIDIA_BASE_URL,
  signal,
  fetcher,
  onDelta,
}: NvidiaReplyOptions): Promise<string> {
  const resolvedApiKey = (apiKey ?? process.env.NVIDIA_API_KEY)?.trim();
  if (!resolvedApiKey || resolvedApiKey.startsWith("replace_")) {
    throw new NvidiaConfigurationError(
      "NVIDIA API key is missing. Add NVIDIA_API_KEY to your server-side environment (.env.local) and restart the app.",
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
      chatMessages.push({
        role: "user",
        content: [
          { type: "text", text: m.content },
          { type: "image_url", image_url: { url: m.image } },
        ],
      });
      continue;
    }
    chatMessages.push({
      role: m.role,
      content: m.content,
    });
  }

  const resolvedModel = model?.trim() || process.env.NVIDIA_MODEL?.trim() || NVIDIA_DEFAULT_MODEL;
  if (getModel(resolvedModel)?.mode !== "chat")
    throw new NvidiaConfigurationError(
      "This model is no longer enabled. Choose Llama 3.2 11B, Llama 3.2 90B or DeepSeek, and update NVIDIA_MODEL if needed.",
    );
  if (messages.some((message) => message.image) && !getModel(resolvedModel)?.vision)
    throw new NvidiaAPIError(
      "This model accepts text only. Choose a model marked Chat + photos, or start a new chat without photos.",
      400,
    );

  try {
    if (onDelta) {
      const stream = await client.chat.completions.create(
        {
          model: resolvedModel,
          messages: chatMessages,
          temperature: 0.2,
          top_p: 0.7,
          max_tokens: 1024,
          stream: true,
        },
        { signal },
      );
      let reply = "";
      try {
        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta.content;
          if (!text) continue;
          const delta = text.slice(0, MAX_REPLY_LENGTH - reply.length);
          reply += delta;
          if (delta) onDelta(delta);
          if (reply.length >= MAX_REPLY_LENGTH) break;
        }
      } finally {
        stream.controller.abort();
      }
      if (!reply.trim())
        throw new NvidiaAPIError("NVIDIA returned no answer text. Please try again.");
      return reply.trim();
    }
    const completion = await client.chat.completions.create(
      {
        model: resolvedModel,
        messages: chatMessages,
        temperature: 0.2,
        top_p: 0.7,
        max_tokens: 1024,
      },
      { signal },
    );

    const message = completion.choices?.[0]?.message;
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
              ? `NVIDIA model "${resolvedModel}" is unavailable. Choose another model or check NVIDIA account access.`
              : status === 400 || status === 422
                ? "NVIDIA couldn’t process this message. Try a shorter message or a different model."
                : "NVIDIA is temporarily unavailable. Please try again shortly.";
      throw new NvidiaAPIError(
        message,
        status === 429 ? 429 : status === 401 || status === 403 ? 401 : 502,
      );
    }
    if (error instanceof Error && error.name === "AbortError") {
      throw error;
    }
    throw new NvidiaAPIError(
      "Could not reach NVIDIA. Please check the connection and try again.",
      502,
    );
  }
}
