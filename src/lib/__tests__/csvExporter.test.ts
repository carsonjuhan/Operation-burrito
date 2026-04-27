import { describe, it, expect } from "vitest";
import {
  escapeCsvField,
  exportItemsToCsv,
  generateExportFilename,
  ExportableItem,
} from "../csvExporter";

// ── escapeCsvField ──────────────────────────────────────────────────────────

describe("escapeCsvField", () => {
  it("returns empty string for empty input", () => {
    expect(escapeCsvField("")).toBe("");
  });

  it("returns plain string when no special characters", () => {
    expect(escapeCsvField("Baby Monitor")).toBe("Baby Monitor");
  });

  it("wraps field in quotes when it contains a comma", () => {
    expect(escapeCsvField("Bottles, nipples")).toBe('"Bottles, nipples"');
  });

  it("escapes double quotes by doubling them", () => {
    expect(escapeCsvField('The "best" item')).toBe('"The ""best"" item"');
  });

  it("wraps field in quotes when it contains a newline", () => {
    expect(escapeCsvField("Line 1\nLine 2")).toBe('"Line 1\nLine 2"');
  });

  it("wraps field in quotes when it contains a carriage return", () => {
    expect(escapeCsvField("Line 1\rLine 2")).toBe('"Line 1\rLine 2"');
  });

  it("handles field with commas and quotes together", () => {
    expect(escapeCsvField('Size "M", cotton')).toBe('"Size ""M"", cotton"');
  });
});

// ── exportItemsToCsv ────────────────────────────────────────────────────────

describe("exportItemsToCsv", () => {
  const sampleItem: ExportableItem = {
    name: "Baby Monitor",
    category: "Nursery",
    priority: "Must Have",
    timing: "Newborn (0-3 months)",
    status: "Need",
    estimatedCost: "149.99",
    actualCost: "",
    notes: "WiFi preferred",
    link: "https://example.com/monitor",
  };

  it("produces header row with correct column labels", () => {
    const csv = exportItemsToCsv([]);
    expect(csv).toBe(
      "Name,Category,Priority,Timing,Status,Estimated Cost,Actual Cost,Notes,Link"
    );
  });

  it("produces header + one data row", () => {
    const csv = exportItemsToCsv([sampleItem]);
    const lines = csv.split("\r\n");
    expect(lines).toHaveLength(2);
    expect(lines[1]).toBe(
      "Baby Monitor,Nursery,Must Have,Newborn (0-3 months),Need,149.99,,WiFi preferred,https://example.com/monitor"
    );
  });

  it("escapes fields with commas in data rows", () => {
    const item: ExportableItem = {
      ...sampleItem,
      notes: "Bottles, wipes, and more",
    };
    const csv = exportItemsToCsv([item]);
    const lines = csv.split("\r\n");
    expect(lines[1]).toContain('"Bottles, wipes, and more"');
  });

  it("handles multiple items", () => {
    const items: ExportableItem[] = [
      sampleItem,
      { ...sampleItem, name: "Crib", category: "Nursery", estimatedCost: "299.00" },
    ];
    const csv = exportItemsToCsv(items);
    const lines = csv.split("\r\n");
    expect(lines).toHaveLength(3); // header + 2 data rows
  });

  it("handles items with empty fields", () => {
    const item: ExportableItem = {
      name: "Pacifier",
      category: "Feeding",
      priority: "",
      timing: "",
      status: "Need",
      estimatedCost: "",
      actualCost: "",
      notes: "",
      link: "",
    };
    const csv = exportItemsToCsv([item]);
    const lines = csv.split("\r\n");
    expect(lines[1]).toBe("Pacifier,Feeding,,,Need,,,,");
  });
});

// ── generateExportFilename ──────────────────────────────────────────────────

describe("generateExportFilename", () => {
  it("generates filename with provided date", () => {
    const date = new Date(2026, 3, 21); // April 21, 2026
    expect(generateExportFilename(date)).toBe("baby-items-2026-04-21.csv");
  });

  it("pads single-digit month and day", () => {
    const date = new Date(2026, 0, 5); // Jan 5, 2026
    expect(generateExportFilename(date)).toBe("baby-items-2026-01-05.csv");
  });

  it("generates filename with current date when no date provided", () => {
    const filename = generateExportFilename();
    expect(filename).toMatch(/^baby-items-\d{4}-\d{2}-\d{2}\.csv$/);
  });
});
