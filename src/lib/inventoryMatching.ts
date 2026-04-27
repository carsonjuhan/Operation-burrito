// Manual mapping from registry items to checklist items
// This ensures we mark checklist items as "have" instead of creating duplicates

export const INVENTORY_MATCHES: Record<string, string[]> = {
  // ===== CERTAIN MATCHES =====

  // Cribs & Sleep
  "bugaboo stardust": ["travel crib", "pack-n-play", "baby cot"],
  "bugaboo stardust play yard": ["travel crib", "pack-n-play", "baby cot"],

  // Bath
  "ggumbi bath tub": ["baby bathtub", "baby bath tub"],
  "bath mat": ["bath mat"],

  // Care & Hygiene
  "baby cotton bud": ["baby cotton swabs", "cotton swabs"],
  "diaper genie": ["nappy bin", "diaper pail"],
  "huggies": ["disposable diapers", "diapers"],
  "baby thermometer": ["thermometer", "baby thermometer"],
  "nail clipper": ["nail scissors", "nail file"],

  // Car Seats & Carriers
  "uppababy aria": ["infant car seat", "car seat"],
  "ergobaby carrier": ["baby carrier"],
  "baby carrier": ["baby carrier"],

  // Feeding & Breast Pumps
  "medela harmony": ["breast pump", "breast pump (manual or electric)"],
  "spectra": ["breast pump", "breast pump (manual or electric)"],
  "breast pump": ["breast pump", "breast pump (manual or electric)"],

  // Baby Bottles (all variants)
  "baby bottle": ["baby bottle", "bottle", "baby bottle 160ml", "baby bottle 120ml", "baby bottle 240ml"],
  "nuk": ["baby bottle", "bottle"],
  "pigeon": ["baby bottle", "bottle"],
  "dr browns": ["baby bottle", "bottle"],
  "mam": ["baby bottle", "bottle"],
  "chuchu": ["baby bottle", "bottle"],

  // Milk Storage
  "medela milk bottles": ["milk storage bags / bottles", "milk storage bottles", "breast milk storage"],
  "milk bottles": ["milk storage bags / bottles"],

  // Bottle Care
  "bottle brush": ["bottle brush", "bottle & nipple brush", "bottle brush / nipple brush", "bottle brush and nipple brush"],
  "bottle clean brush": ["bottle brush", "bottle & nipple brush", "bottle brush / nipple brush"],
  "rotating bottle brush": ["bottle brush", "bottle & nipple brush"],
  "bottle tongs": ["bottle tongs", "bottle tongs / scissor-grip"],

  // Pacifiers (also called "sucker" in some regions)
  "pacifier": ["pacifier", "soother", "pacifier / soother"],
  "sucker": ["pacifier", "soother", "pacifier / soother"],
  "nuk sucker": ["pacifier", "soother", "pacifier / soother"],

  // Bibs
  "bib": ["bibs", "drool bib"],

  // Cleaning & Bath
  "baby shampoo": ["shampoo", "baby wash & shampoo"],
  "baby laundry detergent": ["baby laundry detergent"],

  // Bedding & Towels
  "muslin towel": ["towel", "bath towel", "hooded bath towel"],
  "towel": ["towel"],
  "bath towel": ["bath towel", "hooded bath towel"],
  "muslin blanket": ["muslin blanket", "blanket"],
  "pillow": ["baby pillow"],
  "blanket": ["blanket"],
  "bugaboo bed sheets": ["fitted sheets", "sheet"],
  "bed sheets": ["fitted sheets", "sheet"],

  // Clothing
  "onesie": ["onesie", "bodysuit", "snap crotch onesie"],
  "japanese onesie": ["onesie", "bodysuit"],
  "t-shirt": ["onesie", "bodysuit"],
  "jordan set": ["onesie", "bodysuit", "baby clothing"],
  "dino set": ["onesie", "bodysuit", "baby clothing"],
  "montbell": ["baby clothing", "outerwear"],
  "socks": ["socks", "baby socks"],
  "gloves": ["mittens", "baby mittens"],
  "sweater": ["vest", "warm vest"],
  "down jacket": ["baby clothing", "outerwear"],

  // Special Occasion / Ceremony
  "sailor": ["ceremony dress"],
  "yukata": ["ceremony dress"],
  "sailor yellow set": ["ceremony dress"],
  "white yukata": ["ceremony dress"],
  "blue yukata": ["ceremony dress"],

  // Gear
  "bouncer": ["bouncer", "baby bouncer"],
  "play gym": ["mobile", "baby gym", "play mat"],
  "changing mat": ["diaper changing mat", "diaper changing table", "changing table"],
  "winnie the pooh changing mat": ["diaper changing mat", "diaper changing table", "changing table"],

  // Toys
  "jellycat": ["soothing toy"],
  "busy bee": ["soothing toy"],
  "mawson": ["soothing toy"],

  // Postpartum
  "frida mom": ["postpartum"],
  "frida mom peri bottle": ["perineal wash bottle", "perineal rinse bottle"],
  "peri bottle": ["perineal wash bottle", "perineal rinse bottle"],
  "pregnancy pillow": ["body pillow"],

  // Additional mappings
  "shower wrap": ["bath towel", "hooded bath towel", "towel"],
};

// Normalize item name for matching
function normalize(name: string): string {
  return name.toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Check if a registry item matches a checklist item
export function findChecklistMatch(registryItemName: string, checklistItemName: string): boolean {
  const regNorm = normalize(registryItemName);
  const checkNorm = normalize(checklistItemName);

  // Exact match
  if (regNorm === checkNorm) return true;

  // Check manual mappings
  for (const [key, matches] of Object.entries(INVENTORY_MATCHES)) {
    if (regNorm.includes(normalize(key))) {
      for (const match of matches) {
        if (checkNorm.includes(normalize(match)) || normalize(match).includes(checkNorm)) {
          return true;
        }
      }
    }
  }

  return false;
}

// Get suggested matches for review
export function getSuggestedMatches(registryItemName: string, checklistItems: any[]): Array<{
  checklistItem: any;
  confidence: "high" | "medium" | "low";
  reason: string;
}> {
  const suggestions: Array<{ checklistItem: any; confidence: "high" | "medium" | "low"; reason: string }> = [];
  const regNorm = normalize(registryItemName);

  for (const checklistItem of checklistItems) {
    const checkNorm = normalize(checklistItem.name_en);

    // Check manual mapping
    for (const [key, matches] of Object.entries(INVENTORY_MATCHES)) {
      if (regNorm.includes(normalize(key))) {
        for (const match of matches) {
          if (checkNorm.includes(normalize(match))) {
            suggestions.push({
              checklistItem,
              confidence: "high",
              reason: `Manual mapping: ${key} → ${match}`,
            });
            break;
          }
        }
      }
    }

    // Keyword matching for uncertain ones
    const regWords = regNorm.split(" ").filter((w) => w.length > 3);
    const checkWords = checkNorm.split(" ").filter((w) => w.length > 3);
    const common = regWords.filter((w) => checkWords.includes(w));

    if (common.length >= 2 && !suggestions.find((s) => s.checklistItem.id === checklistItem.id)) {
      suggestions.push({
        checklistItem,
        confidence: "medium",
        reason: `Common words: ${common.join(", ")}`,
      });
    }
  }

  return suggestions.slice(0, 5); // Top 5 suggestions
}
