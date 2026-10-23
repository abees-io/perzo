export const MAX_POSE_VIDEO_BYTES = 3_000_000;
export const MAX_POSE_REQUEST_BYTES = 3_300_000;
export const MAX_POSE_FRAMES = 300;
export type PoseBox = { x: number; y: number; width: number; height: number; tracking_id: number };
export type FrameBoxes = { frame_id: number; boxes: PoseBox[] };
export type PosePoint = { x: number; y: number; z: number };
export type PoseBody = { bbox?: PoseBox; keypoints_3d: PosePoint[]; keypoints_2d?: { x: number; y: number }[]; keypoint_confidence?: number[] };
export type PoseFrame = { frame_id: number; bodies: PoseBody[] };
export type PoseResult = { frames: PoseFrame[]; warnings: string[] };

export function parseTrackedBoxes(text: string): FrameBoxes[] {
  if (text.length > 150_000) throw new Error("The tracking file is too large. Use a shorter clip.");
  const lines = text.trim().split(/\r?\n/).filter(line => line.trim());
  if (!/^[1-5]$/.test(lines[0]?.trim() || "")) throw new Error("The first tracking-file line must be the number of people (1–5).");
  const count = Number(lines[0]);
  const frames = new Map<number, PoseBox[]>();
  for (const line of lines.slice(1)) {
    const parts = line.trim().split(/\s+/).map(Number);
    if (parts.length !== 6 || !parts.every(Number.isFinite)) throw new Error("Each tracking row must contain: frame_id tracking_id x y width height.");
    const [frame_id, tracking_id, x, y, width, height] = parts;
    if (!Number.isInteger(frame_id) || frame_id < 0 || frame_id >= MAX_POSE_FRAMES || !Number.isInteger(tracking_id) || tracking_id < 0 || tracking_id > 4294967295) throw new Error("Use frame indices 0–299 and non-negative integer tracking IDs.");
    if ([x, y, width, height].every(value => value === -1)) continue;
    if (width <= 0 || height <= 0) throw new Error("Tracking boxes must have positive width and height.");
    const boxes = frames.get(frame_id) || [];
    if (boxes.length >= count || boxes.some(box => box.tracking_id === tracking_id)) throw new Error("Each person needs one unique tracking ID per frame, within the declared person count.");
    boxes.push({ x, y, width, height, tracking_id }); frames.set(frame_id, boxes);
  }
  if (!frames.size) throw new Error("The tracking file must include at least one body box.");
  return [...frames].sort(([a], [b]) => a - b).map(([frame_id, boxes]) => ({ frame_id, boxes }));
}
