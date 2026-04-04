"use client";

import { useState, useMemo } from "react";
import { useStoreContext } from "@/contexts/StoreContext";
import { BagItem, BagCategory } from "@/types";
import { Modal } from "@/components/Modal";
import { ReceiptImportModal } from "@/components/ReceiptImportModal";
import { EmptyState } from "@/components/EmptyState";
import { Plus, Pencil, Trash2, Package, ScanLine } from "lucide-react";
import clsx from "clsx";

const CATEGORIES: BagCategory[] = [
  "Clothing — Mom",
  "Clothing — Baby",
  "Documents",
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

export default function HospitalBagPage() {
  const { store, loaded, updateBagItem, addBagItem, deleteBagItem } = useStoreContext();
  const [showModal, setShowModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [editing, setEditing] = useState<BagItem | null>(null);
  const [form, setForm] = useState(DEFAULT_FORM);

  if (!loaded) return null;

  const { hospitalBag } = store;

  const packed = hospitalBag.filter((i) => i.packed).length;
  const total = hospitalBag.length;
  const percent = total > 0 ? Math.round((packed / total) * 100) : 0;

  const grouped = useMemo(() => {
    const groups: Partial<Record<BagCategory, BagItem[]>> = {};
    for (const item of hospitalBag) {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category]!.push(item);
    }
    return groups;
  }, [hospitalBag]);

  const allPacked = total > 0 && packed === total;

  function handlePackAll() {
    hospitalBag.forEach((item) => {
      if (!item.packed) updateBagItem(item.id, { packed: true });
    });
  }

  function handleUnpackAll() {
    hospitalBag.forEach((item) => {
      if (item.packed) updateBagItem(item.id, { packed: false });
    });
  }

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

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">Hospital Bag</h1>
          <p className="text-sm text-stone-400 mt-1">
            {packed} of {total} packed
          </p>
        </div>
        <div className="flex items-center gap-2">
          {total > 0 && (
            <button
              onClick={allPacked ? handleUnpackAll : handlePackAll}
              className="btn-secondary"
            >
              {allPacked ? "Unpack All" : "Pack All"}
            </button>
          )}
          <button onClick={() => setShowReceiptModal(true)} className="btn-secondary">
            <ScanLine size={16} /> Scan Receipt
          </button>
          <button onClick={openAdd} className="btn-primary">
            <Plus size={16} /> Add Item
          </button>
        </div>
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <div className="card p-4 mb-6">
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
      {hospitalBag.length === 0 ? (
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
        <div className="space-y-4">
          {(Object.keys(grouped) as BagCategory[]).map((cat) => (
            <div key={cat}>
              <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-2 px-1">
                {cat}
                <span className="ml-2 normal-case font-normal">
                  ({grouped[cat]!.filter((i) => i.packed).length}/{grouped[cat]!.length})
                </span>
              </h2>
              <div className="card divide-y divide-stone-100">
                {grouped[cat]!.map((item) => (
                  <BagItemRow
                    key={item.id}
                    item={item}
                    onToggle={() => updateBagItem(item.id, { packed: !item.packed })}
                    onEdit={() => openEdit(item)}
                    onDelete={() => deleteBagItem(item.id)}
                  />
                ))}
              </div>
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
                  {CATEGORIES.map((c) => (
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
                placeholder="Any details…"
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
    </div>
  );
}

function BagItemRow({
  item,
  onToggle,
  onEdit,
  onDelete,
}: {
  item: BagItem;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className={clsx("flex items-center gap-3 px-4 py-3 group", item.packed && "opacity-60")}>
      <button
        onClick={onToggle}
        className="shrink-0 text-stone-300 hover:text-emerald-500 transition-colors"
        title={item.packed ? "Mark as unpacked" : "Mark as packed"}
      >
        <Package
          size={18}
          className={clsx(item.packed ? "text-emerald-500 fill-emerald-100" : "text-stone-300")}
        />
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={clsx(
              "text-sm font-medium",
              item.packed ? "line-through text-stone-400" : "text-stone-700"
            )}
          >
            {item.name}
          </span>
          {item.quantity != null && (
            <span className="badge bg-stone-100 text-stone-500">×{item.quantity}</span>
          )}
        </div>
        {item.notes && (
          <p className="text-xs text-stone-400 mt-0.5 truncate">{item.notes}</p>
        )}
      </div>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button
          onClick={onEdit}
          className="p-1.5 rounded hover:bg-stone-100 text-stone-400"
        >
          <Pencil size={14} />
        </button>
        <button
          onClick={onDelete}
          className="p-1.5 rounded hover:bg-red-50 text-stone-400 hover:text-red-500"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}
