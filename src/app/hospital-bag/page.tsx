"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useStoreContext } from "@/contexts/StoreContext";
import { BagItem, BagCategory, ChecklistItem } from "@/types";
import { Modal } from "@/components/Modal";
import { ReceiptImportModal } from "@/components/ReceiptImportModal";
import { EmptyState } from "@/components/EmptyState";
import { useUndoDelete } from "@/hooks/useUndoDelete";
import { useChecklistData } from "@/hooks/useChecklistData";
import { useShowMore } from "@/hooks/useShowMore";
import { useToast } from "@/contexts/ToastContext";
import { Plus, Pencil, Trash2, CheckCircle2, Circle, ScanLine, Printer, ChevronDown, ChevronUp, PackageCheck, X, EyeOff } from "lucide-react";
import clsx from "clsx";
import { PageTransition } from "@/components/PageTransition";

// Map postpartum checklist categoryEn to BagCategory
function mapToBagCategory(categoryEn?: string): BagCategory {
  const cat = (categoryEn || "").toLowerCase();
  if (cat.includes("id") || cat.includes("card") || cat.includes("document") || cat.includes("consent") || cat.includes("certificate")) return "Documents";
  if (cat.includes("clothing") || cat.includes("admission") || cat.includes("postpartum items")) return "Clothing — Mom";
  if (cat.includes("toiletri") || cat.includes("daily toiletries")) return "Toiletries";
  if (cat.includes("labour") || cat.includes("delivery")) return "Comfort & Labour";
  if (cat.includes("feeding")) return "Feeding";
  if (cat.includes("daily essentials")) return "Snacks";
  if (cat.includes("thoughtful")) return "Other";
  return "Other";
}

const BAG_CATEGORIES: BagCategory[] = [
  "Documents",
  "Clothing — Mom",
  "Clothing — Baby",
  "Toiletries",
  "Comfort & Labour",
  "Feeding",
  "Electronics",
  "Snacks",
  "Other",
];

const DEFAULT_FORM = {
  name: "",
  category: "Other" as BagCategory,
  quantity: "",
  notes: "",
};

type MergedBagItem = {
  type: "bag" | "checklist";
  bagItem?: BagItem;
  checklistItem?: ChecklistItem;
  name: string;
  bagCategory: BagCategory;
  status: "packed" | "unpacked" | "skipped";
  notes?: string;
  quantity?: number;
};

export default function HospitalBagPage() {
  const { store, loaded, updateBagItem, addBagItem, deleteBagItem, restoreBagItem, updateChecklistState } = useStoreContext();
  const { data: checklistData, loading: checklistLoading } = useChecklistData();
  const { handleDelete: handleUndoDelete } = useUndoDelete<BagItem>(deleteBagItem, restoreBagItem, (i) => i.name);
  const { addToast } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [editing, setEditing] = useState<BagItem | null>(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [collapsed, setCollapsed] = useState<Partial<Record<BagCategory, boolean>>>({});

  // Track which checklist items are "packed" (synced via store)
  const [packedChecklist, setPackedChecklist] = useState<Set<string>>(
    () => new Set(store.hospitalChecklistPacked ?? [])
  );

  // Track skipped checklist items (synced via store)
  const [skippedChecklist, setSkippedChecklist] = useState<Set<string>>(
    () => new Set(store.hospitalChecklistSkipped ?? [])
  );
  const [showSkipped, setShowSkipped] = useState(false);

  const togglePackedChecklist = (itemId: string) => {
    setPackedChecklist((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      updateChecklistState("hospitalChecklistPacked", [...next]);
      return next;
    });
  };

  const toggleSkippedChecklist = (itemId: string) => {
    const wasSkipped = skippedChecklist.has(itemId);
    setSkippedChecklist((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      updateChecklistState("hospitalChecklistSkipped", [...next]);
      return next;
    });
    if (!wasSkipped) {
      const item = checklistData?.CHECKLIST_ITEMS.find((i) => i.id === itemId);
      addToast(
        `"${item?.name ?? "Item"}" marked as don't need`,
        "info",
        { label: "Undo", onClick: () => toggleSkippedChecklist(itemId) },
        5500,
      );
    }
  };

  // Merge bag items + postpartum checklist items
  const mergedItems = useMemo((): MergedBagItem[] => {
    const items: MergedBagItem[] = [];

    // Add existing bag items from store
    for (const bagItem of store.hospitalBag) {
      items.push({
        type: "bag",
        bagItem,
        name: bagItem.name,
        bagCategory: bagItem.category,
        status: bagItem.packed ? "packed" : "unpacked",
        notes: bagItem.notes,
        quantity: bagItem.quantity,
      });
    }

    // Add postpartum checklist items (not already in bag by name)
    const postpartumItems = (checklistData?.CHECKLIST_ITEMS ?? []).filter(
      (ci) => ci.category === "Postpartum"
    );
    for (const ci of postpartumItems) {
      const alreadyInBag = store.hospitalBag.some(
        (b) => b.name.toLowerCase() === ci.name.toLowerCase()
      );
      if (alreadyInBag) continue;

      if (skippedChecklist.has(ci.id) && !showSkipped) continue;

      items.push({
        type: "checklist",
        checklistItem: ci,
        name: ci.name,
        bagCategory: mapToBagCategory(ci.categoryEn),
        status: skippedChecklist.has(ci.id)
          ? "skipped"
          : packedChecklist.has(ci.id)
            ? "packed"
            : "unpacked",
        notes: ci.categoryEn,
      });
    }

    return items;
  }, [store.hospitalBag, checklistData, packedChecklist, skippedChecklist, showSkipped]);

  const grouped = useMemo(() => {
    const groups: Partial<Record<BagCategory, MergedBagItem[]>> = {};
    for (const item of mergedItems) {
      if (!groups[item.bagCategory]) groups[item.bagCategory] = [];
      groups[item.bagCategory]!.push(item);
    }
    return groups;
  }, [mergedItems]);

  if (!loaded || checklistLoading) return null;

  const totalItems = mergedItems.length;
  const packedCount = mergedItems.filter((i) => i.status === "packed").length;
  const unpackedCount = mergedItems.filter((i) => i.status === "unpacked").length;
  const skippedCount = skippedChecklist.size;
  const percent = totalItems > 0 ? Math.round((packedCount / totalItems) * 100) : 0;

  function openAdd() {
    setEditing(null);
    setForm(DEFAULT_FORM);
    setShowModal(true);
  }

  function openEdit(item: BagItem) {
    setEditing(item);
    setForm({
      name: item.name,
      category: item.category,
      quantity: item.quantity != null ? String(item.quantity) : "",
      notes: item.notes,
    });
    setShowModal(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      name: form.name.trim(),
      category: form.category,
      quantity: form.quantity ? parseInt(form.quantity, 10) : undefined,
      notes: form.notes.trim(),
    };
    if (editing) {
      updateBagItem(editing.id, payload);
    } else {
      addBagItem({ ...payload, packed: false });
    }
    setShowModal(false);
  }

  function handlePackAll() {
    // Pack all bag items
    store.hospitalBag.forEach((item) => {
      if (!item.packed) updateBagItem(item.id, { packed: true });
    });
    // Pack all checklist items
    const postpartumItems = (checklistData?.CHECKLIST_ITEMS ?? []).filter(
      (ci) => ci.category === "Postpartum"
    );
    const next = new Set(packedChecklist);
    postpartumItems.forEach((ci) => next.add(ci.id));
    setPackedChecklist(next);
    updateChecklistState("hospitalChecklistPacked", [...next]);
  }

  function handleUnpackAll() {
    store.hospitalBag.forEach((item) => {
      if (item.packed) updateBagItem(item.id, { packed: false });
    });
    setPackedChecklist(new Set());
    updateChecklistState("hospitalChecklistPacked", []);
  }

  const allPacked = totalItems > 0 && packedCount === totalItems;

  return (
    <PageTransition className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">Hospital Bag & Prep</h1>
          <p className="text-sm text-stone-400 mt-1">
            <span className="text-emerald-600 font-semibold">{packedCount} packed</span>
            {" · "}
            <span className="text-amber-600 font-semibold">{unpackedCount} to pack</span>
            {skippedCount > 0 && (
              <>
                {" · "}
                <button
                  onClick={() => setShowSkipped(!showSkipped)}
                  className="text-stone-400 hover:text-stone-600 underline"
                >
                  {skippedCount} skipped {showSkipped ? "(showing)" : "(hidden)"}
                </button>
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {totalItems > 0 && (
            <button
              onClick={allPacked ? handleUnpackAll : handlePackAll}
              className="btn-secondary print-hide"
            >
              {allPacked ? "Unpack All" : "Pack All"}
            </button>
          )}
          {totalItems > 0 && (
            <button onClick={() => window.print()} className="btn-secondary print-hide">
              <Printer size={16} /> Print
            </button>
          )}
          <button onClick={() => setShowReceiptModal(true)} className="btn-secondary print-hide">
            <ScanLine size={16} /> Scan Receipt
          </button>
          <button onClick={openAdd} className="btn-primary print-hide">
            <Plus size={16} /> Add Item
          </button>
        </div>
      </div>

      {/* Progress bar */}
      {totalItems > 0 && (
        <div className="card p-4 mb-6 print-hide">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-stone-500">Packing progress</span>
            <span className="text-xs font-semibold text-stone-700">{percent}%</span>
          </div>
          <div className="w-full bg-stone-100 rounded-full h-2">
            <div
              className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      )}

      {/* Content */}
      {totalItems === 0 ? (
        <EmptyState
          icon="🧳"
          title="No items yet"
          description="Start building your hospital bag checklist — clothes, documents, toiletries, and more."
          action={
            <button onClick={openAdd} className="btn-primary">
              <Plus size={16} /> Add your first item
            </button>
          }
        />
      ) : (
        <div className="space-y-4 print-hide">
          {(Object.keys(grouped) as BagCategory[]).map((cat) => (
            <BagCategoryGroup
              key={cat}
              category={cat}
              items={grouped[cat]!}
              isCollapsed={!!collapsed[cat]}
              onToggleCollapse={() => setCollapsed((prev) => ({ ...prev, [cat]: !prev[cat] }))}
              onTogglePacked={(item) => {
                if (item.bagItem) {
                  updateBagItem(item.bagItem.id, { packed: !item.bagItem.packed });
                } else if (item.checklistItem) {
                  togglePackedChecklist(item.checklistItem.id);
                }
              }}
              onEdit={(item) => item.bagItem && openEdit(item.bagItem)}
              onDelete={(item) => item.bagItem && handleUndoDelete(item.bagItem)}
              onAddToBag={(item) => {
                if (item.checklistItem) {
                  addBagItem({
                    name: item.checklistItem.name,
                    category: item.bagCategory,
                    packed: false,
                    notes: item.checklistItem.categoryEn || "",
                  });
                  // Mark as packed in checklist so it doesn't show as dupe
                  togglePackedChecklist(item.checklistItem.id);
                }
              }}
              onToggleSkipped={(item) => {
                if (item.checklistItem) {
                  toggleSkippedChecklist(item.checklistItem.id);
                }
              }}
            />
          ))}
        </div>
      )}

      {/* Print-only checklist */}
      {totalItems > 0 && (
        <div className="print-only">
          <h1 className="text-xl font-bold mb-1">Hospital Bag & Prep Checklist</h1>
          <p className="text-sm text-stone-500 mb-4">{packedCount} of {totalItems} packed</p>
          {(Object.keys(grouped) as BagCategory[]).map((cat) => (
            <div key={cat} className="mb-4">
              <h2 className="text-sm font-bold uppercase tracking-wide border-b border-stone-300 pb-1 mb-2">
                {cat} ({grouped[cat]!.filter((i) => i.status === "packed").length}/{grouped[cat]!.length})
              </h2>
              <ul className="space-y-1">
                {grouped[cat]!.map((item, idx) => (
                  <li key={item.bagItem?.id ?? item.checklistItem?.id ?? idx} className="flex items-start gap-2 text-sm">
                    <span className="shrink-0">{item.status === "packed" ? "\u2611" : "\u2610"}</span>
                    <span className={item.status === "packed" ? "line-through text-stone-400" : ""}>
                      {item.name}
                      {item.quantity != null && <span className="text-stone-500"> (x{item.quantity})</span>}
                      {item.notes && <span className="text-stone-400 ml-1">- {item.notes}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* Receipt Import Modal */}
      {showReceiptModal && (
        <ReceiptImportModal
          onClose={() => setShowReceiptModal(false)}
          onImportItems={() => {}}
          onImportBagItems={(items) => items.forEach((i) => addBagItem(i))}
          defaultDestination="bag"
        />
      )}

      {/* Modal */}
      {showModal && (
        <Modal
          title={editing ? "Edit Item" : "Add Item"}
          onClose={() => setShowModal(false)}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Item Name *</label>
              <input
                className="input"
                required
                placeholder="e.g. Nursing bra"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Category</label>
                <select
                  className="select"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value as BagCategory })}
                >
                  {BAG_CATEGORIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Quantity (optional)</label>
                <input
                  className="input"
                  type="number"
                  min="1"
                  placeholder="e.g. 2"
                  value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="label">Notes</label>
              <textarea
                className="textarea"
                rows={2}
                placeholder="Any details..."
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" className="btn-primary flex-1 justify-center">
                {editing ? "Save Changes" : "Add Item"}
              </button>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="btn-secondary flex-1 justify-center"
              >
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}
    </PageTransition>
  );
}

const SHOW_MORE_PAGE_SIZE = 50;

function BagCategoryGroup({
  category,
  items,
  isCollapsed,
  onToggleCollapse,
  onTogglePacked,
  onEdit,
  onDelete,
  onAddToBag,
  onToggleSkipped,
}: {
  category: BagCategory;
  items: MergedBagItem[];
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onTogglePacked: (item: MergedBagItem) => void;
  onEdit: (item: MergedBagItem) => void;
  onDelete: (item: MergedBagItem) => void;
  onAddToBag: (item: MergedBagItem) => void;
  onToggleSkipped: (item: MergedBagItem) => void;
}) {
  const { visibleCount, showMore, hasMore, remaining, reset } = useShowMore(items.length, SHOW_MORE_PAGE_SIZE);

  useEffect(() => {
    reset();
  }, [items.length, reset]);

  const packedInCat = items.filter((i) => i.status === "packed").length;
  const unpackedInCat = items.filter((i) => i.status === "unpacked").length;
  const progress = Math.round((packedInCat / items.length) * 100);
  const visibleItems = items.slice(0, visibleCount);

  return (
    <div className="card" style={{ contentVisibility: "auto", containIntrinsicSize: "auto 200px" }}>
      {/* Category Header */}
      <button
        onClick={onToggleCollapse}
        className="w-full flex items-center justify-between p-4 min-h-[44px] hover:bg-stone-50 transition-colors"
        aria-expanded={!isCollapsed}
        aria-label={`${category}: ${items.length} items, ${packedInCat} packed`}
      >
        <div className="flex items-center gap-3 flex-1">
          <h2 className="text-sm font-semibold text-stone-700">{category}</h2>
          <div className="flex gap-2 text-xs">
            {unpackedInCat > 0 && <span className="badge bg-amber-100 text-amber-700">{unpackedInCat} to pack</span>}
            {packedInCat > 0 && <span className="badge bg-emerald-100 text-emerald-700">{packedInCat} packed</span>}
          </div>
          <div className="flex items-center gap-2 ml-auto mr-3">
            <div className="w-24 h-1.5 bg-stone-100 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 transition-all" style={{ width: `${progress}%` }} />
            </div>
            <span className="text-xs text-stone-400">{packedInCat}/{items.length}</span>
          </div>
        </div>
        {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
      </button>

      {/* Items */}
      {!isCollapsed && (
        <div className="border-t border-stone-100 divide-y divide-stone-100">
          {visibleItems.map((item, idx) => (
            <BagItemRow
              key={item.bagItem?.id ?? item.checklistItem?.id ?? `${category}-${idx}`}
              item={item}
              staggerIndex={idx}
              onTogglePacked={() => onTogglePacked(item)}
              onEdit={item.bagItem ? () => onEdit(item) : undefined}
              onDelete={item.bagItem ? () => onDelete(item) : undefined}
              onToggleSkipped={item.checklistItem ? () => onToggleSkipped(item) : undefined}
            />
          ))}
          {hasMore && (
            <div className="px-4 py-3 text-center">
              <button
                onClick={showMore}
                className="btn-secondary text-xs px-4 py-2"
                aria-label={`Show ${Math.min(remaining, SHOW_MORE_PAGE_SIZE)} more items in ${category}`}
              >
                Show more ({remaining} remaining)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function BagItemRow({
  item,
  staggerIndex,
  onTogglePacked,
  onEdit,
  onDelete,
  onToggleSkipped,
}: {
  item: MergedBagItem;
  staggerIndex?: number;
  onTogglePacked: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onToggleSkipped?: () => void;
}) {
  return (
    <div
      className={clsx(
        "flex items-center gap-3 px-4 py-3 group animate-toggle",
        (item.status === "packed" || item.status === "skipped") && "opacity-60"
      )}
      style={staggerIndex != null ? { "--stagger-index": Math.min(staggerIndex, 15) } as React.CSSProperties : undefined}
    >
      {/* Status Icon */}
      <div className="shrink-0 animate-toggle">
        {item.status === "packed" && (
          <button
            onClick={onTogglePacked}
            className="text-emerald-500 hover:text-stone-400 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label={`Unpack ${item.name}`}
          >
            <CheckCircle2 size={20} />
          </button>
        )}
        {item.status === "unpacked" && (
          <button
            onClick={onTogglePacked}
            className="text-stone-300 hover:text-emerald-500 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label={`Pack ${item.name}`}
          >
            <Circle size={20} />
          </button>
        )}
        {item.status === "skipped" && <EyeOff size={20} className="text-stone-300" />}
      </div>

      {/* Item Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={clsx(
            "text-sm font-medium",
            (item.status === "packed" || item.status === "skipped") && "text-stone-400"
          )}>
            {item.name}
          </span>
          {item.quantity != null && (
            <span className="badge bg-stone-100 text-stone-500">x{item.quantity}</span>
          )}
          {item.type === "checklist" && item.status !== "skipped" && (
            <span className="badge bg-sage-50 text-sage-600 text-xs">suggested</span>
          )}
          {item.status === "skipped" && (
            <span className="badge bg-stone-100 text-stone-400">Don&apos;t need</span>
          )}
        </div>
        {item.notes && (
          <p className="text-xs text-stone-400 mt-0.5 truncate">{item.notes}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-1.5 shrink-0">
        {/* Skip button for checklist items that are unpacked */}
        {item.status === "unpacked" && onToggleSkipped && (
          <button
            onClick={onToggleSkipped}
            className="text-xs text-stone-400 hover:text-stone-500 px-1 py-1"
            title="Don't need this"
          >
            <X size={12} />
          </button>
        )}

        {/* Undo skip */}
        {item.status === "skipped" && onToggleSkipped && (
          <button onClick={onToggleSkipped} className="text-xs text-stone-400 hover:text-stone-600">
            Undo
          </button>
        )}

        {/* Edit/Delete for bag items */}
        {item.bagItem && (
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
            {onEdit && (
              <button
                onClick={onEdit}
                className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded hover:bg-stone-100 text-stone-400"
                aria-label={`Edit ${item.name}`}
              >
                <Pencil size={14} />
              </button>
            )}
            {onDelete && (
              <button
                onClick={onDelete}
                className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded hover:bg-red-50 text-stone-400 hover:text-red-500"
                aria-label={`Delete ${item.name}`}
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
