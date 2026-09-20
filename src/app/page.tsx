import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { ButtonLink, Eyebrow, ScallopBand, Section, Badge } from "@/components/ui";
import {
  AmbientMeadow,
  BlueprintShelf,
  FolkFlower,
  Leaf,
  ShelfRuleDivider,
  SketchDoodle,
  Sparkle,
  SprigDivider,
} from "@/components/illustrations";
import { ThemeShelfDemo } from "@/components/theme-shelf-demo";
import { ProductCard } from "@/components/product-card";
import { CATEGORIES, getProduct, type Category } from "@/lib/catalog";
import { FAQ } from "@/content/site";
import { IconArrowRight, IconChevronDown } from "@/components/icons";

const FEATURED = [
  "mini-scalloped-bookshelf",
  "custom-mini-book-set",
  "mini-book-keychain",
  "mini-plant",
  "mini-shelf-letters",
  "mini-arched-bookshelf",
  "mini-classic-bookshelf",
  "mini-ladder",
];

/** The one ambient touch: a soft folk landscape the little shelf sits in front of.
 *  Closed, tapering shapes only — nothing here ever shows a hard cut edge. */
function HeroWindow() {
  return (
    <svg
      viewBox="0 0 400 170"
      preserveAspectRatio="none"
      aria-hidden
      role="presentation"
      className="pointer-events-none absolute bottom-[-13%] left-[-23%] -z-10 hidden h-[44%] w-[146%] lg:block"
    >
      <circle cx="366" cy="74" r="40" fill="var(--color-sun-200)" opacity="0.6" />
      <path
        d="M20 122 C 74 66 152 82 216 94 C 272 104 334 98 386 122 C 320 133 84 133 20 122 Z"
        fill="var(--color-sky-200)"
        opacity="0.9"
      />
      <g fill="var(--color-sage-400)" stroke="var(--color-sage-600)" strokeWidth="1.6" strokeLinejoin="round">
        <path d="M348 110 c0-14 7.5-22 7.5-22 s7.5 8 7.5 22 Z" />
        <path d="M368 114 c0-10 5.5-16 5.5-16 s5.5 6 5.5 16 Z" />
        <path d="M36 112 c0-12 6.5-19 6.5-19 s6.5 7 6.5 19 Z" />
      </g>
      <path
        d="M4 148 C 64 100 132 124 202 116 C 276 108 338 126 396 148 C 318 160 80 160 4 148 Z"
        fill="var(--color-sage-200)"
      />
      <path
        d="M4 148 C 64 100 132 124 202 116 C 276 108 338 126 396 148"
        pathLength={300}
        className="sketch-once"
        style={{ animationDelay: "900ms" }}
        fill="none"
        stroke="var(--color-sage-600)"
        strokeWidth="2.6"
        strokeLinecap="round"
        opacity="0.5"
      />
      <circle cx="372" cy="34" r="4" fill="var(--color-gold-400)" opacity="0.6" className="animate-drift" style={{ transformBox: "fill-box", transformOrigin: "center" }} />
      <circle cx="348" cy="56" r="2.6" fill="var(--color-blush-300)" opacity="0.75" className="animate-drift-slow" style={{ transformBox: "fill-box", transformOrigin: "center", animationDelay: "1.6s" }} />
      <circle cx="26" cy="46" r="3" fill="var(--color-gold-400)" opacity="0.45" className="animate-drift-slow" style={{ transformBox: "fill-box", transformOrigin: "center", animationDelay: "0.8s" }} />
    </svg>
  );
}

/** The maker's story — inline in the desktop hero, a pinned note below the mobile fold. */
function HeroStory() {
  return (
    <>
      <p className="story-line text-[1.06rem] leading-relaxed text-ink-600 sm:text-[1.12rem]">
        <span className="font-bold text-ink-800">
          Some stories stay with us long after the last page.
        </span>{" "}
        This is your little space to keep them close. A tiny shelf for the stories that
        made you laugh, cry, fall in love, or see the world a little differently.
      </p>
      <p className="story-line text-[1.06rem] leading-relaxed text-ink-600 sm:text-[1.12rem]">
        <span className="font-bold text-ink-800">
          Made for book lovers, by a book lover.
        </span>{" "}
        Because every story deserves a place to be remembered.
      </p>
    </>
  );
}

/* one pen-stroke per promise; each `d` is a single path so it draws as one gesture */
const HERO_MARKS = {
  hand: {
    ink: "M10 31.5 V25.6 C6.4 24 4.8 20.8 4.8 17.8 V14.4 a1.9 1.9 0 0 1 3.8 0 V18 M8.6 17.6 V8.4 a1.9 1.9 0 0 1 3.8 0 V17 M12.4 17 V6.8 a1.9 1.9 0 0 1 3.8 0 V17 M16.2 17.4 V8.6 a1.9 1.9 0 0 1 3.8 0 v10 C20 25.8 16.6 31.5 10 31.5",
    accent: "M26.5 6.5 V13 M23.2 9.8 H29.8",
    accentColor: "var(--color-gold-400)",
  },
  six: {
    ink: "M5 28.4 V14.6 h3 V28.4 M9 28.4 V11 h3 V28.4 M13 28.4 V16.2 h3 V28.4 M17 28.4 V12.4 h3 V28.4 M21 28.4 V15 h3 V28.4 M25 28.4 V13 h3 V28.4",
    accent: "M3 29.6 H30.4",
    accentColor: "var(--color-sage-600)",
  },
  box: {
    ink: "M6.5 15.5 h21 v13.5 h-21 Z M4 10 h26 v5.5 H4 Z M17 10 V29",
    accent: "M17 10 C16.5 6.6 14.4 3.9 11.3 2.8 M14.4 5.8 C12.4 6.4 10.5 5.8 9.3 4.2 M16.4 8.2 C18.4 6 21 5.2 23.3 5.6",
    accentColor: "var(--color-sage-600)",
  },
} as const;

function HeroMark({ kind, delay = 0 }: { kind: keyof typeof HERO_MARKS; delay?: number }) {
  const m = HERO_MARKS[kind];
  return (
    <svg viewBox="0 0 34 34" className="h-8 w-8 shrink-0" aria-hidden role="presentation">
      <path
        d={m.ink}
        pathLength={300}
        className="sketch-once"
        style={{ animationDelay: `${delay}ms` }}
        fill="none"
        stroke="var(--color-ink-800)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d={m.accent}
        pathLength={300}
        className="sketch-once"
        style={{ animationDelay: `${delay + 260}ms` }}
        fill="none"
        stroke={m.accentColor}
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function HomePage() {
  return (
    <div className="pb-nav">
      {/* ─── Hero ─── announcement bar + header + this fold = exactly one viewport */}
      <Section tint="paper" className="relative overflow-hidden">
        <div className="hero-fold">
          <div className="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)] items-center gap-5 pt-4 sm:pt-8 lg:grid-cols-[1.04fr_0.96fr] lg:grid-rows-1 lg:gap-14">
          {/* ── copy ── */}
          <div className="animate-fade-up text-center lg:text-left">
            <p className="eyebrow inline-flex items-center gap-2 rounded-full border-[1.5px] border-dashed border-taupe-300 bg-cream-50/70 py-1.5 pl-2.5 pr-3.5">
              <svg viewBox="0 0 14 14" className="h-3.5 w-3.5 shrink-0" aria-hidden role="presentation">
                <FolkFlower x={7} y={7} r={4.2} />
              </svg>
              Miniatures for book lovers
            </p>

            <h1 className="hero-h1 mt-3 text-balance font-display font-bold text-ink-900 lg:mt-4">
              Build a little shelf for the{" "}
              <span className="hero-accent">
                stories you love.
                <svg viewBox="0 0 200 16" preserveAspectRatio="none" className="hero-accent-line" aria-hidden role="presentation">
                  <path
                    d="M4 8.5 C 34 3.5 66 12.5 100 7.5 S 168 3.5 196 9"
                    pathLength={300}
                    className="sketch-once"
                    style={{ animationDelay: "520ms" }}
                    fill="none"
                    stroke="var(--color-sage-600)"
                    strokeWidth="2.6"
                    strokeLinecap="round"
                  />
                  <path
                    d="M9 12.8 C 42 8.2 72 16.4 108 11.4 S 170 8.6 192 13.2"
                    pathLength={300}
                    className="sketch-once"
                    style={{ animationDelay: "740ms" }}
                    fill="none"
                    stroke="var(--color-rose-400)"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
                <svg viewBox="0 0 34 26" className="hero-accent-sprig soft-in" style={{ animationDelay: "1050ms" }} aria-hidden role="presentation">
                  <Leaf x={2} y={16} s={6} angle={-28} />
                  <FolkFlower x={24} y={9} r={5} />
                  <Sparkle x={31} y={22} s={3} />
                </svg>
              </span>
            </h1>

            <p className="story-line mx-auto mt-3 max-w-[34ch] text-pretty text-[1.15rem] leading-relaxed text-ink-600 lg:hidden">
              Your books. Your shelf. Your little library.
            </p>
            <div className="mx-auto mt-4 hidden max-w-[46ch] space-y-3 text-pretty lg:mx-0 lg:block">
              <HeroStory />
            </div>

            <div className="mt-5 flex flex-col items-stretch gap-3 sm:mt-7 sm:flex-row sm:items-center sm:justify-center lg:justify-start">
              <ButtonLink href="/build" className="btn-lg group">
                Build your little shelf
                <IconArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
              </ButtonLink>
              <ButtonLink href="/shop" variant="quiet" className="btn-sketch btn-lg">
                Shop the collection
              </ButtonLink>
            </div>
          </div>

          {/* ── the little window — fills whatever the fold has left ── */}
          <div
            className="hero-window animate-fade-up relative isolate h-full w-full lg:mx-auto lg:aspect-[5/6] lg:h-auto lg:max-w-[calc((100svh-14rem)*5/6)]"
            style={{ animationDelay: "120ms" }}
          >
            <HeroWindow />
            {/* the pencil under-drawing, still showing under the finished thing */}
            <div aria-hidden className="arch absolute inset-0 rotate-[3.5deg] border-2 border-dashed border-taupe-300" />
            <div className="arch absolute inset-0 rotate-[-1.5deg] border-[1.5px] border-taupe-300 bg-cream-50 p-2.5 shadow-[0_26px_36px_-18px_rgba(94,73,52,0.42)]">
              <div className="arch relative h-full w-full overflow-hidden">
                <Image
                  src="/marketing/shelf-mains/03.webp"
                  alt="The Choco Brown Classic bookshelf styled with a LITERATURE topper, tulips and candlelight, beside a full-size novel"
                  fill
                  preload
                  sizes="(min-width:1024px) 44vw, 90vw"
                  className="object-cover object-[50%_32%] lg:object-[56%_50%]"
                />
              </div>
            </div>
            <figure className="hero-polaroid absolute -bottom-2 -left-1 m-0 w-[7.4rem] -rotate-6 sm:w-[8.6rem] lg:-bottom-9 lg:-left-11 lg:w-[9.4rem]">
              <div className="clay-sm relative bg-cream-50 p-1.5 pb-0 shadow-[0_16px_22px_-10px_rgba(94,73,52,0.45)]">
                <span
                  aria-hidden
                  className="absolute -top-2.5 left-1/2 h-5 w-14 -translate-x-1/2 -rotate-6 rounded-[2px] bg-blush-200/85 shadow-[inset_0_0_0_1px_rgba(214,138,120,0.35)]"
                />
                <Image
                  src="/marketing/mini-books/04.webp"
                  alt="A hand holding a stack of six miniature novels, no longer than a thumb"
                  width={480}
                  height={480}
                  sizes="160px"
                  className="aspect-square w-full rounded-[0.7rem] object-cover"
                />
                <figcaption className="story-line py-1.5 text-center text-[0.68rem] leading-tight text-ink-600">
                  actual size
                </figcaption>
              </div>
            </figure>
          </div>
          </div>

          {/* the drawn scroll cue: the fold's one pointer at the rest of the shop */}
          <div className="hero-cue soft-in flex flex-col items-center gap-0.5 pb-[5.5rem] pt-1.5 lg:pb-4 lg:pt-3" style={{ animationDelay: "1200ms" }}>
            <span className="story-line text-[0.78rem] text-ink-600">the shop, just below</span>
            <IconChevronDown className="cue-bob h-4 w-4 text-sage-700" />
          </div>
        </div>
      </Section>
      <ScallopBand from="paper" to="cream" />

      {/* ─── The maker's note: the hero story, pinned just under the fold (mobile) ─── */}
      <Section className="pt-8 lg:hidden">
        <div className="stitch relative mx-auto max-w-md rotate-[-0.6deg] bg-cream-50 px-6 pb-7 pt-8 text-center">
          <span
            aria-hidden
            className="absolute -top-3 left-1/2 h-6 w-20 -translate-x-1/2 rotate-[-4deg] rounded-[2px] bg-blush-200/85 shadow-[inset_0_0_0_1px_rgba(214,138,120,0.35)]"
          />
          <svg viewBox="0 0 34 26" className="mx-auto mb-3 h-6 w-8" aria-hidden role="presentation">
            <Leaf x={2} y={16} s={6} angle={-28} />
            <FolkFlower x={24} y={9} r={5} />
            <Sparkle x={31} y={22} s={3} />
          </svg>
          <div className="space-y-3">
            <HeroStory />
          </div>
        </div>
      </Section>

      {/* ─── The three promises ─── */}
      <Section className="pt-5">
        <ul className="enter clay-sm mx-auto grid max-w-md grid-cols-3 divide-x-[1.5px] divide-dashed divide-taupe-300 lg:max-w-2xl">
          {([
            ["hand", "Manually assembled"],
            ["six", "Books come in sets of six"],
            ["box", "Arrives in an illustrated box"],
          ] as const).map(([kind, label], i) => (
            <li key={kind} className="flex flex-col items-center gap-1.5 px-2 py-3.5 text-center sm:px-3">
              <HeroMark kind={kind} delay={280 + i * 190} />
              <span className="font-sans text-[0.7rem] font-bold leading-tight text-ink-800 sm:text-[0.78rem]">
                {label}
              </span>
            </li>
          ))}
        </ul>
      </Section>

      {/* ─── Categories ─── */}
      <Section className="pb-14 pt-12 lg:pb-20 lg:pt-16">
        <div className="enter mb-6 flex items-end justify-between gap-4">
          <div>
            <Eyebrow className="mb-2">Around the shop</Eyebrow>
            <h2 className="text-2xl font-bold sm:text-3xl">Little things, by aisle</h2>
          </div>
          <Link href="/shop" className="btn-link hidden items-center gap-1 sm:inline-flex">
            Shop all <IconArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="enter-stagger no-scrollbar -mx-4 -mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-4 pt-5 sm:mx-0 sm:mt-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 sm:pb-2 sm:pt-0 lg:grid-cols-5">
          {(Object.entries(CATEGORIES) as [Category, (typeof CATEGORIES)[Category]][]).map(([slug, cat], i) => (
            <Link
              key={slug}
              href={`/shop/${slug}`}
              className="clay clay-hover group relative flex min-w-[46%] snap-start flex-col text-center sm:min-w-0"
              style={{ "--i": i } as CSSProperties}
            >
              {/* a little drawing that sketches itself, like a shop sign being painted */}
              <span className="absolute -right-2 -top-2 z-10 flex h-12 w-12 items-center justify-center rounded-full border-[1.5px] border-taupe-200/80 bg-cream-50 shadow-clay-sm transition-transform duration-500 group-hover:-rotate-6 group-hover:scale-110">
                <SketchDoodle kind={slug} delay={i * 700} className="h-8 w-8" />
              </span>
              <div className="relative m-2.5 mb-0 aspect-[4/3] overflow-hidden rounded-2xl border-[1.5px] border-taupe-200/70 bg-paper">
                <Image
                  src={cat.photo}
                  alt={cat.name}
                  fill
                  sizes="(min-width:1024px) 20vw, (min-width:640px) 33vw, 46vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <div className="flex flex-1 flex-col gap-1 p-3.5 pt-2.5">
                <span className="font-display text-[1.02rem] font-semibold leading-tight">{cat.name}</span>
                <span className="font-sans text-xs leading-snug text-ink-600">{cat.blurb}</span>
              </div>
            </Link>
          ))}
        </div>
      </Section>

      {/* ─── Build your little shelf ─── */}
      <ScallopBand from="sage" to="cream" rise />
      <Section tint="sage" className="relative overflow-hidden pb-12 pt-10 lg:pb-16 lg:pt-14">
        <AmbientMeadow />
        <div className="relative">
          <div className="enter mx-auto mb-8 max-w-2xl text-center">
            <Eyebrow className="mb-2">The signature</Eyebrow>
            <h2 className="text-3xl font-bold sm:text-4xl">Build your little shelf</h2>
            <p className="story-line mt-3 text-lg text-ink-600">
              Pick a theme, choose six stories, and watch your shelf fill up.
            </p>
          </div>
          <ThemeShelfDemo />
          <div className="enter-stagger mt-10 grid gap-3 sm:grid-cols-3">
            {[
              ["1", "Choose a shelf", "Three styles, nine studio colors, two sizes."],
              ["2", "Pick six stories", "A ready-made set, or your own six titles."],
              ["3", "Make it yours", "Add tiny extras, a theme, and a note."],
            ].map(([n, title, body], i) => (
              <div key={n} className="clay flex items-start gap-3 p-4" style={{ "--i": i } as CSSProperties}>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blush-200 font-display text-lg font-bold text-rose-700 shadow-[inset_0_1.5px_0_rgba(255,255,255,0.7)]">
                  {n}
                </span>
                <div>
                  <p className="font-display font-semibold">{title}</p>
                  <p className="font-sans text-sm text-ink-600">{body}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="enter mt-8 text-center">
            <ButtonLink href="/build" className="btn-lg">
              Start building <IconArrowRight className="h-5 w-5" />
            </ButtonLink>
          </div>
        </div>
      </Section>
      <ScallopBand from="sage" to="cream100" />

      {/* ─── Set of six ─── the section IS the panel now, no .clay card */}
      <Section tint="cream100" className="pb-12 pt-10 lg:pb-16 lg:pt-14">
        <div className="enter grid items-center gap-6 lg:grid-cols-[auto_1fr_auto]">
          <Image
            src="/marketing/mini-books/01.webp"
            alt="Ten miniature novels spread across a pale wood surface in afternoon light"
            width={640}
            height={640}
            sizes="200px"
            className="mx-auto aspect-square w-40 rounded-2xl object-cover"
          />
          <div className="text-center lg:text-left">
            <h2 className="text-2xl font-bold sm:text-3xl">Miniature books come in sets of six</h2>
            <p className="mx-auto mt-2 max-w-[58ch] font-sans text-[0.98rem] leading-relaxed text-ink-600 lg:mx-0">
              Six is what fits the backing card, and about as many favorites as
              anyone can name without hedging. Pick a ready-made series, or send us
              your own six titles. We source each cover, scale it down, print it on
              matte cardstock and mount it by hand.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2 lg:justify-start">
              <Badge tone="rose">Always six</Badge>
              <Badge tone="sage">About 1 × 1.4 in each</Badge>
              <Badge tone="taupe">Made to order</Badge>
            </div>
          </div>
          <div className="flex flex-row justify-center gap-2 lg:flex-col">
            <ButtonLink href="/products/custom-mini-book-set" variant="blush">
              Customize a set
            </ButtonLink>
            <ButtonLink href="/shop/mini-books" variant="quiet">
              Ready-made sets
            </ButtonLink>
          </div>
        </div>
      </Section>
      <ScallopBand from="cream100" to="cream" />

      {/* ─── Featured ─── */}
      <Section className="pb-14 pt-12 lg:pb-20 lg:pt-16">
        <ShelfRuleDivider className="mx-auto mb-10 h-11 w-full max-w-2xl px-4 opacity-80" />
        <div className="enter mb-6 flex items-end justify-between gap-4">
          <div>
            <Eyebrow className="mb-2">Fresh from the studio</Eyebrow>
            <h2 className="text-2xl font-bold sm:text-3xl">Little things to start with</h2>
          </div>
          <Link href="/shop" className="btn-link hidden items-center gap-1 sm:inline-flex">
            See everything <IconArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="enter grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {FEATURED.map((slug, i) => {
            const p = getProduct(slug);
            return p ? <ProductCard key={slug} product={p} eager={i < 2} /> : null;
          })}
        </div>
        <div className="mt-6 text-center sm:hidden">
          <ButtonLink href="/shop" variant="quiet">
            See everything
          </ButtonLink>
        </div>
      </Section>

      {/* ─── Packaging & story ─── */}
      <ScallopBand from="blush" to="cream" rise />
      <Section tint="blush" className="pb-12 pt-10 lg:pb-16 lg:pt-14">
        <div className="enter grid items-center gap-8 lg:grid-cols-2">
          <div className="order-2 grid grid-cols-2 gap-3 lg:order-1">
            <div className="stitch rotate-[-1.5deg] overflow-hidden bg-cream-50 p-2">
              <Image
                src="/marketing/packaging/09.webp"
                alt="The Little Bookshop gift box open on a sage green background, its illustrated bookshelf lid propped behind"
                width={1400}
                height={1050}
                className="h-full w-full rounded-2xl object-cover"
              />
            </div>
            <div className="stitch mt-6 rotate-[1.5deg] overflow-hidden bg-cream-50 p-2">
              <Image
                src="/marketing/packaging/10.webp"
                alt="The closed Little Bookshop gift box at an angle, its pastel bookshelf artwork facing the camera"
                width={1400}
                height={1050}
                className="h-full w-full rounded-2xl object-cover"
              />
            </div>
            <p className="col-span-2 text-center font-sans text-xs text-ink-600">
              Every order is packed into our illustrated bookshelf box.
            </p>
          </div>
          <div className="order-1 text-center lg:order-2 lg:text-left">
            <Eyebrow className="mb-2">Unboxing, but tiny</Eyebrow>
            <h2 className="text-3xl font-bold">Wrapped like it matters</h2>
            <p className="mt-3 font-sans text-[0.98rem] leading-relaxed text-ink-600">
              Shelf-and-book bundles arrive in our illustrated bookshelf box. Book
              sets come tucked into a six-slot backing card, one window per story.
              Keychains hang from their own illustrated card.
            </p>
            <p className="story-line mt-4 text-lg text-ink-600">
              Which makes it a dangerously easy gift.
            </p>
            <div className="mt-5 flex justify-center gap-2 lg:justify-start">
              <ButtonLink href="/about" variant="quiet">
                Our story
              </ButtonLink>
              <ButtonLink href="/shop/mini-books" variant="blush">
                Gift a set of six
              </ButtonLink>
            </div>
          </div>
        </div>
      </Section>
      <ScallopBand from="blush" to="cream" />

      {/* ─── FAQ teaser ─── last section: extra bottom air before the footer seam */}
      <Section className="pb-16 pt-12 lg:pb-24 lg:pt-16">
        <div className="mx-auto max-w-2xl">
          <div className="enter mb-6 text-center">
            <Eyebrow className="mb-2">Small questions</Eyebrow>
            <h2 className="text-2xl font-bold sm:text-3xl">Asked often, answered gladly</h2>
          </div>
          <div className="enter-stagger space-y-3">
            {FAQ.slice(0, 3).map((item, i) => (
              <details key={item.q} className="clay group px-5 py-4 open:pb-5" style={{ "--i": i } as CSSProperties}>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-display text-[1.02rem] font-semibold [&::-webkit-details-marker]:hidden">
                  {item.q}
                  <span className="text-xl text-taupe-500 transition-transform duration-300 group-open:rotate-45" aria-hidden>
                    +
                  </span>
                </summary>
                <p className="mt-2 font-sans text-[0.95rem] leading-relaxed text-ink-600">{item.a}</p>
              </details>
            ))}
          </div>
          <div className="mt-5 text-center">
            <Link href="/faq" className="btn-link inline-flex items-center gap-1">
              All questions <IconArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <BlueprintShelf className="mx-auto mt-12 w-full max-w-sm" />
          <SprigDivider className="mx-auto mt-10 h-9 w-72 opacity-90" />
        </div>
      </Section>
    </div>
  );
}
