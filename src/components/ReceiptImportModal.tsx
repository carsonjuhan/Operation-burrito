"use client";

import { useState, useRef } from "react";
import { Modal } from "@/components/Modal";
import { parseReceiptFile, ParsedReceiptItem } from "@/lib/receiptParser";
import { ItemCategory, ItemPriority, BagCategory } from "@/types";
import { Upload, Receipt, AlertCircle, Loader2, ShoppingBag, ShoppingCart } from "lucide-react";
import clsx from "clsx";

type Destination = "items" | "bag";

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
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function processFile(file: File) {
    setError("");
    setLoading(true);
    setFileName(file.name);

    const isPdf = file.type === "application/pdf";
    const isImage = file.type.startsWith("image/");
    if (!isPdf && !isImage) {
      setError("Please upload a receipt image (JPG, PNG, HEIC, WEBP) or PDF.");
      setLoading(false);
      return;
    }

    try {
      if (!isPdf) {
        setProgress("Running OCR on image… this may take 10–30 seconds");
      } else {
        setProgress("Extracting text from PDF…");
      }
      const items = await parseReceiptFile(file);
      if (items.length === 0) {
        setError(
          "No items could be extracted. The receipt may be hard to read — try a clearer photo."
        );
        setLoading(false);
        return;
      }
      setRows(items);
    } catch (err) {
      console.error(err);
      setError(
        "Failed to process the receipt. Make sure the image is clear and try again."
      );
    } finally {
      setLoading(false);
      setProgress("");
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

  return (
    <Modal title="Import from Receipt" onClose={onClose}>
      {loading ? (
        <div className="py-12 flex flex-col items-center gap-4 text-center">
          <Loader2 size={36} className="text-sage-500 animate-spin" />
          <div>
            <p className="text-sm font-medium text-stone-700">Processing receipt…</p>
            {progress && <p className="text-xs text-stone-400 mt-1">{progress}</p>}
          </div>
          {fileName && (
            <p className="text-xs text-stone-400 bg-stone-50 rounded px-3 py-1.5">
              {fileName}
            </p>
          )}
        </div>
      ) : !rows ? (
        // ── Upload step ────────────────────────────────────────────────────
        <div className="space-y-4">
          <p className="text-sm text-stone-500">
            Upload a receipt photo or PDF. We&apos;ll extract the items and prices so you
            can add them to your baby items list or hospital bag.
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
              JPG, PNG, HEIC, WEBP, or PDF · OCR may take 15–30 s
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
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-rose-600 text-sm bg-rose-50 rounded-lg p-3">
              <AlertCircle size={16} className="shrink-0" />
              {error}
            </div>
          )}
        </div>
      ) : (
        // ── Review step ────────────────────────────────────────────────────
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-stone-500">
              {rows.length} line{rows.length !== 1 ? "s" : ""} extracted from{" "}
              <span className="font-medium text-stone-700">{fileName}</span>. Select
              items to import.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() =>
                  setRows(rows.map((r) => ({ ...r, selected: true })))
                }
                className="text-xs text-sage-600 hover:underline"
              >
                All
              </button>
              <span className="text-xs text-stone-300">·</span>
              <button
                onClick={() =>
                  setRows(rows.map((r) => ({ ...r, selected: false })))
                }
                className="text-xs text-stone-400 hover:underline"
              >
                None
              </button>
            </div>
          </div>

          <div className="space-y-1 max-h-80 overflow-y-auto pr-1">
            {rows.map((row) => (
              <div
                key={row.id}
                className={clsx(
                  "flex items-center gap-3 rounded-lg px-3 py-2 transition-colors",
                  row.selected ? "bg-sage-50 border border-sage-200" : "border border-transparent opacity-50"
                )}
              >
                <input
                  type="checkbox"
                  checked={row.selected}
                  onChange={() => toggleRow(row.id)}
                  className="rounded border-stone-300 shrink-0"
                />
                <input
                  type="text"
                  value={row.name}
                  onChange={(e) => updateName(row.id, e.target.value)}
                  className="flex-1 text-sm bg-transparent border-none outline-none text-stone-700 placeholder:text-stone-300"
                  placeholder="Item name"
                />
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-xs text-stone-400">$</span>
                  <input
                    type="number"
                    value={row.price ?? ""}
                    onChange={(e) => updatePrice(row.id, e.target.value)}
                    min="0"
                    step="0.01"
                    className="w-16 text-xs text-right bg-transparent border-none outline-none text-stone-500"
                    placeholder="—"
                  />
                </div>
              </div>
            ))}
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
