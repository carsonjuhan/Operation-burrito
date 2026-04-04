// ── ICS (iCalendar) parser ────────────────────────────────────────────────────

export interface ParsedEvent {
  title: string;
  date: string;   // YYYY-MM-DD
  time: string;   // HH:MM (24h) or ""
  location: string;
  notes: string;
  provider: string;
}

function parseIcsDateValue(value: string): { date: string; time: string } {
  // Handle TZID param: "20260415T100000" after stripping TZID prefix
  // Handle UTC: "20260415T100000Z"
  // Handle date-only: "20260415"
  const raw = value.replace(/Z$/, "");

  if (raw.includes("T")) {
    const [d, t] = raw.split("T");
    return {
      date: `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`,
      time: `${t.slice(0, 2)}:${t.slice(2, 4)}`,
    };
  }
  return {
    date: `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`,
    time: "",
  };
}

function unfoldLines(raw: string): string[] {
  return raw
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n[ \t]/g, "") // RFC 5545 line folding
    .split("\n");
}

function unescapeIcs(s: string): string {
  return s.replace(/\\n/g, "\n").replace(/\\,/g, ",").replace(/\\\\/g, "\\");
}

export function parseIcs(text: string): ParsedEvent[] {
  const lines = unfoldLines(text);
  const events: ParsedEvent[] = [];
  let inEvent = false;
  let cur: Partial<ParsedEvent> & { date?: string; time?: string } = {};

  for (const line of lines) {
    const upper = line.toUpperCase();

    if (upper === "BEGIN:VEVENT") {
      inEvent = true;
      cur = {};
      continue;
    }
    if (upper === "END:VEVENT") {
      if (cur.title) {
        events.push({
          title: cur.title ?? "",
          date: cur.date ?? "",
          time: cur.time ?? "",
          location: cur.location ?? "",
          notes: cur.notes ?? "",
          provider: cur.provider ?? "",
        });
      }
      inEvent = false;
      continue;
    }
    if (!inEvent) continue;

    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;

    // Key may have params: "DTSTART;TZID=America/Vancouver"
    const keyPart = line.slice(0, colonIdx);
    const baseKey = keyPart.split(";")[0].toUpperCase();
    const value = line.slice(colonIdx + 1);

    if (baseKey === "SUMMARY") {
      cur.title = unescapeIcs(value).trim();
    } else if (baseKey === "DTSTART") {
      // value after colon, but TZID param means "DTSTART;TZID=...:20260415T100000"
      const dtVal = value.trim();
      const parsed = parseIcsDateValue(dtVal);
      cur.date = parsed.date;
      cur.time = parsed.time;
    } else if (baseKey === "LOCATION") {
      cur.location = unescapeIcs(value).trim();
    } else if (baseKey === "DESCRIPTION") {
      cur.notes = unescapeIcs(value).trim();
    } else if (baseKey === "ORGANIZER" || baseKey.startsWith("ATTENDEE")) {
      const cnMatch = line.match(/CN=([^;:]+)/i);
      if (cnMatch && !cur.provider) {
        cur.provider = cnMatch[1].trim().replace(/^"(.*)"$/, "$1");
      }
    }
  }

  return events;
}

// ── vCard parser ──────────────────────────────────────────────────────────────

export interface ParsedContact {
  name: string;
  phone: string;
  email: string;
  notes: string; // org/title
}

export function parseVCard(text: string): ParsedContact[] {
  const contacts: ParsedContact[] = [];
  // Split on BEGIN:VCARD (case-insensitive)
  const cards = text.split(/BEGIN:VCARD/i).slice(1);

  for (const card of cards) {
    const lines = unfoldLines(card);
    let name = "";
    let phone = "";
    let email = "";
    let org = "";
    let title = "";

    for (const line of lines) {
      if (/^END:VCARD/i.test(line.trim())) break;
      const colonIdx = line.indexOf(":");
      if (colonIdx === -1) continue;
      const baseKey = line.slice(0, colonIdx).split(";")[0].toUpperCase();
      const value = line.slice(colonIdx + 1).trim();

      if (baseKey === "FN") {
        name = value;
      } else if (baseKey === "N" && !name) {
        // N:Last;First;Middle;Prefix;Suffix
        const parts = value.split(";");
        const first = parts[1]?.trim();
        const last = parts[0]?.trim();
        name = [first, last].filter(Boolean).join(" ");
      } else if (baseKey === "TEL" && !phone) {
        phone = value;
      } else if (baseKey === "EMAIL" && !email) {
        email = value;
      } else if (baseKey === "ORG" && !org) {
        org = value.replace(/;/g, " ").trim();
      } else if (baseKey === "TITLE" && !title) {
        title = value.trim();
      }
    }

    if (name || phone || email) {
      const notesParts = [title, org].filter(Boolean);
      contacts.push({
        name: name || email.split("@")[0] || "Unknown",
        phone,
        email,
        notes: notesParts.join(" — "),
      });
    }
  }

  return contacts;
}

// ── EML (email file) parser ───────────────────────────────────────────────────

export interface ParsedEmail {
  fromName: string;
  fromEmail: string;
  subject: string;
  body: string;
}

export function parseEml(text: string): ParsedEmail {
  // Split headers from body on first blank line
  const blankLineIdx = text.search(/\r?\n\r?\n/);
  const headerText = blankLineIdx === -1 ? text : text.slice(0, blankLineIdx);
  const bodyRaw = blankLineIdx === -1 ? "" : text.slice(blankLineIdx).trim();

  // Unfold header continuation lines
  const headerLines = headerText
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n[ \t]/g, " ")
    .split("\n");

  const headers: Record<string, string> = {};
  for (const line of headerLines) {
    const colon = line.indexOf(":");
    if (colon !== -1) {
      const key = line.slice(0, colon).toLowerCase().trim();
      headers[key] = line.slice(colon + 1).trim();
    }
  }

  // Strip HTML tags and decode quoted-printable roughly
  const body = bodyRaw
    .replace(/<[^>]+>/g, " ")
    .replace(/=\r?\n/g, "")
    .replace(/=([0-9A-F]{2})/gi, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16))
    )
    .replace(/[ \t]+/g, " ")
    .trim();

  // Parse "Name <email>" or just "email"
  let fromName = "";
  let fromEmail = "";
  const fromRaw = headers.from ?? "";
  const match = fromRaw.match(/^"?([^"<]*?)"?\s*<?([^\s>]+@[^\s>]+)>?$/);
  if (match) {
    fromName = match[1].trim();
    fromEmail = match[2].trim();
  } else if (fromRaw.includes("@")) {
    fromEmail = fromRaw.trim();
    fromName = fromEmail.split("@")[0];
  }

  return {
    fromName,
    fromEmail,
    subject: headers.subject ?? "",
    body,
  };
}

/** Best-effort: extract a date and time from free text */
export function extractDateTimeFromText(text: string): {
  date: string;
  time: string;
} {
  let date = "";
  let time = "";

  // ISO date: 2026-04-15
  const iso = text.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (iso) {
    date = iso[1];
  }

  if (!date) {
    // Month name: April 15, 2026 / 15 April 2026
    const named = text.match(
      /\b(\d{1,2})\s+(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{4})\b/i
    );
    const named2 = text.match(
      /\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{1,2}),?\s+(\d{4})\b/i
    );
    const src = named ?? named2;
    if (src) {
      const d = new Date(src[0]);
      if (!isNaN(d.getTime())) {
        date = d.toISOString().split("T")[0];
      }
    }
  }

  if (!date) {
    // Numeric: 04/15/2026 or 15/04/2026 – assume MM/DD/YYYY
    const num = text.match(/\b(\d{1,2})[/-](\d{1,2})[/-](\d{4})\b/);
    if (num) {
      const d = new Date(`${num[3]}-${num[1].padStart(2, "0")}-${num[2].padStart(2, "0")}`);
      if (!isNaN(d.getTime())) {
        date = d.toISOString().split("T")[0];
      }
    }
  }

  // Time: 10:30 am / 14:00
  const timeMatch = text.match(/\b(\d{1,2}):(\d{2})\s*(am|pm)?\b/i);
  if (timeMatch) {
    let h = parseInt(timeMatch[1], 10);
    const m = timeMatch[2];
    const ampm = (timeMatch[3] ?? "").toLowerCase();
    if (ampm === "pm" && h < 12) h += 12;
    if (ampm === "am" && h === 12) h = 0;
    time = `${String(h).padStart(2, "0")}:${m}`;
  }

  return { date, time };
}
