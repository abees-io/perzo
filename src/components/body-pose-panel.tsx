"use client";
import { useEffect, useRef, useState } from "react";
import { MAX_POSE_VIDEO_BYTES, parseTrackedBoxes, type PoseResult } from "@/lib/pose";
import { BrandMark } from "./brand";

export function BodyPosePanel({ onBusy }: { onBusy: (busy: boolean) => void }) {
  const [video, setVideo] = useState<File | null>(null), [boxes, setBoxes] = useState<File | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [result, setResult] = useState<PoseResult | null>(null), [frame, setFrame] = useState(0), [angle, setAngle] = useState(0);
  const [download, setDownload] = useState("");
  const controller = useRef<AbortController | null>(null), locked = useRef(false);
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    if (!result) { setDownload(""); return; }
    const url = URL.createObjectURL(new Blob([JSON.stringify(result)], { type: "application/json" }));
    setDownload(url); return () => URL.revokeObjectURL(url);
  }, [result]);
  async function analyze(event: React.FormEvent) {
    event.preventDefault(); if (locked.current || !video || !boxes) return;
    setError(""); setResult(null); locked.current = true; setBusy(true); onBusy(true);
    controller.current = new AbortController();
    const timer = setTimeout(() => controller.current?.abort(), 55_000);
    try {
      if (video.type !== "video/mp4" || video.size > MAX_POSE_VIDEO_BYTES) throw new Error("Choose an MP4 video under 3 MB.");
      if (boxes.size > 150_000) throw new Error("Use a tracking file under 150 KB.");
      parseTrackedBoxes(await boxes.text());
      const body = new FormData(); body.set("video", video); body.set("boxes", boxes);
      const response = await fetch("/api/body-pose", { method: "POST", body, signal: controller.current.signal });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Pose analysis failed.");
      if (!Array.isArray(data.frames) || !data.frames.length) throw new Error("No pose frames were returned.");
      setResult(data); setFrame(0);
    } catch (failure) { setError(failure instanceof Error && failure.name === "AbortError" ? "Analysis cancelled or timed out. Try a shorter clip." : failure instanceof Error ? failure.message : "Couldn’t analyze the video."); }
    finally { clearTimeout(timer); locked.current = false; setBusy(false); onBusy(false); }
  }
  const bodies = result?.frames[frame]?.bodies || [];
  const points = bodies.flatMap((body, bodyIndex) => body.keypoints_3d.map((point, index) => ({
    x: point.x * Math.cos(angle) + point.z * Math.sin(angle), y: -point.y, bodyIndex, index,
  }))).filter(point => Number.isFinite(point.x) && Number.isFinite(point.y));
  const minX = Math.min(0, ...points.map(p => p.x)), maxX = Math.max(.01, ...points.map(p => p.x));
  const minY = Math.min(0, ...points.map(p => p.y)), maxY = Math.max(.01, ...points.map(p => p.y));
  const scale = 230 / Math.max(maxX - minX, maxY - minY);
  return <section className="pose-panel" aria-labelledby="pose-title">
    <BrandMark state={busy ? "working" : "idle"} /><h1 id="pose-title">See movement in 3D.</h1>
    <p>Analyze a short video with NVIDIA Body Pose. Get per-frame joints and pose data.</p>
    <form onSubmit={analyze}>
      <label className="pose-upload">1. Video clip<input aria-label="Body Pose video" type="file" accept="video/mp4" disabled={busy} onChange={event => { setVideo(event.target.files?.[0] || null); setResult(null); setError(""); }} /><small>H.264 MP4 · under 3 MB · up to 300 frames · constant frame rate</small></label>
      <label className="pose-upload">2. Tracking boxes<input aria-label="Body Pose tracking file" type="file" accept=".txt,text/plain" disabled={busy} onChange={event => { setBoxes(event.target.files?.[0] || null); setResult(null); setError(""); }} /><small>A matching text file from your person tracker, covering the clip’s frames.</small></label>
      <details><summary>What is a tracking file?</summary><p>NVIDIA requires body boxes; it doesn’t detect people automatically. First line: number of people (1–5). Then one row per person per frame:</p><pre>frame_id tracking_id x y width height</pre><p>Coordinates are in pixels. Frame numbers start at 0. Keep the same person’s tracking ID across frames.</p><a href="https://docs.nvidia.com/nim/maxine/body-pose/latest/basic-inference.html" target="_blank" rel="noreferrer">NVIDIA input guide ↗</a></details>
      <p className="pose-privacy">The selected video and tracking data are sent to NVIDIA when you press Analyze. They aren’t saved in Perzo.</p>
      <button className="pose-analyze" disabled={busy || !video || !boxes}>{busy ? "Analyzing movement…" : "Analyze video"}</button>
      {busy && <button className="pose-cancel" type="button" onClick={() => controller.current?.abort()}>Cancel analysis</button>}
    </form>
    {error && <p role="alert" className="project-error">{error}</p>}
    {result && <div className="pose-result"><h2>{result.frames.length} pose frames</h2>
      <svg viewBox="0 0 300 280" role="img" aria-label={`3D joint preview, frame ${result.frames[frame].frame_id}`}><path d="M20 250H280M150 20V260" stroke="#ffffff15" />{points.map(p => <circle key={`${p.bodyIndex}-${p.index}`} cx={150 + (p.x - (minX + maxX) / 2) * scale} cy={140 + (p.y - (minY + maxY) / 2) * scale} r="2.5" fill={["#f6ae7e", "#bd92df", "#8cceca", "#e79ab1", "#d4d68a"][p.bodyIndex % 5]} />)}</svg>
      {!points.length && <p>No joints were found in this frame.</p>}
      <label>Frame {result.frames[frame].frame_id}<input type="range" min="0" max={result.frames.length - 1} value={frame} onChange={event => setFrame(Number(event.target.value))} /></label>
      <label>Rotate joint view<input type="range" min="-3.14" max="3.14" step=".02" value={angle} onChange={event => setAngle(Number(event.target.value))} /></label>
      {result.warnings.map((warning, index) => <p key={index}>{warning}</p>)}
      {download && <a href={download} download="perzo-body-pose.json">Download full pose data ↓</a>}
    </div>}
  </section>;
}
