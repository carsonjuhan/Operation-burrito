"use client";

import { useRef, useState, useCallback } from "react";
import { Camera, X, ZoomIn } from "lucide-react";
import { resizePhoto, getPhotoSize, formatPhotoSize } from "@/lib/photoUtils";

interface PhotoAttachmentProps {
  photos: string[];
  onChange: (photos: string[]) => void;
  maxPhotos?: number;
}

/**
 * Reusable photo attachment widget.
 *
 * Displays thumbnails in a horizontal row with add/delete/view-full controls.
 * Photos are resized and compressed before being passed back via `onChange`.
 */
export function PhotoAttachment({
  photos,
  onChange,
  maxPhotos = 5,
}: PhotoAttachmentProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [viewIndex, setViewIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      setLoading(true);
      try {
        const remaining = maxPhotos - photos.length;
        const toProcess = Array.from(files).slice(0, remaining);

        const newPhotos: string[] = [];
        for (const file of toProcess) {
          try {
            const dataUrl = await resizePhoto(file);
            newPhotos.push(dataUrl);
          } catch {
            // Skip files that fail to process
          }
        }

        if (newPhotos.length > 0) {
          onChange([...photos, ...newPhotos]);
        }
      } finally {
        setLoading(false);
        // Reset the input so the same file can be selected again
        if (inputRef.current) inputRef.current.value = "";
      }
    },
    [photos, onChange, maxPhotos]
  );

  const handleDelete = useCallback(
    (index: number) => {
      onChange(photos.filter((_, i) => i !== index));
    },
    [photos, onChange]
  );

  const totalSize = photos.reduce((sum, p) => sum + getPhotoSize(p), 0);

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <label className="label mb-0">Photos</label>
        {photos.length > 0 && (
          <span className="text-xs text-stone-400">
            {photos.length}/{maxPhotos} ({formatPhotoSize(totalSize)})
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        {/* Thumbnails */}
        {photos.map((photo, idx) => (
          <div
            key={idx}
            className="relative group w-16 h-16 rounded-lg overflow-hidden border border-stone-200 dark:border-stone-600 shrink-0"
          >
            <img
              src={photo}
              alt={`Photo ${idx + 1}`}
              className="w-full h-full object-cover"
            />
            {/* Overlay actions */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
              <button
                type="button"
                onClick={() => setViewIndex(idx)}
                className="p-1 rounded-full bg-white/80 text-stone-700 hover:bg-white transition-colors"
                aria-label={`View photo ${idx + 1}`}
              >
                <ZoomIn size={12} />
              </button>
              <button
                type="button"
                onClick={() => handleDelete(idx)}
                className="p-1 rounded-full bg-white/80 text-red-600 hover:bg-white transition-colors"
                aria-label={`Remove photo ${idx + 1}`}
              >
                <X size={12} />
              </button>
            </div>
          </div>
        ))}

        {/* Add button */}
        {photos.length < maxPhotos && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={loading}
            className="w-16 h-16 rounded-lg border-2 border-dashed border-stone-300 dark:border-stone-600 flex flex-col items-center justify-center text-stone-400 hover:border-sage-400 hover:text-sage-600 dark:hover:border-sage-500 dark:hover:text-sage-400 transition-colors disabled:opacity-50"
            aria-label="Attach photo"
          >
            <Camera size={16} />
            <span className="text-[10px] mt-0.5">
              {loading ? "..." : "Add"}
            </span>
          </button>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileChange}
          aria-label="Select photo files"
        />
      </div>

      {/* Full-size modal */}
      {viewIndex !== null && photos[viewIndex] && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setViewIndex(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Photo preview"
        >
          <div
            className="relative max-w-3xl max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={photos[viewIndex]}
              alt={`Photo ${viewIndex + 1} full size`}
              className="max-w-full max-h-[85vh] rounded-lg shadow-2xl object-contain"
            />
            <button
              type="button"
              onClick={() => setViewIndex(null)}
              className="absolute -top-3 -right-3 p-2 rounded-full bg-white dark:bg-stone-800 shadow-lg text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors"
              aria-label="Close photo preview"
            >
              <X size={16} />
            </button>
            {/* Size info */}
            <div className="absolute bottom-2 left-2 text-xs text-white/70 bg-black/40 rounded px-2 py-1">
              {formatPhotoSize(getPhotoSize(photos[viewIndex]))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Inline thumbnail strip for list views (read-only, no editing).
 * Shows small thumbnails with click-to-expand.
 */
export function PhotoThumbnails({ photos }: { photos?: string[] }) {
  const [viewIndex, setViewIndex] = useState<number | null>(null);

  if (!photos || photos.length === 0) return null;

  return (
    <>
      <div className="flex gap-1 mt-1">
        {photos.slice(0, 3).map((photo, idx) => (
          <button
            key={idx}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setViewIndex(idx);
            }}
            className="w-8 h-8 rounded overflow-hidden border border-stone-200 dark:border-stone-600 shrink-0 hover:ring-2 hover:ring-sage-300 transition-shadow"
            aria-label={`View photo ${idx + 1}`}
          >
            <img
              src={photo}
              alt=""
              className="w-full h-full object-cover"
            />
          </button>
        ))}
        {photos.length > 3 && (
          <span className="w-8 h-8 rounded bg-stone-100 dark:bg-stone-700 flex items-center justify-center text-[10px] text-stone-500 dark:text-stone-400 font-medium">
            +{photos.length - 3}
          </span>
        )}
      </div>

      {/* Full-size modal */}
      {viewIndex !== null && photos[viewIndex] && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setViewIndex(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Photo preview"
        >
          <div
            className="relative max-w-3xl max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={photos[viewIndex]}
              alt={`Photo ${viewIndex + 1} full size`}
              className="max-w-full max-h-[85vh] rounded-lg shadow-2xl object-contain"
            />
            <button
              type="button"
              onClick={() => setViewIndex(null)}
              className="absolute -top-3 -right-3 p-2 rounded-full bg-white dark:bg-stone-800 shadow-lg text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors"
              aria-label="Close photo preview"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
