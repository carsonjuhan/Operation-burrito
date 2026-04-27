import { parseReceiptText } from '@/lib/receiptParser';

// Mock crypto.randomUUID for deterministic test output
let uuidCounter = 0;
beforeEach(() => {
  uuidCounter = 0;
  vi.stubGlobal('crypto', {
    ...globalThis.crypto,
    randomUUID: vi.fn(() => `test-uuid-${++uuidCounter}`),
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('parseReceiptText', () => {
  it('parses lines with trailing prices', () => {
    const text = `Baby Bottle  $12.99
Pacifier  $5.49
Bib Set  $8.00`;
    const items = parseReceiptText(text);
    expect(items).toHaveLength(3);
    expect(items[0].name).toBe('Baby Bottle');
    expect(items[0].price).toBe(12.99);
    expect(items[0].selected).toBe(true);
    expect(items[1].name).toBe('Pacifier');
    expect(items[1].price).toBe(5.49);
    expect(items[2].name).toBe('Bib Set');
    expect(items[2].price).toBe(8);
  });

  it('filters out totals, tax, and subtotals', () => {
    const text = `Baby Bottle  $12.99
Subtotal  $12.99
Tax  $1.30
Total  $14.29`;
    const items = parseReceiptText(text);
    expect(items).toHaveLength(1);
    expect(items[0].name).toBe('Baby Bottle');
  });

  it('filters out dates and phone numbers', () => {
    const text = `04/15/2026
1-800-555-1234
Baby Monitor  $49.99`;
    const items = parseReceiptText(text);
    expect(items).toHaveLength(1);
    expect(items[0].name).toBe('Baby Monitor');
  });

  it('filters out separator lines', () => {
    const text = `--------
Baby Wipes  $3.99
========`;
    const items = parseReceiptText(text);
    expect(items).toHaveLength(1);
    expect(items[0].name).toBe('Baby Wipes');
  });

  it('skips prices over $500 as likely totals', () => {
    const text = `Expensive Total  $599.99
Baby Bottle  $12.99`;
    const items = parseReceiptText(text);
    expect(items).toHaveLength(1);
    expect(items[0].name).toBe('Baby Bottle');
  });

  it('deduplicates items with the same name (case-insensitive)', () => {
    const text = `Baby Bottle  $12.99
baby bottle  $12.99`;
    const items = parseReceiptText(text);
    expect(items).toHaveLength(1);
  });

  it('includes items without price but marks them as deselected', () => {
    const text = `Baby Bottle  $12.99
Some Product Name`;
    const items = parseReceiptText(text);
    expect(items).toHaveLength(2);
    const noPrice = items.find(i => i.name === 'Some Product Name');
    expect(noPrice).toBeDefined();
    expect(noPrice!.price).toBeNull();
    expect(noPrice!.selected).toBe(false);
  });

  it('strips quantity prefixes from names', () => {
    const text = `2x Baby Bottle  $25.98
3 @ Pacifier  $15.00`;
    const items = parseReceiptText(text);
    expect(items[0].name).toBe('Baby Bottle');
    expect(items[1].name).toBe('Pacifier');
  });

  it('returns empty array for empty input', () => {
    expect(parseReceiptText('')).toEqual([]);
  });

  it('skips lines that are too short after cleaning', () => {
    const text = `A  $1.00
Baby Bottle  $12.99`;
    const items = parseReceiptText(text);
    // "A" is < 2 chars, should be skipped
    expect(items).toHaveLength(1);
    expect(items[0].name).toBe('Baby Bottle');
  });

  it('handles prices with comma separators', () => {
    const text = `Stroller System  $1,299.99`;
    const items = parseReceiptText(text);
    // Price > 500 so it gets filtered out
    expect(items).toHaveLength(0);
  });

  it('handles prices with trailing letter code', () => {
    const text = `Baby Wipes  $3.99 F`;
    const items = parseReceiptText(text);
    expect(items).toHaveLength(1);
    expect(items[0].price).toBe(3.99);
  });

  it('assigns unique IDs to each item', () => {
    const text = `Item A  $10.00
Item B  $20.00`;
    const items = parseReceiptText(text);
    expect(items[0].id).toBe('test-uuid-1');
    expect(items[1].id).toBe('test-uuid-2');
  });
});
