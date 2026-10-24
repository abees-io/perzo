export interface ModelOption {
  id: string;
  name: string;
  tag: string;
  icon: string;
  description: string;
  vision: boolean;
  mode: "chat" | "video";
}
export const DEFAULT_MODEL_ID = "meta/llama-3.2-11b-vision-instruct";
export const VSR_MODEL_ID = "nvidia/vsr";
export const AVAILABLE_MODELS: ModelOption[] = [
  {
    id: DEFAULT_MODEL_ID,
    name: "Llama 3.2 11B",
    tag: "Chat + photos",
    icon: "◈",
    vision: true,
    mode: "chat",
    description: "Everyday conversations and image questions.",
  },
  {
    id: "meta/llama-3.2-90b-vision-instruct",
    name: "Llama 3.2 90B",
    tag: "Chat + photos",
    icon: "◈",
    vision: true,
    mode: "chat",
    description: "Larger Meta model for text and images.",
  },
  {
    id: "deepseek-ai/deepseek-v4.1-flash",
    name: "DeepSeek Flash",
    tag: "Text chat",
    icon: "ϟ",
    vision: false,
    mode: "chat",
    description: "Reasoning, coding and text questions.",
  },
  {
    id: VSR_MODEL_ID,
    name: "Video Super Resolution",
    tag: "Setup required",
    icon: "◇",
    vision: false,
    mode: "video",
    description:
      "NVIDIA video upscaling. Preview a clip and choose output settings; a GPU-hosted VSR server is required to process it.",
  },
];
export function getModel(id: unknown) {
  return AVAILABLE_MODELS.find((model) => model.id === id);
}
export function sanitizeModelId(model: unknown): string | undefined {
  return typeof model === "string" ? getModel(model.trim())?.id : undefined;
}
