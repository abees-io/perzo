# Perzo

A personal AI companion built with Next.js, TypeScript, Tailwind CSS, and the NVIDIA NIM API. The mobile-first interface uses a dark glass composer, orange/coral/purple branding, and a logo that animates only while waiting for a reply.

Chat uses NVIDIA’s OpenAI-compatible API, with a selectable model in the composer. The default is `meta/llama-3.2-11b-vision-instruct`.

## Setup

Requires Node.js 20.9 or newer and npm.

1. Clone the repo and run `npm install`.
2. Copy `.env.example` to `.env.local`:

   ```env
   NVIDIA_API_KEY=your_real_nvidia_api_key
   NVIDIA_MODEL=meta/llama-3.2-11b-vision-instruct
   NVIDIA_BASE_URL=https://integrate.api.nvidia.com/v1
   ```

   Get a free API key at [build.nvidia.com](https://build.nvidia.com). Do not prefix it with `NEXT_PUBLIC_` — it must stay server-side only.

3. Run `npm.cmd run dev` and open [http://127.0.0.1:5000](http://127.0.0.1:5000).
4. Restart the dev server after changing `.env.local`.

## Try the chat

- Send a message and watch Perzo think, then respond.
- Press **Enter** to send, or **Shift+Enter** for a new line.
- Only one request runs at a time. A loading indicator appears while waiting.
- Errors show a dismissable banner with a **Try again** button.
- Blank or oversized messages (over 4,000 characters) cannot be sent.
- **New session** opens a fresh chat and keeps previous conversations in Recents for the current browser session. Up to 20 recent messages are sent as context; older messages are trimmed when needed to fit the request size limit. Chats clear on refresh.
- **Projects** creates a named workspace with its own chat history.
- **Personalize** lets you set a display name (saved in browser local storage).
- The **microphone** button uses browser speech recognition when supported.

## Checks

```text
npm run test
npm run typecheck
npm run build
npm run format:check
```

## Structure

- `src/components/perzo-chat.tsx` — chat interface and in-memory conversation state
- `src/components/brand.tsx` — shared Perzo logo
- `src/components/icon.tsx` — interface icons
- `src/components/voice-input.tsx` — browser speech recognition
- `src/lib/chat.ts` — shared message types, limits, and server input validation
- `src/lib/models.ts` — the three enabled models and photo capabilities
- `src/lib/reply-stream.ts` — streamed reply reader and connection error handling
- `src/lib/server/nvidia.ts` — NVIDIA NIM API client (server-only)
- `src/lib/server/perzo.ts` — Perzo personality and reply dispatcher
- `src/app/api/chat/route.ts` — POST endpoint with validation and error handling
- `src/app/globals.css` — layout, brand palette, and animations
- `public/perzo-logo.png` — brand asset

## Security notes

- `NVIDIA_API_KEY` is read only in server-side code and never included in the client bundle.
- Responses are rendered as plain React text — no raw HTML is ever injected.
- The app binds to `127.0.0.1` by default. Before any public deployment, add authentication and server-side rate limiting.

## Model selection

Choose Llama 3.2 11B, Llama 3.2 90B, or DeepSeek Flash from the model picker attached to the message bar. Your selection is remembered in this browser. Both Llama models accept photos; DeepSeek receives text only, with earlier photo attachments omitted. Availability and quotas depend on your NVIDIA account. Video analysis is not included.

## Reply feedback

A short chime plays when an answer finishes. Errors trigger a brief vibration on supported devices. Both are enabled automatically with no settings switches. Browser audio rules, device volume, and vibration support still apply. Screen sharing is not included.

## Maintaining the code

Run `npm.cmd run format` to format source files, or `npm.cmd run format:check` to check formatting. Type checking also detects unused local variables and parameters. Dependency versions are pinned, and `npm ci` installs the lockfile versions for repeatable builds. See [the layout guide](docs/chat-layout.md) for message margins and thinking-logo spacing.
