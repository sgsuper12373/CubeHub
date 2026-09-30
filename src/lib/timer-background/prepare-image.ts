/**
 * Turn a user-picked file into what we store: a downscaled, re-encoded image
 * (a phone photo can be 10+ MB; a timer background never needs more than
 * ~1920px) plus its luminance range for the scrim check. Client-only.
 */
import { luminancePercentiles } from "./scrim";
import type { StoredBackground } from "./storage";

export const MAX_INPUT_BYTES = 25 * 1024 * 1024;
const MAX_EDGE = 1920;
const SAMPLE_EDGE = 64;

export class BackgroundImageError extends Error {}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

export async function prepareImage(file: File): Promise<StoredBackground> {
  if (!file.type.startsWith("image/")) {
    throw new BackgroundImageError("That file isn't an image.");
  }
  if (file.size > MAX_INPUT_BYTES) {
    throw new BackgroundImageError("That image is over 25 MB. Try a smaller one.");
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new BackgroundImageError("Couldn't read that image. Try a JPEG, PNG or WebP.");
  }

  try {
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, width, height);
    // WebP keeps transparency and is small; fall back to JPEG where the
    // browser can't encode WebP.
    const blob =
      (await toBlob(canvas, "image/webp", 0.85)) ??
      (await toBlob(canvas, "image/jpeg", 0.85));
    if (!blob) throw new BackgroundImageError("Couldn't process that image.");

    const sample = document.createElement("canvas");
    sample.width = sample.height = SAMPLE_EDGE;
    const ctx = sample.getContext("2d", { willReadFrequently: true })!;
    ctx.drawImage(bitmap, 0, 0, SAMPLE_EDGE, SAMPLE_EDGE);
    const range = luminancePercentiles(ctx.getImageData(0, 0, SAMPLE_EDGE, SAMPLE_EDGE).data);

    return { blob, range, width, height, savedAt: Date.now() };
  } finally {
    bitmap.close();
  }
}
