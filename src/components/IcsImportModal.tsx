"use client";

import { useState, useRef } from "react";
import { Modal } from "@/components/Modal";
import { parseIcs, ParsedEvent } from "@/lib/importParsers";
import { AppointmentType } from "@/types";
import { Upload, Calendar, AlertCircle } from "lucide-react";
import clsx from "clsx";

const APPOINTMENT_TYPES: AppointmentType[] = [
  "OB / Midwife",
  "Ultrasound",
  "Blood Work",
  "Hospital Tour",
  "Dentist",
  "Specialist",
  "Other",
];

interface ImportRow extends ParsedEvent {
  id: string;
  selected: boolean;
  type: AppointmentType;
}

interface Props {
  onClose: () => void;
  onImport: (
    events: Array<{
      title: string;
      type: AppointmentType;
      date: string;
      time: string;
      provider: string;
      location: string;
      notes: string;
      completed: boolean;
    }>
  ) => void;
}

export function IcsImportModal({ onClose, onImport }: Props) {
  const [rows, setRows] = useState<ImportRow[] | null>(null);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function processFile(file: File) {
    setError("");
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      try {
        const events = parseIcs(text);
        if (events.length === 0) {
          setError("No events found in this file.");
          return;
        }
        setRows(
          events.map((ev) => ({
            ...ev,
            id: crypto.randomUUID(),
            selected: true,
            type: guessType(ev.title),
          }))
        );
      } catch {
        setError("Could not parse the .ics file. Make sure it's a valid calendar file.");
      }
    };
    reader.readAsText(file);
  }

  function handleFile(file: File) {
    if (!file.name.toLowerCase().endsWith(".ics") && file.type !== "text/calendar") {
      setError("Please upload a .ics calendar file.");
      return;
    }
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

  function updateType(id: string, type: AppointmentType) {
    setRows((prev) =>
      prev ? prev.map((r) => (r.id === id ? { ...r, type } : r)) : prev
    );
  }

  function handleImport() {
    const selected = (rows ?? []).filter((r) => r.selected);
    onImport(
      selected.map(({ title, type, date, time, provider, location, notes }) => ({
        title,
        type,
        date,
        time,
        provider,
        location,
        notes,
        completed: false,
      }))
    );
    onClose();
  }

  const selectedCount = (rows ?? []).filter((r) => r.selected).length;

  return (
    <Modal title="Import from Calendar (.ics)" onClose={onClose}>
      {!rows ? (
        <div className="space-y-4">
          <p className="text-sm text-stone-500">
            Upload an <strong>.ics</strong> file exported from Google Calendar, Apple
            Calendar, or any app that supports iCalendar.
          </p>

          {/* Drop zone */}
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
            <Calendar size={32} className="mx-auto text-stone-300 mb-3" />
            <p className="text-sm font-medium text-stone-600">
              Drop .ics file here or click to browse
            </p>
            <input
              ref={inputRef}
              type="file"
              accept=".ics,text/calendar"
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
        <div className="space-y-4">
          <p className="text-sm text-stone-500">
            {rows.length} event{rows.length !== 1 ? "s" : ""} found. Select which to
            import and assign appointment types.
          </p>

          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {rows.map((row) => (
              <div
                key={row.id}
                className={clsx(
                  "rounded-lg border p-3 transition-colors",
                  row.selected ? "border-sage-300 bg-sage-50" : "border-stone-100 bg-white opacity-60"
                )}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={row.selected}
                    onChange={() => toggleRow(row.id)}
                    className="mt-1 rounded border-stone-300"
                  />
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <p className="text-sm font-medium text-stone-800 truncate">{row.title}</p>
                    <div className="flex flex-wrap gap-2 text-xs text-stone-500">
                      {row.date && <span>{row.date}{row.time ? ` · ${row.time}` : ""}</span>}
                      {row.provider && <span>· {row.provider}</span>}
                      {row.location && <span>· {row.location}</span>}
                    </div>
                    {row.selected && (
                      <select
                        className="text-xs border border-stone-200 rounded-md px-2 py-1 bg-white w-full"
                        value={row.type}
                        onChange={(e) => updateType(row.id, e.target.value as AppointmentType)}
                      >
                        {APPOINTMENT_TYPES.map((t) => (
                          <option key={t}>{t}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3 pt-1">
            <button
              onClick={handleImport}
              disabled={selectedCount === 0}
              className="btn-primary flex-1 justify-center disabled:opacity-40"
            >
              <Upload size={15} />
              Import {selectedCount > 0 ? `${selectedCount} event${selectedCount !== 1 ? "s" : ""}` : ""}
            </button>
            <button onClick={() => setRows(null)} className="btn-secondary flex-1 justify-center">
              Choose different file
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

// Guess appointment type from event title keywords
function guessType(title: string): AppointmentType {
  const t = title.toLowerCase();
  if (t.includes("ultrasound") || t.includes("scan") || t.includes("anatomy")) return "Ultrasound";
  if (t.includes("blood") || t.includes("lab") || t.includes("gbs")) return "Blood Work";
  if (t.includes("tour") || t.includes("hospital")) return "Hospital Tour";
  if (t.includes("dentist") || t.includes("dental")) return "Dentist";
  if (t.includes("specialist") || t.includes("consult")) return "Specialist";
  if (t.includes("ob") || t.includes("midwife") || t.includes("prenatal")) return "OB / Midwife";
  return "Other";
}
