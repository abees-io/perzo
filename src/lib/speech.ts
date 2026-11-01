/**
 * Speech synthesis helper for text-to-speech voice feedback.
 * Uses native browser window.speechSynthesis.
 */

export function isSpeechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/**
 * Strips markdown and formatting to create clean, natural spoken speech.
 */
export function cleanTextForSpeech(text: string): string {
  return text
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, "")
    // Remove inline code
    .replace(/`([^`]+)`/g, "$1")
    // Remove markdown links [text](url) -> text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    // Remove markdown headers
    .replace(/^#{1,6}\s+/gm, "")
    // Remove bold/italics
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/(\*|_)(.*?)\1/g, "$2")
    // Remove bullet points / lists
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    // Collapse extra whitespaces
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Speaks text using the browser's speech synthesis engine.
 * Automatically chooses Malayalam voice if Malayalam characters are present,
 * otherwise defaults to English / browser language.
 */
export function speakText({
  text,
  onStart,
  onEnd,
  onError,
}: {
  text: string;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: unknown) => void;
}): () => void {
  if (!isSpeechSupported()) {
    onError?.(new Error("Speech synthesis not supported in this browser"));
    return () => {};
  }

  // Cancel any ongoing speech first
  window.speechSynthesis.cancel();

  const spoken = cleanTextForSpeech(text);
  if (!spoken) {
    onEnd?.();
    return () => {};
  }

  const utterance = new SpeechSynthesisUtterance(spoken);

  // Check for Malayalam script range \u0D00 - \u0D7F
  const hasMalayalam = /[\u0D00-\u0D7F]/.test(text);

  const voices = window.speechSynthesis.getVoices();
  if (hasMalayalam) {
    utterance.lang = "ml-IN";
    const mlVoice = voices.find((v) => v.lang.startsWith("ml"));
    if (mlVoice) utterance.voice = mlVoice;
  } else {
    utterance.lang = navigator.language || "en-US";
    // Prefer friendly natural English voice if available
    const naturalVoice = voices.find(
      (v) => (v.name.includes("Natural") || v.name.includes("Google") || v.name.includes("Neural")) && v.lang.startsWith("en"),
    );
    if (naturalVoice) utterance.voice = naturalVoice;
  }

  utterance.rate = 1.0;
  utterance.pitch = 1.0;

  utterance.onstart = () => {
    onStart?.();
  };

  utterance.onend = () => {
    onEnd?.();
  };

  utterance.onerror = (e) => {
    // Ignore canceled/interrupted events
    if (e.error === "canceled" || e.error === "interrupted") {
      onEnd?.();
      return;
    }
    onError?.(e);
    onEnd?.();
  };

  window.speechSynthesis.speak(utterance);

  return () => {
    window.speechSynthesis.cancel();
  };
}

export function stopSpeaking(): void {
  if (isSpeechSupported()) {
    window.speechSynthesis.cancel();
  }
}

