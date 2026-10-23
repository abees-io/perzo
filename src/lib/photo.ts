import { MAX_IMAGE_URL_LENGTH } from "./chat";

export async function preparePhoto(file: File): Promise<string> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error("Choose a JPEG, PNG or WebP photo. Videos aren’t supported yet.");
  if (file.size > 10_000_000) throw new Error("Choose a photo smaller than 10 MB.");
  const bitmap = await createImageBitmap(file);
  try {
    const canvas = document.createElement("canvas");
    const scale = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height));
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Your browser couldn’t prepare this photo.");
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    for (const quality of [.8, .65, .5, .35, .2]) {
      const image = canvas.toDataURL("image/jpeg", quality);
      if (image.length <= MAX_IMAGE_URL_LENGTH) return image;
    }
    throw new Error("This photo is too detailed. Try a smaller crop.");
  } finally { bitmap.close(); }
}
