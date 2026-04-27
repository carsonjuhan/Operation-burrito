"use client";

import { useState, useRef, useCallback } from "react";
import { Modal } from "@/components/Modal";
import { parseReceiptFile, ParsedReceiptItem } from "@/lib/receiptParser";
import { ItemCategory, ItemPriority, BagCategory } from "@/types";
import { Upload, Receipt, AlertCircle, ShoppingBag, ShoppingCart, Trash2 } from "lucide-react";
import clsx from "clsx";

type Destination = "items" | "bag";

const SUPPORTED_FORMATS = "JPG, PNG, HEIC, WEBP, or PDF";
const SUPPORTED_MIME_PREFIXES = ["image/", "application/pdf"];

interface Props {
  onClose: () => void;
  onImportItems: (
    items: Array<{
      name: string;
      category: ItemCategory;
      priority: ItemPriority;
      purchased: boolean;
      notes: string;
      estimatedCost?: number;
    }>
  ) => void;
  onImportBagItems: (
    items: Array<{
      name: string;
      category: BagCategory;
      packed: boolean;
      notes: string;
      quantity?: number;
    }>
  ) => void;
  defaultDestination?: Destination;
}

export function ReceiptImportModal({
  onClose,
  onImportItems,
  onImportBagItems,
  defaultDestination = "items",
}: Props) {
  const [rows, setRows] = useState<ParsedReceiptItem[] | null>(null);
  const [destination, setDestination] = useState<Destination>(defaultDestination);
  const [loading, setLoading] = useState(false);
  const [progressPct, setProgressPct] = useState(0);
  const [progressMsg, setProgressMsg] = useState("");
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleProgress = useCallback((pct: number, message: string) => {
    setProgressPct(pct);
    setProgressMsg(message);
  }, []);

  function getFileTypeError(file: File): string | null {
    const isSupported = SUPPORTED_MIME_PREFIXES.some((prefix) =>
      file.type.startsWith(prefix)
    );
    if (!isSupported) {
      const ext = file.name.split(".").pop()?.toUpperCase() || "unknown";
      return `Unsupported file type "${ext}" (${file.type || "unknown MIME type"}). Accepted formats: ${SUPPORTED_FORMATS}.`;
    }
    return null;
  }

  async function processFile(file: File) {
    setError("");
    setLoading(true);
    setProgressPct(0);
    setProgressMsg("");
    setFileName(file.name);

    const typeError = getFileTypeError(file);
    if (typeError) {
      setError(typeError);
      setLoading(false);
      return;
    }

    try {
      const items = await parseReceiptFile(file, handleProgress);
      if (items.length === 0) {
        const isPdf = file.type === "application/pdf";
        setError(
          isPdf
            ? "No items could be extracted from this PDF. The file may be scanned as an image (not text-based) or contain no recognizable receipt data."
            : "No items could be extracted from this image. Try a clearer, well-lit photo of the receipt with all text visible."
        );
        setLoading(false);
        return;
      }
      setRows(items);
    } catch (err) {
      console.error(err);
      const message =
        err instanceof Error ? err.message : String(err);
      if (message.includes("worker") || message.includes("load")) {
        setError(
          "Failed to load the text recognition engine. Please refresh the page and try again."
        );
      } else {
        setError(
          `Failed to process the receipt: ${message}. Make sure the file is a valid receipt image or PDF and try again.`
        );
      }
    } finally {
      setLoading(false);
      setProgressPct(0);
      setProgressMsg("");
    }
  }

  function handleFile(file: File) {
    processFile(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function toggleRow(id: string) {
    setRows((prev) =>
      prev ? prev.map((r) => (r.id === id ? { ...r, selected: !r.selected } : r)) : prev
    );
  }

  function toggleAll(selected: boolean) {
    setRows((prev) =>
      prev ? prev.map((r) => ({ ...r, selected })) : prev
    );
  }

  function updateName(id: string, name: string) {
    setRows((prev) =>
      prev ? prev.map((r) => (r.id === id ? { ...r, name } : r)) : prev
    );
  }

  function updatePrice(id: string, price: string) {
    setRows((prev) =>
      prev
        ? prev.map((r) =>
            r.id === id
              ? { ...r, price: price === "" ? null : parseFloat(price) }
              : r
          )
        : prev
    );
  }

  function removeRow(id: string) {
    setRows((prev) =>
      prev ? prev.filter((r) => r.id !== id) : prev
    );
  }

  function handleImport() {
    const selected = (rows ?? []).filter((r) => r.selected && r.name.trim());
    if (destination === "items") {
      onImportItems(
        selected.map((r) => ({
          name: r.name,
          category: "Other" as ItemCategory,
          priority: "Nice to Have" as ItemPriority,
          purchased: true,
          notes: "",
          estimatedCost: r.price ?? undefined,
        }))
      );
    } else {
      onImportBagItems(
        selected.map((r) => ({
          name: r.name,
          category: "Other" as BagCategory,
          packed: false,
          notes: r.price != null ? `$${r.price.toFixed(2)}` : "",
        }))
      );
    }
    onClose();
  }

  const selectedCount = (rows ?? []).filter((r) => r.selected).length;
  const allSelected = rows != null && rows.length > 0 && rows.every((r) => r.selected);
  const totalPrice = (rows ?? [])
    .filter((r) => r.selected && r.price != null)
    .reduce((sum, r) => sum + (r.price ?? 0), 0);

  return (
    <Modal title="Import from Receipt" onClose={onClose} size={rows ? "lg" : "md"}>
      {loading ? (
        // -- Loading state with progress bar ---------------------------------
        <div className="py-10 flex flex-col items-center gap-4 text-center">
          <div className="w-full max-w-xs">
            <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
              <div
                className={clsx(
                  "h-full rounded-full transition-all duration-300",
                  progressPct > 0 ? "bg-sage-500" : "bg-sage-400 animate-pulse"
                )}
                style={{ width: progressPct > 0 ? `${progressPct}%` : "30%" }}
                role="progressbar"
                aria-valuenow={progressPct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Receipt processing progress"
              />
            </div>
            <div className="flex justify-between mt-1.5">
              <span className="text-xs text-stone-400">
                {progressMsg || "Preparing..."}
              </span>
              {progressPct > 0 && (
                <span className="text-xs font-medium text-sage-600">
                  {progressPct}%
                </span>
              )}
            </div>
          </div>
          <p className="text-sm font-medium text-stone-700">Processing receipt...</p>
          {fileName && (
            <p className="text-xs text-stone-400 bg-stone-50 rounded px-3 py-1.5">
              {fileName}
            </p>
          )}
        </div>
      ) : !rows ? (
        // -- Upload step -----------------------------------------------------
        <div className="space-y-4">
          <p className="text-sm text-stone-500">
            Upload a receipt photo or PDF. We&apos;ll extract the items and prices so you
            can review and edit them before adding to your list.
          </p>

          {/* Destination toggle */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setDestination("items")}
              className={clsx(
                "flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg border text-sm font-medium transition-colors",
                destination === "items"
                  ? "border-sage-400 bg-sage-50 text-sage-700"
                  : "border-stone-200 text-stone-500 hover:border-stone-300"
              )}
            >
              <ShoppingCart size={16} />
              Baby Items
            </button>
            <button
              onClick={() => setDestination("bag")}
              className={clsx(
                "flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg border text-sm font-medium transition-colors",
                destination === "bag"
                  ? "border-sage-400 bg-sage-50 text-sage-700"
                  : "border-stone-200 text-stone-500 hover:border-stone-300"
              )}
            >
              <ShoppingBag size={16} />
              Hospital Bag
            </button>
          </div>

          <div
            className={clsx(
              "border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors",
              dragging
                ? "border-sage-400 bg-sage-50"
                : "border-stone-200 hover:border-stone-300 hover:bg-stone-50"
            )}
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
          >
            <Receipt size={32} className="mx-auto text-stone-300 mb-3" />
            <p className="text-sm font-medium text-stone-600">
              Drop receipt here or click to browse
            </p>
            <p className="text-xs text-stone-400 mt-1">
              {SUPPORTED_FORMATS} -- OCR may take 15-30 s
            </p>
            <input
              ref={inputRef}
              type="file"
              accept="image/*,.pdf,application/pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
              aria-label="Upload receipt file"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 text-rose-600 text-sm bg-rose-50 rounded-lg p-3">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>
      ) : (
        // -- Review step (editable table) ------------------------------------
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-stone-500">
              {rows.length} item{rows.length !== 1 ? "s" : ""} extracted from{" "}
              <span className="font-medium text-stone-700">{fileName}</span>.
              Review and edit before importing.
            </p>
          </div>

          {/* Editable table */}
          <div className="border border-stone-200 rounded-lg overflow-hidden">
            {/* Table header */}
            <div className="flex items-center gap-3 px-3 py-2 bg-stone-50 border-b border-stone-200 text-xs font-semibold text-stone-500 uppercase tracking-wide">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={(e) => toggleAll(e.target.checked)}
                className="rounded border-stone-300 shrink-0"
                aria-label={allSelected ? "Deselect all items" : "Select all items"}
              />
              <span className="flex-1">Name</span>
              <span className="w-20 text-right">Price</span>
              <span className="w-8" />
            </div>

            {/* Table rows */}
            <div className="max-h-72 overflow-y-auto divide-y divide-stone-100">
              {rows.map((row) => (
                <div
                  key={row.id}
                  className={clsx(
                    "flex items-center gap-3 px-3 py-2 transition-colors",
                    row.selected ? "bg-white" : "bg-stone-50 opacity-50"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={row.selected}
                    onChange={() => toggleRow(row.id)}
                    className="rounded border-stone-300 shrink-0"
                    aria-label={`${row.selected ? "Deselect" : "Select"} ${row.name}`}
                  />
                  <input
                    type="text"
                    value={row.name}
                    onChange={(e) => updateName(row.id, e.target.value)}
                    className="flex-1 text-sm bg-transparent border border-stone-200 rounded px-2 py-1 text-stone-700 placeholder:text-stone-300 focus:border-sage-400 focus:outline-none focus:ring-1 focus:ring-sage-200"
                    placeholder="Item name"
                    aria-label={`Item name for row`}
                  />
                  <div className="flex items-center gap-1 shrink-0 w-20">
                    <span className="text-xs text-stone-400">$</span>
                    <input
                      type="number"
                      value={row.price ?? ""}
                      onChange={(e) => updatePrice(row.id, e.target.value)}
                      min="0"
                      step="0.01"
                      className="w-full text-sm text-right bg-transparent border border-stone-200 rounded px-2 py-1 text-stone-600 focus:border-sage-400 focus:outline-none focus:ring-1 focus:ring-sage-200"
                      placeholder="--"
                      aria-label={`Price for ${row.name}`}
                    />
                  </div>
                  <button
                    onClick={() => removeRow(row.id)}
                    className="p-1 rounded hover:bg-red-50 text-stone-300 hover:text-red-500 transition-colors shrink-0"
                    aria-label={`Remove ${row.name}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>

            {/* Table footer / summary */}
            <div className="flex items-center justify-between px-3 py-2 bg-stone-50 border-t border-stone-200 text-xs text-stone-500">
              <span>
                {selectedCount} of {rows.length} selected
              </span>
              {totalPrice > 0 && (
                <span className="font-medium text-stone-700">
                  Total: ${totalPrice.toFixed(2)}
                </span>
              )}
            </div>
          </div>

          {/* Destination */}
          <div className="flex gap-2">
            <button
              onClick={() => setDestination("items")}
              className={clsx(
                "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border text-sm font-medium transition-colors",
                destination === "items"
                  ? "border-sage-400 bg-sage-50 text-sage-700"
                  : "border-stone-200 text-stone-500"
              )}
            >
              <ShoppingCart size={14} />
              Baby Items
            </button>
            <button
              onClick={() => setDestination("bag")}
              className={clsx(
                "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border text-sm font-medium transition-colors",
                destination === "bag"
                  ? "border-sage-400 bg-sage-50 text-sage-700"
                  : "border-stone-200 text-stone-500"
              )}
            >
              <ShoppingBag size={14} />
              Hospital Bag
            </button>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleImport}
              disabled={selectedCount === 0}
              className="btn-primary flex-1 justify-center disabled:opacity-40"
            >
              <Upload size={15} />
              Import {selectedCount} item{selectedCount !== 1 ? "s" : ""}
              {" "}to {destination === "items" ? "Baby Items" : "Hospital Bag"}
            </button>
            <button
              onClick={() => {
                setRows(null);
                setError("");
              }}
              className="btn-secondary"
            >
              Re-scan
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
