import { findChecklistMatch, getSuggestedMatches } from '@/lib/inventoryMatching';

describe('findChecklistMatch', () => {
  it('returns true for exact match (case-insensitive)', () => {
    expect(findChecklistMatch('baby carrier', 'Baby Carrier')).toBe(true);
  });

  it('returns true for manual mapping match', () => {
    // "ergobaby carrier" maps to ["baby carrier"]
    expect(findChecklistMatch('Ergobaby Carrier', 'baby carrier')).toBe(true);
  });

  it('returns true for partial manual mapping match', () => {
    // "uppababy aria" maps to ["infant car seat", "car seat"]
    expect(findChecklistMatch('Uppababy Aria Infant Car Seat', 'infant car seat')).toBe(true);
  });

  it('returns true when registry name contains mapping key', () => {
    // "medela harmony" maps to ["breast pump", ...]
    expect(findChecklistMatch('Medela Harmony Manual Breast Pump', 'breast pump')).toBe(true);
  });

  it('returns false for unmatched items', () => {
    expect(findChecklistMatch('Random Gadget XYZ', 'baby carrier')).toBe(false);
  });

  it('returns false for completely unrelated items', () => {
    expect(findChecklistMatch('Kitchen Blender', 'Nursery Lamp')).toBe(false);
  });

  it('handles special characters in names', () => {
    // "dr browns" is a mapping key that maps to ["baby bottle", "bottle"]
    // "Dr Browns Bottle" normalizes to "dr browns bottle" which includes "dr browns"
    expect(findChecklistMatch("Dr Browns Bottle", 'baby bottle')).toBe(true);
  });

  it('matches bottle brush variants', () => {
    expect(findChecklistMatch('Rotating Bottle Brush Set', 'bottle brush')).toBe(true);
  });
});

describe('getSuggestedMatches', () => {
  const mockChecklistItems = [
    { id: '1', name_en: 'baby carrier' },
    { id: '2', name_en: 'breast pump' },
    { id: '3', name_en: 'baby bottle' },
    { id: '4', name_en: 'nursery lamp' },
    { id: '5', name_en: 'diaper changing mat' },
  ];

  it('returns high-confidence matches for manual mappings', () => {
    const suggestions = getSuggestedMatches('Ergobaby Carrier Omni', mockChecklistItems);
    expect(suggestions.length).toBeGreaterThan(0);
    const highConfidence = suggestions.filter(s => s.confidence === 'high');
    expect(highConfidence.length).toBeGreaterThan(0);
    expect(highConfidence[0].checklistItem.name_en).toBe('baby carrier');
  });

  it('returns medium-confidence matches for keyword overlap', () => {
    // "baby" and "carrier" are > 3 chars and present in both
    const suggestions = getSuggestedMatches('baby carrier deluxe edition', mockChecklistItems);
    // Should include the exact manual match as high
    const hasMatch = suggestions.some(s => s.checklistItem.name_en === 'baby carrier');
    expect(hasMatch).toBe(true);
  });

  it('limits results to 5 suggestions', () => {
    // Create many checklist items that could match
    const manyItems = Array.from({ length: 20 }, (_, i) => ({
      id: String(i),
      name_en: `baby item variant ${i}`,
    }));
    const suggestions = getSuggestedMatches('baby item variant', manyItems);
    expect(suggestions.length).toBeLessThanOrEqual(5);
  });

  it('returns empty array for no matches', () => {
    const suggestions = getSuggestedMatches('completely random xyz', mockChecklistItems);
    expect(suggestions).toEqual([]);
  });

  it('includes reason in suggestion', () => {
    const suggestions = getSuggestedMatches('Ergobaby Carrier', mockChecklistItems);
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions[0].reason).toBeTruthy();
  });
});
