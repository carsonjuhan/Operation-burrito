"use client";

import { useState, useMemo } from "react";
import { useStoreContext } from "@/contexts/StoreContext";
import { Contact, ContactRole } from "@/types";
import { Modal } from "@/components/Modal";
import { EmptyState } from "@/components/EmptyState";
import { Plus, Pencil, Trash2, Phone, Mail } from "lucide-react";
import clsx from "clsx";

const ROLES: ContactRole[] = [
  "OB / Doctor",
  "Midwife",
  "Doula",
  "Hospital",
  "Pediatrician",
  "Partner",
  "Family",
  "Other",
];

const ROLE_COLORS: Record<ContactRole, string> = {
  "OB / Doctor": "bg-violet-100 text-violet-700",
  "Midwife": "bg-rose-100 text-rose-700",
  "Doula": "bg-emerald-100 text-emerald-700",
  "Hospital": "bg-sky-100 text-sky-700",
  "Pediatrician": "bg-amber-100 text-amber-700",
  "Partner": "bg-pink-100 text-pink-700",
  "Family": "bg-orange-100 text-orange-700",
  "Other": "bg-stone-100 text-stone-600",
};

const ROLE_SORT_ORDER: Record<ContactRole, number> = {
  "Hospital": 0,
  "OB / Doctor": 1,
  "Midwife": 2,
  "Doula": 3,
  "Pediatrician": 4,
  "Partner": 5,
  "Family": 6,
  "Other": 7,
};

const DEFAULT_FORM = {
  name: "",
  role: "Other" as ContactRole,
  phone: "",
  email: "",
  notes: "",
};

export default function ContactsPage() {
  const { store, loaded, addContact, updateContact, deleteContact } = useStoreContext();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [form, setForm] = useState(DEFAULT_FORM);

  if (!loaded) return null;

  const { contacts } = store;

  const sorted = useMemo(
    () =>
      [...contacts].sort(
        (a, b) => ROLE_SORT_ORDER[a.role] - ROLE_SORT_ORDER[b.role]
      ),
    [contacts]
  );

  function openAdd() {
    setEditing(null);
    setForm(DEFAULT_FORM);
    setShowModal(true);
  }

  function openEdit(contact: Contact) {
    setEditing(contact);
    setForm({
      name: contact.name,
      role: contact.role,
      phone: contact.phone,
      email: contact.email,
      notes: contact.notes,
    });
    setShowModal(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      name: form.name.trim(),
      role: form.role,
      phone: form.phone.trim(),
      email: form.email.trim(),
      notes: form.notes.trim(),
    };
    if (editing) {
      updateContact(editing.id, payload);
    } else {
      addContact(payload);
    }
    setShowModal(false);
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">Key Contacts</h1>
          <p className="text-sm text-stone-400 mt-1">
            {contacts.length} contact{contacts.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button onClick={openAdd} className="btn-primary">
          <Plus size={16} /> Add Contact
        </button>
      </div>

      {/* Content */}
      {contacts.length === 0 ? (
        <EmptyState
          icon="📇"
          title="No contacts yet"
          description="Save your OB, midwife, doula, hospital, and other important people in one place."
          action={
            <button onClick={openAdd} className="btn-primary">
              <Plus size={16} /> Add your first contact
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {sorted.map((contact) => (
            <ContactCard
              key={contact.id}
              contact={contact}
              onEdit={() => openEdit(contact)}
              onDelete={() => deleteContact(contact.id)}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <Modal
          title={editing ? "Edit Contact" : "Add Contact"}
          onClose={() => setShowModal(false)}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Name *</label>
              <input
                className="input"
                required
                placeholder="e.g. Dr. Sarah Nguyen"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Role</label>
              <select
                className="select"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as ContactRole })}
              >
                {ROLES.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Phone</label>
              <input
                className="input"
                type="tel"
                placeholder="e.g. (555) 123-4567"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Email</label>
              <input
                className="input"
                type="email"
                placeholder="e.g. doctor@clinic.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Notes</label>
              <textarea
                className="textarea"
                rows={3}
                placeholder="Office hours, after-hours line, special instructions…"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" className="btn-primary flex-1 justify-center">
                {editing ? "Save Changes" : "Add Contact"}
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

function ContactCard({
  contact,
  onEdit,
  onDelete,
}: {
  contact: Contact;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="card p-4 group">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-sm font-semibold text-stone-800">{contact.name}</span>
            <span className={clsx("badge", ROLE_COLORS[contact.role])}>{contact.role}</span>
          </div>

          <div className="space-y-1.5 mt-2">
            {contact.phone && (
              <a
                href={`tel:${contact.phone}`}
                className="flex items-center gap-2 text-xs text-stone-500 hover:text-emerald-600 transition-colors"
              >
                <Phone size={12} className="shrink-0 text-stone-400" />
                {contact.phone}
              </a>
            )}
            {contact.email && (
              <a
                href={`mailto:${contact.email}`}
                className="flex items-center gap-2 text-xs text-stone-500 hover:text-emerald-600 transition-colors"
              >
                <Mail size={12} className="shrink-0 text-stone-400" />
                <span className="truncate">{contact.email}</span>
              </a>
            )}
            {contact.notes && (
              <p className="text-xs text-stone-400 mt-2 whitespace-pre-wrap">{contact.notes}</p>
            )}
          </div>
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
    </div>
  );
}
