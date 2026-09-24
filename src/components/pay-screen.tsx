"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge, ButtonLink, Section } from "./ui";
import { PaymentInstructions } from "./payment-instructions";
import { CopyButton } from "./copy-button";
import { SprigDivider } from "./illustrations";
import { useCart } from "./cart-context";
import { CLEAR_CART_KEY } from "./clear-cart-on-mount";
import { formatMoney } from "@/lib/money";
import { recallOrder, type PaySnapshot } from "@/lib/pay-snapshot";
import { SITE } from "@/content/site";

/**
 * The payment screen.
 *
 * `initial` is the server's copy and is always preferred. When the order store
 * could not be reached — or a serverless instance without the row served the
 * page — this falls back to the copy the checkout kept in this tab, so a
 * customer who has just placed an order can always see what they owe.
 */
export function PayScreen({
  orderNumber,
  initial,
}: {
  orderNumber: string;
  initial: PaySnapshot | null;
}) {
  const [snap, setSnap] = useState<PaySnapshot | null>(initial);
  const [checked, setChecked] = useState(initial !== null);
  const { cart, ready, clearCart } = useCart();

  // fall back to this tab's copy, and empty the basket once we know the order
  useEffect(() => {
    const local = initial ?? recallOrder(orderNumber);
    if (!initial && local) setSnap(local);
    setChecked(true);
    if (!local || !ready) return;
    try {
      if (sessionStorage.getItem(CLEAR_CART_KEY) !== orderNumber) return;
      sessionStorage.removeItem(CLEAR_CART_KEY); // consumed: refreshes are no-ops
    } catch {
      return;
    }
    if (cart.lines.length) clearCart();
  }, [initial, orderNumber, ready, cart.lines.length, clearCart]);

  if (!snap) {
    return (
      <Section className="pb-nav pt-12">
        <div className="clay mx-auto max-w-md p-8 text-center">
          <h1 className="font-display text-2xl font-bold">
            {checked ? "We couldn't open this order" : "Finding your order…"}
          </h1>
          {checked && (
            <>
              <p className="mt-2 font-sans text-[0.95rem] leading-relaxed text-ink-600">
                Your order number is{" "}
                <span className="font-bold text-ink-800">#{orderNumber}</span>. We emailed you the
                payment details too, so check your inbox. If you can&apos;t find them, message us
                with that number and we&apos;ll sort it out.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <CopyButton value={orderNumber} label="order number" />
                <ButtonLink href="/contact" variant="quiet">
                  Contact us
                </ButtonLink>
              </div>
              <p className="mt-3 font-sans text-xs text-ink-600">{SITE.contactEmail}</p>
            </>
          )}
        </div>
      </Section>
    );
  }

  return (
    <Section className="pt-8">
      <div className="mx-auto max-w-2xl">
        {/* ── order received ── */}
        <div className="text-center">
          <h1 className="hero-h1 text-balance font-display font-bold text-ink-900">
            Your little order has been submitted ♡
          </h1>
          <p className="story-line mx-auto mt-3 max-w-[42ch] text-pretty text-[1.08rem] leading-relaxed text-ink-600">
            Complete your payment, then send us your payment screenshot below (or on Instagram) so
            we can confirm your order and begin processing it.
          </p>
          <p className="mx-auto mt-2 max-w-[44ch] font-sans text-[0.95rem] leading-relaxed text-ink-600">
            Submitting it does not confirm it yet. We only start making your order once we have
            received and checked your payment screenshot.
          </p>
        </div>

        {/* ── how to pay ── */}
        <div className="mt-6">
          <PaymentInstructions
            orderNumber={snap.number}
            customerName={snap.customerName}
            total={snap.total}
          />
        </div>

        {/* ── the order slip ── */}
        <div className="clay mt-8 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-brown-500/12 bg-paper p-5">
            <div>
              <p className="eyebrow mb-1">Your order number</p>
              <p className="font-display text-[2rem] font-bold leading-none text-ink-900 sm:text-[2.4rem]">
                #{snap.number}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge tone="taupe">Awaiting payment</Badge>
              <CopyButton value={snap.number} label="order number" />
            </div>
          </div>

          <div className="p-5">
            <dl className="space-y-1.5 font-sans text-[0.95rem]">
              <div className="flex justify-between gap-4">
                <dt className="text-ink-600">Name</dt>
                <dd className="text-right font-bold">{snap.customerName}</dd>
              </div>
            </dl>

            <ul className="mt-4 space-y-2.5">
              {snap.items.map((item, i) => (
                <li key={i} className="stitch bg-paper p-3.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="font-display font-bold">{item.name}</p>
                    <p className="shrink-0 font-display font-semibold">
                      {formatMoney(item.lineTotal)}
                    </p>
                  </div>
                  <p className="font-sans text-xs text-ink-600">
                    Qty {item.qty} · {formatMoney(item.unitPrice)} each
                  </p>
                  {item.details.length > 0 && (
                    <ul className="mt-1 font-sans text-[0.86rem] text-ink-600">
                      {item.details.map((d) => (
                        <li key={d}>{d}</li>
                      ))}
                    </ul>
                  )}
                  {item.titles && item.titles.length > 0 && (
                    <ol className="mt-1.5 grid list-decimal gap-0.5 pl-5 font-sans text-[0.86rem] text-ink-600">
                      {item.titles.map((t, n) => (
                        <li key={n}>
                          {t.title}
                          {t.author ? `, ${t.author}` : ""}
                        </li>
                      ))}
                    </ol>
                  )}
                  {item.notes && (
                    <p className="mt-1.5 font-sans text-[0.86rem] italic text-ink-600">
                      Note: {item.notes}
                    </p>
                  )}
                </li>
              ))}
            </ul>

            <dl className="mt-4 space-y-2 border-t border-brown-500/12 pt-4 font-sans text-[0.95rem]">
              <div className="flex justify-between gap-4">
                <dt className="text-ink-600">Subtotal</dt>
                <dd className="font-bold">{formatMoney(snap.subtotal)}</dd>
              </div>
              {snap.discount > 0 && (
                <div className="flex justify-between gap-4 text-sage-700">
                  <dt>Discount{snap.discountCode ? ` (${snap.discountCode})` : ""}</dt>
                  <dd className="font-bold">−{formatMoney(snap.discount)}</dd>
                </div>
              )}
              <div className="flex justify-between gap-4">
                <dt className="text-ink-600">Shipping</dt>
                <dd className="font-bold">
                  {snap.shipping === 0 ? "Free" : formatMoney(snap.shipping)}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 border-t border-brown-500/15 pt-2">
                <dt className="font-display text-[1.05rem] font-bold">Final amount to pay</dt>
                <dd className="font-display text-[1.35rem] font-bold text-ink-900">
                  {formatMoney(snap.total)}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        <SprigDivider className="mx-auto mt-10 h-9 w-64 opacity-90" />
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <ButtonLink href={`/order/${snap.number}`} variant="quiet">
            View order status
          </ButtonLink>
          <ButtonLink href="/shop" variant="quiet">
            Keep browsing
          </ButtonLink>
        </div>
        <p className="mt-4 text-center font-sans text-xs text-ink-600">
          Bookmark this page — it is where your payment details live.{" "}
          <Link href="/contact" className="btn-link">
            Need help?
          </Link>
        </p>
      </div>
    </Section>
  );
}
