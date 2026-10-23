export interface ModelOption {
  id: string;
  name: string;
  tag: string;
  icon: string;
  description: string;
  kind: "chat" | "pose";
  vision: boolean;
}
export const DEFAULT_MODEL_ID = "meta/llama-3.2-11b-vision-instruct";
export const BODY_POSE_ID = "nvidia/body-pose";
export const AVAILABLE_MODELS: ModelOption[] = [
  { id: DEFAULT_MODEL_ID, name: "Llama 3.2 11B", tag: "Chat + photos", icon: "◈", kind: "chat", vision: true, description: "Everyday conversations and image questions." },
  { id: "nvidia/nemotron-3.5-super-vl-120b-a12b", name: "Nemotron Super 120B", tag: "Chat + photos", icon: "◈", kind: "chat", vision: true, description: "NVIDIA reasoning and visual understanding." },
  { id: "nvidia/nemotron-3.5-lightning-30b-a3b", name: "Nemotron Lightning 30B", tag: "Text chat", icon: "ϟ", kind: "chat", vision: false, description: "NVIDIA conversational and reasoning model." },
  { id: "meta/llama-3.2-90b-vision-instruct", name: "Llama 3.2 90B", tag: "Chat + photos", icon: "◈", kind: "chat", vision: true, description: "Larger Meta model for text and images." },
  { id: "deepseek-ai/deepseek-v4.1-flash", name: "DeepSeek Flash", tag: "Text chat", icon: "ϟ", kind: "chat", vision: false, description: "Reasoning, coding and text questions." },
  { id: BODY_POSE_ID, name: "NVIDIA 3D Body Pose", tag: "Video tool", icon: "◇", kind: "pose", vision: false, description: "Analyze a short video with tracked body boxes; preview joints and download pose data." },
];
export function getModel(id: unknown) { return AVAILABLE_MODELS.find(model => model.id === id); }
export function sanitizeModelId(model: unknown): string | undefined { return typeof model === "string" ? getModel(model.trim())?.id : undefined; }
