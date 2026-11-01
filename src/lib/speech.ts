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
 * Picks the most expressive, confident voice available on the device.
 * Prioritizes modern Natural / Neural voices for a charismatic, human tone.
 */
function pickConfidentVoice(
  voices: SpeechSynthesisVoice[],
  isMalayalam: boolean,
): SpeechSynthesisVoice | undefined {
  if (isMalayalam) {
    return (
      voices.find((v) => v.lang.startsWith("ml")) ||
      voices.find((v) => v.name.toLowerCase().includes("malayalam"))
    );
  }

  // Priority ranking for confident, clear voices:
  const preferredNames = [
    "Ryan Online (Natural)",
    "Guy Online (Natural)",
    "Christopher Online (Natural)",
    "Andrew Online (Natural)",
    "Google US English",
    "Daniel (Enhanced)",
    "Samantha (Enhanced)",
    "Alex",
  ];

  for (const name of preferredNames) {
    const match = voices.find((v) => v.name.includes(name));
    if (match) return match;
  }

  // Fallback to any Natural / Neural English voice
  const anyNatural = voices.find(
    (v) =>
      (v.name.includes("Natural") || v.name.includes("Neural") || v.name.includes("Google")) &&
      v.lang.startsWith("en"),
  );
  if (anyNatural) return anyNatural;

  // Standard English voice
  return (
    voices.find((v) => v.lang.startsWith("en") && v.default) ||
    voices.find((v) => v.lang.startsWith("en"))
  );
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
  const selectedVoice = pickConfidentVoice(voices, hasMalayalam);

  if (selectedVoice) {
    utterance.voice = selectedVoice;
    utterance.lang = selectedVoice.lang;
  } else {
    utterance.lang = hasMalayalam ? "ml-IN" : navigator.language || "en-US";
  }

  // Confident tone profile:
  // - Grounded pitch (0.95) creates a calm, deeper resonance instead of robotic treble
  // - Brisk cadence (1.06) delivers a snappy, articulate pace
  utterance.pitch = hasMalayalam ? 1.0 : 0.95;
  utterance.rate = hasMalayalam ? 1.0 : 1.06;

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

