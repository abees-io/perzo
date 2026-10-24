import { getModel, sanitizeModelId } from "./models";
export const MAX_MESSAGE_LENGTH = 4000;
export const MAX_HISTORY_MESSAGES = 20;
export const MAX_REPLY_LENGTH = 4000;
export const MAX_REQUEST_BYTES = 350_000;

export const MAX_IMAGE_URL_LENGTH = 250_000;
export type ChatMessage = { role: "user" | "assistant"; content: string; image?: string };

export class ChatValidationError extends Error {}

export function buildChatRequest(history: ChatMessage[], model: string) {
  const recent = history.slice(-MAX_HISTORY_MESSAGES);
  const latestImage = recent.findLastIndex((message) => message.image);
  const messages = recent.map(({ role, content, image }, index) => ({
    role,
    content,
    ...(getModel(model)?.vision && image && index === latestImage ? { image } : {}),
  }));
  const encoder = new TextEncoder();
  // Keep the newest question and photo, trimming old context to fit the API limit.
  while (
    messages.length > 1 &&
    encoder.encode(JSON.stringify({ messages, model })).byteLength > MAX_REQUEST_BYTES
  ) {
    messages.shift();
  }
  return { messages, model };
}

export function validateMessages(body: unknown): ChatMessage[] {
  if (!body || typeof body !== "object" || !("messages" in body)) {
    throw new ChatValidationError("Send a list of messages.");
  }
  const messages = body.messages;
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > MAX_HISTORY_MESSAGES) {
    throw new ChatValidationError(`Send between 1 and ${MAX_HISTORY_MESSAGES} recent messages.`);
  }
  const validated = messages.map((message: unknown): ChatMessage => {
    if (
      !message ||
      typeof message !== "object" ||
      !("role" in message) ||
      !("content" in message) ||
      (message.role !== "user" && message.role !== "assistant") ||
      typeof message.content !== "string"
    ) {
      throw new ChatValidationError("Messages must contain a user or assistant role and text.");
    }
    const content = message.content.trim();
    if (!content || content.length > MAX_MESSAGE_LENGTH) {
      throw new ChatValidationError(
        `Each message must contain 1–${MAX_MESSAGE_LENGTH} characters.`,
      );
    }
    if ("image" in message && message.image !== undefined) {
      if (
        message.role !== "user" ||
        typeof message.image !== "string" ||
        message.image.length > MAX_IMAGE_URL_LENGTH ||
        !/^data:image\/(jpeg|png);base64,[A-Za-z0-9+/]+={0,2}$/.test(message.image)
      ) {
        throw new ChatValidationError(
          "Attach a valid JPEG or PNG photo under 180 KB after compression.",
        );
      }
      return { role: message.role, content, image: message.image };
    }
    return { role: message.role, content };
  });
  if (validated.at(-1)?.role !== "user") {
    throw new ChatValidationError("The last message must be from you.");
  }
  return validated;
}

export function extractModel(body: unknown): string | undefined {
  if (body && typeof body === "object" && "model" in body) {
    const model = sanitizeModelId(body.model);
    if (!model || getModel(model)?.mode !== "chat")
      throw new ChatValidationError(
        "Choose Llama 3.2 11B, Llama 3.2 90B or DeepSeek from the model picker.",
      );
    return model;
  }
  return undefined;
}
