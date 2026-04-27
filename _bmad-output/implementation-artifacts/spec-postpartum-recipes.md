---
title: 'Postpartum Recipes Page'
type: 'feature'
created: '2026-04-27'
status: 'complete'
baseline_commit: '7e72c84'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Expecting parents need guidance on postpartum recovery meals — traditional Chinese (月子餐) and Japanese (産後の食事) recipes organized by recovery phase, searchable by protein and ingredients. No such resource exists in the app.

**Approach:** Add a `/recipes` page with 100+ curated recipes in a static JSON data file, with search, protein filter (tofu, fish, beef, chicken, pork), cuisine filter (Chinese/Japanese), and recovery phase filter matching the 4 postpartum stages (休養期, 溫補期, 大補期, 保養期). Each recipe shows bilingual name, ingredients list, and basic instructions.

## Boundaries & Constraints

**Always:** Recipes are read-only reference data (not user-editable). Show bilingual names (English + Chinese/Japanese). Include all 4 recovery phases from the menu reference image. Each recipe must have: name, cuisine, protein type, phase, ingredients list, prep time, and instructions.

**Ask First:** Adding recipe bookmarking/favorites to the store (defer unless trivial). Adding meal planning/weekly schedule view.

**Never:** No external API calls for recipes. No user-submitted recipes. No nutritional calculation.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Search by keyword | User types "ginger" | Show recipes containing "ginger" in name or ingredients | Empty state if no matches |
| Filter by protein | Select "Fish" | Show only fish-protein recipes | Show count and clear filter option |
| Filter by phase | Select "休養期 Rest (Days 0-7)" | Show recipes appropriate for that phase | N/A |
| Combined filters | Protein=Chicken + Phase=大補期 + search="soup" | Intersection of all filters | "No recipes match" with reset button |
| Empty search | Clear all filters | Show all 100+ recipes | N/A |

</frozen-after-approval>

## Code Map

- `data/postpartum_recipes.json` -- 100+ recipes with bilingual names, ingredients, phases, protein types
- `src/app/recipes/page.tsx` -- New page: search bar, filter chips, recipe cards grid
- `src/types/index.ts` -- Recipe type definitions (PostpartumRecipe, RecipeCuisine, RecipeProtein, RecipePhase)
- `src/components/Sidebar.tsx` -- Add "Recipes" nav item with UtensilsCrossed icon
- `src/app/search/page.tsx` -- Wire recipes into global search

## Tasks & Acceptance

**Execution:**
- [x] `src/types/index.ts` -- Add PostpartumRecipe interface and union types for cuisine, protein, phase
- [x] `data/postpartum_recipes.json` -- Create 100+ curated Chinese and Japanese postpartum recipes with bilingual names, ingredients, instructions, protein type, phase, and prep time
- [x] `src/app/recipes/page.tsx` -- Build recipes page with search input, protein/cuisine/phase filter chips, collapsible recipe cards showing ingredients and instructions, responsive grid layout
- [x] `src/components/Sidebar.tsx` -- Add Recipes nav item between "Birth Plan" and "Notes"
- [x] `src/app/search/page.tsx` -- Add recipes section to global search results

**Acceptance Criteria:**
- Given the recipes page loads, when no filters active, then all 100+ recipes display in a responsive grid
- Given user types in search, when input matches recipe name or ingredient, then results filter in real-time
- Given user selects protein filter "Fish", when combined with phase "休養期", then only fish recipes for that phase show
- Given user clicks a recipe card, when expanded, then bilingual name, ingredients list, prep time, and instructions are visible

## Design Notes

**Recovery phases (from image reference):**
1. 休養期 Rest Period (Days 0-7) — light, easy-to-digest foods
2. 溫補期 Warm Toning (Days 8-22) — warming soups and broths
3. 大補期 Major Toning (Days 23-30) — rich nourishing meals
4. 保養期 Maintenance (Day 31+) — balanced nutrition

**Recipe data structure example:**
```json
{
  "id": "cn-001",
  "name_en": "Red Date Steamed Chicken",
  "name_zh": "紅棗蒸滑雞",
  "cuisine": "chinese",
  "protein": "chicken",
  "phase": "rest",
  "prepTime": 30,
  "servings": 2,
  "ingredients": ["chicken thigh 200g", "red dates 6pcs", "ginger 3 slices", "sesame oil 1 tsp", "rice wine 1 tbsp"],
  "instructions": ["Slice chicken into pieces...", "Steam for 20 minutes..."]
}
```

## Verification

**Commands:**
- `npx next lint --quiet` -- expected: no errors
- `curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/recipes` -- expected: 200

**Manual checks:**
- Recipes page shows 100+ recipes with working search and filters
- Bilingual names display correctly (Chinese/Japanese characters render)
- Sidebar shows "Recipes" nav item
