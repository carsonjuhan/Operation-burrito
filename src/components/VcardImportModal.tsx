"use client";

import { useState, useRef } from "react";
import { Modal } from "@/components/Modal";
import {
  parseVCard,
  parseEml,
  extractDateTimeFromText,
  ParsedContact,
} from "@/lib/importParsers";
import { ContactRole, AppointmentType } from "@/types";
import { Upload, UserPlus, Mail, AlertCircle, Calendar } from "lucide-react";
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

const APPOINTMENT_TYPES: AppointmentType[] = [
  "OB / Midwife",
  "Ultrasound",
  "Blood Work",
  "Hospital Tour",
  "Dentist",
  "Specialist",
  "Other",
];

interface ContactRow extends ParsedContact {
  id: string;
  selected: boolean;
  role: ContactRole;
}

interface ApptRow {
  id: string;
  selected: boolean;
  title: string;
  type: AppointmentType;
  date: string;
  time: string;
  provider: string;
  location: string;
  notes: string;
}

type ParseResult =
  | { kind: "contacts"; rows: ContactRow[] }
  | { kind: "appointment"; row: ApptRow };

interface Props {
  onClose: () => void;
  onImportContacts: (
    contacts: Array<{
      name: string;
      role: ContactRole;
      phone: string;
      email: string;
      notes: string;
    }>
  ) => void;
  onImportAppointment?: (appt: {
    title: string;
    type: AppointmentType;
    date: string;
    time: string;
    provider: string;
    location: string;
    notes: string;
    completed: boolean;
  }) => void;
}

export function VcardImportModal({
  onClose,
  onImportContacts,
  onImportAppointment,
}: Props) {
  const [result, setResult] = useState<ParseResult | null>(null);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function processFile(file: File) {
    setError("");
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const name = file.name.toLowerCase();

      try {
        if (name.endsWith(".vcf") || name.endsWith(".vcard")) {
          const contacts = parseVCard(text);
          if (contacts.length === 0) {
            setError("No contacts found in this file.");
            return;
          }
          setResult({
            kind: "contacts",
            rows: contacts.map((c) => ({
              ...c,
              id: crypto.randomUUID(),
              selected: true,
              role: guessRole(c.name, c.notes),
            })),
          });
        } else if (name.endsWith(".eml") || name.endsWith(".txt")) {
          const email = parseEml(text);
          const { date, time } = extractDateTimeFromText(
            `${email.subject} ${email.body}`
          );
          // Email can produce both a contact and an appointment hint
          // Show as appointment if subject looks like one, else contact
          const isAppt =
            /appointment|booking|confirm|schedule|visit|reminder/i.test(
              email.subject
            );

          if (isAppt && onImportAppointment) {
            setResult({
              kind: "appointment",
              row: {
                id: crypto.randomUUID(),
                selected: true,
                title: email.subject || "Appointment",
                type: "Other",
                date,
                time,
                provider: email.fromName || "",
                location: "",
                notes: email.body.slice(0, 300),
              },
            });
          } else {
            // Import sender as contact
            if (!email.fromEmail && !email.fromName) {
              setError("Could not find contact information in this email.");
              return;
            }
            setResult({
              kind: "contacts",
              rows: [
                {
                  id: crypto.randomUUID(),
                  selected: true,
                  name: email.fromName || email.fromEmail.split("@")[0],
                  phone: "",
                  email: email.fromEmail,
                  notes: email.subject ? `Re: ${email.subject}` : "",
                  role: "Other",
                },
              ],
            });
          }
        } else {
          setError(
            "Please upload a .vcf (vCard) or .eml (email) file."
          );
        }
      } catch {
        setError("Could not parse the file. Make sure it's a valid vCard or email file.");
      }
    };
    reader.readAsText(file);
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

  function toggleContact(id: string) {
    if (result?.kind !== "contacts") return;
    setResult({
      ...result,
      rows: result.rows.map((r) =>
        r.id === id ? { ...r, selected: !r.selected } : r
      ),
    });
  }

  function updateRole(id: string, role: ContactRole) {
    if (result?.kind !== "contacts") return;
    setResult({
      ...result,
      rows: result.rows.map((r) => (r.id === id ? { ...r, role } : r)),
    });
  }

  function updateAppt(patch: Partial<ApptRow>) {
    if (result?.kind !== "appointment") return;
    setResult({ ...result, row: { ...result.row, ...patch } });
  }

  function handleImport() {
    if (result?.kind === "contacts") {
      const selected = result.rows.filter((r) => r.selected);
      onImportContacts(
        selected.map(({ name, role, phone, email, notes }) => ({
          name,
          role,
          phone,
          email,
          notes,
        }))
      );
    } else if (result?.kind === "appointment" && onImportAppointment) {
      const { title, type, date, time, provider, location, notes } = result.row;
      onImportAppointment({ title, type, date, time, provider, location, notes, completed: false });
    }
    onClose();
  }

  const canImport =
    result?.kind === "contacts"
      ? result.rows.some((r) => r.selected)
      : result?.kind === "appointment";

  return (
    <Modal title="Import Contact or Email" onClose={onClose}>
      {!result ? (
        <div className="space-y-4">
          <p className="text-sm text-stone-500">
            Upload a <strong>.vcf</strong> vCard file to import contacts, or an{" "}
            <strong>.eml</strong> email file to extract a contact or appointment.
          </p>

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
            <div className="flex justify-center gap-3 mb-3">
              <UserPlus size={28} className="text-stone-300" />
              <Mail size={28} className="text-stone-300" />
            </div>
            <p className="text-sm font-medium text-stone-600">
              Drop .vcf or .eml file here, or click to browse
            </p>
            <p className="text-xs text-stone-400 mt-1">
              Supported: vCard (.vcf), Email (.eml)
            </p>
            <input
              ref={inputRef}
              type="file"
              accept=".vcf,.vcard,.eml,.txt"
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
      ) : result.kind === "contacts" ? (
        // ── Contact review ────────────────────────────────────────────────
        <div className="space-y-4">
          <p className="text-sm text-stone-500">
            {result.rows.length} contact{result.rows.length !== 1 ? "s" : ""} found.
            Review and assign roles before importing.
          </p>
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {result.rows.map((row) => (
              <div
                key={row.id}
                className={clsx(
                  "rounded-lg border p-3 transition-colors",
                  row.selected
                    ? "border-sage-300 bg-sage-50"
                    : "border-stone-100 bg-white opacity-60"
                )}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={row.selected}
                    onChange={() => toggleContact(row.id)}
                    className="mt-1 rounded border-stone-300"
                  />
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <p className="text-sm font-semibold text-stone-800">{row.name}</p>
                    <div className="flex flex-wrap gap-2 text-xs text-stone-500">
                      {row.phone && <span>{row.phone}</span>}
                      {row.email && <span>{row.email}</span>}
                      {row.notes && <span className="text-stone-400">{row.notes}</span>}
                    </div>
                    {row.selected && (
                      <select
                        className="text-xs border border-stone-200 rounded-md px-2 py-1 bg-white w-full"
                        value={row.role}
                        onChange={(e) =>
                          updateRole(row.id, e.target.value as ContactRole)
                        }
                      >
                        {ROLES.map((r) => (
                          <option key={r}>{r}</option>
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
              disabled={!canImport}
              className="btn-primary flex-1 justify-center disabled:opacity-40"
            >
              <Upload size={15} />
              Import {result.rows.filter((r) => r.selected).length} contact
              {result.rows.filter((r) => r.selected).length !== 1 ? "s" : ""}
            </button>
            <button onClick={() => setResult(null)} className="btn-secondary flex-1 justify-center">
              Choose different file
            </button>
          </div>
        </div>
      ) : (
        // ── Appointment review ────────────────────────────────────────────
        <div className="space-y-4">
          <p className="text-sm text-stone-500">
            This email looks like an appointment confirmation. Review details before
            adding.
          </p>
          <div className="rounded-lg border border-sage-300 bg-sage-50 p-4 space-y-3">
            <div>
              <label className="label">Title</label>
              <input
                className="input"
                value={result.row.title}
                onChange={(e) => updateAppt({ title: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Type</label>
                <select
                  className="select"
                  value={result.row.type}
                  onChange={(e) =>
                    updateAppt({ type: e.target.value as AppointmentType })
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
                  value={result.row.date}
                  onChange={(e) => updateAppt({ date: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Time</label>
                <input
                  className="input"
                  type="time"
                  value={result.row.time}
                  onChange={(e) => updateAppt({ time: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Provider</label>
                <input
                  className="input"
                  value={result.row.provider}
                  onChange={(e) => updateAppt({ provider: e.target.value })}
                />
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleImport}
              className="btn-primary flex-1 justify-center"
            >
              <Calendar size={15} />
              Add to Appointments
            </button>
            <button
              onClick={() => setResult(null)}
              className="btn-secondary flex-1 justify-center"
            >
              Choose different file
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function guessRole(name: string, notes: string): ContactRole {
  const t = `${name} ${notes}`.toLowerCase();
  if (t.includes("hospital") || t.includes("maternity") || t.includes("bc women")) return "Hospital";
  if (t.includes("ob") || t.includes("doctor") || t.includes("dr.") || t.includes("physician")) return "OB / Doctor";
  if (t.includes("midwife") || t.includes("midwifery")) return "Midwife";
  if (t.includes("doula")) return "Doula";
  if (t.includes("pediatri")) return "Pediatrician";
  return "Other";
}
