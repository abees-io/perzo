export interface ModelOption {
  id: string;
  name: string;
  tag: string;
  icon: string;
  description: string;
  vision: boolean;
}
export const DEFAULT_MODEL_ID = "meta/llama-3.2-11b-vision-instruct";
export const AVAILABLE_MODELS: ModelOption[] = [
  {
    id: DEFAULT_MODEL_ID,
    name: "Llama 3.2 11B",
    tag: "Chat + photos",
    icon: "◈",
    vision: true,
    description: "Everyday conversations and image questions.",
  },
  {
    id: "meta/llama-3.2-90b-vision-instruct",
    name: "Llama 3.2 90B",
    tag: "Chat + photos",
    icon: "◈",
    vision: true,
    description: "Larger Meta model for text and images.",
  },
  {
    id: "deepseek-ai/deepseek-v4.1-flash",
    name: "DeepSeek Flash",
    tag: "Text chat",
    icon: "ϟ",
    vision: false,
    description: "Reasoning, coding and text questions.",
  },
];
export function getModel(id: unknown) {
  return AVAILABLE_MODELS.find((model) => model.id === id);
}
export function sanitizeModelId(model: unknown): string | undefined {
  return typeof model === "string" ? getModel(model.trim())?.id : undefined;
}
