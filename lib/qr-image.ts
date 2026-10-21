"use client";

import jsQR from "jsqr";

// Reads a QR code from a picture: a photo taken with the phone, or a screenshot.
// Tries the picture at a few sizes (a small QR in a big photo is hard to read at
// one size) and returns the text of the QR, or null if none was found.

const MAX_SIDES = [1200, 2000, 700];

async function loadImage(file: File): Promise<{ source: CanvasImageSource; width: number; height: number; close: () => void }> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      return { source: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close() };
    } catch {
      // fall back to an <img>
    }
  }
  const url = URL.createObjectURL(file);
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("image"));
    img.src = url;
  });
  return { source: img, width: img.naturalWidth, height: img.naturalHeight, close: () => URL.revokeObjectURL(url) };
}

export async function decodeQrFromFile(file: File): Promise<string | null> {
  let image;
  try {
    image = await loadImage(file);
  } catch {
    return null;
  }
  try {
    for (const maxSide of MAX_SIDES) {
      const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
      const w = Math.max(1, Math.round(image.width * scale));
      const h = Math.max(1, Math.round(image.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return null;
      ctx.drawImage(image.source, 0, 0, w, h);
      const found = jsQR(ctx.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: "attemptBoth" });
      if (found?.data) return found.data;
    }
    return null;
  } finally {
    image.close();
  }
}
