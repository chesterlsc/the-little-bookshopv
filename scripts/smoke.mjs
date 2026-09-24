/**
 * End-to-end smoke test for the core shopping + order pipeline.
 *
 *   1. npm run dev
 *   2. node scripts/smoke.mjs [baseUrl]
 *
 * Requires PAYMENT_PROVIDER=dev and EMAIL_PROVIDER=dev (the defaults).
 *
 * Run it against `npm run dev`, never `npm run start`: only dev applies
 * .env.development.local, which blanks DATABASE_URL. Against a server holding
 * the real one, this suite writes test orders and signups into the shop's
 * database, and its signups would claim real subscribers into a digest that
 * only ever reaches var/outbox.
 */
import { chromium } from "playwright";
import fs from "node:fs";

const BASE = process.argv[2] ?? "http://localhost:3000";
const results = [];
const check = (name, ok) => {
  results.push([name, ok]);
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}`);
};

const exePath = fs.existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined;
const browser = await chromium.launch({ executablePath: exePath });
const shopping = await browser.newContext({ viewport: { width: 390, height: 844 } });
// the welcome popup and cookie bar get their own scenario below; keep them out of this one
await shopping.addInitScript(() => {
  localStorage.setItem("tlb-welcome-v1", JSON.stringify({ status: "dismissed", at: "smoke" }));
  localStorage.setItem("tlb-cookies-v1", JSON.stringify({ at: "smoke" }));
});
const page = await shopping.newPage();
const pageErrors = [];
page.on("pageerror", (e) => pageErrors.push(String(e)));

/* ── storefront ─────────────────────────────────────────────────────────── */
await page.goto(BASE + "/", { waitUntil: "networkidle" });
check("home renders", (await page.textContent("body")).includes("Build your little shelf"));

/* ── the Style step: the chosen colour, photographed ── */
// seeded here rather than reached through the fold, so it does not hang on the hero
await page.evaluate(() => localStorage.setItem("tlb-builder-v1", JSON.stringify({ shelfSlug: "mini-arched-bookshelf", step: 1 })));
await page.goto(BASE + "/build", { waitUntil: "networkidle" });
await page.waitForSelector(".shelf-reel", { timeout: 15000 });
const reelX = () => page.evaluate(() => document.querySelector(".shelf-reel")?.style.getPropertyValue("--reel-x"));
const reelBefore = await reelX();
await page.getByRole("radio", { name: "Navy Blue" }).click();
await page.waitForTimeout(300);
check("choosing a colour slides the photographed line-up to that shelf",
  !!reelBefore && reelBefore !== (await reelX()) && (await page.textContent("main")).includes("Navy Blue"));
await page.getByRole("radio", { name: "Midnight Black" }).click();
await page.waitForTimeout(300);
check("a colour never photographed is drawn instead, and says so",
  (await page.locator(".shelf-reel").count()) === 0 && (await page.textContent("main")).includes("haven't photographed Midnight Black"));

await page.goto(BASE + "/products/mini-scalloped-bookshelf", { waitUntil: "networkidle" });
await page.getByRole("radio", { name: "Blush Pink" }).click();
await page.getByRole("button", { name: /Add to basket/ }).click();
await page.waitForTimeout(500);
check("add to basket opens drawer", (await page.textContent("body")).includes("Your basket"));
await page.keyboard.press("Escape");

await page.goto(BASE + "/products/custom-mini-book-set", { waitUntil: "networkidle" });
await page.getByRole("button", { name: /Add to basket/ }).click();
await page.waitForTimeout(300);
check("custom set blocks without six titles", (await page.textContent("body")).includes("Please add a title for book 1"));
for (let i = 0; i < 6; i++) await page.fill(`#set-title-${i}`, `Tiny Book ${i + 1}`);
await page.getByRole("button", { name: /Add to basket/ }).click();
await page.waitForTimeout(500);
check("custom set adds with six titles", (await page.textContent("body")).includes("6 custom titles"));
await page.keyboard.press("Escape");

await page.reload({ waitUntil: "networkidle" });
await page.goto(BASE + "/cart", { waitUntil: "networkidle" });
await page.waitForTimeout(400);
check("cart persists after reload", (await page.textContent("body")).includes("Custom Mini Book Set"));

/* ── checkout: manual payment, no gateway ───────────────────────────────── */
await page.goto(BASE + "/checkout", { waitUntil: "networkidle" });
const fill = (id, v) => page.fill(`#field-${id}`, v);
await fill("fullName", "Smoke Tester");
await fill("phone", "09171234567");
await fill("email", "smoke@example.com");
await fill("instagram", "@smoketester");
await fill("address1", "1 Test Lane");
await fill("barangay", "San Roque");
await fill("city", "Quezon City");
await fill("province", "Metro Manila");
await fill("postalCode", "1100");
// the exact total the customer is promised, to compare against the payment screen
const checkoutTotal = (await page.textContent("body")).match(/₱[\d,]+\.\d\d/g).pop();
await page.getByRole("button", { name: /Place order/ }).click();
await page.waitForURL(/\/order\/LB[\w-]+\/pay/, { timeout: 20000 });
check("place order redirects to payment instructions", true);
// client-side nav: wait for the screen itself, not just the URL
await page.getByRole("heading", { name: /has been submitted/ }).waitFor({ timeout: 20000 });
const body = await page.textContent("body");
check("payment screen shows awaiting payment", body.includes("Awaiting payment"));
check("payment screen shows GCash + MariBank", body.includes("09614863499") && body.includes("MariBank"));
const orderNumber = (page.url().match(/\/order\/(LB[\w-]+)\/pay/) ?? [])[1];
check("order number is short and quotable", /^LB\d+-[A-Z2-9]{6}$/.test(orderNumber ?? ""));
check("payment total matches checkout total", body.includes(checkoutTotal));
await page.waitForTimeout(600);
const cartRaw = await page.evaluate(() => localStorage.getItem("tlb-cart-v1"));
check("basket cleared once the order is saved", !cartRaw || JSON.parse(cartRaw).lines.length === 0);

await page.reload({ waitUntil: "networkidle" });
const afterReload = await page.textContent("body");
check("refresh keeps the same order", afterReload.includes(orderNumber) && afterReload.includes(checkoutTotal));

await page.goto(`${BASE}/order/${orderNumber}`, { waitUntil: "networkidle" });
check("order page shows awaiting payment", (await page.textContent("body")).includes("Awaiting payment"));

/* ── API-level edge cases ───────────────────────────────────────────────── */
const cart = { lines: [{ type: "product", key: "k1", slug: "mini-plant", variantId: "white", qty: 1 }] };
const customer = { fullName: "A", phone: "09171234567", email: "a@example.com", instagram: "@someone", address1: "x", barangay: "b", city: "y", province: "p", postalCode: "1000", addressNotes: "", orderNotes: "" };
const post = (payload) => fetch(`${BASE}/api/checkout`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });

const r1 = await (await post({ cart, customer })).json();
check("api creates an order", /^LB\d+-[A-Z2-9]{6}$/.test(r1.orderNumber ?? ""));

const key = `smoke-${Date.now()}`;
const a = await (await post({ cart, customer, idempotencyKey: key })).json();
const b = await (await post({ cart, customer, idempotencyKey: key })).json();
check("double submit reuses one order", a.orderNumber === b.orderNumber && b.reused === true);

const bad = await post({ cart, customer: { ...customer, email: "nope", postalCode: "12" } });
const badJson = await bad.json();
check("invalid customer rejected with friendly errors", bad.status === 422 && !!badJson.fieldErrors?.email && !!badJson.fieldErrors?.postalCode);

const badCart = await post({ cart: { lines: [{ type: "product", key: "z", slug: "nope", variantId: "default", qty: 1 }] }, customer });
check("invalid cart rejected with 422", badCart.status === 422);

/* ── the payment screenshot ─────────────────────────────────────────────── */
// the smallest valid JPEG: a 1x1 white pixel, which is all the sniff needs
const TINY_JPEG =
  "/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==";
let proofN = 0;
const proofPost = (number, payload, contentType = "application/json", ip = `smoke-proof-${Date.now()}-${proofN++}`) =>
  fetch(`${BASE}/api/orders/${encodeURIComponent(number)}/payment-proof`, {
    method: "POST",
    headers: { "Content-Type": contentType, "x-forwarded-for": ip },
    body: JSON.stringify(payload),
  });
const proofOrder = (await (await post({ cart, customer })).json()).orderNumber;

const sent = await proofPost(proofOrder, { image: `data:image/jpeg;base64,${TINY_JPEG}`, method: "GCash" });
check("a payment screenshot is accepted", sent.status === 200, String(sent.status));
const proofMail = fs.readdirSync("var/outbox")
  .filter((f) => f.endsWith(".eml"))
  .map((f) => fs.readFileSync(`var/outbox/${f}`, "utf8"))
  .filter((m) => m.includes(`Payment screenshot · ${proofOrder}`));
check("the shop is emailed the screenshot as a real attachment",
  proofMail.length === 1
  && /^Content-Type: multipart\/mixed/m.test(proofMail[0])
  && /^Content-Disposition: attachment; filename="payment-LB[\w-]+\.jpg"/m.test(proofMail[0])
  && proofMail[0].includes(TINY_JPEG.slice(0, 40)),
  `${proofMail.length} mails`);
check("the order says the payment was submitted",
  (await (await fetch(`${BASE}/order/${proofOrder}`)).text()).includes("Payment submitted"));
check("a corrected screenshot is allowed, a fourth is not",
  (await proofPost(proofOrder, { image: `data:image/jpeg;base64,${TINY_JPEG}` })).status === 200
  && (await proofPost(proofOrder, { image: `data:image/jpeg;base64,${TINY_JPEG}` })).status === 200
  && (await proofPost(proofOrder, { image: `data:image/jpeg;base64,${TINY_JPEG}` })).status === 409);
check("a PNG is refused: the browser sends JPEG",
  (await proofPost(proofOrder, { image: "data:image/png;base64,iVBORw0KGgo=" })).status === 400);
check("text pretending to be a JPEG is refused",
  (await proofPost(proofOrder, { image: `data:image/jpeg;base64,${Buffer.from("not an image").toString("base64")}` })).status === 400);
check("a non-JSON post is refused", (await proofPost(proofOrder, { image: "x" }, "text/plain")).status === 415);
check("an unknown order number is refused",
  (await proofPost("LB9999-ZZZZZZ", { image: `data:image/jpeg;base64,${TINY_JPEG}` })).status === 404);
// this run's own order email: everything without an attachment stays single-part
check("emails without an attachment are still written the old way",
  fs.readdirSync("var/outbox").filter((f) => f.endsWith(".eml"))
    .map((f) => fs.readFileSync(`var/outbox/${f}`, "utf8"))
    .filter((m) => m.includes(`New order ${proofOrder}`))
    .every((m) => /^Content-Type: text\/html/m.test(m) && !/multipart/.test(m)));

const titles = (n) => Array.from({ length: n }, (_, i) => ({ title: `Book ${i + 1}`, author: "" }));
const setCart = (n) => ({ lines: [{ type: "product", key: "s1", slug: "custom-mini-book-set", variantId: "front-back-spine", qty: 1, titles: titles(n) }] });
const six = await (await post({ cart: setCart(6), customer })).json();
const twelve = await (await post({ cart: setCart(12), customer })).json();
check("a second six costs another set", twelve.pay?.subtotal === six.pay?.subtotal * 2, `${six.pay?.subtotal} then ${twelve.pay?.subtotal}`);
check("books can only be ordered six at a time", (await post({ cart: setCart(7), customer })).status === 422);
check("more than five sets is refused", (await post({ cart: setCart(36), customer })).status === 422);

const lettersCart = { lines: [
  { type: "product", key: "l1", slug: "mini-shelf-letters", variantId: "faves|navy-blue", qty: 1 },
  { type: "product", key: "p1", slug: "mini-plant", variantId: "bone-white", qty: 1 },
] };
const lettersDetails = ((await (await post({ cart: lettersCart, customer })).json()).pay?.items ?? []).flatMap((i) => i.details);
check("letters keep word and color; an old plant color id is White",
  ["Word: FAVES", "Color: Navy Blue", "Color: White"].every((d) => lettersDetails.includes(d)));
const oldLetters = await post({ cart: { lines: [{ type: "product", key: "o1", slug: "mini-shelf-letters", variantId: "faves", qty: 1 }] }, customer });
check("letters saved before colors must be chosen again", oldLetters.status === 422);

/* ── welcome discount ───────────────────────────────────────────────────── */
const disc = await (await post({ cart, customer, discountCode: " welcome 5 " })).json();
check("welcome code: 5% off, normalized, shipping untouched",
  disc.pay?.discountCode === "WELCOME5" && disc.pay?.discount === Math.floor(disc.pay.subtotal * 0.05)
  && disc.pay?.total === disc.pay.subtotal - disc.pay.discount + disc.pay.shipping);
const fake = await (await post({ cart, customer, discountCode: "HACK99" })).json();
check("made-up code buys nothing", fake.pay?.discount === 0 && !fake.pay?.discountCode);
const setOnly = await (await post({ customer, discountCode: "bookset10", cart: { lines: [
  { type: "product", key: "b1", slug: "mini-fourth-wing-set", variantId: "front-back-spine", qty: 1 },
  { type: "product", key: "b2", slug: "mini-plant", variantId: "white", qty: 1 },
] } })).json();
check("book set code: 10% off the set only, not the plant",
  setOnly.pay?.discountCode === "BOOKSET10" && setOnly.pay?.discount === 3990);

// own throttle bucket, so a developer's earlier signups cannot fail this run
let subs = 0;
const sub = (payload) => fetch(`${BASE}/api/subscribe`, { method: "POST", headers: { "Content-Type": "application/json", "x-forwarded-for": `smoke-${Date.now()}-${subs++}` }, body: JSON.stringify(payload) });
const subEmail = `smoke-${Date.now()}@example.com`;
const joined = await (await sub({ email: subEmail, source: "instagram" })).json();
check("signup returns the welcome code", joined.ok === true && joined.code === "WELCOME5");
// the dev mailer names each file after its recipients
check("the subscriber is never emailed, so orders keep the mail quota",
  !fs.existsSync("var/outbox") || !fs.readdirSync("var/outbox").some((f) => f.includes(subEmail)));

// 25 more signups cross a batch exactly once, whatever was already waiting locally,
// so exactly one digest can list any of them
const batchTag = `digest-${Date.now()}-`;
for (let i = 0; i < 25; i++) await sub({ email: `${batchTag}${i}@example.com`, source: "tiktok" });
await new Promise((r) => setTimeout(r, 2000)); // the digest is sent after the response
const digests = fs.readdirSync("var/outbox")
  .filter((f) => f.endsWith(".eml"))
  .map((f) => fs.readFileSync(`var/outbox/${f}`, "utf8"))
  .filter((m) => /^Subject: .* new subscribers/m.test(m) && m.includes(batchTag));
check("every 25 signups send the shop one digest with each email and survey answer",
  digests.length === 1 && /^To: .*thelittlebookshop/m.test(digests[0]) && /TikTok/.test(digests[0]),
  `${digests.length} digests`);
check("signup rejects a bad address", (await sub({ email: "nope", source: "tiktok" })).status === 422);
check("signup rejects a missing survey answer", (await sub({ email: "no-survey@example.com" })).status === 422);
check("non-JSON posts are refused", (await fetch(`${BASE}/api/subscribe`, { method: "POST", headers: { "Content-Type": "text/plain" }, body: JSON.stringify({ email: "x@example.com", source: "instagram" }) })).status === 415);
const bot = await (await sub({ email: "bot@example.com", source: "instagram", website: "spam" })).json();
check("honeypot looks like success to the bot", bot.ok === true);

const gone = await fetch(`${BASE}/api/payments/verify?order=LB1001`);
check("old payment gateway routes are gone", gone.status === 404);

/* ── welcome popup + cookie bar, in a fresh browser ─────────────────────── */
{
  const fresh = await browser.newContext({
    viewport: { width: 390, height: 844 },
    extraHTTPHeaders: { "x-forwarded-for": `smoke-popup-${Date.now()}` }, // own throttle bucket
  });
  const pp = await fresh.newPage();
  const perr = [];
  pp.on("pageerror", (e) => perr.push(String(e)));
  await pp.goto(BASE + "/", { waitUntil: "networkidle" });
  const dialog = pp.locator('[role="dialog"][aria-labelledby]');
  check("popup waits for the splash", (await dialog.count()) === 0);
  await pp.waitForTimeout(5200);
  check("popup appears once the splash is done", (await dialog.count()) === 1);
  check("cookie bar present", (await pp.locator('aside[aria-label="Cookies"]').count()) === 1);
  await pp.locator('[role="dialog"] input[type="email"]').fill(`smoke-popup-${Date.now()}@example.com`);
  await pp.locator('[role="dialog"] button[type="submit"]').click();
  await pp.waitForTimeout(300);
  check("no code without the survey answer", /Pick one/.test(await dialog.textContent()) && !/There it is/.test(await dialog.textContent()));
  await pp.locator('[role="dialog"] label:has-text("Instagram")').click();
  await pp.locator('[role="dialog"] button[type="submit"]').click();
  await pp.waitForTimeout(1800);
  const revealed = await dialog.textContent();
  check("popup reveals the code after signup", /WELCOME5/.test(revealed) && /There it is/.test(revealed));
  const remembered = await pp.evaluate(() => JSON.parse(localStorage.getItem("tlb-welcome-v1") || "null"));
  check("popup remembers the signup with its code", remembered?.status === "joined" && remembered?.code === "WELCOME5");
  await pp.keyboard.press("Escape");
  await pp.waitForTimeout(400);
  check("Escape closes the popup", (await dialog.count()) === 0);
  await pp.reload({ waitUntil: "networkidle" });
  await pp.waitForTimeout(5200);
  check("popup never returns after signup", (await dialog.count()) === 0);
  await pp.locator('aside[aria-label="Cookies"] button:has-text("Okay")').click();
  await pp.waitForTimeout(200);
  check("cookie bar dismisses", (await pp.locator('aside[aria-label="Cookies"]').count()) === 0);
  check("popup scenario has no page errors", perr.length === 0, perr.join(" | "));
  await fresh.close();
}

check("no page errors during run", pageErrors.length === 0, pageErrors.join(" | "));

await browser.close();
const failed = results.filter(([, ok]) => !ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
