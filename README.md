# Perzo

A personal AI pet chat built with Next.js, TypeScript, Tailwind CSS and the official OpenAI SDK. Includes a CSS pet placeholder with idle, thinking and responding animations.

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

4. Run `npm run dev` and open http://127.0.0.1:3000.
5. Restart the development server after changing environment variables.

## Try the chat

- Send “Hi, my name is Alex.” Then ask “What is my name?” to check conversation context.
- Press Enter to send, or Shift+Enter to insert a new line.
- Watch Perzo think, then respond. Only one request can run at once.
- Send HTML such as `<b>hello</b>`: it appears as plain text, never executable HTML.
- Blank messages cannot be sent. Each message is limited to 4,000 characters.
- Without valid API settings, sending a message displays a setup error. Correct the settings, restart, and use Try again; retry does not duplicate your message.
- New conversation clears the chat. Reloading also clears it: history stays only in browser memory, and the last 20 messages are sent for context. Older messages are not included.

## Checks

```text
npm run test
npm run typecheck
npm run build
```

## Structure

- `src/components/perzo-chat.tsx`: interface and in-memory conversation state.
- `src/components/pet.tsx`: animated pet placeholder.
- `src/lib/chat.ts`: shared message types, limits and server input validation.
- `src/app/api/chat/route.ts`: bounded JSON input, validation and safe error responses.
- `src/lib/server/perzo.ts`: server-only OpenAI Responses call and Perzo personality.
- `src/app/globals.css`: Tailwind import, responsive layout and pet animations.

The frontend calls only `/api/chat`. API credentials never enter the client bundle. Responses are rendered as React text, without raw HTML. Requests use `store: false`; this does not change the provider's other applicable data-retention policies. No database, RAG, voice, tools or integrations are included.

The app binds to localhost by default for personal development. Before public deployment, add authentication and server-side rate limits to protect your API usage.

Future persistence belongs behind the chat endpoint; RAG can supply context before the model call, tools/MCP can extend the server adapter, and voice can connect to the existing text input/output flow.

API reference: https://developers.openai.com/api/docs/quickstart
