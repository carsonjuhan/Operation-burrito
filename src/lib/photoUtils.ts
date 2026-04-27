/**
 * Photo attachment utilities for resizing, measuring, and formatting image data.
 *
 * Photos are stored as base64 data URLs in localStorage via the app store.
 * Images are resized to a max width and compressed as JPEG to limit storage usage.
 */

/** Default maximum width in pixels for resized photos. */
export const DEFAULT_MAX_WIDTH = 800;

/** JPEG compression quality (0-1). */
export const JPEG_QUALITY = 0.7;

/**
 * Resize an image file to fit within `maxWidth` pixels wide, returning a
 * base64 data URL (JPEG at 0.7 quality).
 *
 * If the image is already narrower than `maxWidth`, it is re-encoded at the
 * target quality without upscaling.
 */
export function resizePhoto(
  file: File,
  maxWidth: number = DEFAULT_MAX_WIDTH
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new Error("Failed to read file"));

    reader.onload = () => {
      const img = new Image();

      img.onerror = () => reject(new Error("Failed to load image"));

      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Failed to get canvas context"));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
        resolve(dataUrl);
      };

      img.src = reader.result as string;
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Calculate the approximate byte size of a base64 data URL string.
 *
 * A base64 string encodes 3 bytes in 4 characters. The data URL prefix
 * (e.g. "data:image/jpeg;base64,") is stripped before calculation.
 */
export function getPhotoSize(dataUrl: string): number {
  // Strip the data URL prefix to get raw base64
  const base64 = dataUrl.split(",")[1] ?? dataUrl;
  // Each base64 char represents 6 bits; 4 chars = 3 bytes
  // Subtract padding characters
  const padding = (base64.match(/=+$/) || [""])[0].length;
  return Math.floor((base64.length * 3) / 4) - padding;
}

/**
 * Format a byte count to a human-readable string (e.g. "1.2 MB").
 */
export function formatPhotoSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
}
