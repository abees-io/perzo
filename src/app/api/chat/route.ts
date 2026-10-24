import { ChatValidationError, MAX_REQUEST_BYTES, validateMessages, extractModel } from "@/lib/chat";
import { getPerzoReply } from "@/lib/server/perzo";
import { NvidiaAPIError, NvidiaConfigurationError } from "@/lib/server/nvidia";

import { GeminiAPIError, GeminiConfigurationError } from "@/lib/server/gemini";

export const runtime = "nodejs";

// Keep the provider deadline below the hosting function's runtime budget.
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
        return Response.json(
          { error: "Please send messages from the Perzo app." },
          { status: 403 },
        );
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

    const parsedBody = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    const messages = validateMessages(parsedBody);
    const model = extractModel(parsedBody);
    const signal = AbortSignal.any([request.signal, AbortSignal.timeout(55_000)]);
    if (request.headers.get("accept") === "application/x-ndjson") {
      const abort = new AbortController();
      const streamSignal = AbortSignal.any([signal, abort.signal]);
      const encoder = new TextEncoder();
      let cancelled = false;
      const stream = new ReadableStream({
        async start(controller) {
          const emit = (event: object) => {
            if (!cancelled) controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
          };
          try {
            const reply = await getPerzoReply(
              messages,
              streamSignal,
              (text) => emit({ delta: text }),
              model,
            );
            emit({ done: true, reply });
          } catch (error) {
            emit({
              error: streamSignal.aborted
                ? "The reply took too long. Please try again."
                : error instanceof NvidiaConfigurationError ||
                    error instanceof NvidiaAPIError ||
                    error instanceof GeminiConfigurationError ||
                    error instanceof GeminiAPIError
                  ? error.message
                  : "Perzo couldn’t finish that reply. Please try again.",
            });
          } finally {
            if (!cancelled) controller.close();
          }
        },
        cancel() {
          cancelled = true;
          abort.abort();
        },
      });
      return new Response(stream, {
        headers: {
          "Content-Type": "application/x-ndjson",
          "Cache-Control": "no-cache, no-transform",
          "X-Accel-Buffering": "no",
        },
      });
    }
    const reply = await getPerzoReply(messages, signal, undefined, model);
    return Response.json({ reply }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof ChatValidationError) {
      return Response.json(
        { error: error instanceof SyntaxError ? "Invalid message format." : error.message },
        { status: 400 },
      );
    }
    if (error instanceof NvidiaConfigurationError || error instanceof GeminiConfigurationError) {
      return Response.json({ error: error.message }, { status: 503 });
    }
    if (error instanceof NvidiaAPIError || error instanceof GeminiAPIError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json(
      { error: "Perzo couldn't finish that reply. Please try again." },
      { status: 502 },
    );
  } finally {
    reader?.releaseLock();
  }
}
