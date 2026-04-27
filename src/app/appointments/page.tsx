"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useStoreContext } from "@/contexts/StoreContext";
import { Appointment, AppointmentType } from "@/types";
import { Modal } from "@/components/Modal";
import { IcsImportModal } from "@/components/IcsImportModal";
import { EmptyState } from "@/components/EmptyState";
import { useUndoDelete } from "@/hooks/useUndoDelete";
import { Plus, Pencil, Trash2, MapPin, CheckCircle2, Circle, CalendarPlus, Download } from "lucide-react";
import clsx from "clsx";
import { PageTransition } from "@/components/PageTransition";
import calendarData from "../../../data/calendar_events.json";

const APPOINTMENT_TYPES: AppointmentType[] = [
  "OB / Midwife",
  "Ultrasound",
  "Blood Work",
  "Hospital Tour",
  "Dentist",
  "Specialist",
  "Other",
];

const TYPE_COLORS: Record<AppointmentType, string> = {
  "OB / Midwife": "bg-violet-100 text-violet-700",
  "Ultrasound": "bg-sky-100 text-sky-700",
  "Blood Work": "bg-red-100 text-red-700",
  "Hospital Tour": "bg-emerald-100 text-emerald-700",
  "Dentist": "bg-amber-100 text-amber-700",
  "Specialist": "bg-rose-100 text-rose-700",
  "Other": "bg-stone-100 text-stone-600",
};

const DEFAULT_FORM = {
  title: "",
  type: "OB / Midwife" as AppointmentType,
  date: "",
  time: "",
  provider: "",
  location: "",
  notes: "",
  completed: false,
};

export default function AppointmentsPage() {
  const { store, loaded, addAppointment, updateAppointment, deleteAppointment, restoreAppointment } =
    useStoreContext();
  const { handleDelete: handleUndoDelete } = useUndoDelete<Appointment>(deleteAppointment, restoreAppointment, (a) => a.title);
  const [showModal, setShowModal] = useState(false);
  const [showIcsModal, setShowIcsModal] = useState(false);
  const [editing, setEditing] = useState<Appointment | null>(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const hasImportedRef = useRef(false);

  // Auto-import calendar appointments on first load if store is empty
  useEffect(() => {
    if (!loaded || hasImportedRef.current) return;
    if (store.appointments.length > 0) {
      hasImportedRef.current = true;
      return;
    }
    for (const appt of calendarData.appointments) {
      addAppointment({
        title: appt.title,
        type: appt.type as AppointmentType,
        date: appt.date,
        time: appt.time,
        provider: appt.provider,
        location: appt.location,
        notes: appt.notes,
        completed: appt.completed,
      });
    }
    hasImportedRef.current = true;
  }, [loaded]); // eslint-disable-line react-hooks/exhaustive-deps

  const upcoming = useMemo(
    () =>
      store.appointments
        .filter((a) => !a.completed)
        .sort((a, b) => (a.date > b.date ? 1 : a.date < b.date ? -1 : 0)),
    [store.appointments]
  );

  const past = useMemo(
    () =>
      store.appointments
        .filter((a) => a.completed)
        .sort((a, b) => (a.date > b.date ? -1 : a.date < b.date ? 1 : 0)),
    [store.appointments]
  );

  if (!loaded) return null;

  const { appointments } = store;

  function openAdd() {
    setEditing(null);
    setForm(DEFAULT_FORM);
    setShowModal(true);
  }

  function openEdit(appt: Appointment) {
    setEditing(appt);
    setForm({
      title: appt.title,
      type: appt.type,
      date: appt.date,
      time: appt.time,
      provider: appt.provider,
      location: appt.location,
      notes: appt.notes,
      completed: appt.completed,
    });
    setShowModal(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      title: form.title.trim(),
      type: form.type,
      date: form.date,
      time: form.time,
      provider: form.provider.trim(),
      location: form.location.trim(),
      notes: form.notes.trim(),
      completed: form.completed,
    };
    if (editing) {
      updateAppointment(editing.id, payload);
    } else {
      addAppointment(payload);
    }
    setShowModal(false);
  }

  function handleImportCalendar() {
    let imported = 0;
    for (const appt of calendarData.appointments) {
      // Skip duplicates by matching title + date
      const exists = store.appointments.some(
        (a) => a.title === appt.title && a.date === appt.date
      );
      if (exists) continue;
      addAppointment({
        title: appt.title,
        type: appt.type as AppointmentType,
        date: appt.date,
        time: appt.time,
        provider: appt.provider,
        location: appt.location,
        notes: appt.notes,
        completed: appt.completed,
      });
      imported++;
    }
    alert(`Imported ${imported} new appointment${imported !== 1 ? "s" : ""}. ${calendarData.appointments.length - imported} skipped (already exist).`);
  }

  return (
    <PageTransition className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">Appointments</h1>
          <p className="text-sm text-stone-400 mt-1">
            {appointments.length} appointment{appointments.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleImportCalendar} className="btn-secondary">
            <Download size={16} /> Import Calendar
          </button>
          <button onClick={() => setShowIcsModal(true)} className="btn-secondary">
            <CalendarPlus size={16} /> Import .ics
          </button>
          <button onClick={openAdd} className="btn-primary">
            <Plus size={16} /> Add Appointment
          </button>
        </div>
      </div>

      {/* Content */}
      {appointments.length === 0 ? (
        <EmptyState
          icon="📅"
          title="No appointments yet"
          description="Track OB visits, ultrasounds, blood work, hospital tours, and any other prenatal appointments."
          action={
            <button onClick={openAdd} className="btn-primary">
              <Plus size={16} /> Add your first appointment
            </button>
          }
        />
      ) : (
        <div className="space-y-6">
          {upcoming.length > 0 && (
            <Section title="Upcoming">
              {upcoming.map((appt) => (
                <AppointmentCard
                  key={appt.id}
                  appt={appt}
                  onToggle={() =>
                    updateAppointment(appt.id, { completed: !appt.completed })
                  }
                  onEdit={() => openEdit(appt)}
                  onDelete={() => handleUndoDelete(appt)}
                />
              ))}
            </Section>
          )}
          {past.length > 0 && (
            <Section title="Past">
              {past.map((appt) => (
                <AppointmentCard
                  key={appt.id}
                  appt={appt}
                  onToggle={() =>
                    updateAppointment(appt.id, { completed: !appt.completed })
                  }
                  onEdit={() => openEdit(appt)}
                  onDelete={() => handleUndoDelete(appt)}
                />
              ))}
            </Section>
          )}
        </div>
      )}

      {/* ICS Import Modal */}
      {showIcsModal && (
        <IcsImportModal
          onClose={() => setShowIcsModal(false)}
          onImport={(events) => events.forEach((ev) => addAppointment(ev))}
        />
      )}

      {/* Modal */}
      {showModal && (
        <Modal
          title={editing ? "Edit Appointment" : "Add Appointment"}
          onClose={() => setShowModal(false)}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Title *</label>
              <input
                className="input"
                required
                placeholder="e.g. 20-week anatomy scan"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Type</label>
                <select
                  className="select"
                  value={form.type}
                  onChange={(e) =>
                    setForm({ ...form, type: e.target.value as AppointmentType })
                  }
                >
                  {APPOINTMENT_TYPES.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Date</label>
                <input
                  className="input"
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Time</label>
                <input
                  className="input"
                  type="time"
                  value={form.time}
                  onChange={(e) => setForm({ ...form, time: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Provider</label>
                <input
                  className="input"
                  placeholder="e.g. Dr. Smith"
                  value={form.provider}
                  onChange={(e) => setForm({ ...form, provider: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="label">Location</label>
              <input
                className="input"
                placeholder="Clinic name or address"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Notes</label>
              <textarea
                className="textarea"
                rows={3}
                placeholder="Questions to ask, things to bring…"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.completed}
                onChange={(e) => setForm({ ...form, completed: e.target.checked })}
                className="rounded border-stone-300 text-sage-600 focus:ring-sage-400"
              />
              <span className="text-sm text-stone-600">Mark as completed</span>
            </label>
            <div className="flex gap-3 pt-2">
              <button type="submit" className="btn-primary flex-1 justify-center">
                {editing ? "Save Changes" : "Add Appointment"}
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-2 px-1">
        {title}
      </h2>
      <div className="card divide-y divide-stone-100">{children}</div>
    </div>
  );
}

function AppointmentCard({
  appt,
  onToggle,
  onEdit,
  onDelete,
}: {
  appt: Appointment;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const formattedDate =
    appt.date
      ? new Date(appt.date + "T12:00:00").toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : null;

  const formattedTime = appt.time
    ? new Date(`1970-01-01T${appt.time}`).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      })
    : null;

  return (
    <div className={clsx("p-4 group", appt.completed && "opacity-70")}>
      <div className="flex items-start gap-3">
        <button
          onClick={onToggle}
          className="mt-0.5 shrink-0 text-stone-400 hover:text-emerald-500 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label={appt.completed ? `Mark ${appt.title} as upcoming` : `Mark ${appt.title} as completed`}
        >
          {appt.completed ? (
            <CheckCircle2 size={20} className="text-emerald-500" />
          ) : (
            <Circle size={20} />
          )}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span
              className={clsx(
                "text-sm font-semibold text-stone-700",
                appt.completed && "line-through text-stone-400"
              )}
            >
              {appt.title}
            </span>
            <span className={`badge ${TYPE_COLORS[appt.type]}`}>{appt.type}</span>
          </div>
          <div className="flex flex-wrap gap-3 mt-1">
            {(formattedDate || formattedTime) && (
              <span className="text-xs text-stone-500">
                {[formattedDate, formattedTime].filter(Boolean).join(" · ")}
              </span>
            )}
            {appt.provider && (
              <span className="text-xs text-stone-400">{appt.provider}</span>
            )}
            {appt.location && (
              <span className="flex items-center gap-1 text-xs text-stone-400">
                <MapPin size={11} />
                {appt.location}
              </span>
            )}
          </div>
          {appt.notes && (
            <p className="text-xs text-stone-500 mt-2 whitespace-pre-wrap">{appt.notes}</p>
          )}
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity shrink-0">
          <button
            onClick={onEdit}
            className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded hover:bg-stone-100 text-stone-400"
            aria-label={`Edit ${appt.title}`}
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={onDelete}
            className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded hover:bg-red-50 text-stone-400 hover:text-red-500"
            aria-label={`Delete ${appt.title}`}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
