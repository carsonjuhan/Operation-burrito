"use client";

import { useState, useMemo } from "react";
import { useStoreContext } from "@/contexts/StoreContext";
import { BabyItem, ItemCategory, ItemPriority } from "@/types";
import { Modal } from "@/components/Modal";
import { ReceiptImportModal } from "@/components/ReceiptImportModal";
import { CsvImportModal } from "@/components/CsvImportModal";
import { EmptyState } from "@/components/EmptyState";
import { Plus, CheckCircle2, Circle, Pencil, Trash2, ExternalLink, Filter, ScanLine, ShoppingBag, Table2 } from "lucide-react";
import clsx from "clsx";

const CATEGORIES: ItemCategory[] = [
  "Nursery", "Clothing", "Feeding", "Safety", "Travel",
  "Health & Hygiene", "Toys & Gear", "Postpartum", "Other",
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
};

export default function ItemsPage() {
  const { store, loaded, addItem, updateItem, deleteItem, addBagItem } = useStoreContext();
  const registryUrl = store.registryUrl ?? "";
  const [showModal, setShowModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [editing, setEditing] = useState<BabyItem | null>(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [filterCategory, setFilterCategory] = useState<ItemCategory | "All">("All");
  const [filterPriority, setFilterPriority] = useState<ItemPriority | "All">("All");
  const [filterStatus, setFilterStatus] = useState<"All" | "Purchased" | "Needed">("All");

  if (!loaded) return null;

  const { items } = store;

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (filterCategory !== "All" && item.category !== filterCategory) return false;
      if (filterPriority !== "All" && item.priority !== filterPriority) return false;
      if (filterStatus === "Purchased" && !item.purchased) return false;
      if (filterStatus === "Needed" && item.purchased) return false;
      return true;
    });
  }, [items, filterCategory, filterPriority, filterStatus]);

  const grouped = useMemo(() => {
    const groups: Partial<Record<ItemCategory, BabyItem[]>> = {};
    for (const item of filtered) {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category]!.push(item);
    }
    return groups;
  }, [filtered]);

  const totalCost = items
    .filter((i) => !i.purchased && i.estimatedCost)
    .reduce((sum, i) => sum + (i.estimatedCost ?? 0), 0);

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
    };
    if (editing) {
      updateItem(editing.id, payload);
    } else {
      addItem(payload);
    }
    setShowModal(false);
  }

  const purchased = items.filter((i) => i.purchased).length;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">Baby Items</h1>
          <p className="text-sm text-stone-400 mt-1">
            {purchased} of {items.length} purchased
            {totalCost > 0 && ` · ~$${totalCost.toFixed(0)} still needed`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {registryUrl && (
            <a href={registryUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary">
              <ShoppingBag size={16} /> View Registry
            </a>
          )}
          <button onClick={() => setShowCsvModal(true)} className="btn-secondary">
            <Table2 size={16} /> Import Spreadsheet
          </button>
          <button onClick={() => setShowReceiptModal(true)} className="btn-secondary">
            <ScanLine size={16} /> Scan Receipt
          </button>
          <button onClick={openAdd} className="btn-primary">
            <Plus size={16} /> Add Item
          </button>
        </div>
      </div>

      {/* Filters */}
      {items.length > 0 && (
        <div className="card p-4 mb-6 flex flex-wrap gap-3 items-center">
          <Filter size={14} className="text-stone-400" />
          <div className="flex items-center gap-2">
            <span className="text-xs text-stone-500">Category</span>
            <select
              className="text-xs border border-stone-200 rounded-md px-2 py-1 bg-white focus:outline-none"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value as ItemCategory | "All")}
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
            >
              <option value="All">All</option>
              {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-stone-500">Status</span>
            <select
              className="text-xs border border-stone-200 rounded-md px-2 py-1 bg-white focus:outline-none"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
            >
              <option value="All">All</option>
              <option value="Needed">Needed</option>
              <option value="Purchased">Purchased</option>
            </select>
          </div>
        </div>
      )}

      {/* Content */}
      {items.length === 0 ? (
        <EmptyState
          icon="🛒"
          title="No items yet"
          description="Start adding baby items you need to purchase — nursery, clothing, gear, and more."
          action={
            <button onClick={openAdd} className="btn-primary">
              <Plus size={16} /> Add your first item
            </button>
          }
        />
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-stone-400 text-sm">No items match the current filters.</div>
      ) : (
        <div className="space-y-6">
          {(Object.keys(grouped) as ItemCategory[]).map((cat) => (
            <div key={cat}>
              <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-2 px-1">{cat}</h2>
              <div className="card divide-y divide-stone-100">
                {grouped[cat]!.map((item) => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    onToggle={() => updateItem(item.id, { purchased: !item.purchased })}
                    onEdit={() => openEdit(item)}
                    onDelete={() => deleteItem(item.id)}
                  />
                ))}
              </div>
            </div>
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
    </div>
  );
}

function ItemRow({
  item,
  onToggle,
  onEdit,
  onDelete,
}: {
  item: BabyItem;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className={clsx("flex items-center gap-3 px-4 py-3 group", item.purchased && "opacity-60")}>
      <button onClick={onToggle} className="shrink-0 text-stone-400 hover:text-emerald-500 transition-colors">
        {item.purchased ? (
          <CheckCircle2 size={20} className="text-emerald-500" />
        ) : (
          <Circle size={20} />
        )}
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={clsx("text-sm font-medium", item.purchased && "line-through text-stone-400")}>
            {item.name}
          </span>
          <span className={`badge ${PRIORITY_COLORS[item.priority]}`}>{item.priority}</span>
        </div>
        {item.notes && <p className="text-xs text-stone-400 mt-0.5 truncate">{item.notes}</p>}
      </div>
      {item.estimatedCost != null && (
        <span className="text-xs text-stone-400 shrink-0">${item.estimatedCost}</span>
      )}
      {item.link && (
        <a
          href={item.link}
          target="_blank"
          rel="noopener noreferrer"
          className="text-stone-300 hover:text-sage-600 transition-colors shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink size={14} />
        </a>
      )}
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={onEdit} className="p-1.5 rounded hover:bg-stone-100 text-stone-400">
          <Pencil size={14} />
        </button>
        <button onClick={onDelete} className="p-1.5 rounded hover:bg-red-50 text-stone-400 hover:text-red-500">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}
