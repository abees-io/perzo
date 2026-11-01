import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanTextForSpeech } from "../src/lib/speech";

test("cleanTextForSpeech removes markdown symbols and code blocks", () => {
  const input = "```typescript\nconst x = 1;\n```\nHere is **important** info with `inline code` and *emphasis*.";
  const cleaned = cleanTextForSpeech(input);
  assert.equal(cleaned, "Here is important info with inline code and emphasis.");
});

test("cleanTextForSpeech strips links and headers while keeping text", () => {
  const input = "### Title of Message\nVisit [Google](https://google.com) for details.\n- Bullet 1\n- Bullet 2";
  const cleaned = cleanTextForSpeech(input);
  assert.equal(cleaned, "Title of Message Visit Google for details. Bullet 1 Bullet 2");
});

test("cleanTextForSpeech preserves Malayalam characters", () => {
  const input = "**നമസ്കാരം**, സുഖമാണോ?";
  const cleaned = cleanTextForSpeech(input);
  assert.equal(cleaned, "നമസ്കാരം, സുഖമാണോ?");
});

