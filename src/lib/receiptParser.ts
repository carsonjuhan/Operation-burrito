export interface ParsedReceiptItem {
  id: string;
  name: string;
  price: number | null;
  selected: boolean;
}

const SKIP_PATTERNS = [
  /^(subtotal|sub[\s-]total|total|tax|hst|gst|pst|qst|tip|change|cash|visa|mastercard|amex|debit|credit|approved|declined|thank you|receipt|store #|balance|amount|tender|payment|loyalty|points|savings|discount|sale|void|refund|item\s*#|qty|quantity)/i,
  /^\*+/,
  /^[-=]{2,}/,
  /^\d{1,2}\/\d{1,2}\/\d{2,4}/, // dates
  /^(\+?1[-\s]?)?\(?\d{3}\)?[-\s]\d{3}[-\s]\d{4}/, // phone numbers
  /^\s*$/, // empty
];

function cleanName(raw: string): string {
  return raw
    .replace(/^\d+\s*[xX×@]\s*/, "") // "2x " or "2 @ "
    .replace(/\$[\d.,]+/g, "")        // inline prices
    .replace(/\s{2,}/g, " ")
    .replace(/[#*]+$/, "")
    .trim();
}

export function parseReceiptText(raw: string): ParsedReceiptItem[] {
  const lines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const items: ParsedReceiptItem[] = [];
  const seen = new Set<string>();

  for (const line of lines) {
    if (SKIP_PATTERNS.some((p) => p.test(line))) continue;

    // Price at end of line: "$12.99", "12.99", "-12.99" (returns)
    const priceMatch = line.match(/[-−]?\$?\s*([\d,]+\.\d{2})\s*[A-Z]?\s*$/);

    if (priceMatch) {
      const price = parseFloat(priceMatch[1].replace(",", ""));
      // Skip obviously wrong values (totals over $500 are usually not single items)
      if (price > 500 || price < 0) continue;

      const namePart = line.slice(0, line.length - priceMatch[0].length);
      const name = cleanName(namePart);

      if (name.length < 2) continue;

      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);

      items.push({
        id: crypto.randomUUID(),
        name,
        price,
        selected: true,
      });
    } else if (
      // No price on this line — keep if it looks like a product name
      /[a-zA-Z]{3,}/.test(line) &&
      line.length >= 3 &&
      line.length <= 70 &&
      !/^\d+$/.test(line)
    ) {
      const name = cleanName(line);
      if (name.length < 2) continue;

      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);

      items.push({
        id: crypto.randomUUID(),
        name,
        price: null,
        selected: false, // auto-deselect items without price
      });
    }
  }

  return items;
}

export type ProgressCallback = (pct: number, message: string) => void;

export async function ocrImageFile(
  file: File,
  onProgress?: ProgressCallback
): Promise<string> {
  onProgress?.(0, "Loading OCR engine...");
  const { createWorker } = await import("tesseract.js");
  onProgress?.(5, "Initializing OCR worker...");
  const worker = await createWorker("eng", 1, {
    logger: (m: { status: string; progress: number }) => {
      if (m.status === "recognizing text") {
        // Map 0-1 progress to 10-95% range (leaving room for init and cleanup)
        const pct = Math.round(10 + m.progress * 85);
        onProgress?.(pct, "Recognizing text...");
      }
    },
  });
  try {
    const {
      data: { text },
    } = await worker.recognize(file);
    onProgress?.(95, "Finishing up...");
    return text;
  } finally {
    await worker.terminate();
  }
}

export async function extractPdfText(
  file: File,
  onProgress?: ProgressCallback
): Promise<string> {
  onProgress?.(0, "Loading PDF engine...");
  const arrayBuffer = await file.arrayBuffer();
  const pdfjsLib = await import("pdfjs-dist");

  // Worker: use local copy from public/ so PDF parsing works offline
  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    const basePath = process.env.NODE_ENV === 'production' ? '/Operation-burrito' : '';
    pdfjsLib.GlobalWorkerOptions.workerSrc = `${basePath}/pdf.worker.min.mjs`;
  }

  onProgress?.(10, "Opening PDF...");
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let full = "";

  for (let i = 1; i <= pdf.numPages; i++) {
    const pct = Math.round(10 + ((i - 1) / pdf.numPages) * 85);
    onProgress?.(pct, `Extracting page ${i} of ${pdf.numPages}...`);
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ("str" in item ? (item as { str: string }).str : ""))
      .join(" ");
    full += pageText + "\n";
  }

  onProgress?.(95, "Finishing up...");
  return full;
}

export async function parseReceiptFile(
  file: File,
  onProgress?: ProgressCallback
): Promise<ParsedReceiptItem[]> {
  let text = "";
  if (file.type === "application/pdf") {
    text = await extractPdfText(file, onProgress);
  } else {
    text = await ocrImageFile(file, onProgress);
  }
  onProgress?.(100, "Parsing items...");
  return parseReceiptText(text);
}
