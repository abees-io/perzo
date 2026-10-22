# Perzo

A personal AI companion built with Next.js, TypeScript, Tailwind CSS and the official OpenAI SDK. The mobile-first interface uses the supplied Perzo logo, a near-black background and orange, coral and purple accents, with idle, thinking and responding states.

## Start locally

Requires Node.js 20.9 or newer and npm.

1. Run `npm install` in this folder.
2. Copy `.env.example` to `.env.local` in the project root, next to `package.json`.
3. Open `.env.local` privately and replace both placeholders:

   ```env
   OPENAI_API_KEY=your_real_api_key
   OPENAI_MODEL=your_available_responses_model_id
   ```

   Create a key at https://platform.openai.com/api-keys and choose a Responses-compatible model available to your API project. API access requires the appropriate account access and billing. Do not paste the key into the chat interface or share it. `.env.local` is ignored by Git; never use a `NEXT_PUBLIC_` prefix for secrets.

4. Run `npm run dev` and open http://127.0.0.1:5000.
5. Restart the development server after changing environment variables.

## Try the chat

- Send “Hi, my name is Alex.” Then ask “What is my name?” to check conversation context.
- Press Enter to send, or Shift+Enter to insert a new line.
- Watch Perzo think, then respond. Only one request can run at once.
- Send HTML such as `<b>hello</b>`: it appears as plain text, never executable HTML.
- Blank messages cannot be sent. Each message is limited to 4,000 characters.
- Without valid API settings, sending a message displays a setup error. Correct the settings, restart, and use Try again; retry does not duplicate your message.
- New conversation clears the chat. Reloading also clears it: history stays only in browser memory, and the last 20 messages are sent for context. Older messages are not included.
- Projects creates a named space with its own chat. Switch between spaces in Recents; their messages remain separate. New session starts a fresh general chat and keeps the previous one in Recents. Chats and projects are session-only and clear on refresh.
- The sidebar has a search control, Projects/Chats/Personalize links, a searchable Recents list, a profile button and a bottom New session action. Search matches titles and message text within the current browser session. The profile button opens the saved-name setting.
- The opening screen keeps only the small brand mark and centered greeting. A minimal header opens the navigation drawer. The single rounded message bar contains a plus menu, text field, microphone and Send button. The conversation scrolls above it. The layout accounts for display cutouts, home indicators and the visible viewport when the keyboard opens; the sidebar is available on desktop after chatting.
- The opening screen shows a small Perzo logo and a greeting based on your device's local time: morning 05:00–11:59, afternoon 12:00–16:59, evening 17:00–20:59, and late night 21:00–04:59. It refreshes every minute and when you return to the app.
- Menu → Personalize Perzo lets you set or clear an optional name. The name is stored only in this browser's local storage, independent of chat history; it is not an authenticated account profile or automatically sent to the model.
- The plus button opens chat/project actions. The microphone uses browser speech recognition when supported, only after you tap it and grant permission. Recognized words stay in the draft until you send. Some browsers process speech online. Unsupported browsers keep typed chat available; the mic is disabled. This is dictation, not a full spoken conversation mode. See https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition.

## Checks

```text
npm run test
npm run typecheck
npm run build
```

## Structure

- `src/components/perzo-chat.tsx`: interface and in-memory conversation state.
- `src/components/brand.tsx`: shared Perzo logo presentation.
- `src/components/icon.tsx`: interface icons.
- `public/perzo-logo.png`: supplied logo, preserved as the source asset.
- `src/lib/chat.ts`: shared message types, limits and server input validation.
- `src/app/api/chat/route.ts`: bounded JSON input, validation and safe error responses.
- `src/lib/server/perzo.ts`: server-only OpenAI Responses call and Perzo personality.
- `src/app/globals.css`: Tailwind import, responsive layout, brand palette and animations.

The chat frontend calls `/api/chat`. API credentials never enter the client bundle. Responses are rendered as React text, without raw HTML. Requests use `store: false`; this does not change the provider's other applicable data-retention policies. Optional browser dictation uses the browser's recognition service separately. No database, RAG, spoken AI responses, tools or external account integrations are included.

The app binds to localhost by default for personal development. Before public deployment, add authentication and server-side rate limits to protect your API usage.

Future persistence belongs behind the chat endpoint; RAG can supply context before the model call, tools/MCP can extend the server adapter, and voice can connect to the existing text input/output flow.

API reference: https://developers.openai.com/api/docs/quickstart
