"use client";

import { useState, useRef } from "react";
import { Modal } from "@/components/Modal";
import {
  parseCsv,
  autoMapColumns,
  mapRowToItem,
  ColumnMap,
  fetchGoogleSheetCsv,
  toGoogleSheetsCsvUrl,
} from "@/lib/csvImporter";
import { BabyItem, ItemCategory, ItemPriority } from "@/types";
import { Upload, Table2, AlertCircle, Loader2, Link2, FileSpreadsheet } from "lucide-react";
import clsx from "clsx";

const ITEM_FIELDS: { key: keyof ColumnMap; label: string; required?: boolean }[] = [
  { key: "name", label: "Item Name", required: true },
  { key: "category", label: "Category" },
  { key: "estimatedCost", label: "Estimated Cost ($)" },
  { key: "actualCost", label: "Actual Cost ($)" },
  { key: "priority", label: "Priority" },
  { key: "purchased", label: "Purchased / Status" },
  { key: "notes", label: "Notes" },
  { key: "link", label: "Link / URL" },
];

interface Props {
  onClose: () => void;
  onImport: (items: Array<Omit<BabyItem, "id" | "createdAt">>) => void;
}

type Step = "source" | "mapping" | "preview" | "done";

export function CsvImportModal({ onClose, onImport }: Props) {
  const [step, setStep] = useState<Step>("source");
  const [mode, setMode] = useState<"url" | "file">("url");
  const [sheetUrl, setSheetUrl] = useState(
    "https://docs.google.com/spreadsheets/d/1eBGqPAGBsxBgzlhjWLKS3RF7EAH4tMDBWuMSHaVyYNc/edit"
  );
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Partial<ColumnMap>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function processText(text: string) {
    setError("");
    const { headers: h, rows: r } = parseCsv(text);
    if (h.length === 0) {
      setError("Could not parse this file. Make sure it's a valid CSV.");
      return;
    }
    setHeaders(h);
    setRows(r);
    setMapping(autoMapColumns(h));
    setStep("mapping");
  }

  function handleFile(file: File) {
    if (!file.name.toLowerCase().endsWith(".csv") && !file.type.includes("csv")) {
      setError("Please upload a .csv file (File → Download → CSV in Google Sheets).");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => processText(e.target?.result as string);
    reader.readAsText(file);
  }

  async function handleUrlFetch() {
    if (!sheetUrl.trim()) return;
    if (!toGoogleSheetsCsvUrl(sheetUrl.trim())) {
      setError("That doesn't look like a Google Sheets URL.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const csv = await fetchGoogleSheetCsv(sheetUrl.trim());
      processText(csv);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const previewRows = rows.slice(0, 5);
  const mappedItems = rows
    .map((r) => mapRowToItem(r, mapping))
    .filter((x): x is Omit<BabyItem, "id" | "createdAt"> => x !== null);

  function handleImport() {
    onImport(mappedItems);
    onClose();
  }

  return (
    <Modal title="Import from Spreadsheet" onClose={onClose}>
      {step === "source" && (
        <div className="space-y-4">
          <p className="text-sm text-stone-500">
            Import your baby items from Google Sheets or any CSV file. Columns will be
            auto-detected and you can adjust the mapping before importing.
          </p>

          {/* Mode toggle */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setMode("url")}
              className={clsx(
                "flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg border text-sm font-medium transition-colors",
                mode === "url"
                  ? "border-sage-400 bg-sage-50 text-sage-700"
                  : "border-stone-200 text-stone-500 hover:border-stone-300"
              )}
            >
              <Link2 size={16} />
              Google Sheets URL
            </button>
            <button
              onClick={() => setMode("file")}
              className={clsx(
                "flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg border text-sm font-medium transition-colors",
                mode === "file"
                  ? "border-sage-400 bg-sage-50 text-sage-700"
                  : "border-stone-200 text-stone-500 hover:border-stone-300"
              )}
            >
              <FileSpreadsheet size={16} />
              Upload CSV file
            </button>
          </div>

          {mode === "url" ? (
            <div className="space-y-2">
              <p className="text-xs text-stone-400">
                Make sure your sheet is set to <strong>Anyone with the link can view</strong>,
                then paste the URL below.
              </p>
              <div className="flex gap-2">
                <input
                  className="input flex-1 text-xs"
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  value={sheetUrl}
                  onChange={(e) => { setSheetUrl(e.target.value); setError(""); }}
                  onKeyDown={(e) => e.key === "Enter" && handleUrlFetch()}
                />
                <button
                  onClick={handleUrlFetch}
                  disabled={loading || !sheetUrl.trim()}
                  className="btn-primary shrink-0"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : "Fetch"}
                </button>
              </div>
            </div>
          ) : (
            <div
              className={clsx(
                "border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors",
                dragging
                  ? "border-sage-400 bg-sage-50"
                  : "border-stone-200 hover:border-stone-300 hover:bg-stone-50"
              )}
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                const file = e.dataTransfer.files[0];
                if (file) handleFile(file);
              }}
            >
              <Table2 size={32} className="mx-auto text-stone-300 mb-3" />
              <p className="text-sm font-medium text-stone-600">Drop CSV here or click to browse</p>
              <p className="text-xs text-stone-400 mt-1">
                In Google Sheets: File → Download → Comma Separated Values (.csv)
              </p>
              <input
                ref={inputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                }}
              />
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 text-rose-600 text-sm bg-rose-50 rounded-lg p-3">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              {error}
            </div>
          )}
        </div>
      )}

      {step === "mapping" && (
        <div className="space-y-4">
          <p className="text-sm text-stone-500">
            <strong>{rows.length} rows</strong> found with{" "}
            <strong>{headers.length} columns</strong>. Map your sheet&apos;s columns to app fields.
          </p>

          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {ITEM_FIELDS.map(({ key, label, required }) => (
              <div key={key} className="flex items-center gap-3">
                <span className="text-xs text-stone-600 w-36 shrink-0">
                  {label}
                  {required && <span className="text-rose-500 ml-0.5">*</span>}
                </span>
                <select
                  className="text-xs border border-stone-200 rounded-md px-2 py-1.5 bg-white flex-1 focus:outline-none focus:border-sage-400"
                  value={mapping[key] ?? ""}
                  onChange={(e) =>
                    setMapping((prev) => ({
                      ...prev,
                      [key]: e.target.value || undefined,
                    }))
                  }
                >
                  <option value="">— skip —</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
                {mapping[key] && previewRows[0] && (
                  <span className="text-xs text-stone-400 truncate max-w-24">
                    e.g. &ldquo;{previewRows[0][mapping[key]!] ?? "—"}&rdquo;
                  </span>
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-3 pt-1">
            <button
              onClick={() => setStep("preview")}
              disabled={!mapping.name}
              className="btn-primary flex-1 justify-center disabled:opacity-40"
            >
              Preview {mappedItems.length} items →
            </button>
            <button onClick={() => setStep("source")} className="btn-secondary">
              Back
            </button>
          </div>
        </div>
      )}

      {step === "preview" && (
        <div className="space-y-4">
          <p className="text-sm text-stone-500">
            Preview of first 5 rows. <strong>{mappedItems.length} items</strong> will be imported.
          </p>

          <div className="overflow-x-auto rounded-lg border border-stone-100">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-100">
                  <th className="text-left px-3 py-2 text-stone-500 font-medium">Name</th>
                  <th className="text-left px-3 py-2 text-stone-500 font-medium">Category</th>
                  <th className="text-left px-3 py-2 text-stone-500 font-medium">Priority</th>
                  <th className="text-left px-3 py-2 text-stone-500 font-medium">Est. Cost</th>
                  <th className="text-left px-3 py-2 text-stone-500 font-medium">Purchased</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {mappedItems.slice(0, 5).map((item, i) => (
                  <tr key={i} className="hover:bg-stone-50">
                    <td className="px-3 py-2 text-stone-700 font-medium max-w-32 truncate">{item.name}</td>
                    <td className="px-3 py-2 text-stone-500">{item.category}</td>
                    <td className="px-3 py-2 text-stone-500">{item.priority}</td>
                    <td className="px-3 py-2 text-stone-500">
                      {item.estimatedCost != null ? `$${item.estimatedCost}` : "—"}
                    </td>
                    <td className="px-3 py-2 text-stone-500">{item.purchased ? "✓" : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {mappedItems.length > 5 && (
            <p className="text-xs text-stone-400">
              + {mappedItems.length - 5} more rows not shown
            </p>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleImport}
              disabled={mappedItems.length === 0}
              className="btn-primary flex-1 justify-center disabled:opacity-40"
            >
              <Upload size={15} />
              Import {mappedItems.length} item{mappedItems.length !== 1 ? "s" : ""} to Baby Items
            </button>
            <button onClick={() => setStep("mapping")} className="btn-secondary">
              Adjust mapping
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
