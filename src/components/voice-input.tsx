"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "./icon";

type RecognitionResult = { isFinal: boolean; 0: { transcript: string } };
type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onresult: ((event: { resultIndex: number; results: ArrayLike<RecognitionResult> }) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};
type RecognitionWindow = Window & { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };

export function VoiceInput({ disabled, onTranscript, onListeningChange, onError }: {
  disabled: boolean;
  onTranscript: (text: string) => void;
  onListeningChange: (listening: boolean) => void;
  onError: (message: string | null) => void;
}) {
  const [supported, setSupported] = useState(false);
  const [phase, setPhase] = useState<"idle" | "starting" | "listening">("idle");
  const recognition = useRef<Recognition | null>(null);
  const starting = useRef(false);

  useEffect(() => {
    const browserWindow = window as RecognitionWindow;
    setSupported(Boolean(browserWindow.SpeechRecognition || browserWindow.webkitSpeechRecognition));
    return () => {
      if (recognition.current) {
        recognition.current.onend = null;
        recognition.current.onresult = null;
        recognition.current.onerror = null;
        recognition.current.onstart = null;
        recognition.current.abort();
      }
    };
  }, []);

  function toggle() {
    if (recognition.current) {
      try { if (phase === "starting") recognition.current.abort(); else recognition.current.stop(); }
      catch {
        recognition.current = null; starting.current = false;
        setPhase("idle"); onListeningChange(false);
      }
      return;
    }
    if (starting.current || disabled) return;
    const browserWindow = window as RecognitionWindow;
    const SpeechRecognition = browserWindow.SpeechRecognition || browserWindow.webkitSpeechRecognition;
    if (!SpeechRecognition) { onError("Voice typing isn’t available in this browser. You can still type your message."); return; }
    const session = new SpeechRecognition();
    session.lang = navigator.language || "en-US";
    session.continuous = false;
    session.interimResults = false;
    session.onstart = () => setPhase("listening");
    session.onresult = event => {
      const parts: string[] = [];
      for (let index = event.resultIndex; index < event.results.length; index++) {
        if (event.results[index].isFinal) parts.push(event.results[index][0].transcript);
      }
      if (parts.length) onTranscript(parts.join(" "));
    };
    session.onerror = event => {
      if (event.error === "aborted") return;
      onError(event.error === "not-allowed" || event.error === "service-not-allowed"
        ? "Microphone access wasn’t allowed. Enable it in your browser settings to use voice typing."
        : event.error === "no-speech" ? "No speech was detected. Tap the microphone to try again."
        : "Voice typing couldn’t connect. Please try again or type your message.");
    };
    session.onend = () => {
      recognition.current = null; starting.current = false;
      setPhase("idle"); onListeningChange(false);
    };
    recognition.current = session;
    starting.current = true;
    setPhase("starting"); onListeningChange(true); onError(null);
    try { session.start(); }
    catch {
      recognition.current = null; starting.current = false;
      setPhase("idle"); onListeningChange(false);
      onError("The microphone couldn’t start. Please try again.");
    }
  }

  const label = phase === "starting" ? "Cancel voice typing" : phase === "listening" ? "Stop voice typing" : "Start voice typing";
  return <button type="button" className={`mic-button ${phase !== "idle" ? "is-listening" : ""}`} disabled={disabled || !supported} onClick={toggle} aria-label={supported ? label : "Voice typing unavailable in this browser"} aria-pressed={phase !== "idle"} title={supported ? `${label}. Your browser may process audio online.` : "Voice typing isn’t supported in this browser"}><Icon name={phase === "idle" ? "mic" : "stop"} size={21} /></button>;
}
