import OpenAI from "openai";
import { MAX_REPLY_LENGTH, type ChatMessage } from "../chat";
import { GROQ_MODEL_ID, getModel } from "../models";

export const GROQ_BASE_URL = "https://api.groq.com/openai/v1";
export const GROQ_DEFAULT_MODEL = GROQ_MODEL_ID;

export class GroqConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GroqConfigurationError";
  }
}

export class GroqAPIError extends Error {
  constructor(
    message: string,
    public readonly status: number = 502,
  ) {
    super(message);
    this.name = "GroqAPIError";
  }
}

export interface GroqReplyOptions {
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
 * Calls Groq Cloud API using OpenAI-compatible SDK.
 * Reads GROQ_API_KEY strictly on the server-side.
 */
export async function getGroqReply({
  messages,
  instructions,
  model,
  apiKey,
  baseUrl = GROQ_BASE_URL,
  signal,
  fetcher,
  onDelta,
}: GroqReplyOptions): Promise<string> {
  const resolvedApiKey = (apiKey ?? process.env.GROQ_API_KEY)?.trim();
  if (!resolvedApiKey || resolvedApiKey.startsWith("replace_")) {
    throw new GroqConfigurationError(
      "Groq API key is missing. Add GROQ_API_KEY to your server-side environment (.env.local) and restart the app.",
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

  const resolvedModel = model?.trim() || GROQ_DEFAULT_MODEL;
  if (getModel(resolvedModel)?.provider !== "groq")
    throw new GroqConfigurationError(
      "This model is no longer enabled. Choose a Groq model from the model picker.",
    );
  if (messages.some((message) => message.image) && !getModel(resolvedModel)?.vision)
    throw new GroqAPIError(
      "This model accepts text only. Choose a model marked Chat + photos, or start a new chat without photos.",
      400,
    );

  try {
    if (onDelta) {
      const stream = await client.chat.completions.create(
        {
          model: resolvedModel,
          messages: chatMessages,
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
        throw new GroqAPIError("Groq returned no answer text. Please try again.");
      return reply.trim();
    }
    const completion = await client.chat.completions.create(
      {
        model: resolvedModel,
        messages: chatMessages,
      },
      { signal },
    );

    const message = completion.choices?.[0]?.message;
    const reply = message?.content?.trim();
    if (!reply) {
      throw new GroqAPIError("Groq API returned an empty response. Please try again.", 502);
    }
    return reply;
  } catch (error) {
    if (error instanceof GroqConfigurationError || error instanceof GroqAPIError) {
      throw error;
    }
    if (error instanceof OpenAI.APIError) {
      const status = error.status ?? 502;
      const message =
        status === 401 || status === 403
          ? "Groq API authentication failed. Verify GROQ_API_KEY in your server settings."
          : status === 429
            ? "Groq API rate limit reached. Please wait a moment and try again."
            : status === 404
              ? `Groq model "${resolvedModel}" is unavailable. Choose another model or check Groq account access.`
              : status === 400 || status === 422
                ? "Groq couldn’t process this message. Try a shorter message or a different model."
                : "Groq is temporarily unavailable. Please try again shortly.";
      throw new GroqAPIError(
        message,
        status === 429 ? 429 : status === 401 || status === 403 ? 401 : 502,
      );
    }
    if (error instanceof Error && error.name === "AbortError") {
      throw error;
    }
    throw new GroqAPIError(
      "Could not reach Groq. Please check the connection and try again.",
      502,
    );
  }
}

