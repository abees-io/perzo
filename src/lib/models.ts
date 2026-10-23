export interface ModelOption {
  id: string;
  name: string;
  tag: string;
  icon: string;
  description: string;
}

export const DEFAULT_MODEL_ID = "meta/llama-3.2-11b-vision-instruct";

export const AVAILABLE_MODELS: ModelOption[] = [
  {
    id: "meta/llama-3.2-11b-vision-instruct",
    name: "Llama 3.2 11B",
    tag: "Fast & Vision",
    icon: "⚡",
    description: "Snappy, lightweight multimodal model by Meta. Best for fast daily chat.",
  },
  {
    id: "nvidia/nemotron-3.5-super-vl-120b-a12b",
    name: "Nemotron 120B Super",
    tag: "Deep Reasoning",
    icon: "🧠",
    description: "NVIDIA's 120B flagship reasoning model. Excels at complex thinking and analysis.",
  },
  {
    id: "nvidia/nemotron-3.5-lightning-30b-a3b",
    name: "Nemotron Lightning 30B",
    tag: "Ultra Fast",
    icon: "⚡",
    description: "NVIDIA's high-throughput model built for ultra-fast conversational latency.",
  },
  {
    id: "meta/llama-3.2-90b-vision-instruct",
    name: "Llama 3.2 90B",
    tag: "High Intelligence",
    icon: "🌟",
    description: "Meta's flagship multimodal model with deep nuance and visual comprehension.",
  },
  {
    id: "nv-mistralai/mistral-nemo-12b-instruct",
    name: "Mistral NeMo 12B",
    tag: "Sharp & Precise",
    icon: "🌪️",
    description: "Trained in collaboration with Mistral AI. Crisp, direct answers and great code.",
  },
  {
    id: "deepseek-ai/deepseek-v4.1-flash",
    name: "DeepSeek Flash",
    tag: "Logic & Code",
    icon: "🚀",
    description: "High-speed reasoning model by DeepSeek for logic and coding tasks.",
  },
];

export function sanitizeModelId(model?: unknown): string | undefined {
  if (typeof model !== "string") return undefined;
  const trimmed = model.trim();
  if (/^[a-zA-Z0-9_\-\.\/]{1,120}$/.test(trimmed)) {
    return trimmed;
  }
  return undefined;
}
