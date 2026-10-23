import { ChatValidationError, MAX_REQUEST_BYTES, validateMessages } from "@/lib/chat";
import { getPerzoReply } from "@/lib/server/perzo";
import { NvidiaAPIError, NvidiaConfigurationError } from "@/lib/server/nvidia";

export const runtime = "nodejs";

// Allow up to 60 s on Vercel Pro / 10 s on Hobby (raised where the plan permits).
export const maxDuration = 60;

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const incomingHost = request.headers.get("host");

  // Compare only the host portion — Vercel's internal URL may use http: even
  // when the public request arrives over https:, so a full-URL comparison would
  // produce false 403s in production.
  if (origin && incomingHost) {
    try {
      if (new URL(origin).host !== incomingHost) {
        return Response.json({ error: "Please send messages from the Perzo app." }, { status: 403 });
      }
    } catch {
      return Response.json({ error: "Please send messages from the Perzo app." }, { status: 403 });
    }
  }

  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  try {
    if (!request.headers.get("content-type")?.includes("application/json")) {
      return Response.json({ error: "Send messages as JSON." }, { status: 415 });
    }
    reader = request.body?.getReader();
    if (!reader) throw new ChatValidationError("Your message is missing.");

    const chunks: Uint8Array[] = [];
    let bytes = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_REQUEST_BYTES) {
        await reader.cancel();
        return Response.json({ error: "This conversation request is too large." }, { status: 413 });
      }
      chunks.push(value);
    }

    const messages = validateMessages(JSON.parse(Buffer.concat(chunks).toString("utf8")));
    const reply = await getPerzoReply(messages, request.signal);
    return Response.json({ reply }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof ChatValidationError) {
      return Response.json(
        { error: error instanceof SyntaxError ? "Invalid message format." : error.message },
        { status: 400 }
      );
    }
    if (error instanceof NvidiaConfigurationError) {
      return Response.json({ error: error.message }, { status: 503 });
    }
    if (error instanceof NvidiaAPIError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json(
      { error: error instanceof Error ? error.message : "Perzo couldn't finish that reply. Please try again." },
      { status: 502 }
    );
  } finally {
    reader?.releaseLock();
  }
}
