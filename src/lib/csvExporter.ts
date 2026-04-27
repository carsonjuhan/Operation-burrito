// ── CSV Export Utility (RFC 4180) ─────────────────────────────────────────────

/**
 * Represents a baby item row for CSV export.
 * This decouples the export from the internal BabyItem/ChecklistItem types
 * so both merged checklist items and tracked items can be exported uniformly.
 */
export interface ExportableItem {
  name: string;
  category: string;
  priority: string;
  timing: string;
  status: string;
  estimatedCost: string;
  actualCost: string;
  notes: string;
  link: string;
}

const CSV_HEADERS: (keyof ExportableItem)[] = [
  "name",
  "category",
  "priority",
  "timing",
  "status",
  "estimatedCost",
  "actualCost",
  "notes",
  "link",
];

const CSV_HEADER_LABELS: Record<keyof ExportableItem, string> = {
  name: "Name",
  category: "Category",
  priority: "Priority",
  timing: "Timing",
  status: "Status",
  estimatedCost: "Estimated Cost",
  actualCost: "Actual Cost",
  notes: "Notes",
  link: "Link",
};

// ── RFC 4180 field escaping ─────────────────────────────────────────────────

/**
 * Escapes a CSV field per RFC 4180:
 * - If the field contains a comma, double-quote, or newline, wrap it in double quotes
 * - Any double quotes inside the field are escaped by doubling them
 */
export function escapeCsvField(value: string): string {
  if (value === "") return "";
  const needsQuoting = value.includes(",") || value.includes('"') || value.includes("\n") || value.includes("\r");
  if (!needsQuoting) return value;
  return `"${value.replace(/"/g, '""')}"`;
}

// ── CSV generation ──────────────────────────────────────────────────────────

/**
 * Generates a CSV string from an array of exportable items.
 * Returns a string with header row followed by data rows, using CRLF line endings per RFC 4180.
 */
export function exportItemsToCsv(items: ExportableItem[]): string {
  const headerRow = CSV_HEADERS.map((h) => escapeCsvField(CSV_HEADER_LABELS[h])).join(",");
  const dataRows = items.map((item) =>
    CSV_HEADERS.map((h) => escapeCsvField(item[h] ?? "")).join(",")
  );
  return [headerRow, ...dataRows].join("\r\n");
}

// ── Filename generation ─────────────────────────────────────────────────────

/**
 * Generates a timestamped filename for the CSV export.
 * Format: baby-items-YYYY-MM-DD.csv
 */
export function generateExportFilename(date?: Date): string {
  const d = date ?? new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `baby-items-${yyyy}-${mm}-${dd}.csv`;
}

// ── Browser download trigger ────────────────────────────────────────────────

/**
 * Triggers a file download in the browser by creating a temporary anchor element.
 * Uses a Blob with UTF-8 BOM for Excel compatibility.
 */
export function downloadCsv(csvContent: string, filename: string): void {
  // UTF-8 BOM for Excel compatibility
  const bom = "\uFEFF";
  const blob = new Blob([bom + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
