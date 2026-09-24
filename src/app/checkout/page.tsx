"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCart } from "@/components/cart-context";
import { CLEAR_CART_KEY } from "@/components/clear-cart-on-mount";
import { rememberOrder } from "@/lib/pay-snapshot";
import { Button, ButtonLink, Eyebrow, Field, inputClass, Section } from "@/components/ui";
import { FREE_SHIPPING_MINIMUM, cartCount, cartSubtotal, describeLine, shippingFor, validateCart } from "@/lib/cart";
import { EMPTY_CUSTOMER, validateCustomer, type CustomerInfo, type FieldErrors } from "@/lib/checkout";
import { formatMoney } from "@/lib/money";
import { codeLabel, discountFor, isValidCode, normalizeCode } from "@/lib/discount";
import { IconCheck } from "@/components/icons";

const FIELDS: {
  key: keyof CustomerInfo;
  label: string;
  autoComplete: string;
  type?: string;
  half?: boolean;
  optional?: boolean;
  hint?: string;
  placeholder?: string;
}[] = [
  { key: "fullName", label: "Full name", autoComplete: "name" },
  { key: "phone", label: "Mobile number", autoComplete: "tel", type: "tel", half: true, placeholder: "09XX XXX XXXX" },
  { key: "email", label: "Email address", autoComplete: "email", type: "email", half: true },
  {
    key: "instagram",
    label: "Instagram username (optional)",
    autoComplete: "off",
    optional: true,
    hint: "Recommended — this is where you'll send your payment screenshot.",
    placeholder: "@yourhandle",
  },
  { key: "address1", label: "House / unit / building and street", autoComplete: "address-line1" },
  { key: "barangay", label: "Barangay", autoComplete: "address-level3", half: true },
  { key: "city", label: "City or municipality", autoComplete: "address-level2", half: true },
  { key: "province", label: "Province", autoComplete: "address-level1", half: true },
  { key: "postalCode", label: "Postal code", autoComplete: "postal-code", half: true, placeholder: "1000" },
];

/** New key per mount, so a double-click reuses one order but a fresh visit does not. */
function newIdempotencyKey() {
  return `co-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, ready } = useCart();
  const [customer, setCustomer] = useState<CustomerInfo>(EMPTY_CUSTOMER);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [cartIssues, setCartIssues] = useState<{ key: string; message: string }[]>([]);
  const [serverMessage, setServerMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const idempotencyKey = useRef(newIdempotencyKey());
  const inFlight = useRef(false);

  // The discount box: what they typed, and what has been applied. Only an
  // applied code is sent, and the server recomputes the amount regardless.
  const [codeInput, setCodeInput] = useState("");
  const [appliedCode, setAppliedCode] = useState("");
  const [codeMessage, setCodeMessage] = useState<string | null>(null);

  const applyCode = () => {
    const code = normalizeCode(codeInput);
    if (!code) {
      setAppliedCode("");
      setCodeMessage(null);
      return;
    }
    if (isValidCode(code)) {
      setAppliedCode(code);
      setCodeMessage(null);
    } else {
      setAppliedCode("");
      setCodeMessage("That code isn't one of ours.");
    }
  };

  const subtotal = cartSubtotal(cart);
  const discount = discountFor(appliedCode, cart);
  const shipping = shippingFor(subtotal);
  const localIssues = ready ? validateCart(cart) : [];

  const set = (key: keyof CustomerInfo, value: string) =>
    setCustomer((c) => ({ ...c, [key]: value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inFlight.current) return; // a second click must never make a second order
    setServerMessage(null);
    const fieldErrors = validateCustomer(customer);
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length) {
      document.getElementById(`field-${Object.keys(fieldErrors)[0]}`)?.focus();
      return;
    }
    if (localIssues.length) return;

    inFlight.current = true;
    setSubmitting(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cart,
          customer,
          idempotencyKey: idempotencyKey.current,
          ...(appliedCode ? { discountCode: appliedCode } : {}),
        }),
      });
      const json = await res.json();
      if (res.ok && json.orderNumber) {
        // replace, not push: Back must not return to a filled form and re-submit.
        // The basket is cleared on the payment page, once the order really exists;
        // this marker tells that page the basket it finds is the one just ordered.
        try {
          sessionStorage.setItem(CLEAR_CART_KEY, json.orderNumber);
          // keep a copy so the payment screen works even if the order store is unreachable
          if (json.pay) rememberOrder(json.pay);
        } catch {
          /* storage unavailable; the basket simply stays put */
        }
        router.replace(`/order/${encodeURIComponent(json.orderNumber)}/pay`);
        return;
      }
      if (json.fieldErrors) setErrors(json.fieldErrors);
      else if (json.issues) setCartIssues(json.issues);
      else setServerMessage(json.message ?? "Something went wrong and your order was not saved. Please try again.");
    } catch {
      setServerMessage("We couldn't reach the shop just now. Your order was not saved. Please try again.");
    }
    inFlight.current = false;
    setSubmitting(false);
  };

  if (ready && cart.lines.length === 0) {
    return (
      <Section className="pb-nav pt-12">
        <div className="clay mx-auto max-w-md p-8 text-center">
          <h1 className="font-display text-2xl font-bold">Nothing to check out yet</h1>
          <p className="mt-2 font-sans text-[0.95rem] text-ink-600">
            Your basket is empty. Six tiny books would fix that.
          </p>
          <div className="mt-5 flex justify-center gap-2">
            <ButtonLink href="/build">Build a shelf</ButtonLink>
            <ButtonLink href="/shop" variant="quiet">
              Browse the shop
            </ButtonLink>
          </div>
        </div>
      </Section>
    );
  }

  return (
    <div className="pb-nav">
      <Section className="pt-8">
        <div className="mb-6 text-center">
          <Eyebrow className="mb-2">Checkout</Eyebrow>
          <h1 className="text-3xl font-bold sm:text-4xl">Nearly on your shelf</h1>
          <p className="mx-auto mt-2 max-w-[48ch] font-sans text-[0.95rem] text-ink-600">
            Guest checkout, no account needed. You&apos;ll pay by GCash or MariBank transfer on
            the next screen, then send us your screenshot on Instagram.
          </p>
        </div>

        <form onSubmit={submit} noValidate className="grid items-start gap-6 lg:grid-cols-[1.5fr_1fr]">
          <div className="clay p-5 sm:p-6">
            <h2 className="mb-4 font-display text-xl font-bold">Where should the tiny things go?</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {FIELDS.map((f) => (
                <Field
                  key={f.key}
                  label={f.label}
                  htmlFor={`field-${f.key}`}
                  hint={f.hint}
                  error={errors[f.key]}
                  className={f.half ? "" : "sm:col-span-2"}
                >
                  <input
                    id={`field-${f.key}`}
                    type={f.type ?? "text"}
                    value={customer[f.key]}
                    onChange={(e) => set(f.key, e.target.value)}
                    autoComplete={f.autoComplete}
                    required={!f.optional}
                    aria-invalid={errors[f.key] ? true : undefined}
                    className={`${inputClass} ${errors[f.key] ? "!border-rose-500" : ""}`}
                  />
                </Field>
              ))}
              <Field
                label="Address notes or landmarks (optional)"
                htmlFor="field-addressNotes"
                hint="Gate instructions, a landmark, the colour of the gate — anything that helps the courier find you."
                error={errors.addressNotes}
                className="sm:col-span-2"
              >
                <textarea
                  id="field-addressNotes"
                  value={customer.addressNotes}
                  onChange={(e) => set("addressNotes", e.target.value)}
                  rows={2}
                  maxLength={500}
                  className={`${inputClass} resize-y`}
                />
              </Field>
              <Field
                label="Order notes (optional)"
                htmlFor="field-orderNotes"
                hint="A gift message, or anything else the studio should know."
                error={errors.orderNotes}
                className="sm:col-span-2"
              >
                <textarea
                  id="field-orderNotes"
                  value={customer.orderNotes}
                  onChange={(e) => set("orderNotes", e.target.value)}
                  rows={2}
                  maxLength={500}
                  className={`${inputClass} resize-y`}
                />
              </Field>
            </div>
          </div>

          <aside className="clay sticky top-24 p-5" aria-label="Order summary">
            <h2 className="font-display text-lg font-bold">
              Your order{" "}
              <span className="font-sans text-sm font-bold text-ink-600">
                · {cartCount(cart)} {cartCount(cart) === 1 ? "item" : "items"}
              </span>
            </h2>
            <ul className="mt-3 space-y-2 border-b border-brown-500/10 pb-3">
              {cart.lines.map((line) => (
                <li key={line.key} className="flex justify-between gap-3 font-sans text-[0.9rem]">
                  <span className="text-ink-600">
                    {describeLine(line)} <span className="text-ink-400">× {line.qty}</span>
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-3">
              <label htmlFor="field-discount" className="mb-1.5 block font-sans text-sm font-bold text-ink-800">
                Discount code
              </label>
              <div className="flex gap-2">
                <input
                  id="field-discount"
                  value={codeInput}
                  onChange={(e) => {
                    setCodeInput(e.target.value);
                    setCodeMessage(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      applyCode();
                    }
                  }}
                  onBlur={applyCode}
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  placeholder="Discount code"
                  aria-describedby="discount-note"
                  className={`${inputClass} uppercase ${codeMessage ? "!border-rose-500" : ""}`}
                />
                <Button type="button" variant="quiet" onClick={applyCode} className="shrink-0 px-4">
                  Apply
                </Button>
              </div>
              <p id="discount-note" className={`mt-1 text-xs ${codeMessage ? "font-bold text-rose-700" : "text-ink-600"}`} role={codeMessage ? "alert" : undefined}>
                {codeMessage ??
                  (!appliedCode
                    ? "Got a code? Pop it in here."
                    : discount > 0
                      ? codeLabel(appliedCode)
                      : "That code is for mini book sets. Add a set to use it.")}
              </p>
            </div>
            <dl className="mt-3 space-y-2 font-sans text-[0.95rem]">
              <div className="flex justify-between">
                <dt className="text-ink-600">Subtotal</dt>
                <dd className="font-bold">{formatMoney(subtotal)}</dd>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-sage-700">
                  <dt>Discount ({appliedCode})</dt>
                  <dd className="font-bold">−{formatMoney(discount)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-ink-600">Shipping</dt>
                <dd className="font-bold">
                  {shipping === 0 ? "Free" : formatMoney(shipping)}
                </dd>
              </div>
              {shipping > 0 && (
                <p className="text-xs text-ink-600">
                  Add {formatMoney(FREE_SHIPPING_MINIMUM - subtotal)} more for free shipping.
                </p>
              )}
              <div className="flex justify-between border-t border-brown-500/15 pt-2 text-[1.05rem]">
                <dt className="font-display font-bold">Total</dt>
                <dd className="font-display font-bold">{formatMoney(subtotal - discount + shipping)}</dd>
              </div>
            </dl>

            {(localIssues.length > 0 || cartIssues.length > 0) && (
              <div className="stitch mt-4 bg-blush-100/60 p-3" role="alert">
                <p className="font-sans text-sm font-bold text-rose-700">Before payment:</p>
                <ul className="mt-1 list-disc pl-4 font-sans text-sm text-rose-700">
                  {[...localIssues, ...cartIssues].map((i, n) => (
                    <li key={n}>{i.message}</li>
                  ))}
                </ul>
                <Link href="/cart" className="mt-1 inline-block font-sans text-sm font-bold text-rose-700 underline">
                  Fix it in the basket
                </Link>
              </div>
            )}
            {serverMessage && (
              <p className="stitch mt-4 bg-blush-100/60 p-3 font-sans text-sm font-bold text-rose-700" role="alert">
                {serverMessage}
              </p>
            )}

            <Button
              type="submit"
              disabled={submitting || localIssues.length > 0}
              className="btn-lg mt-4 w-full"
            >
              {submitting ? "Saving your order…" : "Place order"}
            </Button>
            <ul className="mt-3 space-y-1 font-sans text-xs text-ink-600">
              {[
                "No card details, ever",
                "Pay by GCash or MariBank on the next screen",
                "Confirmed once we've checked your screenshot",
              ].map((t) => (
                <li key={t} className="flex items-center gap-1.5">
                  <IconCheck className="h-3.5 w-3.5 shrink-0 text-sage-600" /> {t}
                </li>
              ))}
            </ul>
          </aside>
        </form>
      </Section>
    </div>
  );
}
