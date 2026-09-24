"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { usePathname } from "next/navigation";
import { useCart } from "./cart-context";
import { IconCheck, IconX } from "./icons";
import { FolkFlower, Leaf, MiniShelf, Sparkle } from "./illustrations";
import { SPLASH_MS } from "./splash-screen";
import { Button, ButtonLink, inputClass } from "./ui";
import { dismissWelcome, joinWelcome, readWelcome } from "@/lib/welcome";

/**
 * The mailing-list invitation: a little shelf with five tiny books and one
 * empty slot. Your email is the sixth book. Type it, tap once, and the last
 * book slides onto the shelf.
 *
 * There is no code in exchange. Signing up is a choice, and the promise is
 * only this: when the shop runs a discount, the code comes by email. Nothing
 * is sent on signup (Resend is kept for orders).
 *
 * Shows once per browser, after the entry splash has finished, and never over
 * checkout or an order page. Declining is a real choice with a real label.
 * A save that fails asks to try again.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const FIVE = ["Six", "tiny", "books,", "one", "is"];
const SIXTH = "YOU";
const SOURCES = [
  ["instagram", "Instagram"],
  ["facebook", "Facebook"],
  ["tiktok", "TikTok"],
  ["friend", "A friend"],
] as const;

/** at most once per page load even when storage is unavailable */
let shownThisLoad = false;

const isQuietRoute = (path: string) => path.startsWith("/checkout") || path.startsWith("/order/");

export function WelcomePopup() {
  const pathname = usePathname();
  const { drawerOpen } = useCart();
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [stage, setStage] = useState<"form" | "reveal">("form");
  const [email, setEmail] = useState("");
  const [source, setSource] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [surveyError, setSurveyError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const panelRef = useRef<HTMLDivElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const restoreTo = useRef<HTMLElement | null>(null);
  const latest = useRef({ pathname, drawerOpen });
  useEffect(() => {
    latest.current = { pathname, drawerOpen };
  });

  const id = useId();
  const h2Id = `${id}-title`;
  const emailId = `${id}-email`;
  const errId = `${id}-err`;
  const surveyId = `${id}-survey`;

  // one timer, set on mount: internal navigations never remount the layout
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const delay = reduced ? 1500 : SPLASH_MS + 1300;
    const t = window.setTimeout(() => {
      const { pathname: path, drawerOpen: basket } = latest.current;
      if (shownThisLoad || readWelcome() !== null || isQuietRoute(path) || basket) return;
      shownThisLoad = true;
      restoreTo.current = document.activeElement as HTMLElement | null;
      setOpen(true);
    }, delay);
    return () => window.clearTimeout(t);
  }, []);

  const blocked = isQuietRoute(pathname);
  const showing = open && !blocked;

  const finish = () => {
    setOpen(false);
    setClosing(false);
    restoreTo.current?.focus?.();
  };

  const close = () => {
    if (closing) return;
    setClosing(true);
    // belt and braces: if the fade never reports back, close anyway
    window.setTimeout(finish, 260);
  };

  // Declining before signup remembers the "no"; after the reveal they have
  // joined, so closing must not overwrite that with a dismissal.
  const decline = () => {
    if (stage === "form") dismissWelcome();
    close();
  };

  // scroll lock and first focus, once per opening
  useEffect(() => {
    if (!showing) return;
    document.body.style.overflow = "hidden";
    const wide = window.matchMedia("(min-width: 640px)").matches;
    (wide ? emailRef.current : panelRef.current)?.focus();
    return () => {
      document.body.style.overflow = "";
    };
  }, [showing]);

  // Escape always runs the current decline (which depends on the stage),
  // without re-binding the listener on every render.
  const declineRef = useRef(decline);
  useEffect(() => {
    declineRef.current = decline;
  });
  useEffect(() => {
    if (!showing) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") declineRef.current();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [showing]);

  useEffect(() => {
    if (stage === "reveal") headingRef.current?.focus();
  }, [stage]);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busy) return;
    const form = new FormData(e.currentTarget);
    const website = String(form.get("website") ?? "");
    const addr = email.trim().toLowerCase();
    if (!EMAIL_RE.test(addr)) {
      setError("That email looks a little off.");
      emailRef.current?.focus();
      return;
    }
    setError(null);
    if (!source) {
      setSurveyError("Pick one so we know who to thank.");
      panelRef.current?.querySelector<HTMLInputElement>('input[name="source"]')?.focus();
      return;
    }
    setSurveyError(null);
    setBusy(true);
    const fail = (message = "That didn't send. Try once more?") => {
      setError(message);
      setBusy(false);
      emailRef.current?.focus();
    };
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: addr, source, website }),
        signal: AbortSignal.timeout(8000),
      });
      // the saved row is the only record of a signup, so an unsaved one is retried,
      // never shown as done (a repeat is harmless: the list is keyed on the address)
      if (!res.ok) return fail(((await res.json().catch(() => ({}))) as { message?: string }).message);
    } catch {
      return fail();
    }
    joinWelcome();
    setBusy(false);
    setStage("reveal");
  };

  if (!showing) return null;
  const revealed = stage === "reveal";

  return (
    <div
      className={`fixed inset-0 z-[85] sm:flex sm:items-center sm:justify-center sm:p-4 ${closing ? "soft-out" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby={h2Id}
      onAnimationEnd={(e) => {
        if (closing && e.target === e.currentTarget) finish();
      }}
      onKeyDown={(e) => {
        if (e.key !== "Tab" || !panelRef.current) return;
        const items = Array.from(
          panelRef.current.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), input:not([type="hidden"]):not([tabindex="-1"]), [tabindex="0"]',
          ),
        ).filter((el) => el.offsetParent !== null);
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        const active = document.activeElement;
        if (e.shiftKey && (active === first || active === panelRef.current)) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        }
      }}
    >
      <button
        type="button"
        aria-label="Close, no thanks"
        onClick={decline}
        className="soft-in absolute inset-0 bg-ink-900/30 backdrop-blur-[2px]"
        style={{ animationDuration: "300ms" }}
      />

      <div
        ref={panelRef}
        tabIndex={-1}
        className="clay sheet-up absolute inset-x-0 bottom-0 max-h-[88svh] overflow-y-auto rounded-b-none rounded-t-[28px] border-b-0 px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-5 text-left outline-none sm:static sm:w-[min(26rem,100%)] sm:animate-fade-up sm:rounded-[var(--radius-clay)] sm:border-b sm:px-6 sm:pb-5 sm:pt-6 sm:text-center"
      >
        <span
          aria-hidden
          className="absolute -top-2.5 left-1/2 h-5 w-14 -translate-x-1/2 -rotate-6 rounded-[2px] bg-blush-200/85 shadow-[inset_0_0_0_1px_rgba(214,138,120,0.35)]"
        />
        <button
          type="button"
          onClick={decline}
          aria-label="Close, no thanks"
          className="clay-sm absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full text-ink-600 transition hover:text-ink-800"
        >
          <IconX className="h-4.5 w-4.5" />
        </button>

        {/* letterhead: shelf beside the words on a phone, above them on desktop */}
        <div className="grid grid-cols-[7rem_1fr] items-center gap-3 sm:block">
          <div className="relative mx-auto w-28 sm:w-44">
            {/* the pencil under-drawing: the shelf's own frame, traced a hair off */}
            <svg viewBox="0 0 280 202" className="absolute inset-0 h-full w-full rotate-[2.5deg]" aria-hidden>
              <path
                d="M36 185 V19 Q36 10 45 10 H235 Q244 10 244 19 V185 Z"
                pathLength={300}
                className="sketch-once"
                style={{ animationDelay: "200ms" }}
                fill="none"
                stroke="var(--color-taupe-400)"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <g className="soft-in" style={{ animationDelay: "1100ms" }}>
                <Sparkle x={186} y={124} s={4} />
              </g>
              {revealed && (
                <g className="soft-in" style={{ animationDelay: "600ms" }}>
                  <Sparkle x={182} y={112} s={3} />
                  <Sparkle x={192} y={140} s={2.5} />
                </g>
              )}
            </svg>
            <div className="soft-in relative" style={{ animationDelay: "700ms" }}>
              <MiniShelf
                size="miniature"
                shape="scalloped"
                titles={revealed ? [...FIVE, SIXTH] : FIVE}
                animate={revealed}
                animateFrom={5}
                label={
                  revealed
                    ? "A little shelf with six tiny books, now full"
                    : "A little shelf with five tiny books and one empty slot"
                }
                className="w-full"
              />
            </div>
            <svg
              viewBox="0 0 34 26"
              className="soft-in absolute -right-2 -top-2 w-[2.1rem] sm:-right-4"
              style={{ animationDelay: "1300ms" }}
              aria-hidden
            >
              <Leaf x={2} y={16} s={6} angle={-28} />
              <FolkFlower x={24} y={9} r={5} />
              <Sparkle x={31} y={22} s={3} />
            </svg>
          </div>

          <div className={revealed ? "animate-fade-up" : ""}>
            <p className="eyebrow inline-flex items-center gap-2 sm:mt-3">
              <svg viewBox="0 0 14 14" className="h-3.5 w-3.5 shrink-0" aria-hidden>
                <FolkFlower x={7} y={7} r={4.2} />
              </svg>
              {revealed ? "You\u2019re on the list" : "One book short"}
            </p>
            <h2
              id={h2Id}
              ref={headingRef}
              tabIndex={-1}
              className="mt-1 text-balance font-display text-[1.3rem] font-bold leading-tight text-ink-900 outline-none sm:text-[1.5rem]"
            >
              {revealed
                ? "Your shelf is full. Thank you."
                : "Your shelf is missing one little book. Want to be it?"}
            </h2>
          </div>
        </div>

        {revealed ? (
          <>
            <p
              role="status"
              className="mx-auto mt-2 max-w-[34ch] font-sans text-[0.95rem] leading-relaxed text-ink-600"
            >
              No code today. When we run a discount, it comes straight to your inbox. Nothing else.
            </p>
            <div className="animate-fade-up" style={{ animationDelay: "600ms" }}>
              <ButtonLink href="/build" className="mt-4 w-full" onClick={close}>
                Build your little shelf
              </ButtonLink>
              <button type="button" onClick={close} className="btn-link mx-auto mt-3 block py-2 text-sm">
                Keep browsing
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="mx-auto mt-2 max-w-[34ch] font-sans text-[0.95rem] leading-relaxed text-ink-600">
              Leave your email if you like. We only write when we have a discount to share.
            </p>
            <form className="mt-4 text-left" noValidate onSubmit={submit}>
              <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
              <label htmlFor={emailId} className="sr-only">
                Email
              </label>
              <input
                ref={emailRef}
                id={emailId}
                type="email"
                name="email"
                required
                autoComplete="email"
                inputMode="email"
                placeholder="your email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError(null);
                }}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? errId : undefined}
                className={`${inputClass} ${error ? "!border-rose-500" : ""}`}
              />
              {error && (
                <p id={errId} role="alert" className="mt-1 text-xs font-bold text-rose-600">
                  {error}
                </p>
              )}
              <fieldset className="mt-3" aria-describedby={surveyError ? surveyId : undefined}>
                <legend className="mb-1.5 font-sans text-sm font-bold text-ink-800">Where did you find us?</legend>
                <div className="flex flex-wrap gap-1.5">
                  {SOURCES.map(([value, name]) => (
                    <label key={value} className="tag tag-taupe tag-pick">
                      <input
                        type="radio"
                        name="source"
                        value={value}
                        checked={source === value}
                        onChange={() => {
                          setSource(value);
                          if (surveyError) setSurveyError(null);
                        }}
                        className="sr-only"
                      />
                      <IconCheck className="tag-pick-check h-3 w-3" aria-hidden />
                      {name}
                    </label>
                  ))}
                </div>
                {surveyError && (
                  <p id={surveyId} role="alert" className="mt-1.5 text-xs font-bold text-rose-600">
                    {surveyError}
                  </p>
                )}
              </fieldset>
              <Button type="submit" disabled={busy} className="mt-4 w-full">
                {busy ? "Shelving..." : "Add the last book"}
              </Button>
              <button
                type="button"
                onClick={decline}
                className="btn-link btn-link-rose mx-auto mt-3 block py-2 text-sm"
              >
                No thanks
              </button>
              <p className="mt-2 text-center text-xs text-ink-400">
                Only discount codes, only when we have one. Message us any time to be removed.
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
