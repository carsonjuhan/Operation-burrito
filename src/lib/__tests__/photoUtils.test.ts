import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { getPhotoSize, formatPhotoSize, resizePhoto, DEFAULT_MAX_WIDTH, JPEG_QUALITY } from "../photoUtils";

// ── getPhotoSize ─────────────────────────────────────────────────────────────

describe("getPhotoSize", () => {
  it("calculates size of a simple base64 data URL", () => {
    // "Hello" in base64 = "SGVsbG8=" (8 chars, 1 padding char)
    // Decoded bytes: 5 bytes
    const dataUrl = "data:image/jpeg;base64,SGVsbG8=";
    expect(getPhotoSize(dataUrl)).toBe(5);
  });

  it("calculates size with no padding", () => {
    // "abc" in base64 = "YWJj" (4 chars, 0 padding)
    // Decoded bytes: 3 bytes
    const dataUrl = "data:image/jpeg;base64,YWJj";
    expect(getPhotoSize(dataUrl)).toBe(3);
  });

  it("calculates size with double padding", () => {
    // "a" in base64 = "YQ==" (4 chars, 2 padding chars)
    // Decoded bytes: 1 byte
    const dataUrl = "data:image/jpeg;base64,YQ==";
    expect(getPhotoSize(dataUrl)).toBe(1);
  });

  it("handles raw base64 string without data URL prefix", () => {
    // Just base64 with no comma prefix
    expect(getPhotoSize("SGVsbG8=")).toBe(5);
  });

  it("returns 0 for empty base64", () => {
    expect(getPhotoSize("data:image/jpeg;base64,")).toBe(0);
  });
});

// ── formatPhotoSize ──────────────────────────────────────────────────────────

describe("formatPhotoSize", () => {
  it("formats 0 bytes", () => {
    expect(formatPhotoSize(0)).toBe("0 B");
  });

  it("formats bytes under 1 KB", () => {
    expect(formatPhotoSize(500)).toBe("500 B");
  });

  it("formats kilobytes", () => {
    expect(formatPhotoSize(1024)).toBe("1.0 KB");
    expect(formatPhotoSize(2560)).toBe("2.5 KB");
  });

  it("formats megabytes", () => {
    expect(formatPhotoSize(1024 * 1024)).toBe("1.0 MB");
    expect(formatPhotoSize(1.5 * 1024 * 1024)).toBe("1.5 MB");
  });

  it("formats large values in MB", () => {
    expect(formatPhotoSize(5 * 1024 * 1024)).toBe("5.0 MB");
  });
});

// ── resizePhoto (with canvas mock) ───────────────────────────────────────────

describe("resizePhoto", () => {
  let mockDrawImage: ReturnType<typeof vi.fn>;
  let mockToDataURL: ReturnType<typeof vi.fn>;
  let canvasWidth: number;
  let canvasHeight: number;

  beforeAll(() => {
    mockDrawImage = vi.fn();
    mockToDataURL = vi.fn(() => "data:image/jpeg;base64,mockresized");

    // Mock document.createElement for canvas
    const origCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      if (tag === "canvas") {
        const canvas = {
          width: 0,
          height: 0,
          getContext: () => ({
            drawImage: mockDrawImage,
          }),
          toDataURL: mockToDataURL,
          // Track dimensions when they are set
          set _width(v: number) { canvasWidth = v; },
          get _width() { return canvasWidth; },
        };
        // Use defineProperty to track width/height
        Object.defineProperty(canvas, "width", {
          get() { return canvasWidth; },
          set(v) { canvasWidth = v; },
        });
        Object.defineProperty(canvas, "height", {
          get() { return canvasHeight; },
          set(v) { canvasHeight = v; },
        });
        return canvas as any;
      }
      return origCreateElement(tag);
    });

    // Mock Image
    vi.stubGlobal("Image", class MockImage {
      width = 0;
      height = 0;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      _src = "";
      get src() { return this._src; }
      set src(val: string) {
        this._src = val;
        // Simulate a loaded 1600x1200 image by default
        this.width = 1600;
        this.height = 1200;
        setTimeout(() => this.onload?.(), 0);
      }
    });

    // Mock FileReader
    vi.stubGlobal("FileReader", class MockFileReader {
      result: string | null = null;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      readAsDataURL() {
        this.result = "data:image/jpeg;base64,fakefile";
        setTimeout(() => this.onload?.(), 0);
      }
    });
  });

  afterAll(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("resizes an image wider than maxWidth", async () => {
    const file = new File(["fake"], "photo.jpg", { type: "image/jpeg" });
    const result = await resizePhoto(file, 800);

    expect(result).toBe("data:image/jpeg;base64,mockresized");
    // 1600x1200 -> 800x600
    expect(canvasWidth).toBe(800);
    expect(canvasHeight).toBe(600);
    expect(mockDrawImage).toHaveBeenCalled();
    expect(mockToDataURL).toHaveBeenCalledWith("image/jpeg", JPEG_QUALITY);
  });

  it("uses DEFAULT_MAX_WIDTH when no maxWidth provided", async () => {
    const file = new File(["fake"], "photo.jpg", { type: "image/jpeg" });
    await resizePhoto(file);

    expect(canvasWidth).toBe(DEFAULT_MAX_WIDTH);
    expect(canvasHeight).toBe(600); // 1200 * 800 / 1600
  });

  it("does not upscale images smaller than maxWidth", async () => {
    // Override Image to simulate a small image
    vi.stubGlobal("Image", class MockImage {
      width = 0;
      height = 0;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      _src = "";
      get src() { return this._src; }
      set src(val: string) {
        this._src = val;
        this.width = 400;
        this.height = 300;
        setTimeout(() => this.onload?.(), 0);
      }
    });

    const file = new File(["fake"], "small.jpg", { type: "image/jpeg" });
    await resizePhoto(file, 800);

    expect(canvasWidth).toBe(400);
    expect(canvasHeight).toBe(300);
  });
});
