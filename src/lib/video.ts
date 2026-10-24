export const MAX_VIDEO_PREVIEW_BYTES = 100_000_000;
export const VSR_RESOLUTIONS = [
  { label: "720p HD", width: 1280, height: 720 },
  { label: "1080p Full HD", width: 1920, height: 1080 },
  { label: "1440p QHD", width: 2560, height: 1440 },
  { label: "4K UHD", width: 3840, height: 2160 },
] as const;

export function validateVideoPreview(file: Pick<File, "name" | "size" | "type">): string | null {
  if (
    !/\.(mp4|webm|mov)$/i.test(file.name) ||
    (file.type && !["video/mp4", "video/webm", "video/quicktime"].includes(file.type))
  )
    return "Choose an MP4, WebM or MOV video.";
  if (!file.size) return "That video file is empty.";
  if (file.size > MAX_VIDEO_PREVIEW_BYTES)
    return "Choose a video under 100 MB for the local preview.";
  return null;
}
