# Perzo

A personal AI companion built with Next.js, TypeScript, Tailwind CSS, and the NVIDIA NIM API. The mobile-first interface features a near-black background with orange, coral, and purple accents, with idle, thinking, and responding states.

Powered by `nvidia/nemotron-3.5-super-vl-120b-a12b` via NVIDIA's OpenAI-compatible API endpoint.

## Setup

Requires Node.js 20.9 or newer and npm.

1. Clone the repo and run `npm install`.
2. Copy `.env.example` to `.env.local`:

   ```env
   NVIDIA_API_KEY=your_real_nvidia_api_key
   NVIDIA_MODEL=nvidia/nemotron-3.5-super-vl-120b-a12b
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
- **New session** clears the chat. The last 20 messages are sent as context; history is in-browser only and clears on refresh.
- **Projects** creates a named workspace with its own chat history.
- **Personalize** lets you set a display name (saved in browser local storage).
- The **microphone** button uses browser speech recognition when supported.

## Checks

```text
npm run test
npm run typecheck
npm run build
```

## Structure

- `src/components/perzo-chat.tsx` — chat interface and in-memory conversation state
- `src/components/brand.tsx` — shared Perzo logo
- `src/components/icon.tsx` — interface icons
- `src/components/voice-input.tsx` — browser speech recognition
- `src/lib/chat.ts` — shared message types, limits, and server input validation
- `src/lib/server/nvidia.ts` — NVIDIA NIM API client (server-only)
- `src/lib/server/perzo.ts` — Perzo personality and reply dispatcher
- `src/app/api/chat/route.ts` — POST endpoint with validation and error handling
- `src/app/globals.css` — layout, brand palette, and animations
- `public/perzo-logo.png` — brand asset

## Security notes

- `NVIDIA_API_KEY` is read only in server-side code and never included in the client bundle.
- Responses are rendered as plain React text — no raw HTML is ever injected.
- The app binds to `127.0.0.1` by default. Before any public deployment, add authentication and server-side rate limiting.
