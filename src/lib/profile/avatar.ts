/**
 * Avatar preparation, in the browser: any photo in, a small square WebP out.
 * Done client-side so a 6 MB phone photo never leaves the device at full
 * size, and so the Storage bucket only ever holds tiny, uniform files.
 */

export const AVATAR_SIZE = 256;
/** Raw photos above this are refused before decoding. */
export const MAX_SOURCE_BYTES = 15 * 1024 * 1024;
/** The bucket's own limit; a 256px WebP is far below it. */
export const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

/** Centre-crop the largest square, as the source rectangle for drawImage. */
export function centreSquare(width: number, height: number): { sx: number; sy: number; side: number } {
  const side = Math.min(width, height);
  return { sx: Math.floor((width - side) / 2), sy: Math.floor((height - side) / 2), side };
}

export async function prepareAvatar(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/")) throw new Error("Choose an image file.");
  if (file.size > MAX_SOURCE_BYTES) throw new Error("That image is over 15 MB.");

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("That image couldn't be read. Try a JPG or PNG.");
  }

  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = AVATAR_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Your browser can't resize images.");
  const { sx, sy, side } = centreSquare(bitmap.width, bitmap.height);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, AVATAR_SIZE, AVATAR_SIZE);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.85));
  // Safari before 17 can't encode WebP and hands back PNG; the bucket allows both.
  if (!blob) throw new Error("Couldn't prepare that image.");
  if (blob.size > MAX_AVATAR_BYTES) throw new Error("That image is still too large after resizing.");
  return blob;
}

/** File extension for what the browser actually produced. */
export function avatarExtension(blob: Blob): "webp" | "png" {
  return blob.type === "image/webp" ? "webp" : "png";
}
