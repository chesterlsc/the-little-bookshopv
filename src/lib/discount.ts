import { getProduct } from "./catalog";
import { lineUnitPrice, type Cart, type CartLine } from "./cart";
import type { Cents } from "./money";

/**
 * The shop's discount codes: a handful of fixed codes, each a percentage off
 * the lines it covers.
 *
 * Fixed rather than per-customer on purpose. A per-customer code needs a
 * table of issued codes; a shared code is what every shop this size actually
 * runs. The price is only ever computed on the server from this file, so a
 * made-up code or an edited request cannot buy a bigger discount than this.
 *
 * Shipping is worked out on the subtotal before the discount, so a code never
 * costs a customer the free-shipping threshold they had already reached.
 */
export const WELCOME_CODE = "WELCOME5";
export const WELCOME_PERCENT = 5;

/** A standalone mini book set, named or custom. A bundle's set is priced into the bundle. */
const isBookSet = (line: CartLine) => line.type === "product" && Boolean(getProduct(line.slug)?.setOfSix);

const CODES: Record<string, { percent: number; covers: (line: CartLine) => boolean; label: string }> = {
  [WELCOME_CODE]: { percent: WELCOME_PERCENT, covers: () => true, label: `${WELCOME_PERCENT}% off applied.` },
  BOOKSET10: { percent: 10, covers: isBookSet, label: "10% off your mini book sets applied." },
};

/** Codes are typed by hand, so spaces and case are forgiven. */
export function normalizeCode(raw: string | undefined | null): string {
  return (raw ?? "").trim().toUpperCase().replace(/\s+/g, "").slice(0, 20);
}

export function isValidCode(raw: string | undefined | null): boolean {
  return normalizeCode(raw) in CODES;
}

/** What the checkout says once a code is applied. */
export function codeLabel(raw: string | undefined | null): string {
  return CODES[normalizeCode(raw)]?.label ?? "";
}

/** Whole centavos, rounded down: the shop never over-discounts by rounding. */
export function discountFor(code: string | undefined | null, cart: Cart): Cents {
  const rule = CODES[normalizeCode(code)];
  if (!rule) return 0;
  const covered = cart.lines
    .filter(rule.covers)
    .reduce((sum, line) => sum + lineUnitPrice(line) * line.qty, 0);
  return covered > 0 ? Math.floor((covered * rule.percent) / 100) : 0;
}
