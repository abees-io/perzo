import OpenAI from "openai";
import { MAX_REPLY_LENGTH, type ChatMessage } from "../chat";
import { GEMINI_MODEL_ID, getModel } from "../models";

export const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai";
export const GEMINI_DEFAULT_MODEL = GEMINI_MODEL_ID;

export class GeminiConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GeminiConfigurationError";
  }
}

export class GeminiAPIError extends Error {
  constructor(
    message: string,
    public readonly status: number = 502,
  ) {
    super(message);
    this.name = "GeminiAPIError";
  }
}

export interface GeminiReplyOptions {
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
 * Calls Google Gemini API using OpenAI-compatible SDK.
 * Reads GEMINI_API_KEY strictly on the server-side.
 */
export async function getGeminiReply({
  messages,
  instructions,
  model,
  apiKey,
  baseUrl = GEMINI_BASE_URL,
  signal,
  fetcher,
  onDelta,
}: GeminiReplyOptions): Promise<string> {
  const resolvedApiKey = (apiKey ?? process.env.GEMINI_API_KEY)?.trim();
  if (!resolvedApiKey || resolvedApiKey.startsWith("replace_")) {
    throw new GeminiConfigurationError(
      "Gemini API key is missing. Add GEMINI_API_KEY to your server-side environment (.env.local) and restart the app.",
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

  const resolvedModel = model?.trim() || GEMINI_DEFAULT_MODEL;
  if (getModel(resolvedModel)?.provider !== "gemini")
    throw new GeminiConfigurationError(
      "This model is no longer enabled. Choose Gemini from the model picker.",
    );
  if (messages.some((message) => message.image) && !getModel(resolvedModel)?.vision)
    throw new GeminiAPIError(
      "This model accepts text only. Choose a model marked Chat + photos, or start a new chat without photos.",
      400,
    );

  try {
    if (onDelta) {
      const stream = await client.chat.completions.create(
        {
          model: resolvedModel,
          messages: chatMessages,
          reasoning_effort: "low",
          max_tokens: 2048,
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
        throw new GeminiAPIError("Gemini returned no answer text. Please try again.");
      return reply.trim();
    }
    const completion = await client.chat.completions.create(
      {
        model: resolvedModel,
        messages: chatMessages,
        reasoning_effort: "low",
        max_tokens: 2048,
      },
      { signal },
    );

    const message = completion.choices?.[0]?.message;
    const reply = message?.content?.trim();
    if (!reply) {
      throw new GeminiAPIError("Gemini API returned an empty response. Please try again.", 502);
    }
    return reply;
  } catch (error) {
    if (error instanceof GeminiConfigurationError || error instanceof GeminiAPIError) {
      throw error;
    }
    if (error instanceof OpenAI.APIError) {
      const status = error.status ?? 502;
      const message =
        status === 401 || status === 403
          ? "Gemini API authentication failed. Verify GEMINI_API_KEY in your server settings."
          : status === 429
            ? "Gemini API rate limit reached. Please wait a moment and try again."
            : status === 404
              ? `Gemini model "${resolvedModel}" is unavailable. Choose another model or check Google account access.`
              : status === 400 || status === 422
                ? "Gemini couldn’t process this message. Try a shorter message or a different model."
                : "Gemini is temporarily unavailable. Please try again shortly.";
      throw new GeminiAPIError(
        message,
        status === 429 ? 429 : status === 401 || status === 403 ? 401 : 502,
      );
    }
    if (error instanceof Error && error.name === "AbortError") {
      throw error;
    }
    throw new GeminiAPIError(
      "Could not reach Gemini. Please check the connection and try again.",
      502,
    );
  }
}
