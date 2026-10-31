export interface ModelOption {
  id: string;
  name: string;
  tag: string;
  icon: string;
  description: string;
  vision: boolean;
  provider: "nvidia" | "gemini" | "groq";
}
export const DEFAULT_MODEL_ID = "meta/llama-3.2-11b-vision-instruct";
export const GEMINI_MODEL_ID = "gemini-3.8-flash";
export const GROQ_MODEL_ID = "qwen/qwen3.8-27b";
export const AVAILABLE_MODELS: ModelOption[] = [
  {
    id: GROQ_MODEL_ID,
    name: "Qwen 3.8 27B",
    tag: "Ultra-fast chat",
    icon: "⚡",
    provider: "groq",
    vision: false,
    description: "Extremely fast multilingual reasoning on Groq LPU hardware.",
  },
  {
    id: "openai/gpt-oss-120b",
    name: "GPT-OSS 120B",
    tag: "Reasoning",
    icon: "⚡",
    provider: "groq",
    vision: false,
    description: "High-capacity 120B model on Groq for deep reasoning and code.",
  },
  {
    id: GEMINI_MODEL_ID,
    name: "Gemini 3.8 Flash",
    tag: "Chat + photos",
    icon: "✧",
    vision: true,
    provider: "gemini",
    description:
      "Google Gemini for conversations, coding and image questions. Free-tier limits apply.",
  },
  {
    id: DEFAULT_MODEL_ID,
    name: "Llama 3.2 11B",
    tag: "Chat + photos",
    icon: "◈",
    provider: "nvidia",
    vision: true,
    description: "Everyday conversations and image questions.",
  },
  {
    id: "meta/llama-3.2-90b-vision-instruct",
    name: "Llama 3.2 90B",
    tag: "Chat + photos",
    icon: "◈",
    provider: "nvidia",
    vision: true,
    description: "Larger Meta model for text and images.",
  },
  {
    id: "deepseek-ai/deepseek-v4.1-flash",
    name: "DeepSeek Flash",
    tag: "Text chat",
    icon: "ϟ",
    provider: "nvidia",
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
