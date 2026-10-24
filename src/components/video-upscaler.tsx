"use client";
import { useEffect, useRef, useState } from "react";
import { VSR_RESOLUTIONS } from "@/lib/video";
import { Icon } from "./icon";

export function VideoUpscaler({
  file,
  onUpload,
  onRemove,
}: {
  file: File | null;
  onUpload: () => void;
  onRemove: () => void;
}) {
  const [preview, setPreview] = useState(""),
    [previewError, setPreviewError] = useState(false);
  const [resolution, setResolution] = useState("1920"),
    [quality, setQuality] = useState("VIDEO_QUALITY_HIGH");
  const [dimensions, setDimensions] = useState<string | null>(null);
  const guide = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    setPreviewError(false);
    setDimensions(null);
    if (!file) {
      setPreview("");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  return (
    <section className="video-tool" aria-labelledby="video-tool-title">
      <div className="video-tool-kicker">
        <Icon name="video" size={18} />
        NVIDIA NIM<span>Setup required</span>
      </div>
      <h1 id="video-tool-title">
        Give your video
        <br />a clearer picture.
      </h1>
      <p className="video-tool-description">
        Prepare a clip for Video Super Resolution. Choose your output, then connect a GPU service to
        bring it to life.
      </p>
      {!file ? (
        <button type="button" className="video-dropzone" onClick={onUpload}>
          <Icon name="plus" size={28} />
          <strong>Add a video</strong>
          <span>MP4, MOV or WebM · up to 100 MB</span>
          <small>Local preview only</small>
        </button>
      ) : (
        <div className="video-file-card">
          {preview && (
            <video
              key={preview}
              src={preview}
              controls
              playsInline
              preload="metadata"
              onError={() => setPreviewError(true)}
              onLoadedMetadata={(event) => {
                const video = event.currentTarget;
                setDimensions(`${video.videoWidth} × ${video.videoHeight}`);
              }}
              aria-label="Original video preview"
            />
          )}
          <div className="video-file-detail">
            <div>
              <strong>{file.name}</strong>
              <span>
                {(file.size / 1_000_000).toFixed(1)} MB{dimensions ? ` · ${dimensions}` : ""}
              </span>
            </div>
            <button
              type="button"
              className="icon-button"
              onClick={onRemove}
              aria-label="Remove video"
            >
              <Icon name="close" size={18} />
            </button>
          </div>
          {previewError && (
            <p role="status">This browser can’t preview this codec. Try an H.264 MP4.</p>
          )}
        </div>
      )}
      <div className="video-settings">
        <label>
          Output resolution
          <select value={resolution} onChange={(event) => setResolution(event.target.value)}>
            {VSR_RESOLUTIONS.map((option) => (
              <option key={option.width} value={option.width}>
                {option.label} · {option.width} × {option.height}
              </option>
            ))}
          </select>
        </label>
        <label>
          Quality preset
          <select value={quality} onChange={(event) => setQuality(event.target.value)}>
            <option value="VIDEO_QUALITY_HIGH">High quality</option>
            <option value="VIDEO_QUALITY_MEDIUM">Balanced</option>
            <option value="VIDEO_QUALITY_LOW_LATENCY">Low latency</option>
          </select>
        </label>
      </div>
      <div className="video-setup-notice">
        <strong>GPU service not connected</strong>
        <p>
          Your video stays on this device. No upload or enhancement runs yet. Your NVIDIA chat key
          alone doesn’t enable VSR.
        </p>
        <button type="button" onClick={() => guide.current?.showModal()}>
          View setup steps <Icon name="arrow" size={16} />
        </button>
      </div>
      <button type="button" className="video-upscale-button" disabled>
        Connect VSR to enable upscaling
      </button>
      <dialog
        ref={guide}
        className="model-dialog video-guide"
        aria-labelledby="vsr-guide-title"
        onClick={(event) => {
          if (event.target === event.currentTarget) guide.current?.close();
        }}
      >
        <div className="model-dialog-heading">
          <h2 id="vsr-guide-title">Connect NVIDIA VSR</h2>
          <button
            type="button"
            className="icon-button"
            aria-label="Close VSR setup"
            onClick={() => guide.current?.close()}
          >
            <Icon name="close" />
          </button>
        </div>
        <ol>
          <li>Provision a compatible NVIDIA GPU server with Docker and NGC access.</li>
          <li>Deploy NVIDIA’s compressed-video VSR NIM container and verify that it is ready.</li>
          <li>Test a video using NVIDIA’s reference gRPC client.</li>
          <li>
            Build an authenticated upload/job gateway, connect it to Perzo, then add output preview
            and download.
          </li>
        </ol>
        <p>
          This release includes the UI and local preview. The VSR inference client and gateway are
          not connected. Vercel continues to host Perzo’s chat backend.
        </p>
        <a
          href="https://docs.nvidia.com/nim/maxine/vsr/latest/streaming/getting-started.html"
          target="_blank"
          rel="noreferrer"
        >
          NVIDIA deployment guide ↗
        </a>
        <a
          href="https://docs.nvidia.com/nim/maxine/vsr/latest/streaming/running-inference.html"
          target="_blank"
          rel="noreferrer"
        >
          Reference client and API ↗
        </a>
      </dialog>
    </section>
  );
}
