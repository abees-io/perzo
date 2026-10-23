# Perzo

A personal AI companion built with Next.js, TypeScript, Tailwind CSS, and the NVIDIA NIM API. The mobile-first interface features a near-black background with orange, coral, and purple accents, with idle, thinking, and responding states.

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

## Model selection and Body Pose

The model picker is attached to the message bar and remembers your choice in this browser. It lists Llama 3.2 11B and 90B Vision, Nemotron Super 120B, Nemotron Lightning 30B, DeepSeek Flash, and NVIDIA 3D Body Pose. Model access and quotas depend on your NVIDIA account. Photo attachments are sent only to models marked **Chat + photos**. Earlier photos are omitted when switching to a text-only model.

**Body Pose is a video analysis tool, not a conversational model.** Selecting it opens a separate upload panel while preserving the chat. It connects to NVIDIA's hosted gRPC service using your server-side `NVIDIA_API_KEY`. No GPU or Python installation is needed for the app's hosted-client integration.

- Supply a constant-frame-rate H.264 MP4 under 3 MB, at most 300 frames, and a matching tracked-body bounding-box text file under 150 KB. These app limits keep uploads within Vercel's request budget; they are smaller than NVIDIA's hosted limits.
- The first tracking-file line is the number of people (1–5). Each following line contains `frame_id tracking_id x y width height`. Frames start at 0 and each person keeps a stable tracking ID. Use real boxes from a detector/tracker. Perzo does not generate tracking annotations.
- NVIDIA returns pose data, not a rendered video. The app shows a rotatable 3D joint preview and lets you download the complete returned frame data as JSON. Results and selected files remain in browser memory and clear on refresh.
- Analysis has a 50-second upstream deadline. Try short clips if the hosted service queues requests. Account entitlement, endpoint API version, Vercel timeouts, and network access can affect success.
- Optional `NVIDIA_BODY_POSE_FUNCTION_ID` defaults to `254b3621-bb66-4b7b-9c89-621c352b4d91`. Check the current NVIDIA Try API page if the hosted endpoint changes. Never put an API key in a `NEXT_PUBLIC_` variable.

Official references: [Body Pose hosted API](https://build.nvidia.com/nvidia/body-pose/api), [input and output guide](https://docs.nvidia.com/nim/maxine/body-pose/latest/basic-inference.html).

Protocol definitions in `src/lib/server/protos` are from NVIDIA's MIT-licensed [nim-clients](https://github.com/NVIDIA-Maxine/nim-clients) at commit `d02b7d57541b8598ac4c057947b10b2e42ccb1ee`. Their license notices are preserved. The Next.js tracing configuration includes these files in the Body Pose server function.
