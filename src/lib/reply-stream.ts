export async function readReplyStream(body: ReadableStream<Uint8Array>, onText: (text: string) => void): Promise<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "", text = "", final: string | undefined;
  function line(value: string) {
    if (!value.trim()) return;
    const event = JSON.parse(value);
    if (typeof event.error === "string") throw new Error(event.error);
    if (typeof event.delta === "string") { text = (text + event.delta).slice(0, 4000); onText(text); }
    if (event.done === true && typeof event.reply === "string") final = event.reply;
  }
  try {
    while (true) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      const lines = buffer.split("\n"); buffer = lines.pop()!;
      for (const value of lines) line(value);
      if (done) { line(buffer); break; }
    }
    if (!final?.trim()) throw new Error("The connection ended before the reply finished. Please try again.");
    return final.slice(0, 4000);
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
}
