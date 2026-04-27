import {
  parseCsv,
  autoMapColumns,
  normalizeCategory,
  normalizePriority,
  normalizePurchased,
  normalizePrice,
  mapRowToItem,
  toGoogleSheetsCsvUrl,
} from '@/lib/csvImporter';

// ── parseCsv ────────────────────────────────────────────────────────────────

describe('parseCsv', () => {
  it('parses a basic CSV with headers and rows', () => {
    const csv = 'Name,Category,Price\nBottle,Feeding,12.99\nCrib,Nursery,199.00';
    const result = parseCsv(csv);
    expect(result.headers).toEqual(['Name', 'Category', 'Price']);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toEqual({ Name: 'Bottle', Category: 'Feeding', Price: '12.99' });
    expect(result.rows[1]).toEqual({ Name: 'Crib', Category: 'Nursery', Price: '199.00' });
  });

  it('handles quoted fields with commas inside', () => {
    const csv = 'Name,Notes\n"Baby Monitor, Video",Great item';
    const result = parseCsv(csv);
    expect(result.rows[0].Name).toBe('Baby Monitor, Video');
    expect(result.rows[0].Notes).toBe('Great item');
  });

  it('handles escaped double quotes within quoted fields', () => {
    const csv = 'Name,Notes\n"8"" Crib Mattress","fits ""standard"" cribs"';
    const result = parseCsv(csv);
    expect(result.rows[0].Name).toBe('8" Crib Mattress');
    expect(result.rows[0].Notes).toBe('fits "standard" cribs');
  });

  it('returns empty headers and rows for empty input', () => {
    const result = parseCsv('');
    expect(result.headers).toEqual([]);
    expect(result.rows).toEqual([]);
  });

  it('returns empty headers and rows for whitespace-only input', () => {
    const result = parseCsv('   \n  \n   ');
    expect(result.headers).toEqual([]);
    expect(result.rows).toEqual([]);
  });

  it('skips completely empty rows', () => {
    const csv = 'Name,Price\nBottle,10\n,,\nCrib,200';
    const result = parseCsv(csv);
    expect(result.rows).toHaveLength(2);
  });

  it('handles Windows-style CRLF line endings', () => {
    const csv = 'Name,Price\r\nBottle,10\r\nCrib,200';
    const result = parseCsv(csv);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0].Name).toBe('Bottle');
  });

  it('trims whitespace from headers and values', () => {
    const csv = ' Name , Price \n Bottle , 10.50 ';
    const result = parseCsv(csv);
    expect(result.headers).toEqual(['Name', 'Price']);
    expect(result.rows[0].Name).toBe('Bottle');
    expect(result.rows[0].Price).toBe('10.50');
  });

  it('handles rows with fewer columns than headers', () => {
    const csv = 'Name,Category,Price\nBottle';
    const result = parseCsv(csv);
    expect(result.rows[0].Category).toBe('');
    expect(result.rows[0].Price).toBe('');
  });
});

// ── autoMapColumns ──────────────────────────────────────────────────────────

describe('autoMapColumns', () => {
  it('maps common column name synonyms', () => {
    const headers = ['Item', 'Category', 'Price', 'Bought', 'Comments', 'URL'];
    const mapping = autoMapColumns(headers);
    expect(mapping.name).toBe('Item');
    expect(mapping.category).toBe('Category');
    expect(mapping.estimatedCost).toBe('Price');
    expect(mapping.purchased).toBe('Bought');
    expect(mapping.notes).toBe('Comments');
    expect(mapping.link).toBe('URL');
  });

  it('maps "Product Name" to name field', () => {
    const headers = ['Product Name', 'Type'];
    const mapping = autoMapColumns(headers);
    expect(mapping.name).toBe('Product Name');
  });

  it('maps "Estimated Cost" header correctly', () => {
    const headers = ['Name', 'Estimated Cost', 'Actual Cost'];
    const mapping = autoMapColumns(headers);
    expect(mapping.estimatedCost).toBe('Estimated Cost');
    expect(mapping.actualCost).toBe('Actual Cost');
  });

  it('is case-insensitive', () => {
    const headers = ['NAME', 'CATEGORY', 'PRICE'];
    const mapping = autoMapColumns(headers);
    expect(mapping.name).toBe('NAME');
    expect(mapping.category).toBe('CATEGORY');
    expect(mapping.estimatedCost).toBe('PRICE');
  });

  it('returns empty mapping for unrecognized headers', () => {
    const headers = ['foo', 'bar', 'baz'];
    const mapping = autoMapColumns(headers);
    expect(Object.keys(mapping)).toHaveLength(0);
  });
});

// ── normalizeCategory ───────────────────────────────────────────────────────

describe('normalizeCategory', () => {
  it('maps known categories', () => {
    expect(normalizeCategory('nursery')).toBe('Nursery');
    expect(normalizeCategory('Clothing')).toBe('Clothing');
    expect(normalizeCategory('FEEDING')).toBe('Feeding');
    expect(normalizeCategory('car seat')).toBe('Travel');
    expect(normalizeCategory('Health & Hygiene')).toBe('Health & Hygiene');
    expect(normalizeCategory('toys')).toBe('Toys & Gear');
    expect(normalizeCategory('postpartum')).toBe('Postpartum');
  });

  it('maps synonym categories', () => {
    expect(normalizeCategory('furniture')).toBe('Nursery');
    expect(normalizeCategory('apparel')).toBe('Clothing');
    expect(normalizeCategory('stroller')).toBe('Travel');
    expect(normalizeCategory('medical')).toBe('Health & Hygiene');
    expect(normalizeCategory('recovery')).toBe('Postpartum');
  });

  it('defaults to "Other" for unknown categories', () => {
    expect(normalizeCategory('unknown')).toBe('Other');
    expect(normalizeCategory('')).toBe('Other');
    expect(normalizeCategory('random stuff')).toBe('Other');
  });
});

// ── normalizePriority ───────────────────────────────────────────────────────

describe('normalizePriority', () => {
  it('maps high priority synonyms', () => {
    expect(normalizePriority('must have')).toBe('Must Have');
    expect(normalizePriority('essential')).toBe('Must Have');
    expect(normalizePriority('high')).toBe('Must Have');
    expect(normalizePriority('1')).toBe('Must Have');
  });

  it('maps medium priority synonyms', () => {
    expect(normalizePriority('nice to have')).toBe('Nice to Have');
    expect(normalizePriority('important')).toBe('Nice to Have');
    expect(normalizePriority('medium')).toBe('Nice to Have');
    expect(normalizePriority('2')).toBe('Nice to Have');
  });

  it('maps low priority synonyms', () => {
    expect(normalizePriority('optional')).toBe('Optional');
    expect(normalizePriority('low')).toBe('Optional');
    expect(normalizePriority('3')).toBe('Optional');
  });

  it('defaults to "Nice to Have" for unknown values', () => {
    expect(normalizePriority('')).toBe('Nice to Have');
    expect(normalizePriority('unknown')).toBe('Nice to Have');
  });
});

// ── normalizePurchased ──────────────────────────────────────────────────────

describe('normalizePurchased', () => {
  it('returns true for truthy values', () => {
    expect(normalizePurchased('yes')).toBe(true);
    expect(normalizePurchased('Yes')).toBe(true);
    expect(normalizePurchased('true')).toBe(true);
    expect(normalizePurchased('1')).toBe(true);
    expect(normalizePurchased('purchased')).toBe(true);
    expect(normalizePurchased('x')).toBe(true);
    expect(normalizePurchased('✓')).toBe(true);
  });

  it('returns false for falsy or unknown values', () => {
    expect(normalizePurchased('no')).toBe(false);
    expect(normalizePurchased('')).toBe(false);
    expect(normalizePurchased('false')).toBe(false);
    expect(normalizePurchased('pending')).toBe(false);
  });
});

// ── normalizePrice ──────────────────────────────────────────────────────────

describe('normalizePrice', () => {
  it('parses dollar amounts', () => {
    expect(normalizePrice('$12.99')).toBe(12.99);
    expect(normalizePrice('$1,299.00')).toBe(1299);
  });

  it('parses plain numbers', () => {
    expect(normalizePrice('45.50')).toBe(45.5);
    expect(normalizePrice('100')).toBe(100);
  });

  it('strips whitespace', () => {
    expect(normalizePrice(' $ 25.00 ')).toBe(25);
  });

  it('returns undefined for empty or invalid input', () => {
    expect(normalizePrice('')).toBeUndefined();
    expect(normalizePrice('free')).toBeUndefined();
    expect(normalizePrice('N/A')).toBeUndefined();
  });
});

// ── mapRowToItem ────────────────────────────────────────────────────────────

describe('mapRowToItem', () => {
  it('maps a full row to a BabyItem', () => {
    const row = {
      'Item': 'Baby Monitor',
      'Category': 'Safety',
      'Priority': 'Must Have',
      'Purchased': 'yes',
      'Price': '$49.99',
      'Actual': '$45.00',
      'Notes': 'Video monitor',
      'URL': 'https://example.com',
    };
    const mapping = {
      name: 'Item',
      category: 'Category',
      priority: 'Priority',
      purchased: 'Purchased',
      estimatedCost: 'Price',
      actualCost: 'Actual',
      notes: 'Notes',
      link: 'URL',
    };
    const result = mapRowToItem(row, mapping);
    expect(result).not.toBeNull();
    expect(result!.name).toBe('Baby Monitor');
    expect(result!.category).toBe('Safety');
    expect(result!.priority).toBe('Must Have');
    expect(result!.purchased).toBe(true);
    expect(result!.estimatedCost).toBe(49.99);
    expect(result!.actualCost).toBe(45);
    expect(result!.notes).toBe('Video monitor');
    expect(result!.link).toBe('https://example.com');
  });

  it('returns null when name is missing', () => {
    const row = { 'Category': 'Safety' };
    const mapping = { name: 'Name' };
    expect(mapRowToItem(row, mapping)).toBeNull();
  });

  it('returns null when name column is empty', () => {
    const row = { 'Name': '  ' };
    const mapping = { name: 'Name' };
    expect(mapRowToItem(row, mapping)).toBeNull();
  });

  it('uses defaults for unmapped fields', () => {
    const row = { 'Name': 'Pacifier' };
    const mapping = { name: 'Name' };
    const result = mapRowToItem(row, mapping);
    expect(result).not.toBeNull();
    expect(result!.category).toBe('Other');
    expect(result!.priority).toBe('Nice to Have');
    expect(result!.purchased).toBe(false);
    expect(result!.notes).toBe('');
    expect(result!.link).toBeUndefined();
    expect(result!.estimatedCost).toBeUndefined();
  });
});

// ── toGoogleSheetsCsvUrl ────────────────────────────────────────────────────

describe('toGoogleSheetsCsvUrl', () => {
  it('converts a standard Google Sheets URL', () => {
    const url = 'https://docs.google.com/spreadsheets/d/abc123/edit#gid=0';
    const result = toGoogleSheetsCsvUrl(url);
    expect(result).toBe('https://docs.google.com/spreadsheets/d/abc123/export?format=csv&gid=0');
  });

  it('extracts gid from URL fragment', () => {
    const url = 'https://docs.google.com/spreadsheets/d/abc123/edit#gid=456';
    const result = toGoogleSheetsCsvUrl(url);
    expect(result).toContain('gid=456');
  });

  it('defaults gid to 0 when not present', () => {
    const url = 'https://docs.google.com/spreadsheets/d/abc123/edit';
    const result = toGoogleSheetsCsvUrl(url);
    expect(result).toContain('gid=0');
  });

  it('returns null for non-Sheets URLs', () => {
    expect(toGoogleSheetsCsvUrl('https://example.com')).toBeNull();
    expect(toGoogleSheetsCsvUrl('not a url')).toBeNull();
  });
});
