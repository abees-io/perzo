"use client";

import { useEffect, useRef, useState } from "react";
import { MAX_HISTORY_MESSAGES, MAX_MESSAGE_LENGTH, type ChatMessage } from "@/lib/chat";
import { Pet, type PetState } from "./pet";

type DisplayMessage = ChatMessage & { id: string };
const suggestions = [
  { icon: "☀", title: "Find a little focus", message: "Help me choose one small thing to focus on today." },
  { icon: "✧", title: "Make something new", message: "Give me three fun ideas for a small creative project." },
  { icon: "♡", title: "Talk it out", message: "I have a lot on my mind. Help me sort through it one step at a time." },
];
const stateLabels: Record<PetState, string> = { idle: "Here for you", thinking: "Thinking it through…", responding: "A little thought for you" };

export function PerzoChat() {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [state, setState] = useState<PetState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [retryMessages, setRetryMessages] = useState<DisplayMessage[] | null>(null);
  const locked = useRef(false);
  const bottom = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const responseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const controller = useRef<AbortController | null>(null);
  const busy = state === "thinking";

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, error, state]);

  useEffect(() => () => {
    controller.current?.abort();
    if (responseTimer.current) clearTimeout(responseTimer.current);
  }, []);

  async function requestReply(history: DisplayMessage[]) {
    if (locked.current) return;
    locked.current = true;
    if (responseTimer.current) clearTimeout(responseTimer.current);
    setState("thinking");
    setError(null);
    controller.current = new AbortController();
    const timeout = setTimeout(() => controller.current?.abort(), 60_000);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history.slice(-MAX_HISTORY_MESSAGES).map(({ role, content }) => ({ role, content })) }),
        signal: controller.current.signal,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Something went wrong. Please try again.");
      if (typeof data.reply !== "string" || !data.reply.trim()) throw new Error("Perzo returned an empty reply. Please try again.");
      setMessages([...history, { id: crypto.randomUUID(), role: "assistant", content: data.reply }]);
      setRetryMessages(null);
      setState("responding");
      responseTimer.current = setTimeout(() => setState("idle"), 2200);
    } catch (failure) {
      setError(failure instanceof Error && failure.name === "AbortError" ? "The reply took too long. Please try again." : failure instanceof Error ? failure.message : "Couldn't send your message. Please try again.");
      setRetryMessages(history);
      setState("idle");
    } finally {
      clearTimeout(timeout);
      locked.current = false;
      input.current?.focus();
    }
  }

  function send(text = draft) {
    const content = text.trim();
    if (locked.current || !content || content.length > MAX_MESSAGE_LENGTH) return;
    const history: DisplayMessage[] = [...messages, { id: crypto.randomUUID(), role: "user", content }];
    setMessages(history);
    setDraft("");
    setRetryMessages(null);
    void requestReply(history);
  }

  function reset() {
    if (locked.current) return;
    if (responseTimer.current) clearTimeout(responseTimer.current);
    setMessages([]); setDraft(""); setError(null); setRetryMessages(null); setState("idle");
    input.current?.focus();
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="/" aria-label="Perzo home"><span className="brand-mark">p<span>✦</span></span>perzo<span className="brand-period">.</span></a>
        <button className="new-chat" onClick={reset} disabled={busy}><span>＋</span> New conversation <span className="button-arrow">↗</span></button>
        <div className="sidebar-label">YOUR SPACE</div>
        <div className="active-nav"><span>☏</span> A moment with Perzo <span className="nav-dot" /></div>
        <div className="sidebar-note"><span>✧</span><p>Big ideas.<br />Small steps.<br /><strong>A little company.</strong></p></div>
        <div className="sidebar-bottom"><span className="session-dot" /><div>Just this conversation<small>Refresh for a fresh start</small></div></div>
      </aside>

      <main className="main-panel">
        <header className="topbar"><div><span className="header-title">Your everyday companion</span><span className="header-subtitle">A little help, a little heart.</span></div><span className="version-badge"><span /> Perzo · v0.1</span></header>
        <div className="workspace">
          <section className="chat-column" aria-label="Chat with Perzo">
            <div className="conversation-area">
              {messages.length === 0 ? (
                <div className="welcome">
                  <div className="welcome-eyebrow"><span /> A SMALL FRIEND FOR YOUR BIG DAY</div>
                  <h1>Hey, I’m Perzo<span>.</span><br /><span className="muted-heading">What’s on your mind?</span></h1>
                  <p>A messy idea, a curious question, or just a hello.<br className="desktop-break" /> We can figure it out together.</p>
                  <div className="welcome-pet"><Pet state={state} /><span className="hello-note">happy you’re here <span>↙</span></span></div>
                  <div className="suggestion-grid">{suggestions.map(suggestion => <button key={suggestion.title} onClick={() => send(suggestion.message)} disabled={busy}><span className="suggestion-icon">{suggestion.icon}</span><span>{suggestion.title}</span><span className="suggestion-arrow">↗</span></button>)}</div>
                </div>
              ) : (
                <div className="message-list" role="log" aria-label="Conversation" aria-live="polite" aria-relevant="additions text">
                  <div className="conversation-start">A little space to think together</div>
                  {messages.map(message => <article className={`message message-${message.role}`} key={message.id}>
                    <div className="message-avatar" aria-hidden="true">{message.role === "assistant" ? "✦" : "Y"}</div>
                    <div className="message-content"><div className="message-author">{message.role === "assistant" ? "Perzo" : "You"}</div><p>{message.content}</p></div>
                  </article>)}
                  {busy && <div className="message message-assistant"><div className="message-avatar" aria-hidden="true">✦</div><div className="message-content"><div className="message-author">Perzo</div><div className="typing-indicator" role="status" aria-label="Perzo is thinking"><i /><i /><i /></div></div></div>}
                </div>
              )}
              {error && <div className="error-notice" role="alert"><p>{error}</p>{retryMessages && <button onClick={() => void requestReply(retryMessages)} disabled={busy}>Try again ↗</button>}</div>}
              <div ref={bottom} />
            </div>

            <div className="composer-wrap">
              <form className="composer" onSubmit={event => { event.preventDefault(); send(); }}>
                <label className="sr-only" htmlFor="message">Message Perzo</label>
                <textarea id="message" ref={input} value={draft} maxLength={MAX_MESSAGE_LENGTH} rows={2} placeholder="Tell Perzo what’s on your mind…" aria-describedby="composer-hint" onChange={event => setDraft(event.target.value)} onKeyDown={event => {
                  if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); send(); }
                }} />
                <div className="composer-bottom"><span className="composer-spark" aria-hidden="true">✧</span><span className="character-count">{draft.length.toLocaleString()} / {MAX_MESSAGE_LENGTH.toLocaleString()}</span><button className="send-button" type="submit" disabled={busy || !draft.trim()} aria-label={busy ? "Waiting for Perzo" : "Send message"}>{busy ? <span className="send-spinner" /> : <span>↑</span>}</button></div>
              </form>
              <div className="composer-footer" id="composer-hint"><span>Enter to send <span className="hint-divider">·</span> Shift + Enter for a new line</span><span>Perzo can make mistakes. Stay curious.</span></div>
            </div>
          </section>

          <aside className="companion-card" aria-label="Perzo’s status">
            <div className="companion-heading"><span>MEET YOUR COMPANION</span><span>✧</span></div>
            <div className="companion-portrait"><Pet state={state} /></div>
            <h2>A little Perzo.<br />A lot of possibility.</h2>
            <div className="pet-status" role="status"><span className={busy ? "status-pulse" : ""} />{stateLabels[state]}</div>
            <div className="companion-divider" />
            <p>Here to untangle ideas,<br />explore the everyday,<br />and keep you company.</p>
            <div className="companion-footnote">ONE CONVERSATION AT A TIME <span>↗</span></div>
          </aside>
        </div>
      </main>
    </div>
  );
}
