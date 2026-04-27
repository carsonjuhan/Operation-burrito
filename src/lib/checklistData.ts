import { ChecklistItem, ItemCategory, ItemTiming } from "@/types";
import rawData from "../../data/baby_checklist_metadata_v2.json";
import registryData from "../../data/baby_registry_items.json";
import { findChecklistMatch } from "./inventoryMatching";

// Map source lists to timing categories
function getTiming(list: string): ItemTiming {
  const l = list.toLowerCase();
  if (l.includes("hospital bag") || l.includes("待產包")) return "Hospital (Pre-birth)";
  if (l.includes("maternity") || l.includes("マタニティ")) return "Pregnancy";
  if (
    l.includes("baby shopping") ||
    l.includes("寶寶用品") ||
    l.includes("baby clothing") ||
    l.includes("ベビーウェア") ||
    l.includes("sleep") ||
    l.includes("ねんね") ||
    l.includes("feeding") ||
    l.includes("授乳") ||
    l.includes("diaper") ||
    l.includes("おむつ") ||
    l.includes("bath") ||
    l.includes("おふろ")
  ) {
    return "Newborn (0-3 months)";
  }
  if (l.includes("outing") || l.includes("おでかけ")) return "1-6 months";
  if (l.includes("milestone") || l.includes("メモリアル")) return "Special occasions";
  return "Other";
}

// Map original categories to app categories
function mapCategory(categoryEn?: string, categoryOriginal?: string, nameEn?: string): ItemCategory {
  const cat = (categoryEn || "").toLowerCase();
  const name = (nameEn || "").toLowerCase();

  // Documents & IDs
  if (cat.includes("id") || cat.includes("document") || cat.includes("card")) return "Postpartum";

  // Clothing & accessories
  if (
    cat.includes("clothing") ||
    cat.includes("daily items") ||
    name.includes("cloth") ||
    name.includes("outfit") ||
    name.includes("wear") ||
    name.includes("bra") ||
    name.includes("shorts") ||
    name.includes("pajama") ||
    name.includes("undershirt") ||
    name.includes("romper") ||
    name.includes("sock") ||
    name.includes("hat") ||
    name.includes("mitten") ||
    name.includes("swaddle") ||
    name.includes("vest") ||
    name.includes("bib")
  ) {
    return "Clothing";
  }

  // Sleep items
  if (
    cat.includes("sleep") ||
    cat.includes("room") ||
    name.includes("crib") ||
    name.includes("bed") ||
    name.includes("mattress") ||
    name.includes("sheet") ||
    name.includes("blanket") ||
    name.includes("pillow") ||
    name.includes("sleeper") ||
    name.includes("futon") ||
    name.includes("mobile")
  ) {
    return "Nursery";
  }

  // Feeding
  if (
    cat.includes("feeding") ||
    cat.includes("formula") ||
    cat.includes("breastfeed") ||
    name.includes("bottle") ||
    name.includes("nipple") ||
    name.includes("formula") ||
    name.includes("breast") ||
    name.includes("pump") ||
    name.includes("milk") ||
    name.includes("nursing") ||
    name.includes("pacifier") ||
    name.includes("steriliz")
  ) {
    return "Feeding";
  }

  // Bath & hygiene
  if (
    cat.includes("bath") ||
    cat.includes("care") ||
    name.includes("bath") ||
    name.includes("wash") ||
    name.includes("soap") ||
    name.includes("shampoo") ||
    name.includes("lotion") ||
    name.includes("towel") ||
    name.includes("gauze") ||
    name.includes("diaper") ||
    name.includes("nappy") ||
    name.includes("wipe")
  ) {
    return "Health & Hygiene";
  }

  // Medical
  if (
    name.includes("thermometer") ||
    name.includes("medicine") ||
    name.includes("nasal") ||
    name.includes("temperature") ||
    name.includes("humidity") ||
    name.includes("first aid") ||
    name.includes("fever") ||
    name.includes("nail")
  ) {
    return "Safety";
  }

  // Gear & outings
  if (
    cat.includes("outing") ||
    name.includes("stroller") ||
    name.includes("car seat") ||
    name.includes("carrier") ||
    name.includes("bouncer") ||
    name.includes("monitor") ||
    name.includes("swing")
  ) {
    return "Travel";
  }

  // Hospital bag & postpartum
  if (
    cat.includes("labour") ||
    cat.includes("delivery") ||
    cat.includes("postpartum") ||
    cat.includes("hospital") ||
    cat.includes("admission") ||
    cat.includes("essentials") ||
    cat.includes("thoughtful")
  ) {
    return "Postpartum";
  }

  // Toys & milestone items
  if (
    cat.includes("milestone") ||
    cat.includes("ceremony") ||
    cat.includes("memorial") ||
    name.includes("ceremony") ||
    name.includes("shrine") ||
    name.includes("naming") ||
    name.includes("cord case") ||
    name.includes("handprint") ||
    name.includes("toy")
  ) {
    return "Toys & Gear";
  }

  return "Other";
}

// Map Amazon category to app category
function mapAmazonCategory(amazonCat: string): ItemCategory {
  const cat = amazonCat.toLowerCase();
  if (cat.includes("stroller") || cat.includes("car seat") || cat.includes("activity") || cat.includes("gear")) return "Travel";
  if (cat.includes("diaper")) return "Health & Hygiene";
  if (cat.includes("clothing") || cat.includes("apparel")) return "Clothing";
  if (cat.includes("bathing")) return "Health & Hygiene";
  if (cat.includes("feeding") || cat.includes("nursing")) return "Feeding";
  if (cat.includes("nursery") || cat.includes("furniture")) return "Nursery";
  if (cat.includes("toy")) return "Toys & Gear";
  return "Other";
}

// Get ALL items you have (Amazon purchases + Google Sheet inventory)
export const AMAZON_PURCHASED_ITEMS = (registryData.items as any[])
  .filter((item: any) => {
    // Amazon items: check 'purchased' field
    if (item.source === "amazon_registry") return item.purchased === true;
    // Google Sheet items: if it's in the sheet with a quantity, you have it
    if (item.source === "google_sheet") return item.quantity > 0;
    return false;
  })
  .map((item: any) => ({
    id: `registry-${item.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    name: item.name,
    category: mapAmazonCategory(item.category),
    price: item.price,
    currency: item.currency,
    source: item.source,
    purchasedFrom: item.source === "amazon_registry"
      ? "Amazon"
      : (item.purchased_from || "Inventory"),
    originalCategory: item.category,
    quantity: item.quantity,
  }));

// Process and deduplicate the raw JSON data
const processedItems = rawData.items.map((item: any) => ({
  id: item.id,
  name: item.name_en,
  nameOriginal: item.name_original,
  category: mapCategory(item.category_en, item.category_original, item.name_en),
  categoryOriginal: item.category_original,
  categoryEn: item.category_en,
  timing: getTiming(item.list),
  source: item.source_name,
  list: item.list,
}));

// Normalize item name for better deduplication
function normalizeForDedup(name: string): string {
  let normalized = name.toLowerCase();

  // Remove parenthetical notes
  normalized = normalized.replace(/\s*\([^)]*\)/g, "");

  // Remove size/quantity specifications (120ml, 160ml x2, etc.)
  normalized = normalized.replace(/\d+\s*ml(\s*x\d+)?/g, "");
  normalized = normalized.replace(/\s*x\d+\s*/g, " ");

  // Handle specific bottle synonyms BEFORE normalizing slashes
  normalized = normalized.replace(/nipple\s*\/\s*teat/g, "nipple");
  normalized = normalized.replace(/\bteat\b/g, "nipple");

  // Normalize slashes and conjunctions
  normalized = normalized.replace(/\s*\/\s*/g, " ");
  normalized = normalized.replace(/\s+(&|and)\s+/g, " ");

  // Handle specific synonyms and variations
  normalized = normalized.replace(/drool\s+anti-leak cloth/g, "bib");
  normalized = normalized.replace(/drool\s*(bib)?/g, "bib");
  normalized = normalized.replace(/anti-leak\s*cloth/g, "bib");

  // Normalize milk storage variations
  normalized = normalized.replace(/breast milk storage bags?/g, "milk storage");
  normalized = normalized.replace(/milk storage bags?\s*bottles?/g, "milk storage");

  // Normalize bottle-related items
  normalized = normalized.replace(/replacement\s+bottle\s+nipples?/g, "bottle nipple");
  normalized = normalized.replace(/bottle\s+(cleaning liquid|washing detergent)/g, "bottle detergent");
  normalized = normalized.replace(/bottle\s+tongs\s*(scissor-grip)?/g, "bottle tongs");

  // Normalize pacifier/soother synonyms
  normalized = normalized.replace(/\bsoother\b/g, "pacifier");
  normalized = normalized.replace(/\bvanilla\s+pacifier\b/g, "pacifier");
  normalized = normalized.replace(/\bdummy\b/g, "pacifier");

  // Normalize car seat variations
  normalized = normalized.replace(/\bcar\s+seat\b/g, "car seat");
  normalized = normalized.replace(/\binfant\s+car\s+seat\b/g, "car seat");

  // Normalize carrier variations
  normalized = normalized.replace(/\bcarrier\s+wrap\b/g, "carrier");
  normalized = normalized.replace(/\bbaby\s+carrier\b/g, "carrier");

  // Normalize bathtub/bath tub (same item, different spacing)
  normalized = normalized.replace(/\bbath\s*tub\b/g, "bathtub");

  // Normalize bouncer variations (slashes already replaced with spaces by this point)
  normalized = normalized.replace(/\bbouncer\s+(rocker\s+)?lounger\b.*$/g, "bouncer");
  normalized = normalized.replace(/\bbouncer\s+rocker\b.*$/g, "bouncer");

  // Normalize wipe warmer variations
  normalized = normalized.replace(/\bwet\s+wipe\s+warmer\b/g, "wipe warmer");
  normalized = normalized.replace(/\bwipe\s+warmer\s*\([^)]*\)/g, "wipe warmer");

  // Normalize tissue/tissue paper
  normalized = normalized.replace(/\btissue\s+paper\b/g, "tissue");

  // Normalize nail scissors/file variations
  normalized = normalized.replace(/\bnail\s+(scissors|file).*$/g, "nail scissors");

  // Normalize nursing cover/cape
  normalized = normalized.replace(/\bnursing\s+cover\b.*$/g, "nursing cover");

  // Normalize night light variations
  normalized = normalized.replace(/\bnursing\s+night\s+light\b/g, "night light");

  // Normalize vaseline/baby oil
  normalized = normalized.replace(/\bvaseline\b.*$/g, "vaseline");

  // Normalize baby lotion/cream (but not "moisturizing lotion" which is a specific brand)
  normalized = normalized.replace(/\blotion\s*(\/\s*cream)?\b.*$/g, "lotion");

  // Normalize diaper bag variations
  normalized = normalized.replace(/\b(mother'?s?\s+bag|diaper\s+bag|baby\s+tote)\b/g, "diaper bag");

  // Normalize diaper changing table/mat
  normalized = normalized.replace(/\bdiaper\s+changing\s+(table|mat)\b/g, "diaper changing mat");

  // Normalize diapers variations (standalone "diapers" items, not "diaper bag" etc.)
  // Note: "x\d+" may already be stripped by earlier regex, leaving just "pack"
  normalized = normalized.replace(/^(newborn\s+)?diapers?\s*((x\d+\s+)?pack)?$/g, "diapers");
  normalized = normalized.replace(/^disposable\s+diapers?\b.*$/g, "diapers");

  // Normalize water/bath thermometer
  normalized = normalized.replace(/\b(bath\s+)?water\s+thermometer\b/g, "water thermometer");

  // Remove common prefixes
  normalized = normalized.replace(/^(baby|infant|newborn)\s+/g, "");

  // Normalize spacing
  normalized = normalized.replace(/\s+/g, " ").trim();

  // Remove duplicate words (e.g., "bib bib" -> "bib")
  const words = normalized.split(" ");
  const uniqueWords = [...new Set(words)];
  normalized = uniqueWords.join(" ");

  return normalized;
}

// Deduplicate by name (case-insensitive) and merge timing info
const deduplicatedMap = new Map<string, ChecklistItem>();
for (const item of processedItems) {
  const key = normalizeForDedup(item.name);
  if (deduplicatedMap.has(key)) {
    const existing = deduplicatedMap.get(key)!;
    // Keep the shorter, simpler name
    if (item.name.length < existing.name.length) {
      existing.name = item.name;
    }
    // Merge timing - keep unique timings
    const timings = new Set<ItemTiming>([existing.timing, item.timing]);
    // If multiple timings, join them (or pick the earliest)
    if (timings.size > 1) {
      // Keep the earliest timing in the lifecycle
      const order: ItemTiming[] = [
        "Pregnancy",
        "Hospital (Pre-birth)",
        "Newborn (0-3 months)",
        "1-6 months",
        "Special occasions",
        "Other",
      ];
      for (const t of order) {
        if (timings.has(t)) {
          existing.timing = t;
          break;
        }
      }
    }
  } else {
    deduplicatedMap.set(key, { ...item });
  }
}

export const CHECKLIST_ITEMS: ChecklistItem[] = Array.from(deduplicatedMap.values());

// Match inventory items to checklist items
export const MATCHED_CHECKLIST_IDS = new Set<string>();
export const UNIQUE_INVENTORY_ITEMS: any[] = [];
export const MATCH_LOG: Array<{ inventory: string; checklist: string; matched: boolean }> = [];

for (const invItem of AMAZON_PURCHASED_ITEMS) {
  let foundMatch = false;
  let matchedTo = "";

  for (const checklistItem of CHECKLIST_ITEMS) {
    if (findChecklistMatch(invItem.name, checklistItem.name)) {
      MATCHED_CHECKLIST_IDS.add(checklistItem.id);
      matchedTo = checklistItem.name;
      foundMatch = true;
      break; // Stop after first match
    }
  }

  // Log for debugging
  if (foundMatch) {
    MATCH_LOG.push({ inventory: invItem.name, checklist: matchedTo, matched: true });
  }

  // If no match found, this is a unique item (not in checklist)
  if (!foundMatch) {
    UNIQUE_INVENTORY_ITEMS.push(invItem);
    MATCH_LOG.push({ inventory: invItem.name, checklist: "", matched: false });
  }
}

// Export timing options for filters
export const TIMING_OPTIONS: ItemTiming[] = [
  "Pregnancy",
  "Hospital (Pre-birth)",
  "Newborn (0-3 months)",
  "1-6 months",
  "Special occasions",
  "Other",
];
