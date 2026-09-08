/**
 * The `Food` shape every part of the nutrition system works with — a normalized nutrition record,
 * regardless of where it actually came from.
 *
 * GymCrew does not bundle or hand-author its own nutrition data. The real food database is Open
 * Food Facts, a free, open, community-maintained database covering products worldwide (see
 * backend/routes/nutrition-off.php, which proxies and caches it server-side). The only foods that
 * exist purely client-side are the ones a user explicitly creates themselves (see
 * store/custom-foods-store.ts) — never a general-purpose catalog someone at GymCrew typed in.
 */

export type FoodSource = "user_created" | "open_food_facts";

export type Food = {
  id: string;
  name: string;
  brand?: string;
  source: FoodSource;
  /** Macros below are "per this many `servingUnit`" — e.g. 100 "g", or 1 "piece" for a banana/egg. */
  servingSize: number;
  servingUnit: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG?: number;
  sugarG?: number;
  saturatedFatG?: number;
  sodiumMg?: number;
  /** Only set for `source: "open_food_facts"` — the external product barcode (see
   * NUTRITION.md section 36's source-transparency requirement). */
  barcode?: string;
  /** Product photo — Open Food Facts' own product image for `open_food_facts` foods, or a photo the
   * user picked when creating a custom food (stored as a data URI, same as avatar uploads elsewhere
   * in the app). Optional everywhere — plenty of real foods/products have no photo. */
  photoUrl?: string;
};
