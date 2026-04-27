import { describe, it, expect, vi, beforeEach } from "vitest";
import { parseImportFile, buildExportFilename, exportStoreAsJSON } from "@/lib/dataImportExport";
import { DEFAULT_STORE } from "@/hooks/useStore";
import { AppStore } from "@/types";

// ── Helper: create a File from a string ─────────────────────────────────────

function makeFile(content: string, name: string, type = "application/json"): File {
  return new File([content], name, { type });
}

// ── buildExportFilename ─────────────────────────────────────────────────────

describe("buildExportFilename", () => {
  it("returns a filename with the current date", () => {
    const filename = buildExportFilename();
    expect(filename).toMatch(/^operation-burrito-\d{4}-\d{2}-\d{2}\.json$/);
  });
});

// ── exportStoreAsJSON ───────────────────────────────────────────────────────

describe("exportStoreAsJSON", () => {
  beforeEach(() => {
    // Mock DOM methods for download
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:mock-url"),
      revokeObjectURL: vi.fn(),
    });
  });

  it("creates a download link and triggers click", () => {
    const mockClick = vi.fn();
    const mockAppendChild = vi.fn();
    const mockRemoveChild = vi.fn();

    vi.spyOn(document, "createElement").mockReturnValue({
      href: "",
      download: "",
      click: mockClick,
    } as unknown as HTMLAnchorElement);
    vi.spyOn(document.body, "appendChild").mockImplementation(mockAppendChild);
    vi.spyOn(document.body, "removeChild").mockImplementation(mockRemoveChild);

    exportStoreAsJSON(DEFAULT_STORE);

    expect(mockClick).toHaveBeenCalledOnce();
    expect(mockAppendChild).toHaveBeenCalledOnce();
    expect(mockRemoveChild).toHaveBeenCalledOnce();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
  });
});

// ── parseImportFile ─────────────────────────────────────────────────────────

describe("parseImportFile", () => {
  it("rejects non-JSON file extension", async () => {
    const file = makeFile("hello", "data.txt", "text/plain");
    const result = await parseImportFile(file);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("File must be a .json file.");
  });

  it("rejects invalid JSON content", async () => {
    const file = makeFile("this is not json {{{", "data.json");
    const result = await parseImportFile(file);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toMatch(/invalid JSON/i);
  });

  it("rejects null data", async () => {
    const file = makeFile("null", "data.json");
    const result = await parseImportFile(file);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toMatch(/null/i);
  });

  it("rejects an array instead of object", async () => {
    const file = makeFile("[]", "data.json");
    const result = await parseImportFile(file);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toMatch(/array/i);
  });

  it("rejects data with wrong field types", async () => {
    const file = makeFile(JSON.stringify({ items: "not-an-array" }), "data.json");
    const result = await parseImportFile(file);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("items"))).toBe(true);
  });

  it("accepts a valid complete AppStore", async () => {
    const file = makeFile(JSON.stringify(DEFAULT_STORE), "backup.json");
    const result = await parseImportFile(file);
    expect(result.valid).toBe(true);
    expect(result.store).not.toBeNull();
    expect(result.errors).toHaveLength(0);
  });

  it("accepts partial data and fills defaults with warnings", async () => {
    const partial: Partial<AppStore> = {
      items: [
        {
          id: "test-1",
          name: "Test Item",
          category: "Nursery",
          priority: "Must Have",
          purchased: false,
          notes: "",
          createdAt: "2026-01-01",
        },
      ],
    };
    const file = makeFile(JSON.stringify(partial), "partial.json");
    const result = await parseImportFile(file);
    expect(result.valid).toBe(true);
    expect(result.store).not.toBeNull();
    expect(result.store!.items).toHaveLength(1);
    // Missing fields should be filled with defaults
    expect(Array.isArray(result.store!.classes)).toBe(true);
    expect(Array.isArray(result.store!.notes)).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("preserves extra unknown fields for forward compatibility", async () => {
    const data = { ...DEFAULT_STORE, futureField: "keep-me" };
    const file = makeFile(JSON.stringify(data), "future.json");
    const result = await parseImportFile(file);
    expect(result.valid).toBe(true);
    expect((result.store as Record<string, unknown>).futureField).toBe("keep-me");
  });

  it("handles .JSON uppercase extension", async () => {
    const file = makeFile(JSON.stringify(DEFAULT_STORE), "BACKUP.JSON");
    const result = await parseImportFile(file);
    expect(result.valid).toBe(true);
  });
});
