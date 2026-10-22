export const MAX_MESSAGE_LENGTH = 4000;
export const MAX_HISTORY_MESSAGES = 20;
export const MAX_REQUEST_BYTES = 350_000;

export type ChatMessage = { role: "user" | "assistant"; content: string };

export class ChatValidationError extends Error {}

export function validateMessages(body: unknown): ChatMessage[] {
  if (!body || typeof body !== "object" || !("messages" in body)) {
    throw new ChatValidationError("Send a list of messages.");
  }
  const messages = body.messages;
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > MAX_HISTORY_MESSAGES) {
    throw new ChatValidationError(`Send between 1 and ${MAX_HISTORY_MESSAGES} recent messages.`);
  }
  const validated = messages.map((message: unknown): ChatMessage => {
    if (!message || typeof message !== "object" || !("role" in message) || !("content" in message) ||
        (message.role !== "user" && message.role !== "assistant") || typeof message.content !== "string") {
      throw new ChatValidationError("Messages must contain a user or assistant role and text.");
    }
    const content = message.content.trim();
    if (!content || content.length > MAX_MESSAGE_LENGTH) {
      throw new ChatValidationError(`Each message must contain 1–${MAX_MESSAGE_LENGTH} characters.`);
    }
    return { role: message.role, content };
  });
  if (validated.at(-1)?.role !== "user") {
    throw new ChatValidationError("The last message must be from you.");
  }
  return validated;
}
