"use client";
import { useEffect, useRef, useState } from "react";

export function useSpokenReplies(onError: (message: string) => void) {
  const [supported, setSupported] = useState(false), [enabled, setEnabled] = useState(false), [speaking, setSpeaking] = useState(false);
  const enabledRef = useRef(false), utterance = useRef<SpeechSynthesisUtterance | null>(null);
  function stop() {
    utterance.current = null;
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    setSpeaking(false);
  }
  function toggle(value: boolean) { enabledRef.current = value; setEnabled(value); if (!value) stop(); }
  function say(text: string) {
    if (!enabledRef.current || !supported) return;
    stop();
    const speech = new SpeechSynthesisUtterance(text);
    speech.lang = navigator.language || "en-US";
    speech.onstart = () => { if (utterance.current === speech) setSpeaking(true); };
    speech.onend = () => { if (utterance.current === speech) { utterance.current = null; setSpeaking(false); } };
    speech.onerror = event => {
      if (utterance.current !== speech) return;
      utterance.current = null; setSpeaking(false);
      if (event.error !== "canceled" && event.error !== "interrupted") onError("Spoken playback couldn’t start. You can still read the reply in chat.");
    };
    utterance.current = speech;
    window.speechSynthesis.speak(speech);
  }
  useEffect(() => {
    setSupported("speechSynthesis" in window && "SpeechSynthesisUtterance" in window);
    return () => { utterance.current = null; if ("speechSynthesis" in window) window.speechSynthesis.cancel(); };
  }, []);
  return { enabled, supported, speaking, toggle, say, stop };
}
