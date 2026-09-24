import { getProduct, getVariant, SHELF_THEMES } from "./catalog";
import { cartSubtotal, lineUnitPrice, setsOf, shippingFor, validateCart, type Cart, type CartLine } from "./cart";
import type { Cents } from "./money";
import { discountFor, isValidCode, normalizeCode } from "./discount";

/**
 * Customer details collected at checkout; only what the order needs to be
 * made and delivered. Addresses are Philippine-shaped (province / city /
 * barangay) because that is where the shop ships.
 */
export interface CustomerInfo {
  fullName: string;
  phone: string;
  email: string;
  instagram: string;
  address1: string;
  barangay: string;
  city: string;
  province: string;
  postalCode: string;
  addressNotes: string;
  orderNotes: string;
}

export const EMPTY_CUSTOMER: CustomerInfo = {
  fullName: "",
  phone: "",
  email: "",
  instagram: "",
  address1: "",
  barangay: "",
  city: "",
  province: "",
  postalCode: "",
  addressNotes: "",
  orderNotes: "",
};

export type FieldErrors = Partial<Record<keyof CustomerInfo, string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateCustomer(c: Partial<CustomerInfo>): FieldErrors {
  const errors: FieldErrors = {};
  const need = (key: keyof CustomerInfo, label: string, max = 120) => {
    const v = (c[key] ?? "").trim();
    if (!v) errors[key] = `Please add ${label}.`;
    else if (v.length > max) errors[key] = `That ${label} looks too long.`;
  };
  need("fullName", "your full name");
  need("phone", "a mobile number", 40);
  if (!errors.phone && !/^[\d+()\-\s]{7,}$/.test(c.phone!.trim()))
    errors.phone = "That mobile number doesn't look right.";
  need("email", "your email address");
  if (!errors.email && !EMAIL_RE.test(c.email!.trim()))
    errors.email = "That email address doesn't look right.";
  need("address1", "a house or street address", 200);
  need("barangay", "a barangay", 120);
  need("city", "a city or municipality", 120);
  need("province", "a province", 120);
  need("postalCode", "a postal code", 20);
  if (!errors.postalCode && !/^\d{4}$/.test(c.postalCode!.trim()))
    errors.postalCode = "A Philippine postal code is four digits.";
  if ((c.instagram ?? "").length > 60) errors.instagram = "Please keep this under 60 characters.";
  for (const key of ["addressNotes", "orderNotes"] as const) {
    if ((c[key] ?? "").length > 500) errors[key] = "Please keep this under 500 characters.";
  }
  return errors;
}

/** "@handle" and "instagram.com/handle" both come out as "handle". */
export function normalizeInstagram(raw: string): string {
  return raw
    .trim()
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, "")
    .replace(/^@/, "")
    .replace(/\/+$/, "")
    .slice(0, 60);
}

/* ─── Order snapshot (expanded server-side at order time) ─────────────────── */

export interface SnapshotItem {
  kind: "product" | "bundle";
  name: string;
  qty: number;
  unitPrice: Cents;
  lineTotal: Cents;
  details: string[]; // human-readable option/config lines
  titles?: { title: string; author?: string }[];
  notes?: string;
}

export interface OrderSnapshot {
  items: SnapshotItem[];
  customer: CustomerInfo;
  subtotal: Cents;
  /** taken off the subtotal; zero when no valid code was given */
  discount: Cents;
  discountCode?: string;
  shipping: Cents;
  total: Cents;
  currency: string;
}

function lineDetails(line: CartLine): { name: string; details: string[]; titles?: SnapshotItem["titles"]; notes?: string } {
  if (line.type === "product") {
    const product = getProduct(line.slug)!;
    const variant = getVariant(product, line.variantId)!;
    const details = Object.entries(variant.options).map(([k, v]) => `${k}: ${v}`);
    const sets = product.customSet ? setsOf(line.titles) : 1;
    if (product.setOfSix)
      details.push(sets > 1 ? `Sold as ${sets} sets of six (${line.titles!.length} books)` : "Sold as a set of six");
    if (line.singleTitle) details.push(`Personalized title: ${line.singleTitle}`);
    return {
      name: product.name,
      details,
      titles: line.titles,
      notes: line.notes,
    };
  }
  const shelf = getProduct(line.shelf.slug)!;
  const shelfVar = getVariant(shelf, line.shelf.variantId)!;
  const set = getProduct(line.set.slug)!;
  const setVar = getVariant(set, line.set.variantId)!;
  const theme = SHELF_THEMES.find((t) => t.id === line.themeId);
  const details = [
    `Shelf: ${shelf.name} (${Object.values(shelfVar.options).join(", ")})`,
    `Book set: ${set.name}${setVar.options["Cover Style"] ? ` (${setVar.options["Cover Style"]})` : ""}${
      set.customSet && setsOf(line.set.titles) > 1 ? ` · ${line.set.titles!.length} books` : ""
    }`,
    ...line.accessories.map((a) => {
      const p = getProduct(a.slug)!;
      const v = getVariant(p, a.variantId)!;
      const opt = Object.values(v.options).join(", ");
      return `Extra: ${p.name}${opt ? ` (${opt})` : ""}`;
    }),
  ];
  if (theme) details.push(`Shelf theme: ${theme.name}`);
  details.push("Ships together in the illustrated box");
  return {
    name: "Little Shelf Bundle",
    details,
    titles: line.set.titles,
    notes: line.notes,
  };
}

/**
 * Validates the cart against the catalog and produces the priced snapshot.
 * All prices come from the catalog; client-sent prices are never trusted.
 */
export function buildSnapshot(
  cart: Cart,
  customer: CustomerInfo,
  discountCode?: string,
): { snapshot?: OrderSnapshot; issues: { key: string; message: string }[] } {
  const issues = validateCart(cart);
  if (issues.length) return { issues };
  const items: SnapshotItem[] = cart.lines.map((line) => {
    const unitPrice = lineUnitPrice(line);
    const meta = lineDetails(line);
    return {
      kind: line.type,
      name: meta.name,
      qty: line.qty,
      unitPrice,
      lineTotal: unitPrice * line.qty,
      details: meta.details,
      titles: meta.titles,
      notes: meta.notes,
    };
  });
  const subtotal = cartSubtotal(cart);
  const shipping = shippingFor(subtotal);
  const discount = discountFor(discountCode, cart);
  return {
    issues: [],
    snapshot: {
      items,
      customer,
      subtotal,
      discount,
      ...(isValidCode(discountCode) ? { discountCode: normalizeCode(discountCode) } : {}),
      shipping,
      total: subtotal - discount + shipping,
      currency: "PHP",
    },
  };
}
