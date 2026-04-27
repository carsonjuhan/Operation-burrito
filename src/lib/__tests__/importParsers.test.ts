import { parseIcs, parseVCard, parseEml, extractDateTimeFromText } from '@/lib/importParsers';

// ── parseIcs ────────────────────────────────────────────────────────────────

describe('parseIcs', () => {
  it('parses a single event with all fields', () => {
    const ics = `BEGIN:VCALENDAR
BEGIN:VEVENT
SUMMARY:OB Appointment
DTSTART;TZID=America/Vancouver:20260415T100000
LOCATION:Women's Hospital
DESCRIPTION:Regular checkup
ORGANIZER;CN=Dr. Smith:mailto:smith@example.com
END:VEVENT
END:VCALENDAR`;
    const events = parseIcs(ics);
    expect(events).toHaveLength(1);
    expect(events[0].title).toBe('OB Appointment');
    expect(events[0].date).toBe('2026-04-15');
    expect(events[0].time).toBe('10:00');
    expect(events[0].location).toBe("Women's Hospital");
    expect(events[0].notes).toBe('Regular checkup');
    expect(events[0].provider).toBe('Dr. Smith');
  });

  it('parses UTC dates (Z suffix)', () => {
    const ics = `BEGIN:VCALENDAR
BEGIN:VEVENT
SUMMARY:Ultrasound
DTSTART:20260420T140000Z
END:VEVENT
END:VCALENDAR`;
    const events = parseIcs(ics);
    expect(events[0].date).toBe('2026-04-20');
    expect(events[0].time).toBe('14:00');
  });

  it('parses date-only values (no time)', () => {
    const ics = `BEGIN:VCALENDAR
BEGIN:VEVENT
SUMMARY:Due Date
DTSTART;VALUE=DATE:20260715
END:VEVENT
END:VCALENDAR`;
    const events = parseIcs(ics);
    expect(events[0].date).toBe('2026-07-15');
    expect(events[0].time).toBe('');
  });

  it('parses multiple events', () => {
    const ics = `BEGIN:VCALENDAR
BEGIN:VEVENT
SUMMARY:Event 1
DTSTART:20260401T090000Z
END:VEVENT
BEGIN:VEVENT
SUMMARY:Event 2
DTSTART:20260402T100000Z
END:VEVENT
END:VCALENDAR`;
    const events = parseIcs(ics);
    expect(events).toHaveLength(2);
    expect(events[0].title).toBe('Event 1');
    expect(events[1].title).toBe('Event 2');
  });

  it('handles line folding (RFC 5545)', () => {
    // RFC 5545 line folding: continuation line starts with space/tab
    // unfoldLines joins them without inserting extra space
    const ics = `BEGIN:VCALENDAR
BEGIN:VEVENT
SUMMARY:Very Long Event
 Name That Wraps
DTSTART:20260401T090000Z
END:VEVENT
END:VCALENDAR`;
    const events = parseIcs(ics);
    // The unfold removes the newline+space, concatenating directly
    expect(events[0].title).toBe('Very Long EventName That Wraps');
  });

  it('unescapes ICS special characters', () => {
    const ics = `BEGIN:VCALENDAR
BEGIN:VEVENT
SUMMARY:Meeting\\, Important
DTSTART:20260401T090000Z
DESCRIPTION:Line 1\\nLine 2
END:VEVENT
END:VCALENDAR`;
    const events = parseIcs(ics);
    expect(events[0].title).toBe('Meeting, Important');
    expect(events[0].notes).toBe('Line 1\nLine 2');
  });

  it('skips events without a title', () => {
    const ics = `BEGIN:VCALENDAR
BEGIN:VEVENT
DTSTART:20260401T090000Z
END:VEVENT
END:VCALENDAR`;
    const events = parseIcs(ics);
    expect(events).toHaveLength(0);
  });

  it('defaults missing fields to empty strings', () => {
    const ics = `BEGIN:VCALENDAR
BEGIN:VEVENT
SUMMARY:Quick Event
DTSTART:20260401T090000Z
END:VEVENT
END:VCALENDAR`;
    const events = parseIcs(ics);
    expect(events[0].location).toBe('');
    expect(events[0].notes).toBe('');
    expect(events[0].provider).toBe('');
  });
});

// ── parseVCard ──────────────────────────────────────────────────────────────

describe('parseVCard', () => {
  it('parses a single contact with FN, TEL, EMAIL', () => {
    const vcf = `BEGIN:VCARD
VERSION:3.0
FN:Dr. Jane Smith
TEL;TYPE=WORK:604-555-1234
EMAIL:jane@hospital.com
END:VCARD`;
    const contacts = parseVCard(vcf);
    expect(contacts).toHaveLength(1);
    expect(contacts[0].name).toBe('Dr. Jane Smith');
    expect(contacts[0].phone).toBe('604-555-1234');
    expect(contacts[0].email).toBe('jane@hospital.com');
  });

  it('falls back to N field when FN is missing', () => {
    const vcf = `BEGIN:VCARD
VERSION:3.0
N:Smith;Jane;;;
EMAIL:jane@example.com
END:VCARD`;
    const contacts = parseVCard(vcf);
    expect(contacts[0].name).toBe('Jane Smith');
  });

  it('includes ORG and TITLE in notes', () => {
    const vcf = `BEGIN:VCARD
FN:Dr. Smith
ORG:City Hospital
TITLE:Obstetrician
END:VCARD`;
    const contacts = parseVCard(vcf);
    expect(contacts[0].notes).toBe('Obstetrician — City Hospital');
  });

  it('parses multiple contacts', () => {
    const vcf = `BEGIN:VCARD
FN:Contact One
TEL:111-1111
END:VCARD
BEGIN:VCARD
FN:Contact Two
TEL:222-2222
END:VCARD`;
    const contacts = parseVCard(vcf);
    expect(contacts).toHaveLength(2);
    expect(contacts[0].name).toBe('Contact One');
    expect(contacts[1].name).toBe('Contact Two');
  });

  it('uses email prefix as name fallback when no name fields', () => {
    const vcf = `BEGIN:VCARD
EMAIL:someone@example.com
END:VCARD`;
    const contacts = parseVCard(vcf);
    expect(contacts[0].name).toBe('someone');
  });

  it('handles empty phone and email gracefully', () => {
    const vcf = `BEGIN:VCARD
FN:No Contact Info
END:VCARD`;
    const contacts = parseVCard(vcf);
    expect(contacts[0].phone).toBe('');
    expect(contacts[0].email).toBe('');
  });

  it('skips entries with no identifiable info', () => {
    const vcf = `BEGIN:VCARD
VERSION:3.0
END:VCARD`;
    const contacts = parseVCard(vcf);
    expect(contacts).toHaveLength(0);
  });
});

// ── parseEml ────────────────────────────────────────────────────────────────

describe('parseEml', () => {
  it('parses a standard email with name and address', () => {
    const eml = `From: "Dr. Smith" <smith@hospital.com>
Subject: Appointment Confirmation
Date: Mon, 15 Apr 2026 10:00:00 -0700

Dear Patient, your appointment is confirmed for April 20, 2026.`;
    const result = parseEml(eml);
    expect(result.fromName).toBe('Dr. Smith');
    expect(result.fromEmail).toBe('smith@hospital.com');
    expect(result.subject).toBe('Appointment Confirmation');
    expect(result.body).toContain('your appointment is confirmed');
  });

  it('handles From with just email address', () => {
    const eml = `From: someone@example.com
Subject: Test

Body text here.`;
    const result = parseEml(eml);
    expect(result.fromEmail).toBe('someone@example.com');
    // The regex captures empty name for bare emails (non-greedy group 1)
    // The name is empty string since the first regex branch matches
    expect(result.fromName).toBe('');
  });

  it('handles From with angle brackets', () => {
    const eml = `From: Jane <jane@example.com>
Subject: Test

Body`;
    const result = parseEml(eml);
    expect(result.fromName).toBe('Jane');
    expect(result.fromEmail).toBe('jane@example.com');
  });

  it('strips HTML tags from body', () => {
    const eml = `From: test@example.com
Subject: HTML email

<html><body><p>Hello <b>world</b></p></body></html>`;
    const result = parseEml(eml);
    expect(result.body).not.toContain('<html>');
    expect(result.body).not.toContain('<b>');
    expect(result.body).toContain('Hello');
    expect(result.body).toContain('world');
  });

  it('decodes quoted-printable content', () => {
    const eml = `From: test@example.com
Subject: Test

Hello=20World`;
    const result = parseEml(eml);
    expect(result.body).toContain('Hello World');
  });

  it('handles missing headers gracefully', () => {
    const eml = `Just body content with no headers at all`;
    const result = parseEml(eml);
    expect(result.fromName).toBe('');
    expect(result.fromEmail).toBe('');
    expect(result.subject).toBe('');
  });

  it('handles header continuation lines', () => {
    const eml = `From: test@example.com
Subject: Very Long
 Subject Line Here

Body`;
    const result = parseEml(eml);
    expect(result.subject).toBe('Very Long Subject Line Here');
  });
});

// ── extractDateTimeFromText ─────────────────────────────────────────────────

describe('extractDateTimeFromText', () => {
  it('extracts ISO date format', () => {
    const result = extractDateTimeFromText('Your appointment is on 2026-04-15 at the clinic');
    expect(result.date).toBe('2026-04-15');
  });

  it('extracts named month date format (Month DD, YYYY)', () => {
    const result = extractDateTimeFromText('See you on April 15, 2026');
    expect(result.date).toBe('2026-04-15');
  });

  it('extracts time with am/pm', () => {
    const result = extractDateTimeFromText('Appointment at 2:30 pm');
    expect(result.time).toBe('14:30');
  });

  it('extracts time with AM (uppercase)', () => {
    const result = extractDateTimeFromText('Meeting at 10:00 AM');
    expect(result.time).toBe('10:00');
  });

  it('handles 12:00 pm correctly', () => {
    const result = extractDateTimeFromText('Lunch at 12:00 pm');
    expect(result.time).toBe('12:00');
  });

  it('handles 12:00 am correctly (midnight)', () => {
    const result = extractDateTimeFromText('Event at 12:00 am');
    expect(result.time).toBe('00:00');
  });

  it('extracts 24-hour time', () => {
    const result = extractDateTimeFromText('Meeting at 14:30 today');
    expect(result.time).toBe('14:30');
  });

  it('extracts numeric date format (MM/DD/YYYY)', () => {
    const result = extractDateTimeFromText('Appointment on 04/15/2026 at the clinic');
    expect(result.date).toBe('2026-04-15');
  });

  it('returns empty strings when no date/time found', () => {
    const result = extractDateTimeFromText('No date or time here');
    expect(result.date).toBe('');
    expect(result.time).toBe('');
  });

  it('extracts both date and time from text', () => {
    const result = extractDateTimeFromText('Appointment on 2026-04-15 at 10:30 am');
    expect(result.date).toBe('2026-04-15');
    expect(result.time).toBe('10:30');
  });
});
