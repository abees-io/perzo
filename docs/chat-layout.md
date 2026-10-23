# Adjusting the chat layout

Edit the **Chat layout controls** block near the end of `src/app/globals.css`.

| Variable | Default | What it changes |
| --- | --- | --- |
| `--message-edge-space` | 24px desktop, 14px mobile | Gap between each screen edge and messages. Lower it to move replies left and user bubbles right. |
| `--user-message-max-width` | 82% desktop, 86% mobile | Maximum width of user bubbles, anchored to the right. |
| `--reply-max-width` | 75ch | Maximum assistant reply width. Replies start at the left gutter. |
| `--thinking-logo-size` | 30px | Logo size while Perzo is thinking or waiting for the model. |
| `--thinking-logo-gap` | 10px | Gap between that logo and the thinking text. |
| `--composer-max-width` | 920px | Maximum width of the centered message input. |

Layout:

```text
Left edge                                  Right edge
  Perzo
  Assistant reply starts here.

                          ┌─────────────────────────┐
                          │                     You │
                          │ Your message            │
                          └─────────────────────────┘

  [animated logo] Perzo
                  Thinking…

             [ model picker + message input ]
```

Only the pending-reply row shows the animated logo. Once answer text arrives, the logo is removed and the reply starts at the left gutter. The header and welcome logos stay static. Message markup lives in `src/components/perzo-chat.tsx`, inside `.message-list`.
