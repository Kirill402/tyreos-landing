# TYREOS Landing Page — Design Spec

Date: 2026-07-05

## Purpose

A single marketing landing page for **TYREOS** — a SaaS automation platform sold to
tire-shop (шиномонтаж) owners. The platform covers both the owner-facing back office
(AI Administrator, CRM, analytics) and the client-facing experience (online booking,
reminders, messaging channels). The page's job is to sell the platform to a shop owner
and drive them to a free-trial signup — not to serve as a single shop's public site.

Visual direction: SpaceX.com — near-black background, huge uppercase technical
typography, single accent color, full-bleed sections, scroll-driven motion, no customer
testimonials/logos (none exist — do not fabricate).

## Non-goals

- No backend, no real signup processing — the CTA form/button is static (can post to
  `mailto:` or a placeholder endpoint) since there is no product to register into yet.
- No fabricated testimonials, client logos, or case-study numbers presented as real data.
- No build tooling (no bundler/framework) — plain static HTML/CSS/JS.

## Tech stack

- Static site, no build step: `index.html`, `styles.css`, `script.js`, `assets/`.
- Fonts: Google Fonts **Space Grotesk** (headings) + **Inter** (body).
- Motion: **GSAP + ScrollTrigger** via CDN for scroll-reveal, hero parallax, and the
  stats ticker. Fallback: if GSAP fails to load, sections must still be visible
  (no animation-gated visibility — respect `prefers-reduced-motion`).
- Icons: hand-authored inline SVG, monochrome line icons, one per feature (11 total),
  accent-colored on hover/active.
- Imagery: 2–3 AI-generated background visuals (dark, abstract, technical — tire tread
  patterns, circuit/garage lighting) for hero and module section backgrounds, generated
  via the image-generation tool and saved under `assets/`.
- Fully responsive: mobile-first breakpoints, hamburger nav under ~860px.

## Visual system (design tokens)

CSS custom properties in `:root`:

- `--bg: #0a0a0c` (near-black), `--bg-raised: #131316`
- `--fg: #f5f5f7` (primary text), `--fg-muted: #9a9aa2`
- `--accent: #2f7dff` (ion blue) — used sparingly: links, CTA fills, active states,
  icon highlights, ticker digits
- `--mono: 'Space Grotesk', ...` for headings/labels/numbers, `--sans: 'Inter', ...` for body
- Type scale: hero H1 ~clamp(2.75rem, 6vw, 6rem), section H2 ~clamp(2rem, 4vw, 3.5rem),
  uppercase + tight letter-spacing (`-0.02em` to `-0.04em` at large sizes) for headings
- Spacing scale based on an 8px unit; sections use generous vertical padding
  (`clamp(80px, 12vw, 160px)`)

## Page structure

1. **Header** — fixed/sticky, transparent over hero → solid `--bg` with blur on scroll.
   Logo "TYREOS", nav links (Продукт, Возможности, Каналы, Цены), CTA button
   "Попробовать бесплатно". Hamburger menu on mobile.

2. **Hero** — full viewport height. Background: AI-generated dark technical visual with
   gradient overlay for text contrast. Eyebrow label (mono, small, uppercase, e.g.
   "TYREOS / OS FOR TIRE SHOPS"), huge H1 promise headline, one-line subhead, two CTAs
   (primary "Попробовать бесплатно", secondary "Как это работает" — scrolls down).
   Subtle parallax on background via GSAP on scroll.

3. **Stats ticker** — full-width horizontally scrolling marquee strip (infinite loop,
   CSS/JS driven) with 4–6 short promise metrics as feature statements, not fabricated
   numbers presented as audited data — framed as capabilities, e.g.
   "AI-администратор 24/7 · Единое окно: WhatsApp, Instagram, Messenger, Email ·
   Автонапоминания клиентам · Аналитика в реальном времени". Repeat content is fine
   framed qualitatively, no invented percentages/quotes attributed to real customers.

4. **Module 01 — AI-ядро** (AI Администратор, AI Аналитик): large section, module
   number "01" in mono type, heading, short description of the two sub-features each
   with icon + 2–3 line copy, layout: text block + visual panel side by side
   (stacks on mobile).

5. **Module 02 — Бизнес-контроль** (Онлайн-запись, CRM, Клиенты, Напоминания,
   Статистика): module number "02", same treatment, 5 sub-features in a responsive
   icon-grid (2 cols mobile, 3 cols tablet, 5 cols desktop or a condensed layout —
   final grid arrangement decided during implementation for visual balance).

6. **Module 03 — Каналы связи** (WhatsApp, Messenger, Instagram, Email): module number
   "03", framed as "одно окно для всех каналов" — 4 channel icons with brand-appropriate
   coloring used tastefully against the dark theme (small accent per icon is acceptable;
   overall page accent stays ion-blue).

7. **Как это работает** — 4-step horizontal/vertical process: клиент пишет в любой
   канал → AI отвечает и записывает → CRM обновляется автоматически → напоминание
   клиенту + данные в статистике. Numbered mono steps, connecting line/arrow.

8. **Final CTA** — centered, bold heading ("Готовы автоматизировать шиномонтаж?"),
   single prominent CTA button to trial signup, no pricing table (no real pricing
   exists — do not invent tiers/numbers).

9. **Footer** — minimal: logo, nav repeat, social/contact placeholders, copyright line.
   No fabricated legal entity details.

## Interactions & accessibility

- Scroll-reveal: elements fade/slide up into view once, using IntersectionObserver or
  GSAP ScrollTrigger; must respect `prefers-reduced-motion: reduce` (disable
  parallax/marquee animation, keep content statically visible).
- All interactive elements keyboard-navigable; focus-visible states styled to match
  the accent color (not suppressed).
- Color contrast: body text and headings against `--bg` must meet WCAG AA.
- Mobile nav: accessible hamburger (aria-expanded, focus trap not required for a
  simple dropdown, but must be closable via Escape/outside click).

## Assets plan

Generate via image tool, store under `assets/`:
- `hero-bg.jpg` — dark abstract technical/tire visual for hero background
- `module-ai-bg.jpg` — abstract AI/circuit visual for Module 01
- `module-channels-bg.jpg` (optional) — abstract comms/network visual for Module 03

If generation is unavailable at implementation time, ship with a CSS-gradient +
subtle SVG-pattern fallback background so the page is never blocked on external
image generation.

## Open decisions deferred to implementation

- Exact grid arrangement for Module 02's 5 features (visual balance call).
- Exact GSAP ScrollTrigger timing/easing values (implementer's judgment against the
  SpaceX reference feel).
