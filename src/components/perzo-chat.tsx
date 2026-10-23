"use client";

import { useEffect, useRef, useState } from "react";
import { MAX_HISTORY_MESSAGES, MAX_MESSAGE_LENGTH, type ChatMessage } from "@/lib/chat";
import { BrandMark } from "./brand";
import { Icon } from "./icon";
import { VoiceInput } from "./voice-input";
import { readReplyStream } from "@/lib/reply-stream";
import { preparePhoto } from "@/lib/photo";
import { getGreeting } from "@/lib/greeting";
import { DEFAULT_MODEL_ID, getModel, sanitizeModelId } from "@/lib/models";
import { ModelPicker } from "./model-picker";

type DisplayMessage = ChatMessage & { id: string };
type AssistantState = "idle" | "thinking" | "working" | "generating" | "responding";
type Workspace = { id: string; name: string; messages: DisplayMessage[]; kind: "chat" | "project" };

function Navigation({ busy, onReset, onAbout, onProject, projects, activeId, onSelect, displayName }: { busy: boolean; onReset: () => void; onAbout: () => void; onProject: () => void; projects: Workspace[]; activeId: string; onSelect: (id: string) => void; displayName: string }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);
  const searchInput = useRef<HTMLInputElement>(null);
  useEffect(() => { if (searchOpen) searchInput.current?.focus(); }, [searchOpen]);
  const recentSpaces = [...projects].reverse().filter(project => (project.kind === "project" || project.messages.length > 0) &&
    `${project.name} ${project.messages.map(message => message.content).join(" ")}`.toLowerCase().includes(query.toLowerCase()));
  const visibleSpaces = showAll || query ? recentSpaces : recentSpaces.slice(0, 4);
  return <>
    <div className="nav-heading"><a className="nav-wordmark" href="/" aria-label="Perzo home">Perzo<span>.</span></a><button className="nav-search-toggle" onClick={() => { setSearchOpen(!searchOpen); setQuery(""); }} aria-label={searchOpen ? "Close search" : "Search chats and projects"} aria-expanded={searchOpen}><Icon name={searchOpen ? "close" : "search"} size={23} /></button></div>
    {searchOpen && <div className="nav-search-field"><Icon name="search" size={17} /><input ref={searchInput} value={query} onChange={event => setQuery(event.target.value)} placeholder="Search chats and projects" aria-label="Search chats and projects" /></div>}
    <nav className="nav-main-links" aria-label="Workspace navigation">
      <button onClick={onProject} disabled={busy} title="Create a new project"><Icon name="folder" size={22} /><span>Projects</span></button>
      <button onClick={() => onSelect("personal")} disabled={busy}><Icon name="chat" size={22} /><span>Chats</span></button>
      <button onClick={onAbout}><Icon name="info" size={22} /><span>Personalize</span></button>
    </nav>
    <section className="nav-recents" aria-label="Recent chats and projects"><h2>Recents</h2>
      <div className="nav-recent-list">{visibleSpaces.map(project => <button key={project.id} onClick={() => onSelect(project.id)} disabled={busy} aria-current={activeId === project.id ? "page" : undefined}><span>{project.id === "personal" && project.messages.length ? project.messages.find(message => message.role === "user")?.content.slice(0, 48) || "Chat" : project.name}</span></button>)}</div>
      {(showAll || query) && recentSpaces.length === 0 && <p className="nav-empty">{query ? "No matching chats or projects." : "Your recent chats will appear here."}</p>}
      {!query && <button className="nav-view-all" onClick={() => setShowAll(!showAll)} aria-expanded={showAll}>{showAll ? "Show less" : "View all"}<Icon name="chevron" size={18} /></button>}
    </section>
    <div className="nav-footer"><button className="nav-profile" onClick={onAbout} aria-label={displayName ? `Personalize Perzo for ${displayName}` : "Personalize Perzo"} title={displayName || "Personalize Perzo"}>{displayName ? Array.from(displayName)[0].toUpperCase() : <BrandMark />}</button><button className="new-session" onClick={onReset} disabled={busy}><Icon name="plus" size={21} /><span>New session</span></button></div>
  </>;
}

export function PerzoChat() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([{ id: "personal", name: "Chat", messages: [], kind: "chat" }]);
  const [activeId, setActiveId] = useState("personal");
  const activeWorkspace = workspaces.find(workspace => workspace.id === activeId)!;
  const messages = activeWorkspace.messages;
  function setMessages(next: DisplayMessage[]) {
    setWorkspaces(previous => previous.map(workspace => workspace.id === activeId ? { ...workspace, messages: next } : workspace));
  }
  const [projectName, setProjectName] = useState("");
  const [projectError, setProjectError] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [editedName, setEditedName] = useState("");
  const [hour, setHour] = useState<number | null>(null);
  const [profileNotice, setProfileNotice] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const [composerNotice, setComposerNotice] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [photo, setPhoto] = useState<string | undefined>();
  const [preparing, setPreparing] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>(DEFAULT_MODEL_ID);
  const currentModel = getModel(selectedModel)!;
  useEffect(() => {
    try { const saved = sanitizeModelId(localStorage.getItem("perzo.selectedModel")); if (saved) setSelectedModel(saved); } catch {}
  }, []);
  function changeModel(id: string) {
    if (photo && !getModel(id)?.vision) { setComposerNotice("Remove the attached photo before choosing a text-only model."); return; }
    setSelectedModel(id); setError(null); setComposerNotice(null);
    try { localStorage.setItem("perzo.selectedModel", id); } catch {}
  }

  const photoInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const audio = useRef<AudioContext | null>(null);
  function unlockAudio() {
    try { if (!audio.current) audio.current = new AudioContext(); void audio.current.resume().catch(() => {}); } catch { /* Optional audio isn't available everywhere. */ }
  }
  function chime() {
    if (!audio.current || audio.current.state !== "running") return;
    const context = audio.current;
    const oscillator = context.createOscillator(), gain = context.createGain();
    oscillator.connect(gain); gain.connect(context.destination);
    oscillator.frequency.setValueAtTime(660, context.currentTime);
    oscillator.frequency.setValueAtTime(880, context.currentTime + .1);
    gain.gain.setValueAtTime(.035, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(.001, context.currentTime + .3);
    oscillator.start(); oscillator.stop(context.currentTime + .3);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
  }
  async function attachPhoto(file?: File) {
    if (!file) return;
    if (!currentModel.vision) { setComposerNotice("Choose a model marked Chat + photos to attach an image."); return; }
    setPreparing(true); setComposerNotice(null);
    try { setPhoto(await preparePhoto(file)); setExpanded(true); }
    catch (failure) { setComposerNotice(failure instanceof Error ? failure.message : "Couldn’t open this photo."); }
    finally { setPreparing(false); }
  }
  const [draft, setDraft] = useState("");
  const [state, setState] = useState<AssistantState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [retryMessages, setRetryMessages] = useState<DisplayMessage[] | null>(null);
  const locked = useRef(false);
  const shell = useRef<HTMLDivElement>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const drawer = useRef<HTMLDialogElement>(null);
  const about = useRef<HTMLDialogElement>(null);
  const projectDialog = useRef<HTMLDialogElement>(null);
  const responseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const controller = useRef<AbortController | null>(null);
  const busy = state === "thinking" || state === "working" || state === "generating";
  const controlsBusy = busy || listening || preparing;
  useEffect(() => { if (error || composerNotice) navigator.vibrate?.([35, 45, 35]); }, [error, composerNotice]);
  useEffect(() => () => { void audio.current?.close().catch(() => {}); }, []);

  useEffect(() => {
    if (state !== "thinking") return;
    const timer = setTimeout(() => setState("working"), 4000);
    return () => clearTimeout(timer);
  }, [state]);

  useEffect(() => {
    function updateClock() { setHour(new Date().getHours()); }
    function loadName() {
      try { setDisplayName((localStorage.getItem("perzo.displayName") || "").trim().slice(0, 40)); }
      catch { /* The greeting works even when browser storage is unavailable. */ }
    }
    function onVisibilityChange() { if (!document.hidden) updateClock(); }
    function onStorage(event: StorageEvent) { if (event.key === "perzo.displayName" || event.key === null) loadName(); }
    updateClock(); loadName();
    const timer = setInterval(updateClock, 60_000);
    window.addEventListener("focus", updateClock);
    window.addEventListener("storage", onStorage);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", updateClock);
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const updateHeight = () => {
      if (viewport.scale === 1) shell.current?.style.setProperty("--visible-height", `${viewport.height}px`);
      else shell.current?.style.removeProperty("--visible-height");
    };
    updateHeight();
    viewport.addEventListener("resize", updateHeight);
    return () => viewport.removeEventListener("resize", updateHeight);
  }, []);
  useEffect(() => {
    if (messages.length || error) bottom.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "end" });
  }, [messages, error, state]);
  useEffect(() => {
    if (!input.current) return;
    input.current.style.height = "auto";
    input.current.style.height = `${Math.min(input.current.scrollHeight, 120)}px`;
  }, [draft]);
  useEffect(() => () => {
    controller.current?.abort();
    if (responseTimer.current) clearTimeout(responseTimer.current);
  }, []);

  async function requestReply(history: DisplayMessage[]) {
    if (locked.current || preparing || listening) return;
    unlockAudio();
    locked.current = true;
    if (responseTimer.current) clearTimeout(responseTimer.current);
    setState("thinking"); setError(null);
    controller.current = new AbortController();
    const timeout = setTimeout(() => controller.current?.abort(), 60_000);
    try {
      const response = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json", Accept: "application/x-ndjson" },
        body: JSON.stringify({
          messages: history.slice(-MAX_HISTORY_MESSAGES).map(({ role, content, image }, index, recent) => ({ role, content, ...(currentModel.vision && image && index === recent.findLastIndex(message => message.image) ? { image } : {}) })),
          model: selectedModel,
        }),
        signal: controller.current.signal,
      });
      const replyId = crypto.randomUUID();
      let data: { reply?: string; error?: string } = {};
      if (response.ok && response.headers.get("content-type")?.includes("application/x-ndjson") && response.body) {
        data.reply = await readReplyStream(response.body, content => {
          setState("generating");
          setMessages([...history, { id: replyId, role: "assistant", content }]);
        });
      } else {
      try {
        data = await response.json();
      } catch {
        throw new Error(
          response.status >= 500
            ? "The server encountered an error processing your request. Please try again."
            : `Network error (${response.status}: ${response.statusText || "Request failed"}).`
        );
      }
      }
      if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Something went wrong. Please try again.");
      if (typeof data.reply !== "string" || !data.reply.trim()) throw new Error("Perzo returned an empty reply. Please try again.");
      setMessages([...history, { id: replyId, role: "assistant", content: data.reply }]);
      setRetryMessages(null); setState("responding"); chime();
      responseTimer.current = setTimeout(() => setState("idle"), 2200);
    } catch (failure) {
      setMessages(history);
      setError(failure instanceof Error && failure.name === "AbortError" ? "The reply took too long. Please try again." : failure instanceof Error ? failure.message : "Couldn't send your message. Please try again.");
      setRetryMessages(history); setState("idle");
    } finally {
      clearTimeout(timeout); locked.current = false;
      if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) input.current?.focus();
    }
  }
  function send(text = draft) {
    if (locked.current || preparing || listening) return;
    const content = text.trim() || (photo ? "What’s in this photo?" : "");
    if (!content || content.length > MAX_MESSAGE_LENGTH) return;
    const history: DisplayMessage[] = [...messages, { id: crypto.randomUUID(), role: "user", content, ...(photo ? { image: photo } : {}) }];
    setMessages(history); setPhoto(undefined); setExpanded(false); setDraft(""); setRetryMessages(null); setComposerNotice(null);
    void requestReply(history);
  }

  function reset() {
    if (locked.current || listening) return;
    if (responseTimer.current) clearTimeout(responseTimer.current);
    setWorkspaces(previous => {
      const personal = previous.find(workspace => workspace.id === "personal");
      const saved = personal?.messages.length ? [{ ...personal, id: crypto.randomUUID(), name: personal.messages.find(message => message.role === "user")?.content.slice(0, 48) || "Chat" }] : [];
      return [...previous.filter(workspace => workspace.id !== "personal"), ...saved, { id: "personal", name: "Chat", messages: [], kind: "chat" }];
    });
    setActiveId("personal"); setDraft(""); setPhoto(undefined); setExpanded(false); setError(null); setRetryMessages(null); setState("idle");
    drawer.current?.close();
    if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) input.current?.focus();
  }
  function openAbout() { drawer.current?.close(); setEditedName(displayName); setProfileNotice(null); about.current?.showModal(); }
  function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = editedName.trim().slice(0, 40);
    setDisplayName(name);
    try {
      if (name) localStorage.setItem("perzo.displayName", name);
      else localStorage.removeItem("perzo.displayName");
      about.current?.close();
    } catch { setProfileNotice("Your name is set for this session. Your browser couldn’t save it for next time."); }
  }
  function openProject() {
    if (locked.current || listening) return;
    drawer.current?.close(); setProjectName(""); setProjectError(null); projectDialog.current?.showModal();
  }
  function selectWorkspace(id: string) {
    if (locked.current || listening) return;
    if (responseTimer.current) clearTimeout(responseTimer.current);
    setActiveId(id); setDraft(""); setPhoto(undefined); setExpanded(false); setError(null); setRetryMessages(null); setState("idle"); drawer.current?.close();
  }
  function createProject(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = projectName.trim();
    if (!name) { setProjectError("Give your project a name."); return; }
    if (name.length > 60) { setProjectError("Use 60 characters or fewer."); return; }
    const id = crypto.randomUUID();
    setWorkspaces(previous => [...previous, { id, name, messages: [], kind: "project" }]);
    selectWorkspace(id); projectDialog.current?.close();
  }
  const navigationProps = { busy: controlsBusy, onReset: reset, onAbout: openAbout, onProject: openProject, projects: workspaces, activeId, onSelect: selectWorkspace, displayName };

  return (
    <div ref={shell} className={`app-shell ${messages.length ? "has-messages" : "is-welcome"}`}>
      <aside className="sidebar" aria-label="Main navigation"><Navigation {...navigationProps} /></aside>
      <dialog ref={drawer} className="navigation-dialog" aria-label="Navigation" onClick={event => { if (event.target === event.currentTarget) drawer.current?.close(); }}>
        <div className="drawer-content"><button className="icon-button drawer-close" onClick={() => drawer.current?.close()} aria-label="Close navigation"><Icon name="close" /></button><Navigation {...navigationProps} /></div>
      </dialog>
      <dialog ref={about} className="about-dialog" aria-labelledby="about-title" onClick={event => { if (event.target === event.currentTarget) about.current?.close(); }}>
        <button className="icon-button about-close" onClick={() => about.current?.close()} aria-label="Close about Perzo"><Icon name="close" /></button>
        <BrandMark className="about-brand" /><p className="eyebrow">YOUR PERSONAL COMPANION</p><h2 id="about-title">Make it yours.</h2>
        <form className="profile-form" onSubmit={saveProfile}><label htmlFor="display-name">What should Perzo call you?</label><input id="display-name" value={editedName} onChange={event => setEditedName(event.target.value)} maxLength={40} autoComplete="given-name" placeholder="Your name (optional)" aria-describedby="profile-note" /><p className="project-note" id="profile-note">Your name is saved in this browser. Greetings follow your device’s local time.</p>{profileNotice && <p role="status" className="project-note">{profileNotice}</p>}<button type="submit" className="about-done">Save preferences <Icon name="arrow" size={18} /></button></form>
        <p className="about-detail">Chats and projects clear when you refresh. Perzo can make mistakes, so check anything important.</p>
      </dialog>
      <dialog ref={projectDialog} className="about-dialog project-dialog" aria-labelledby="project-title">
        <button className="icon-button about-close" onClick={() => projectDialog.current?.close()} aria-label="Close new project"><Icon name="close" /></button>
        <p className="eyebrow">A SPACE FOR YOUR IDEAS</p><h2 id="project-title">New project</h2>
        <p>Give an idea its own space to grow.</p>
        <form onSubmit={createProject}>
          <label htmlFor="project-name">Project name</label>
          <input id="project-name" value={projectName} onChange={event => { setProjectName(event.target.value); setProjectError(null); }} maxLength={60} placeholder="e.g. My next big idea" autoFocus aria-describedby={projectError ? "project-error" : "project-note"} />
          {projectError && <p id="project-error" className="project-error" role="alert">{projectError}</p>}
          <p className="project-note" id="project-note">Projects and chats stay here until you refresh.</p>
          <button className="about-done" type="submit" disabled={!projectName.trim() || busy}>Create project <Icon name="arrow" size={18} /></button>
        </form>
      </dialog>
      <main className="main-panel">
        <header className="topbar">
          <button className="icon-button menu-button" onClick={() => drawer.current?.showModal()} aria-label="Open navigation"><Icon name="menu" /></button>
          <div className="header-desktop-brand"><BrandMark state={state === "generating" ? "responding" : state} /><span>Perzo</span></div>
          {(messages.length > 0 || activeId !== "personal") && <div className="header-center"><span className="header-title">{activeId === "personal" ? "New chat" : activeWorkspace.name}</span></div>}
          <button className="icon-button" onClick={reset} disabled={controlsBusy} aria-label="New chat" title="New chat"><Icon name="new-chat" size={19} /></button>
        </header>
        <section className="chat-column" aria-label="Chat with Perzo">
          <div className="conversation-area">
            {messages.length === 0 ? (
              <div className="minimal-welcome"><div className="welcome-center"><BrandMark className="welcome-brand" /><h1>{hour === null ? "What’s on your mind?" : getGreeting(hour, displayName)}</h1></div></div>
            ) : (
              <div className="message-list" role="log" aria-label="Conversation" aria-live="polite" aria-relevant="additions text">
                <div className="assistant-intro"><BrandMark /><div><span>{displayName ? `Hey, ${displayName}.` : "Hey there."}</span><p>What’s on your mind?</p></div></div>
                {messages.map((message, index) => <article className={`message message-${message.role}`} key={message.id}>{message.role === "assistant" && <BrandMark className="message-avatar" state={index === messages.length - 1 && (state === "responding" || state === "generating") ? "responding" : "idle"} />}<div className="message-content"><span className="message-author">{message.role === "assistant" ? "Perzo" : displayName || "You"}</span><p>{message.content}</p>{message.image && <img className="chat-photo" src={message.image} alt="Attached photo" />}</div></article>)}
                {busy && state !== "generating" && <div className="message message-assistant"><BrandMark className="message-avatar" state={state} /><div className="message-content"><span className="message-author">Perzo</span><div className="typing-indicator" role="status" aria-label={state === "working" ? "Perzo is still working on your reply" : "Perzo is thinking"}><i /><i /><i /><span className="activity-caption">{state === "working" ? "Working on it…" : "Thinking…"}</span></div></div></div>}
              </div>
            )}
            {error && (
              <div className="error-notice" role="alert">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
                  <p>{error}</p>
                  <button
                    type="button"
                    onClick={() => setError(null)}
                    aria-label="Dismiss error"
                    style={{ background: "transparent", border: 0, padding: 0, cursor: "pointer", color: "#a59ba9", minHeight: "auto" }}
                  >
                    <Icon name="close" size={14} />
                  </button>
                </div>
                {retryMessages && <button onClick={() => void requestReply(retryMessages)} disabled={controlsBusy}>Try again <Icon name="arrow" size={15} /></button>}
              </div>
            )}
            <div ref={bottom} />
          </div>
          <div className="composer-wrap">
            <div className="composer-model-surface"><ModelPicker value={selectedModel} disabled={controlsBusy} onChange={changeModel} />
            {composerNotice && <p className="composer-notice" role="status">{composerNotice}</p>}
            {listening && <p className="composer-notice" role="status">Listening… tap stop when you’re done. Review your words before sending.</p>}
            <form className={`composer media-composer ${expanded || photo ? "is-expanded" : ""}`} onSubmit={event => { event.preventDefault(); send(); }}>
              <input hidden ref={photoInput} type="file" accept="image/jpeg,image/png,image/webp" onChange={event => { void attachPhoto(event.target.files?.[0]); event.target.value = ""; }} />
              <input hidden ref={cameraInput} type="file" accept="image/*" capture="environment" onChange={event => { void attachPhoto(event.target.files?.[0]); event.target.value = ""; }} />
              <div id="media-panel" className="media-panel" inert={!expanded && !photo}><div className="media-panel-inner">
                {photo && <div className="photo-preview"><img src={photo} alt="Photo ready to send" /><button type="button" disabled={controlsBusy} aria-label="Remove photo" onClick={() => setPhoto(undefined)}><Icon name="close" size={16} /></button></div>}
                <div className="media-actions"><button type="button" disabled={controlsBusy || !currentModel.vision} onClick={() => photoInput.current?.click()}><Icon name="image" />Add photo</button><button type="button" disabled={controlsBusy || !currentModel.vision} onClick={() => cameraInput.current?.click()}><Icon name="camera" />Camera</button></div>
                <p>{currentModel.vision ? "One photo at a time · Videos aren’t supported." : "Text model · Switch to Chat + photos for image uploads."}</p>
              </div></div>
              <button className="composer-add" type="button" onClick={() => setExpanded(!expanded)} disabled={controlsBusy} aria-expanded={expanded} aria-controls="media-panel" aria-label={expanded ? "Collapse attachments" : "Add media"}><Icon name={expanded ? "close" : "attachment"} size={21} /></button>
              <div className="composer-field"><label className="sr-only" htmlFor="message">Message Perzo</label><textarea id="message" ref={input} value={draft} maxLength={MAX_MESSAGE_LENGTH} rows={1} placeholder={preparing ? "Preparing photo…" : "Ask me anything…"} aria-describedby="composer-hint" autoCapitalize="sentences" spellCheck disabled={listening} onChange={event => { setDraft(event.target.value); if (error) setError(null); }} onKeyDown={event => {
                if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); send(); }
              }} /></div>
              <VoiceInput disabled={busy || preparing} onTranscript={text => setDraft(previous => `${previous.trimEnd()}${previous.trim() ? " " : ""}${text}`.slice(0, MAX_MESSAGE_LENGTH))} onListeningChange={setListening} onError={setComposerNotice} />
              <button className="send-button" type="submit" disabled={controlsBusy || (!draft.trim() && !photo)} aria-label={busy ? "Waiting for Perzo" : "Send message"}>{busy ? <span className="send-spinner" /> : <Icon name="send" size={21} />}</button>
            </form>
            </div>
            <div className="composer-footer" id="composer-hint"><span className="keyboard-hint">Enter to send · Shift + Enter for a new line</span><span>{draft.length > MAX_MESSAGE_LENGTH - 500 ? `${draft.length.toLocaleString()} / ${MAX_MESSAGE_LENGTH.toLocaleString()}` : "A little AI. A little company."}</span></div>
          </div>
        </section>
      </main>
    </div>
  );
}
