import { MAX_REPLY_LENGTH, MAX_REQUEST_BYTES } from "./chat";

export async function readReplyStream(
  body: ReadableStream<Uint8Array>,
  onText: (text: string) => void,
): Promise<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "",
    text = "",
    final: string | undefined;
  function line(value: string) {
    if (!value.trim()) return;
    let event: unknown;
    try {
      event = JSON.parse(value);
    } catch {
      throw new Error("Perzo returned an invalid reply. Please try again.");
    }
    if (!event || typeof event !== "object")
      throw new Error("Perzo returned an invalid reply. Please try again.");
    if ("error" in event && typeof event.error === "string") throw new Error(event.error);
    if ("delta" in event && typeof event.delta === "string") {
      text = (text + event.delta).slice(0, MAX_REPLY_LENGTH);
      onText(text);
    }
    if (
      "done" in event &&
      event.done === true &&
      "reply" in event &&
      typeof event.reply === "string"
    )
      final = event.reply;
  }
  try {
    while (true) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      if (buffer.length > MAX_REQUEST_BYTES)
        throw new Error("Perzo returned an oversized reply. Please try again.");
      const lines = buffer.split("\n");
      buffer = lines.pop()!;
      for (const value of lines) line(value);
      if (done) {
        line(buffer);
        break;
      }
    }
    if (!final?.trim())
      throw new Error("The connection ended before the reply finished. Please try again.");
    return final.slice(0, MAX_REPLY_LENGTH);
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
