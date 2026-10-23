import { compressCanvas } from "./photo";

export function captureScreenFrame(element: HTMLVideoElement | null, stream: MediaStream | null): string {
  const track = stream?.getVideoTracks()[0];
  if (!track || track.readyState !== "live") throw new Error("Screen sharing has ended. Choose a screen again.");
  if (track.muted) throw new Error("The shared screen is temporarily unavailable. Restore its window and try again.");
  if (!element || element.readyState < 2 || !element.videoWidth || !element.videoHeight) throw new Error("The screen preview isn’t ready yet. Wait a moment and send again.");
  const canvas = document.createElement("canvas"), scale = Math.min(1, 1280 / Math.max(element.videoWidth, element.videoHeight));
  canvas.width = Math.max(1, Math.round(element.videoWidth * scale)); canvas.height = Math.max(1, Math.round(element.videoHeight * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Your browser couldn’t capture this screen.");
  context.drawImage(element, 0, 0, canvas.width, canvas.height);
  return compressCanvas(canvas);
}
