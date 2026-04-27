"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useStoreContext } from "@/contexts/StoreContext";
import { BabyItem, ItemCategory, ItemPriority, ItemTiming, ChecklistItem } from "@/types";
import { useChecklistData } from "@/hooks/useChecklistData";
import { Modal } from "@/components/Modal";
import { ReceiptImportModal } from "@/components/ReceiptImportModal";
import { CsvImportModal } from "@/components/CsvImportModal";
import { EmptyState } from "@/components/EmptyState";
import { useUndoDelete } from "@/hooks/useUndoDelete";
import { useToast } from "@/contexts/ToastContext";
import { Plus, CheckCircle2, Circle, Pencil, Trash2, ExternalLink, Filter, ScanLine, ShoppingBag, Table2, Clock, PackageCheck, ChevronDown, ChevronUp, Download, Share2, X, EyeOff } from "lucide-react";
import { exportItemsToCsv, downloadCsv, generateExportFilename, ExportableItem } from "@/lib/csvExporter";
import { generateRegistryShareUrl } from "@/lib/registryShare";
import { useShowMore } from "@/hooks/useShowMore";
import clsx from "clsx";
import { PageTransition } from "@/components/PageTransition";
import { PhotoAttachment, PhotoThumbnails } from "@/components/PhotoAttachment";

const CATEGORIES: ItemCategory[] = [
  "Nursery", "Clothing", "Feeding", "Safety", "Travel",
  "Health & Hygiene", "Toys & Gear", "Other",
];

const PRIORITIES: ItemPriority[] = ["Must Have", "Nice to Have", "Optional"];

const PRIORITY_COLORS: Record<ItemPriority, string> = {
  "Must Have": "bg-rose-100 text-rose-700",
  "Nice to Have": "bg-amber-100 text-amber-700",
  "Optional": "bg-stone-100 text-stone-500",
};

const DEFAULT_FORM = {
  name: "",
  category: "Nursery" as ItemCategory,
  priority: "Must Have" as ItemPriority,
  purchased: false,
  notes: "",
  link: "",
  estimatedCost: "",
  photos: [] as string[],
};

export default function ItemsPage() {
  const { store, loaded, addItem, updateItem, deleteItem, restoreItem, addBagItem, updateChecklistState } = useStoreContext();
  const { data: checklistData, loading: checklistLoading } = useChecklistData();
  const { handleDelete: handleUndoDelete } = useUndoDelete<BabyItem>(deleteItem, restoreItem, (i) => i.name);
  const { addToast } = useToast();
  const itemsRef = useRef(store.items);
  itemsRef.current = store.items;
  const registryUrl = store.registryUrl ?? "";
  const [showModal, setShowModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [editing, setEditing] = useState<BabyItem | null>(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [filterCategory, setFilterCategory] = useState<ItemCategory | "All">("All");
  const [filterPriority, setFilterPriority] = useState<ItemPriority | "All">("All");
  const [filterStatus, setFilterStatus] = useState<"All" | "Have It" | "Need to Buy" | "In My List">("All");
  const [filterTiming, setFilterTiming] = useState<ItemTiming | "All">("All");
  const [shareCopied, setShareCopied] = useState(false);
  const [viewMode, setViewMode] = useState<"all" | "tracked">("all");
  const [collapsed, setCollapsed] = useState<Partial<Record<ItemCategory, boolean>>>({});

  // Track which checklist items user already has (synced via store)
  const [alreadyHave, setAlreadyHave] = useState<Set<string>>(
    () => new Set(store.checklistAlreadyHave ?? [])
  );

  // Track which checklist items user has skipped / doesn't need (synced via store)
  const [skippedItems, setSkippedItems] = useState<Set<string>>(
    () => new Set(store.checklistSkipped ?? [])
  );
  const [showSkipped, setShowSkipped] = useState(false);

  // Auto-import UNIQUE inventory items (items not in checklist) as tracked items
  const hasImportedRef = useRef(false);
  useEffect(() => {
    if (!loaded || !checklistData || hasImportedRef.current) return;
    const { UNIQUE_INVENTORY_ITEMS } = checklistData;
    localStorage.removeItem("amazon-items-imported");

    const importVersion = localStorage.getItem("registry-items-import-version");
    const imported = localStorage.getItem("registry-items-imported");

    if ((!imported || importVersion !== "5") && UNIQUE_INVENTORY_ITEMS.length > 0) {
      let addedCount = 0;
      const currentItems = itemsRef.current;
      UNIQUE_INVENTORY_ITEMS.forEach((registryItem: any) => {
        const exists = currentItems.some((i) => i.name.toLowerCase() === registryItem.name.toLowerCase());
        if (!exists) {
          const qtyNote = registryItem.quantity > 1 ? ` × ${registryItem.quantity}` : '';
          const sourceNote = registryItem.purchasedFrom === "Inventory"
            ? `Have it${qtyNote} (${registryItem.originalCategory})`
            : `From ${registryItem.purchasedFrom}${qtyNote} (${registryItem.originalCategory})`;
          addItem({
            name: registryItem.name,
            category: registryItem.category,
            priority: "Must Have",
            purchased: true,
            notes: sourceNote,
            estimatedCost: registryItem.price,
          });
          addedCount++;
        }
      });
      localStorage.setItem("registry-items-imported", "true");
      localStorage.setItem("registry-items-import-version", "5");
      hasImportedRef.current = true;
    } else {
      hasImportedRef.current = true;
    }
  }, [loaded, checklistData, addItem]);

  // Save to store whenever alreadyHave changes
  const toggleAlreadyHave = (itemId: string) => {
    setAlreadyHave((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      updateChecklistState("checklistAlreadyHave", [...next]);
      return next;
    });
  };

  // Toggle skip/don't-need for a checklist item
  const toggleSkipped = (itemId: string) => {
    const wasSkipped = skippedItems.has(itemId);
    setSkippedItems((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      updateChecklistState("checklistSkipped", [...next]);
      return next;
    });
    // Show toast with undo when skipping (not when un-skipping)
    if (!wasSkipped) {
      const item = checklistData?.CHECKLIST_ITEMS.find((i) => i.id === itemId);
      addToast(
        `"${item?.name ?? "Item"}" marked as don't need — click "skipped" in header to see hidden items`,
        "info",
        { label: "Undo", onClick: () => toggleSkipped(itemId) },
        5500,
      );
    }
  };

  // Get status for a checklist item
  const getChecklistItemStatus = (item: ChecklistItem): "purchased" | "in-list" | "already-have" | "skipped" | "need" => {
    if (skippedItems.has(item.id)) return "skipped";
    // Check if matched from inventory
    if (checklistData?.MATCHED_CHECKLIST_IDS.has(item.id)) return "already-have";
    // Check manual "already have" marks
    if (alreadyHave.has(item.id)) return "already-have";
    const match = store.items.find((i) => i.name.toLowerCase() === item.name.toLowerCase());
    if (!match) return "need";
    return match.purchased ? "purchased" : "in-list";
  };

  // Merge checklist items with tracked items
  const mergedItems = useMemo((): MergedItemType[] => {
    const items: MergedItemType[] = [];
    const checklistItems = checklistData?.CHECKLIST_ITEMS ?? [];

    // Add all checklist items
    if (viewMode === "all") {
      for (const checklistItem of checklistItems) {
        // Postpartum items live on the Hospital Bag page
        if (checklistItem.category === "Postpartum") continue;
        const status = getChecklistItemStatus(checklistItem);
        // Hide skipped items unless showSkipped is on
        if (status === "skipped" && !showSkipped) continue;
        // Link the tracked item if one exists (for undo/edit/delete actions)
        const matchedTracked = (status === "in-list" || status === "purchased")
          ? store.items.find((i) => i.name.toLowerCase() === checklistItem.name.toLowerCase())
          : undefined;
        items.push({
          type: "checklist",
          checklistItem,
          trackedItem: matchedTracked,
          name: checklistItem.name,
          category: checklistItem.category,
          timing: checklistItem.timing,
          status,
        });
      }
    }

    // Add tracked items not in checklist
    for (const trackedItem of store.items) {
      const inChecklist = checklistItems.some(
        (ci) => ci.name.toLowerCase() === trackedItem.name.toLowerCase()
      );
      if (!inChecklist) {
        items.push({
          type: "tracked",
          trackedItem,
          name: trackedItem.name,
          category: trackedItem.category,
          timing: trackedItem.timing,
          status: trackedItem.purchased ? "purchased" : "in-list",
        });
      }
    }

    return items;
  }, [store.items, viewMode, alreadyHave, skippedItems, showSkipped, checklistData]);

  const filtered = useMemo(() => {
    return mergedItems.filter((item) => {
      if (filterCategory !== "All" && item.category !== filterCategory) return false;
      if (filterTiming !== "All" && item.timing !== filterTiming) return false;

      // Priority filter only applies to tracked items
      if (filterPriority !== "All" && item.trackedItem && item.trackedItem.priority !== filterPriority) return false;

      if (filterStatus === "Have It" && item.status !== "purchased" && item.status !== "already-have") return false;
      if (filterStatus === "Need to Buy" && item.status !== "need") return false;
      if (filterStatus === "In My List" && item.status !== "in-list") return false;

      return true;
    });
  }, [mergedItems, filterCategory, filterPriority, filterStatus, filterTiming]);

  const grouped = useMemo(() => {
    const groups: Partial<Record<ItemCategory, MergedItemType[]>> = {};
    for (const item of filtered) {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category]!.push(item);
    }
    return groups;
  }, [filtered]);

  if (!loaded || checklistLoading || !checklistData) return null;

  const { CHECKLIST_ITEMS, TIMING_OPTIONS, AMAZON_PURCHASED_ITEMS, MATCHED_CHECKLIST_IDS, UNIQUE_INVENTORY_ITEMS } = checklistData;
  const { items } = store;

  const totalCost = items
    .filter((i) => !i.purchased && i.estimatedCost)
    .reduce((sum, i) => sum + (i.estimatedCost ?? 0), 0);

  // Stats
  const totalChecklist = CHECKLIST_ITEMS.length;
  const purchasedCount = mergedItems.filter((i) => i.status === "purchased").length;
  const alreadyHaveCount = mergedItems.filter((i) => i.status === "already-have").length;
  const totalInventoryItems = AMAZON_PURCHASED_ITEMS.length;
  const matchedToChecklist = MATCHED_CHECKLIST_IDS.size;
  const uniqueItemsImported = UNIQUE_INVENTORY_ITEMS.length;
  const amazonCount = AMAZON_PURCHASED_ITEMS.filter((i: any) => i.purchasedFrom === "Amazon").length;
  const otherStoresCount = totalInventoryItems - amazonCount;
  const needCount = mergedItems.filter((i) => i.status === "need").length;
  const inListCount = mergedItems.filter((i) => i.status === "in-list").length;
  const skippedCount = skippedItems.size;

  function openAdd() {
    setEditing(null);
    setForm(DEFAULT_FORM);
    setShowModal(true);
  }

  function openEdit(item: BabyItem) {
    setEditing(item);
    setForm({
      name: item.name,
      category: item.category,
      priority: item.priority,
      purchased: item.purchased,
      notes: item.notes,
      link: item.link ?? "",
      estimatedCost: item.estimatedCost != null ? String(item.estimatedCost) : "",
      photos: item.photos ?? [],
    });
    setShowModal(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      name: form.name.trim(),
      category: form.category,
      priority: form.priority,
      purchased: form.purchased,
      notes: form.notes.trim(),
      link: form.link.trim() || undefined,
      estimatedCost: form.estimatedCost ? parseFloat(form.estimatedCost) : undefined,
      photos: form.photos.length > 0 ? form.photos : undefined,
    };
    if (editing) {
      updateItem(editing.id, payload);
    } else {
      addItem(payload);
    }
    setShowModal(false);
  }

  function quickAddFromChecklist(checklistItem: ChecklistItem) {
    addItem({
      name: checklistItem.name,
      category: checklistItem.category,
      priority: "Must Have",
      purchased: false,
      notes: checklistItem.categoryEn || "",
      timing: checklistItem.timing,
    });
    addToast(`"${checklistItem.name}" added to list`, "success", {
      label: "Undo",
      onClick: () => {
        const added = itemsRef.current.find((i) => i.name === checklistItem.name);
        if (added) deleteItem(added.id);
      },
    }, 5500);
  }

  function quickMarkPurchased(checklistItem: ChecklistItem) {
    addItem({
      name: checklistItem.name,
      category: checklistItem.category,
      priority: "Must Have",
      purchased: true,
      notes: checklistItem.categoryEn || "",
      timing: checklistItem.timing,
    });
    addToast(`"${checklistItem.name}" marked as bought`, "success", {
      label: "Undo",
      onClick: () => {
        const added = itemsRef.current.find((i) => i.name === checklistItem.name);
        if (added) deleteItem(added.id);
      },
    }, 5500);
  }

  function handleExportCsv() {
    const STATUS_LABELS: Record<string, string> = {
      purchased: "Purchased",
      "in-list": "In List",
      "already-have": "Already Have",
      need: "Need",
    };
    const exportableItems: ExportableItem[] = filtered.map((item) => ({
      name: item.name,
      category: item.category,
      priority: item.trackedItem?.priority ?? "",
      timing: item.timing ?? "",
      status: STATUS_LABELS[item.status] ?? item.status,
      estimatedCost: item.trackedItem?.estimatedCost != null ? String(item.trackedItem.estimatedCost) : "",
      actualCost: item.trackedItem?.actualCost != null ? String(item.trackedItem.actualCost) : "",
      notes: item.trackedItem?.notes ?? "",
      link: item.trackedItem?.link ?? "",
    }));
    const csv = exportItemsToCsv(exportableItems);
    downloadCsv(csv, generateExportFilename());
  }

  function handleShareList() {
    const url = generateRegistryShareUrl(items);
    navigator.clipboard.writeText(url).then(() => {
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    }).catch(() => {
      // Fallback for browsers without clipboard API
      const textarea = document.createElement("textarea");
      textarea.value = url;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    });
  }

  return (
    <PageTransition className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">Baby Items & Checklist</h1>
          <p className="text-sm text-stone-400 mt-1">
            {viewMode === "all"
              ? `${totalChecklist} checklist · ${matchedToChecklist} matched · ${uniqueItemsImported} unique · `
              : `${items.length} tracked items · `}
            <span className="text-amber-600 font-semibold">{needCount} need</span>
            {" · "}
            <span className="text-blue-600 font-semibold">{inListCount} in list</span>
            {" · "}
            <span className="text-emerald-600 font-semibold">{alreadyHaveCount} have</span>
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
            {totalCost > 0 && ` · ~$${totalCost.toFixed(0)} budget needed`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {registryUrl && (
            <a href={registryUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary">
              <ShoppingBag size={16} /> Registry
            </a>
          )}
          <button onClick={handleShareList} className="btn-secondary">
            <Share2 size={16} /> {shareCopied ? "Copied!" : "Share List"}
          </button>
          <button onClick={handleExportCsv} className="btn-secondary">
            <Download size={16} /> Export
          </button>
          <button onClick={() => setShowCsvModal(true)} className="btn-secondary">
            <Table2 size={16} /> Import
          </button>
          <button onClick={() => setShowReceiptModal(true)} className="btn-secondary">
            <ScanLine size={16} /> Receipt
          </button>
          <button onClick={openAdd} className="btn-primary">
            <Plus size={16} /> Add Custom
          </button>
        </div>
      </div>

      {/* View Mode Toggle */}
      <div className="card p-3 mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2" role="tablist" aria-label="Item view mode">
          <span className="text-xs font-semibold text-stone-500">View:</span>
          <button
            role="tab"
            aria-selected={viewMode === "all"}
            className={clsx(
              "badge text-xs px-3 py-1.5",
              viewMode === "all" ? "bg-sage-100 text-sage-700" : "bg-stone-100 text-stone-500 hover:bg-stone-200"
            )}
            onClick={() => setViewMode("all")}
          >
            All {totalChecklist} Items
          </button>
          <button
            role="tab"
            aria-selected={viewMode === "tracked"}
            className={clsx(
              "badge text-xs px-3 py-1.5",
              viewMode === "tracked" ? "bg-sage-100 text-sage-700" : "bg-stone-100 text-stone-500 hover:bg-stone-200"
            )}
            onClick={() => setViewMode("tracked")}
          >
            My Tracked Items ({items.length})
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-6 space-y-3">
        <div className="flex flex-wrap gap-2 items-center">
          <Clock size={14} className="text-stone-400" />
          <span className="text-xs font-semibold text-stone-500">When needed:</span>
          <button
            className={clsx(
              "badge text-xs px-2 py-1",
              filterTiming === "All" ? "bg-sage-100 text-sage-700" : "bg-stone-100 text-stone-500 hover:bg-stone-200"
            )}
            onClick={() => setFilterTiming("All")}
          >
            All
          </button>
          {TIMING_OPTIONS.map((timing) => (
            <button
              key={timing}
              className={clsx(
                "badge text-xs px-2 py-1",
                filterTiming === timing ? "bg-sage-100 text-sage-700" : "bg-stone-100 text-stone-500 hover:bg-stone-200"
              )}
              onClick={() => setFilterTiming(timing)}
            >
              {timing}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <Filter size={14} className="text-stone-400" />
          <div className="flex items-center gap-2">
            <span className="text-xs text-stone-500">Status</span>
            <select
              className="text-xs border border-stone-200 rounded-md px-2 py-1 bg-white focus:outline-none"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
              aria-label="Filter by status"
            >
              <option value="All">All</option>
              <option value="Need to Buy">Need to Buy</option>
              <option value="In My List">In My List</option>
              <option value="Have It">Have It (purchased or gift)</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-stone-500">Category</span>
            <select
              className="text-xs border border-stone-200 rounded-md px-2 py-1 bg-white focus:outline-none"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value as ItemCategory | "All")}
              aria-label="Filter by category"
            >
              <option value="All">All</option>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-stone-500">Priority</span>
            <select
              className="text-xs border border-stone-200 rounded-md px-2 py-1 bg-white focus:outline-none"
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value as ItemPriority | "All")}
              aria-label="Filter by priority"
            >
              <option value="All">All</option>
              {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Content */}
      {filtered.length === 0 ? (
        <EmptyState
          icon="📋"
          title="No items match filters"
          description="Try adjusting your filters or add custom items."
          action={
            <button onClick={openAdd} className="btn-primary">
              <Plus size={16} /> Add custom item
            </button>
          }
        />
      ) : (
        <div className="space-y-4">
          {(Object.keys(grouped) as ItemCategory[]).map((cat) => (
            <CategoryGroup
              key={cat}
              category={cat}
              items={grouped[cat]!}
              isCollapsed={!!collapsed[cat]}
              onToggleCollapse={() => setCollapsed((prev) => ({ ...prev, [cat]: !prev[cat] }))}
              onTogglePurchased={(item) => updateItem(item.id, { purchased: !item.purchased })}
              onEdit={openEdit}
              onDelete={(item) => handleUndoDelete(item)}
              onQuickAdd={quickAddFromChecklist}
              onQuickPurchase={quickMarkPurchased}
              onToggleAlreadyHave={toggleAlreadyHave}
              onToggleSkipped={toggleSkipped}
              filterKey={`${filterCategory}-${filterPriority}-${filterStatus}-${filterTiming}-${viewMode}`}
            />
          ))}
        </div>
      )}

      {/* CSV Import Modal */}
      {showCsvModal && (
        <CsvImportModal
          onClose={() => setShowCsvModal(false)}
          onImport={(items) => items.forEach((i) => addItem(i))}
        />
      )}

      {/* Receipt Import Modal */}
      {showReceiptModal && (
        <ReceiptImportModal
          onClose={() => setShowReceiptModal(false)}
          onImportItems={(items) => items.forEach((i) => addItem(i))}
          onImportBagItems={(items) => items.forEach((i) => addBagItem(i))}
          defaultDestination="items"
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
                placeholder="e.g. Convertible car seat"
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
                  onChange={(e) => setForm({ ...form, category: e.target.value as ItemCategory })}
                >
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Priority</label>
                <select
                  className="select"
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value as ItemPriority })}
                >
                  {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="label">Estimated Cost ($)</label>
              <input
                className="input"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={form.estimatedCost}
                onChange={(e) => setForm({ ...form, estimatedCost: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Link (optional)</label>
              <input
                className="input"
                type="url"
                placeholder="https://"
                value={form.link}
                onChange={(e) => setForm({ ...form, link: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Notes</label>
              <textarea
                className="textarea"
                rows={2}
                placeholder="Brand preferences, size, color…"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
            <PhotoAttachment
              photos={form.photos}
              onChange={(photos) => setForm({ ...form, photos })}
            />
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.purchased}
                onChange={(e) => setForm({ ...form, purchased: e.target.checked })}
                className="rounded border-stone-300 text-sage-600 focus:ring-sage-400"
              />
              <span className="text-sm text-stone-600">Already purchased</span>
            </label>
            <div className="flex gap-3 pt-2">
              <button type="submit" className="btn-primary flex-1 justify-center">
                {editing ? "Save Changes" : "Add Item"}
              </button>
              <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1 justify-center">
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}
    </PageTransition>
  );
}

type MergedItemType = {
  type: "checklist" | "tracked";
  checklistItem?: ChecklistItem;
  trackedItem?: BabyItem;
  name: string;
  category: ItemCategory;
  timing?: ItemTiming;
  status: "purchased" | "in-list" | "already-have" | "skipped" | "need";
};

const SHOW_MORE_PAGE_SIZE = 50;

function CategoryGroup({
  category,
  items,
  isCollapsed,
  onToggleCollapse,
  onTogglePurchased,
  onEdit,
  onDelete,
  onQuickAdd,
  onQuickPurchase,
  onToggleAlreadyHave,
  onToggleSkipped,
  filterKey,
}: {
  category: ItemCategory;
  items: MergedItemType[];
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onTogglePurchased: (item: BabyItem) => void;
  onEdit: (item: BabyItem) => void;
  onDelete: (item: BabyItem) => void;
  onQuickAdd: (item: ChecklistItem) => void;
  onQuickPurchase: (item: ChecklistItem) => void;
  onToggleAlreadyHave: (itemId: string) => void;
  onToggleSkipped: (itemId: string) => void;
  filterKey: string;
}) {
  const { visibleCount, showMore, hasMore, remaining, reset } = useShowMore(items.length, SHOW_MORE_PAGE_SIZE);

  // Reset pagination when filters change
  useEffect(() => {
    reset();
  }, [filterKey, reset]);

  const needInCat = items.filter((i) => i.status === "need").length;
  const inListInCat = items.filter((i) => i.status === "in-list").length;
  const purchasedInCat = items.filter((i) => i.status === "purchased").length;
  const haveInCat = items.filter((i) => i.status === "already-have").length;
  const progress = Math.round(((purchasedInCat + haveInCat) / items.length) * 100);

  const visibleItems = items.slice(0, visibleCount);

  return (
    <div className="card" style={{ contentVisibility: "auto", containIntrinsicSize: "auto 200px" }}>
      {/* Category Header */}
      <button
        onClick={onToggleCollapse}
        className="w-full flex items-center justify-between p-4 min-h-[44px] hover:bg-stone-50 transition-colors"
        aria-expanded={!isCollapsed}
        aria-label={`${category} category: ${items.length} items, ${purchasedInCat + haveInCat} completed`}
      >
        <div className="flex items-center gap-3 flex-1">
          <h2 className="text-sm font-semibold text-stone-700">{category}</h2>
          <div className="flex gap-2 text-xs">
            {needInCat > 0 && <span className="badge bg-amber-100 text-amber-700">{needInCat} need</span>}
            {inListInCat > 0 && <span className="badge bg-blue-100 text-blue-700">{inListInCat} in list</span>}
            {purchasedInCat > 0 && <span className="badge bg-emerald-100 text-emerald-700">{purchasedInCat} ✓</span>}
            {haveInCat > 0 && <span className="badge bg-stone-200 text-stone-600">{haveInCat} have</span>}
          </div>
          <div className="flex items-center gap-2 ml-auto mr-3">
            <div className="w-24 h-1.5 bg-stone-100 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 transition-all" style={{ width: `${progress}%` }} />
            </div>
            <span className="text-xs text-stone-400">{purchasedInCat + haveInCat}/{items.length}</span>
          </div>
        </div>
        {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
      </button>

      {/* Items */}
      {!isCollapsed && (
        <div className="border-t border-stone-100 divide-y divide-stone-100">
          {visibleItems.map((mergedItem, idx) => (
            <MergedItemRow
              key={mergedItem.checklistItem?.id ?? mergedItem.trackedItem?.id ?? `${category}-${idx}`}
              item={mergedItem}
              staggerIndex={idx}
              onTogglePurchased={
                mergedItem.trackedItem
                  ? () => onTogglePurchased(mergedItem.trackedItem!)
                  : undefined
              }
              onEdit={mergedItem.trackedItem ? () => onEdit(mergedItem.trackedItem!) : undefined}
              onDelete={mergedItem.trackedItem ? () => onDelete(mergedItem.trackedItem!) : undefined}
              onQuickAdd={
                mergedItem.checklistItem && mergedItem.status === "need"
                  ? () => onQuickAdd(mergedItem.checklistItem!)
                  : undefined
              }
              onQuickPurchase={
                mergedItem.checklistItem && mergedItem.status === "need"
                  ? () => onQuickPurchase(mergedItem.checklistItem!)
                  : undefined
              }
              onToggleAlreadyHave={
                mergedItem.checklistItem
                  ? () => onToggleAlreadyHave(mergedItem.checklistItem!.id)
                  : undefined
              }
              onToggleSkipped={
                mergedItem.checklistItem
                  ? () => onToggleSkipped(mergedItem.checklistItem!.id)
                  : undefined
              }
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

function MergedItemRow({
  item,
  staggerIndex,
  onTogglePurchased,
  onEdit,
  onDelete,
  onQuickAdd,
  onQuickPurchase,
  onToggleAlreadyHave,
  onToggleSkipped,
}: {
  item: MergedItemType;
  staggerIndex?: number;
  onTogglePurchased?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onQuickAdd?: () => void;
  onQuickPurchase?: () => void;
  onToggleAlreadyHave?: () => void;
  onToggleSkipped?: () => void;
}) {
  const trackedItem = item.trackedItem;
  const checklistItem = item.checklistItem;
  const isFromRegistry = trackedItem?.notes?.includes("From ") || trackedItem?.notes?.includes("Have it");
  const purchasedFrom = isFromRegistry && trackedItem?.notes
    ? (trackedItem.notes.match(/From ([^×(]+)/)?.[1]?.trim() || "Inventory")
    : null;

  return (
    <div
      className={clsx("flex items-center gap-3 px-4 py-3 group animate-toggle", (item.status === "purchased" || item.status === "already-have" || item.status === "skipped") && "opacity-60")}
      style={staggerIndex != null ? { "--stagger-index": Math.min(staggerIndex, 15) } as React.CSSProperties : undefined}
    >
      {/* Status Icon */}
      <div className="shrink-0 animate-toggle">
        {item.status === "purchased" && <CheckCircle2 size={20} className="text-emerald-500" />}
        {item.status === "in-list" && onTogglePurchased && (
          <button onClick={onTogglePurchased} className="text-blue-500 hover:text-emerald-500 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center" aria-label={`Mark ${item.name} as purchased`}>
            <Circle size={20} className="fill-blue-100" />
          </button>
        )}
        {item.status === "already-have" && <PackageCheck size={20} className="text-stone-500" />}
        {item.status === "skipped" && <EyeOff size={20} className="text-stone-300" />}
        {item.status === "need" && <Circle size={20} className="text-stone-300" />}
      </div>

      {/* Item Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={clsx("text-sm font-medium", (item.status === "purchased" || item.status === "already-have" || item.status === "skipped") && "text-stone-400")}>
            {item.name}
          </span>
          {trackedItem && <span className={`badge ${PRIORITY_COLORS[trackedItem.priority]}`}>{trackedItem.priority}</span>}
          {isFromRegistry && purchasedFrom && (
            <span className={clsx(
              "badge text-xs",
              purchasedFrom === "Amazon" ? "bg-orange-100 text-orange-700" : "bg-purple-100 text-purple-700"
            )}>
              📦 {purchasedFrom}
            </span>
          )}
          {!isFromRegistry && item.status === "already-have" && (
            <span className="badge bg-stone-200 text-stone-600">Already have</span>
          )}
          {item.status === "in-list" && <span className="badge bg-blue-100 text-blue-700">In list</span>}
          {item.status === "skipped" && <span className="badge bg-stone-100 text-stone-400">Don&apos;t need</span>}
        </div>
        <div className="flex gap-2 mt-0.5 text-xs text-stone-400 flex-wrap">
          {item.timing && (
            <span className="flex items-center gap-1">
              <Clock size={10} />
              {item.timing}
            </span>
          )}
          {checklistItem?.categoryEn && <span>· {checklistItem.categoryEn}</span>}
          {trackedItem?.notes && <span>· {trackedItem.notes}</span>}
        </div>
        <PhotoThumbnails photos={trackedItem?.photos} />
      </div>

      {/* Cost & Link */}
      {trackedItem?.estimatedCost != null && (
        <span className="text-xs text-stone-400 shrink-0">${trackedItem.estimatedCost}</span>
      )}
      {trackedItem?.link && (
        <a
          href={trackedItem.link}
          target="_blank"
          rel="noopener noreferrer"
          className="text-stone-500 hover:text-sage-600 transition-colors shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center"
          onClick={(e) => e.stopPropagation()}
          aria-label={`Open link for ${item.name} (opens in new tab)`}
        >
          <ExternalLink size={14} />
        </a>
      )}

      {/* Actions */}
      <div className="flex gap-1.5 shrink-0">
        {/* Checklist item actions */}
        {item.status === "need" && onQuickAdd && onQuickPurchase && (
          <>
            <button onClick={onQuickAdd} className="btn-secondary text-xs px-2 py-1">
              <Plus size={12} /> List
            </button>
            <button onClick={onQuickPurchase} className="btn-primary text-xs px-2 py-1">
              <CheckCircle2 size={12} /> Bought
            </button>
            {onToggleAlreadyHave && (
              <button onClick={onToggleAlreadyHave} className="btn-secondary text-xs px-2 py-1">
                <PackageCheck size={12} /> Have
              </button>
            )}
            {onToggleSkipped && (
              <button onClick={onToggleSkipped} className="text-xs text-stone-400 hover:text-stone-500 px-1 py-1" title="Don't need this">
                <X size={12} />
              </button>
            )}
          </>
        )}

        {/* Already have toggle */}
        {item.status === "already-have" && onToggleAlreadyHave && (
          <button onClick={onToggleAlreadyHave} className="text-xs text-stone-400 hover:text-stone-600">
            Undo
          </button>
        )}

        {/* Skipped: undo */}
        {item.status === "skipped" && onToggleSkipped && (
          <button onClick={onToggleSkipped} className="text-xs text-stone-400 hover:text-stone-600">
            Undo
          </button>
        )}

        {/* In-list / purchased: undo via delete (returns to "need" state) */}
        {(item.status === "in-list" || item.status === "purchased") && trackedItem && onDelete && (
          <button onClick={onDelete} className="text-xs text-stone-400 hover:text-stone-600">
            Undo
          </button>
        )}

        {/* Tracked item actions */}
        {trackedItem && (
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
            {onEdit && (
              <button onClick={onEdit} className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded hover:bg-stone-100 text-stone-400" aria-label={`Edit ${item.name}`}>
                <Pencil size={14} />
              </button>
            )}
            {onDelete && (
              <button onClick={onDelete} className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded hover:bg-red-50 text-stone-400 hover:text-red-500" aria-label={`Delete ${item.name}`}>
                <Trash2 size={14} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
