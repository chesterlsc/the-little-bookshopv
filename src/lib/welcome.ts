/**
 * What the browser remembers about the welcome offer and cookie notice.
 *
 * Both live in localStorage, per browser, because that is exactly the scope
 * they have: "this person has seen this" is not something the shop needs to
 * know, only something the page needs in order not to nag. Everything here
 * tolerates storage being unavailable (private mode, full quota) by behaving
 * as if nothing was remembered.
 */

const WELCOME_KEY = "tlb-welcome-v1";
const COOKIES_KEY = "tlb-cookies-v1";

export interface WelcomeState {
  status: "dismissed" | "joined";
  at: string;
}

function read<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* nothing to do: the popup will simply show again next visit */
  }
}

export function readWelcome(): WelcomeState | null {
  const w = read<WelcomeState>(WELCOME_KEY);
  return w && (w.status === "dismissed" || w.status === "joined") ? w : null;
}

export function dismissWelcome(): void {
  write(WELCOME_KEY, { status: "dismissed", at: new Date().toISOString() } satisfies WelcomeState);
}

export function joinWelcome(): void {
  write(WELCOME_KEY, { status: "joined", at: new Date().toISOString() } satisfies WelcomeState);
}

export function cookiesAccepted(): boolean {
  return read<{ at: string }>(COOKIES_KEY) !== null;
}

export function acceptCookies(): void {
  write(COOKIES_KEY, { at: new Date().toISOString() });
}
