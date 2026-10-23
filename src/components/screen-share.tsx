"use client";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { captureScreenFrame } from "@/lib/screen-capture";
import { Icon } from "./icon";

export type ScreenShareHandle = { capture: () => string; stop: () => void };
export const ScreenShare = forwardRef<ScreenShareHandle, {
  disabled: boolean; vision: boolean; hasPhoto: boolean;
  onActiveChange: (active: boolean) => void; onPendingChange: (pending: boolean) => void; onError: (message: string | null) => void;
}>(function ScreenShare({ disabled, vision, hasPhoto, onActiveChange, onPendingChange, onError }, ref) {
  const [supported, setSupported] = useState<boolean | null>(null), [active, setActive] = useState(false), [pending, setPending] = useState(false);
  const stream = useRef<MediaStream | null>(null), video = useRef<HTMLVideoElement>(null);
  const generation = useRef(0), mounted = useRef(true), starting = useRef(false);
  const callbacks = useRef({ onActiveChange, onPendingChange, onError });
  callbacks.current = { onActiveChange, onPendingChange, onError };
  function stop() {
    generation.current++; starting.current = false;
    for (const track of stream.current?.getTracks() || []) { track.onended = null; track.stop(); }
    stream.current = null;
    if (video.current) video.current.srcObject = null;
    setActive(false); setPending(false);
    callbacks.current.onActiveChange(false); callbacks.current.onPendingChange(false);
  }
  useEffect(() => {
    mounted.current = true;
    setSupported(Boolean(window.isSecureContext && navigator.mediaDevices?.getDisplayMedia));
    return () => {
      mounted.current = false; generation.current++;
      for (const track of stream.current?.getTracks() || []) { track.onended = null; track.stop(); }
      stream.current = null;
    };
  }, []);
  useEffect(() => { if (!vision && stream.current) stop(); }, [vision]);
  useEffect(() => {
    if (!active || !video.current || !stream.current) return;
    video.current.srcObject = stream.current;
    void video.current.play().catch(() => callbacks.current.onError("Click the screen preview to start it, then send your question."));
  }, [active]);
  useImperativeHandle(ref, () => ({ stop, capture() {
    return captureScreenFrame(video.current, stream.current);
  } }));
  async function start() {
    if (disabled || starting.current || !supported) return;
    if (!vision) { onError("Choose Llama 3.2 11B or 90B to discuss your screen. DeepSeek accepts text only."); return; }
    if (hasPhoto) { onError("Remove the attached photo before sharing your screen."); return; }
    const attempt = ++generation.current;
    starting.current = true; setPending(true); onPendingChange(true); onError(null);
    try {
      // Called directly from the button gesture; the browser owns source selection.
      const selected = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: { ideal: 2, max: 5 } }, audio: false });
      if (!mounted.current || attempt !== generation.current) { selected.getTracks().forEach(track => track.stop()); return; }
      stream.current = selected;
      const track = selected.getVideoTracks()[0];
      if (!track || track.readyState !== "live") throw new Error("The selected screen is no longer available.");
      track.onended = stop;
      setActive(true); callbacks.current.onActiveChange(true);
    } catch (error) {
      if (!mounted.current || attempt !== generation.current) return;
      stop();
      callbacks.current.onError(error instanceof DOMException && error.name === "NotAllowedError" ? "Screen sharing was cancelled or blocked. Nothing was sent." : error instanceof DOMException && error.name === "NotReadableError" ? "Your browser couldn’t access that screen. Try another window or check screen-recording permissions." : error instanceof Error ? error.message : "Screen sharing couldn’t start. Try a desktop browser or attach a screenshot.");
    } finally {
      if (mounted.current && attempt === generation.current) { starting.current = false; setPending(false); callbacks.current.onPendingChange(false); }
    }
  }
  return <div className={`screen-share ${active ? "is-sharing" : ""}`}>
    <div className="screen-share-actions">
      {active ? <><span className="screen-live"><i />Screen preview on</span><button type="button" onClick={stop}><Icon name="stop" size={15} />Stop sharing</button></>
        : pending ? <><span role="status">Choose a screen in your browser…</span><button type="button" onClick={stop}>Cancel</button></>
        : <button type="button" onClick={() => void start()} disabled={disabled || supported !== true} title={!vision ? "Choose a Llama model to share your screen" : "Choose a screen, window or tab"}><Icon name="screen" size={17} />Share screen</button>}
      {supported === false && <span className="screen-unsupported">Unavailable here—attach a screenshot.</span>}
    </div>
    {active && <div className="screen-preview"><video ref={video} muted autoPlay playsInline aria-label="Local preview of your shared screen" onClick={() => { void video.current?.play().catch(() => {}); }} /><p>Each question sends the current screen image to NVIDIA. The preview stays local between questions. No screen audio is captured.</p></div>}
  </div>;
});
