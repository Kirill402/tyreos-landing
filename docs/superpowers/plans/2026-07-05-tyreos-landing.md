# TYREOS Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single static SpaceX-styled landing page (`index.html` + `styles.css` + `script.js`) that markets the TYREOS tire-shop automation platform and drives visitors to a "Попробовать бесплатно" CTA.

**Architecture:** One static HTML page built incrementally section-by-section, one shared `styles.css` (design tokens + all rules) and one shared `script.js` (nav, ticker, GSAP scroll animations). No build tooling, no backend. Verification per task uses the `preview_*` browser tools instead of automated tests (this is a visual artifact, not a logic library).

**Tech Stack:** Plain HTML5, CSS3 (custom properties), vanilla JS, GSAP 3 + ScrollTrigger (CDN), Google Fonts (Space Grotesk + Inter).

## Global Constraints

- No build step, no framework, no npm dependencies — CDN `<script>` tags only.
- Design tokens (from spec): `--bg:#0a0a0c`, `--bg-raised:#131316`, `--fg:#f5f5f7`, `--fg-muted:#9a9aa2`, `--accent:#2f7dff`.
- Fonts: **Space Grotesk** for headings/labels/numbers, **Inter** for body text.
- All copy is in Russian, product name is **TYREOS**.
- No fabricated testimonials, client logos, or numeric stats presented as real/audited data.
- Must respect `prefers-reduced-motion: reduce` — content must be visible even if JS/GSAP never runs (no animation-gated visibility).
- Do not reproduce exact trademarked WhatsApp/Instagram/Messenger logos — use generic, recognizable line icons with brand-appropriate accent color, labelled by text.
- Every section in `index.html` is inserted by replacing an HTML comment anchor placed in Task 1 (e.g. `<!-- HERO -->`) — anchors disappear once replaced by real content; none remain in the finished file.
- Verify every task with the `preview_*` tools (start/reuse dev server, snapshot, inspect, screenshot, console/network check) — never claim a task done without observing it rendered.

---

### Task 1: Project scaffold, design tokens, Header/Nav

**Files:**
- Create: `index.html`
- Create: `styles.css`
- Create: `script.js`
- Create: `.claude/launch.json` (static server config for `preview_start`)

**Interfaces:**
- Produces: CSS custom properties (`--bg`, `--bg-raised`, `--fg`, `--fg-muted`, `--accent`, `--mono`, `--sans`) that every later task's CSS relies on. Produces the `.reveal` class contract (elements get this class; Task 9 makes it animate) and comment anchors `<!-- HERO -->`, `<!-- TICKER -->`, `<!-- MODULE-01 -->`, `<!-- MODULE-02 -->`, `<!-- MODULE-03 -->`, `<!-- HOW-IT-WORKS -->`, `<!-- FINAL-CTA -->`, `<!-- FOOTER -->` inside `<main>`.

- [ ] **Step 1: Create `index.html` with scaffold, head, header/nav, and section anchors**

```html
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TYREOS — операционная система для шиномонтажа</title>
  <meta name="description" content="TYREOS автоматизирует запись, CRM, напоминания и все каналы связи шиномонтажа с помощью AI.">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <a class="skip-link" href="#main">Перейти к содержимому</a>

  <header class="site-header">
    <div class="container site-header__row">
      <a class="logo" href="#top">TYREOS</a>
      <nav class="site-nav" id="site-nav">
        <a href="#modules-01">Продукт</a>
        <a href="#modules-02">Возможности</a>
        <a href="#modules-03">Каналы</a>
        <a class="btn btn--small btn--accent" href="#final-cta">Попробовать бесплатно</a>
      </nav>
      <button class="nav-toggle" id="nav-toggle" aria-expanded="false" aria-controls="site-nav" aria-label="Открыть меню">
        <span class="nav-toggle__bar"></span>
        <span class="nav-toggle__bar"></span>
        <span class="nav-toggle__bar"></span>
      </button>
    </div>
  </header>

  <main id="main">
    <!-- HERO -->
    <!-- TICKER -->
    <!-- MODULE-01 -->
    <!-- MODULE-02 -->
    <!-- MODULE-03 -->
    <!-- HOW-IT-WORKS -->
    <!-- FINAL-CTA -->
  </main>

  <!-- FOOTER -->

  <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js"></script>
  <script src="script.js"></script>
</body>
</html>
```

- [ ] **Step 2: Create `styles.css` with reset, design tokens, base type, and header/nav styles**

```css
*, *::before, *::after { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body { margin: 0; }
img { max-width: 100%; display: block; }
button { font: inherit; }

:root {
  --bg: #0a0a0c;
  --bg-raised: #131316;
  --fg: #f5f5f7;
  --fg-muted: #9a9aa2;
  --accent: #2f7dff;
  --mono: 'Space Grotesk', 'Courier New', monospace;
  --sans: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  --section-pad: clamp(80px, 12vw, 160px);
  --container-w: 1200px;
}

body {
  background: var(--bg);
  color: var(--fg);
  font-family: var(--sans);
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}

h1, h2, h3 {
  font-family: var(--mono);
  text-transform: uppercase;
  letter-spacing: -0.02em;
  line-height: 1.05;
  margin: 0;
}

h1 { font-size: clamp(2.75rem, 6vw, 6rem); letter-spacing: -0.04em; }
h2 { font-size: clamp(2rem, 4vw, 3.5rem); }

p { color: var(--fg-muted); margin: 0; }

a { color: inherit; text-decoration: none; }

.container {
  max-width: var(--container-w);
  margin-inline: auto;
  padding-inline: 24px;
}

.skip-link {
  position: absolute;
  left: -999px;
  top: 0;
  background: var(--accent);
  color: #fff;
  padding: 12px 20px;
  z-index: 1000;
}
.skip-link:focus {
  left: 24px;
  top: 24px;
}

:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 3px;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 14px 28px;
  border-radius: 999px;
  font-family: var(--mono);
  text-transform: uppercase;
  font-size: 0.85rem;
  letter-spacing: 0.02em;
  border: 1px solid rgba(245, 245, 247, 0.25);
  transition: transform 0.2s ease, background 0.2s ease, border-color 0.2s ease;
}
.btn:hover { transform: translateY(-2px); }
.btn--accent {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}
.btn--accent:hover { background: #4d8dff; }
.btn--ghost { background: transparent; }
.btn--ghost:hover { border-color: var(--fg); }
.btn--small { padding: 10px 20px; font-size: 0.75rem; }

.site-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background: transparent;
  transition: background 0.3s ease, backdrop-filter 0.3s ease, border-color 0.3s ease;
  border-bottom: 1px solid transparent;
}
.site-header.is-scrolled {
  background: rgba(10, 10, 12, 0.85);
  backdrop-filter: blur(10px);
  border-bottom-color: rgba(245, 245, 247, 0.1);
}
.site-header__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-block: 18px;
}
.logo {
  font-family: var(--mono);
  font-weight: 700;
  font-size: 1.25rem;
  letter-spacing: 0.04em;
}
.site-nav {
  display: flex;
  align-items: center;
  gap: 32px;
  font-family: var(--mono);
  text-transform: uppercase;
  font-size: 0.85rem;
}
.nav-toggle {
  display: none;
  flex-direction: column;
  gap: 5px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
}
.nav-toggle__bar {
  width: 22px;
  height: 2px;
  background: var(--fg);
}

@media (max-width: 860px) {
  .site-nav {
    position: fixed;
    inset: 64px 0 0 0;
    background: var(--bg);
    flex-direction: column;
    justify-content: center;
    gap: 40px;
    font-size: 1.5rem;
    transform: translateY(-8px);
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.25s ease, transform 0.25s ease;
  }
  .site-nav.is-open {
    opacity: 1;
    transform: translateY(0);
    pointer-events: auto;
  }
  .nav-toggle { display: flex; }
}
```

- [ ] **Step 3: Create `script.js` with header scroll state and mobile nav toggle**

```js
document.addEventListener('DOMContentLoaded', () => {
  const header = document.querySelector('.site-header');
  const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 40);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  const navToggle = document.getElementById('nav-toggle');
  const nav = document.getElementById('site-nav');

  const closeNav = () => {
    nav.classList.remove('is-open');
    navToggle.setAttribute('aria-expanded', 'false');
  };

  navToggle.addEventListener('click', () => {
    const isOpen = nav.classList.toggle('is-open');
    navToggle.setAttribute('aria-expanded', String(isOpen));
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && nav.classList.contains('is-open')) closeNav();
  });

  document.addEventListener('click', (e) => {
    if (nav.classList.contains('is-open') && !nav.contains(e.target) && !navToggle.contains(e.target)) {
      closeNav();
    }
  });

  nav.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeNav));
});
```

- [ ] **Step 4: Create `.claude/launch.json` for the preview server**

```json
{
  "version": "0.0.1",
  "configurations": [
    {
      "name": "tyreos-landing",
      "runtimeExecutable": "npx",
      "runtimeArgs": ["serve", "-l", "4173", "."],
      "port": 4173
    }
  ]
}
```

- [ ] **Step 5: Start the preview server and verify the scaffold renders**

Use `preview_start` with name `tyreos-landing`. Then use `preview_snapshot` and confirm:
- The logo text "TYREOS" is present in the header.
- Nav links "Продукт", "Возможности", "Каналы", "Попробовать бесплатно" are present.

Use `preview_inspect` on `body` and confirm computed `background-color` is `rgb(10, 10, 12)` and `font-family` includes `Inter`.

Use `preview_resize` with `preset: "mobile"`, then `preview_click` on `#nav-toggle`, then `preview_snapshot` and confirm the nav links become visible (not `pointer-events: none`) and `aria-expanded` is `"true"` (check via `preview_inspect` on `#nav-toggle`).

Use `preview_console_logs` and confirm no errors.

- [ ] **Step 6: Commit**

```bash
git add index.html styles.css script.js .claude/launch.json
git commit -m "Add scaffold, design tokens, and header/nav"
```

---

### Task 2: Hero section

**Files:**
- Modify: `index.html` (replace `<!-- HERO -->`)
- Modify: `styles.css` (append hero styles)
- Create: `assets/hero-bg.jpg` (generated image)

**Interfaces:**
- Consumes: `--bg`, `--fg`, `--accent`, `--mono`, `.btn`/`.btn--accent`/`.btn--ghost` from Task 1.
- Produces: `.hero` and `.hero-bg` selectors that Task 9's parallax code targets (`gsap.to('.hero-bg', ...)`), and the `.reveal` class pattern that every later section reuses (any element with class `reveal` fades in on scroll once Task 9 wires GSAP; until then it is just plain-visible, no CSS hides it).

- [ ] **Step 1: Generate the hero background image**

Call the image-generation tool with prompt: *"Dark cinematic automotive garage at night, close-up abstract tire tread texture blending into circuit-board light trails, deep black background, single cold blue neon rim light, minimal, high contrast, no text, no logos, 16:9"*. Save the result to `assets/hero-bg.jpg`. If generation is unavailable, skip this step — the CSS fallback gradient in Step 3 keeps the hero fully usable without it.

- [ ] **Step 2: Replace `<!-- HERO -->` in `index.html`**

```html
<section class="hero" id="top">
  <div class="hero-bg" aria-hidden="true"></div>
  <div class="hero__overlay" aria-hidden="true"></div>
  <div class="container hero__content">
    <p class="eyebrow">TYREOS / OS ДЛЯ ШИНОМОНТАЖА</p>
    <h1>ПЕРЕВЕДИТЕ ШИНОМОНТАЖ<br>НА АВТОПИЛОТ</h1>
    <p class="hero__subhead">TYREOS отвечает клиентам, записывает, напоминает и считает выручку — пока вы чините шины.</p>
    <div class="hero__actions">
      <a class="btn btn--accent" href="#final-cta">Попробовать бесплатно</a>
      <a class="btn btn--ghost" href="#how-it-works">Как это работает</a>
    </div>
  </div>
</section>
```

- [ ] **Step 3: Append hero styles to `styles.css`**

```css
.eyebrow {
  font-family: var(--mono);
  text-transform: uppercase;
  letter-spacing: 0.15em;
  font-size: 0.8rem;
  color: var(--accent);
  margin-bottom: 24px;
}

.hero {
  position: relative;
  min-height: 100svh;
  display: flex;
  align-items: center;
  overflow: hidden;
}
.hero-bg {
  position: absolute;
  inset: -10% 0 0 0;
  height: 120%;
  background: url('assets/hero-bg.jpg') center/cover no-repeat, linear-gradient(160deg, #14141a, #0a0a0c 70%);
  z-index: 0;
}
.hero__overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(10,10,12,0.35) 0%, rgba(10,10,12,0.75) 70%, var(--bg) 100%);
  z-index: 1;
}
.hero__content {
  position: relative;
  z-index: 2;
  padding-top: 120px;
}
.hero__subhead {
  max-width: 44ch;
  margin-top: 28px;
  font-size: 1.15rem;
  color: var(--fg-muted);
}
.hero__actions {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  margin-top: 40px;
}
```

- [ ] **Step 4: Verify in browser**

Reload via `preview_eval` (`window.location.reload()`). Use `preview_snapshot` and confirm the H1 text "ПЕРЕВЕДИТЕ ШИНОМОНТАЖ НА АВТОПИЛОТ" and both CTA buttons are present. Use `preview_screenshot` to confirm the hero fills the viewport with legible text over the background. Use `preview_inspect` on `.hero` and confirm `min-height` computes to the viewport height.

- [ ] **Step 5: Commit**

```bash
git add index.html styles.css assets/hero-bg.jpg
git commit -m "Add hero section"
```

---

### Task 3: Stats ticker

**Files:**
- Modify: `index.html` (replace `<!-- TICKER -->`)
- Modify: `styles.css` (append ticker styles)

**Interfaces:**
- Consumes: `--bg-raised`, `--mono`, `--accent` from Task 1.
- Produces: nothing later tasks depend on (purely decorative, self-contained CSS animation).

- [ ] **Step 1: Replace `<!-- TICKER -->` in `index.html`**

```html
<div class="ticker" aria-hidden="true">
  <div class="ticker__track">
    <span class="ticker__item">AI-АДМИНИСТРАТОР 24/7</span>
    <span class="ticker__item">ЗАПИСЬ БЕЗ ЗВОНКОВ</span>
    <span class="ticker__item">WHATSAPP · INSTAGRAM · MESSENGER · EMAIL — В ОДНОМ ОКНЕ</span>
    <span class="ticker__item">АВТОНАПОМИНАНИЯ КЛИЕНТАМ</span>
    <span class="ticker__item">СТАТИСТИКА В РЕАЛЬНОМ ВРЕМЕНИ</span>
    <span class="ticker__item">AI-АДМИНИСТРАТОР 24/7</span>
    <span class="ticker__item">ЗАПИСЬ БЕЗ ЗВОНКОВ</span>
    <span class="ticker__item">WHATSAPP · INSTAGRAM · MESSENGER · EMAIL — В ОДНОМ ОКНЕ</span>
    <span class="ticker__item">АВТОНАПОМИНАНИЯ КЛИЕНТАМ</span>
    <span class="ticker__item">СТАТИСТИКА В РЕАЛЬНОМ ВРЕМЕНИ</span>
  </div>
</div>
```

- [ ] **Step 2: Append ticker styles to `styles.css`**

```css
.ticker {
  overflow: hidden;
  white-space: nowrap;
  background: var(--bg-raised);
  border-block: 1px solid rgba(245, 245, 247, 0.1);
  padding-block: 18px;
}
.ticker__track {
  display: inline-flex;
  gap: 48px;
  animation: ticker-scroll 32s linear infinite;
}
.ticker:hover .ticker__track { animation-play-state: paused; }
.ticker__item {
  font-family: var(--mono);
  font-size: 0.85rem;
  letter-spacing: 0.04em;
  color: var(--fg-muted);
}
@keyframes ticker-scroll {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}
@media (prefers-reduced-motion: reduce) {
  .ticker__track { animation: none; }
}
```

- [ ] **Step 3: Verify in browser**

Reload. Use `preview_inspect` on `.ticker__track` and confirm `animation-name` is `ticker-scroll`. Use `preview_screenshot` to confirm the ticker strip renders between hero and the next section. Read `styles.css` back and confirm the `@media (prefers-reduced-motion: reduce)` block is present (this can't be emulated via `preview_resize`, so confirm by inspecting the source).

- [ ] **Step 4: Commit**

```bash
git add index.html styles.css
git commit -m "Add stats ticker"
```

---

### Task 4: Module 01 — AI-ядро

**Files:**
- Modify: `index.html` (replace `<!-- MODULE-01 -->`)
- Modify: `styles.css` (append module-section + feature-row styles, reused by Tasks 5–6)
- Create: `assets/module-ai-bg.jpg` (generated image)

**Interfaces:**
- Consumes: `--mono`, `--accent`, `--fg-muted` from Task 1.
- Produces: `.module`, `.module__number`, `.module__grid`, `.feature-row`, `.feature-row__body`, and `.icon` base class — Tasks 5 and 6 reuse `.module`/`.module__number`/`.icon`; the two-column `.module__grid` + `.module__visual` pairing is specific to this task and not reused elsewhere.

- [ ] **Step 1: Generate the module visual**

Call the image-generation tool with prompt: *"Abstract AI circuit board glowing in cold blue light against deep black background, close-up macro texture, no text, no logos, minimal, high contrast, vertical composition"*. Save the result to `assets/module-ai-bg.jpg`. If generation is unavailable, skip this step — the CSS gradient fallback in the next step keeps `.module__visual` fully usable without it.

- [ ] **Step 2: Replace `<!-- MODULE-01 -->` in `index.html`**

```html
<section class="module" id="modules-01">
  <div class="container module__grid">
    <div class="module__text">
      <p class="module__number">01</p>
      <h2 class="reveal">AI-ЯДРО</h2>
      <p class="module__lede reveal">Мозг мастерской, который никогда не устаёт.</p>

      <div class="feature-row reveal">
        <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 5.5h16a1 1 0 0 1 1 1V16a1 1 0 0 1-1 1H10l-4.5 4V17H4a1 1 0 0 1-1-1V6.5a1 1 0 0 1 1-1Z"/>
          <path d="M12 8.2 12.9 10l1.8.9-1.8.9-.9 1.8-.9-1.8L9.3 10l1.8-.9.9-1.8Z" style="fill:currentColor;stroke:none"/>
        </svg>
        <div class="feature-row__body">
          <h3>AI Администратор</h3>
          <p>Отвечает клиентам в мессенджерах и по телефону 24/7, уточняет марку и размер шин, предлагает свободное время и записывает — без участия человека.</p>
        </div>
      </div>

      <div class="feature-row reveal">
        <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 19V13M9 19V9M14 19v-5"/>
          <circle cx="17.5" cy="8.5" r="3"/>
          <path d="m19.8 10.8 2 2"/>
        </svg>
        <div class="feature-row__body">
          <h3>AI Аналитик</h3>
          <p>Каждый день анализирует загрузку, отмены записей и выручку, находит узкие места и присылает владельцу короткий отчёт с рекомендациями.</p>
        </div>
      </div>
    </div>

    <div class="module__visual reveal" aria-hidden="true"></div>
  </div>
</section>
```

- [ ] **Step 3: Append module + feature-row styles to `styles.css`**

```css
.module {
  padding-block: var(--section-pad);
  border-bottom: 1px solid rgba(245, 245, 247, 0.08);
}
.module__number {
  font-family: var(--mono);
  color: var(--accent);
  font-size: 1rem;
  letter-spacing: 0.1em;
  margin-bottom: 12px;
}
.module__lede {
  max-width: 50ch;
  font-size: 1.15rem;
  margin-top: 20px;
}

.module__grid {
  display: grid;
  grid-template-columns: 1.1fr 0.9fr;
  gap: 64px;
  align-items: center;
}
.module__visual {
  aspect-ratio: 4 / 5;
  border-radius: 20px;
  background: url('assets/module-ai-bg.jpg') center/cover no-repeat, linear-gradient(160deg, #1a1a22, #0a0a0c 80%);
  border: 1px solid rgba(245, 245, 247, 0.08);
}

.feature-row {
  display: flex;
  gap: 28px;
  align-items: flex-start;
  margin-top: 56px;
  padding-top: 40px;
  border-top: 1px solid rgba(245, 245, 247, 0.08);
}
.feature-row:first-of-type { border-top: none; }
.feature-row__body h3 {
  font-size: 1.4rem;
  text-transform: none;
  letter-spacing: 0;
  margin-bottom: 10px;
}
.feature-row__body p { max-width: 60ch; }

.icon {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.5;
  stroke-linecap: round;
  stroke-linejoin: round;
  color: var(--fg);
}

@media (max-width: 900px) {
  .module__grid { grid-template-columns: 1fr; }
  .module__visual { order: -1; aspect-ratio: 16 / 9; }
}
@media (max-width: 640px) {
  .feature-row { flex-direction: column; gap: 16px; }
}
```

- [ ] **Step 4: Verify in browser**

Reload. Use `preview_snapshot` and confirm "AI Администратор" and "AI Аналитик" headings are present under module number "01". Use `preview_inspect` on `.module__visual` and confirm it has a non-zero rendered width/height (background renders, not collapsed). Use `preview_screenshot` to confirm the text+visual two-column layout at desktop width. Use `preview_resize` with `preset: "mobile"` and confirm (via `preview_inspect` on `.module__grid`) that `grid-template-columns` collapses to a single column and the visual panel appears above the text (`order: -1`).

- [ ] **Step 5: Commit**

```bash
git add index.html styles.css assets/module-ai-bg.jpg
git commit -m "Add Module 01 (AI core) with visual panel"
```

---

### Task 5: Module 02 — Бизнес-контроль

**Files:**
- Modify: `index.html` (replace `<!-- MODULE-02 -->`)
- Modify: `styles.css` (append feature-grid styles)

**Interfaces:**
- Consumes: `.module`, `.module__number`, `.icon` from Task 4.
- Produces: `.feature-grid` / `.feature-card` classes reused by Task 6 for the channels grid.

- [ ] **Step 1: Replace `<!-- MODULE-02 -->` in `index.html`**

```html
<section class="module" id="modules-02">
  <div class="container">
    <p class="module__number">02</p>
    <h2 class="reveal">БИЗНЕС-КОНТРОЛЬ</h2>
    <p class="module__lede reveal">Всё, чем управляет мастерская, в одном экране.</p>

    <div class="feature-grid">
      <div class="feature-card reveal">
        <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
          <rect x="4" y="5.5" width="16" height="14" rx="1.5"/>
          <path d="M4 9.5h16M8 3.5v3M16 3.5v3"/>
          <path d="m9 14 2 2 4-4"/>
        </svg>
        <h3>Онлайн-запись</h3>
        <p>Клиент выбирает время сам — на сайте, в мессенджере или через AI-администратора. Расписание мастеров обновляется мгновенно.</p>
      </div>

      <div class="feature-card reveal">
        <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="m12 4 8 4-8 4-8-4 8-4Z"/>
          <path d="m4 12 8 4 8-4"/>
          <path d="m4 16 8 4 8-4"/>
        </svg>
        <h3>CRM</h3>
        <p>История каждого клиента: какие шины ставили, когда приезжал в последний раз, сколько потратил.</p>
      </div>

      <div class="feature-card reveal">
        <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="9" cy="8" r="3"/>
          <path d="M3.5 19c.7-3 3-5 5.5-5s4.8 2 5.5 5"/>
          <circle cx="17" cy="9" r="2.3"/>
          <path d="M15.2 12.2c2 .3 3.6 2 4.2 4.3"/>
        </svg>
        <h3>Клиенты</h3>
        <p>База контактов с сегментами — постоянные, разовые, забытые. Легко запустить точечную рассылку.</p>
      </div>

      <div class="feature-card reveal">
        <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 10a6 6 0 1 1 12 0c0 4 1.5 5.5 1.5 5.5H4.5S6 14 6 10Z"/>
          <path d="M10 19a2 2 0 0 0 4 0"/>
        </svg>
        <h3>Напоминания</h3>
        <p>Автоматические уведомления о сезонной замене шин и записи на завтра — клиент не забудет и не сорвёт слот.</p>
      </div>

      <div class="feature-card reveal">
        <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 19V15M10 19V10M16 19V6M20 19H4"/>
        </svg>
        <h3>Статистика</h3>
        <p>Выручка, загрузка мастеров, средний чек — в реальном времени, без сведения таблиц вручную.</p>
      </div>
    </div>
  </div>
</section>
```

- [ ] **Step 2: Append feature-grid styles to `styles.css`**

```css
.feature-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 32px;
  margin-top: 56px;
}
.feature-card {
  background: var(--bg-raised);
  border: 1px solid rgba(245, 245, 247, 0.08);
  border-radius: 16px;
  padding: 32px;
}
.feature-card h3 {
  font-size: 1.15rem;
  text-transform: none;
  letter-spacing: 0;
  margin: 20px 0 12px;
}
```

- [ ] **Step 3: Verify in browser**

Reload. Use `preview_snapshot` and confirm all five headings ("Онлайн-запись", "CRM", "Клиенты", "Напоминания", "Статистика") are present. Use `preview_inspect` on `.feature-grid` at desktop width and confirm the computed `grid-template-columns` has more than one column. Use `preview_resize` with `preset: "mobile"` and `preview_screenshot` to confirm cards stack to a single column without overflow.

- [ ] **Step 4: Commit**

```bash
git add index.html styles.css
git commit -m "Add Module 02 (business control)"
```

---

### Task 6: Module 03 — Каналы связи

**Files:**
- Modify: `index.html` (replace `<!-- MODULE-03 -->`)
- Modify: `styles.css` (append channel-icon accent colors)

**Interfaces:**
- Consumes: `.module`, `.feature-grid`, `.feature-card`, `.icon` from Tasks 4–5.
- Produces: nothing later tasks depend on.

- [ ] **Step 1: Replace `<!-- MODULE-03 -->` in `index.html`**

```html
<section class="module" id="modules-03">
  <div class="container">
    <p class="module__number">03</p>
    <h2 class="reveal">КАНАЛЫ СВЯЗИ</h2>
    <p class="module__lede reveal">Одно окно для всех каналов.</p>

    <div class="feature-grid feature-grid--channels">
      <div class="feature-card reveal">
        <svg class="icon icon--whatsapp" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 4a8 8 0 0 0-6.9 12l-1.1 4 4.1-1.1A8 8 0 1 0 12 4Z"/>
          <path d="M8.5 9.5c.3 3 2 4.7 5 5"/>
        </svg>
        <h3>WhatsApp</h3>
        <p>Заявки и переписки из WhatsApp попадают прямо в CRM.</p>
      </div>

      <div class="feature-card reveal">
        <svg class="icon icon--messenger" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 4C6.9 4 3 7.6 3 12c0 2.4 1.2 4.6 3.1 6.1V21l2.8-1.6c1 .3 2 .5 3.1.5 5.1 0 9-3.6 9-8S17.1 4 12 4Z"/>
          <path d="m8 13 3-3.5 2 2 3-3.5"/>
        </svg>
        <h3>Messenger</h3>
        <p>Сообщения из Facebook Messenger обрабатываются AI-администратором наравне с остальными каналами.</p>
      </div>

      <div class="feature-card reveal">
        <svg class="icon icon--instagram" viewBox="0 0 24 24" aria-hidden="true">
          <rect x="4" y="4" width="16" height="16" rx="4"/>
          <circle cx="12" cy="12" r="3.3"/>
          <circle cx="16.2" cy="7.8" r="0.6" style="fill:currentColor;stroke:none"/>
        </svg>
        <h3>Instagram</h3>
        <p>Directs и комментарии из Instagram превращаются в записи на шиномонтаж.</p>
      </div>

      <div class="feature-card reveal">
        <svg class="icon icon--email" viewBox="0 0 24 24" aria-hidden="true">
          <rect x="3.5" y="5.5" width="17" height="13" rx="1.5"/>
          <path d="m4.5 6.5 7.5 6.5 7.5-6.5"/>
        </svg>
        <h3>Email</h3>
        <p>Автоматические письма-напоминания и сводки для клиентов и владельца.</p>
      </div>
    </div>
  </div>
</section>
```

- [ ] **Step 2: Append channel accent colors to `styles.css`**

```css
.icon--whatsapp { color: #25D366; }
.icon--messenger { color: #4FA6FF; }
.icon--instagram { color: #E1306C; }
.icon--email { color: var(--accent); }

.feature-grid--channels {
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}
```

- [ ] **Step 3: Verify in browser**

Reload. Use `preview_snapshot` and confirm "WhatsApp", "Messenger", "Instagram", "Email" headings are present. Use `preview_inspect` on `.icon--whatsapp` and confirm computed `color` is `rgb(37, 211, 102)`. Use `preview_screenshot`.

- [ ] **Step 4: Commit**

```bash
git add index.html styles.css
git commit -m "Add Module 03 (channels)"
```

---

### Task 7: Как это работает (process steps)

**Files:**
- Modify: `index.html` (replace `<!-- HOW-IT-WORKS -->`)
- Modify: `styles.css` (append process-steps styles)

**Interfaces:**
- Consumes: `--mono`, `--accent`, `--fg-muted` from Task 1.
- Produces: nothing later tasks depend on.

- [ ] **Step 1: Replace `<!-- HOW-IT-WORKS -->` in `index.html`**

```html
<section class="process" id="how-it-works">
  <div class="container">
    <h2 class="reveal">КАК ЭТО РАБОТАЕТ</h2>
    <ol class="process__steps">
      <li class="process__step reveal">
        <span class="process__num">01</span>
        <h3>Клиент пишет</h3>
        <p>В любой из каналов: WhatsApp, Instagram, Messenger, Email или на сайте.</p>
      </li>
      <li class="process__step reveal">
        <span class="process__num">02</span>
        <h3>AI отвечает и записывает</h3>
        <p>AI-администратор уточняет детали и бронирует свободный слот у нужного мастера.</p>
      </li>
      <li class="process__step reveal">
        <span class="process__num">03</span>
        <h3>CRM обновляется</h3>
        <p>Карточка клиента, расписание и статистика синхронизируются автоматически.</p>
      </li>
      <li class="process__step reveal">
        <span class="process__num">04</span>
        <h3>Напоминание и аналитика</h3>
        <p>Клиент получает напоминание, а владелец — отчёт от AI-аналитика.</p>
      </li>
    </ol>
  </div>
</section>
```

- [ ] **Step 2: Append process-steps styles to `styles.css`**

```css
.process { padding-block: var(--section-pad); border-bottom: 1px solid rgba(245, 245, 247, 0.08); }
.process__steps {
  list-style: none;
  margin: 56px 0 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 32px;
}
.process__step {
  border-top: 2px solid var(--accent);
  padding-top: 20px;
}
.process__num {
  display: block;
  font-family: var(--mono);
  color: var(--accent);
  font-size: 1.5rem;
  margin-bottom: 12px;
}
.process__step h3 {
  font-size: 1.1rem;
  text-transform: none;
  letter-spacing: 0;
  margin-bottom: 10px;
}

@media (max-width: 860px) {
  .process__steps { grid-template-columns: 1fr; }
}
```

- [ ] **Step 3: Verify in browser**

Reload. Use `preview_snapshot` and confirm all four step headings appear in order ("Клиент пишет" → "AI отвечает и записывает" → "CRM обновляется" → "Напоминание и аналитика"). Use `preview_inspect` on `.process__steps` at desktop width and confirm `grid-template-columns` has 4 tracks. `preview_resize` to mobile and `preview_screenshot` to confirm single-column stacking.

- [ ] **Step 4: Commit**

```bash
git add index.html styles.css
git commit -m "Add how-it-works process section"
```

---

### Task 8: Final CTA + Footer

**Files:**
- Modify: `index.html` (replace `<!-- FINAL-CTA -->` and `<!-- FOOTER -->`)
- Modify: `styles.css` (append final-cta + footer styles)
- Modify: `script.js` (add footer year auto-fill)

**Interfaces:**
- Consumes: `--mono`, `--accent`, `.btn`/`.btn--accent` from Task 1.
- Produces: `#year` element id that `script.js` fills in — no later task depends on this.

- [ ] **Step 1: Replace `<!-- FINAL-CTA -->` in `index.html`**

```html
<section class="final-cta" id="final-cta">
  <div class="container final-cta__inner reveal">
    <h2>ГОТОВЫ ПЕРЕВЕСТИ ШИНОМОНТАЖ<br>НА АВТОПИЛОТ?</h2>
    <p>Подключите TYREOS за один день — без внедрения и обучения персонала.</p>
    <a class="btn btn--accent" href="mailto:hello@tyreos.app?subject=Пробный%20доступ%20TYREOS">Попробовать бесплатно</a>
  </div>
</section>
```

- [ ] **Step 2: Replace `<!-- FOOTER -->` in `index.html`**

```html
<footer class="site-footer">
  <div class="container site-footer__row">
    <a class="logo" href="#top">TYREOS</a>
    <nav class="site-footer__nav">
      <a href="#modules-01">Продукт</a>
      <a href="#modules-02">Возможности</a>
      <a href="#modules-03">Каналы</a>
      <a href="mailto:hello@tyreos.app">hello@tyreos.app</a>
    </nav>
    <p class="site-footer__copy">© <span id="year"></span> TYREOS</p>
  </div>
</footer>
```

- [ ] **Step 3: Append final-cta + footer styles to `styles.css`**

```css
.final-cta {
  padding-block: var(--section-pad);
  text-align: center;
}
.final-cta__inner { max-width: 700px; margin-inline: auto; }
.final-cta p {
  margin: 28px 0 40px;
  font-size: 1.1rem;
}

.site-footer {
  border-top: 1px solid rgba(245, 245, 247, 0.08);
  padding-block: 48px;
}
.site-footer__row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
}
.site-footer__nav {
  display: flex;
  gap: 24px;
  font-family: var(--mono);
  font-size: 0.8rem;
  text-transform: uppercase;
  color: var(--fg-muted);
}
.site-footer__copy {
  font-family: var(--mono);
  font-size: 0.8rem;
  color: var(--fg-muted);
}
```

- [ ] **Step 4: Add footer year auto-fill to `script.js`**

Insert at the top of the existing `DOMContentLoaded` handler in `script.js`:

```js
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
```

- [ ] **Step 5: Verify in browser**

Reload. Use `preview_snapshot` and confirm the final CTA heading and button, and the footer nav links, are present. Use `preview_inspect` on `#year` and confirm its text matches the current year. Use `preview_click` on the final CTA button's parent to confirm the `href` starts with `mailto:hello@tyreos.app`.

- [ ] **Step 6: Commit**

```bash
git add index.html styles.css script.js
git commit -m "Add final CTA and footer"
```

---

### Task 9: GSAP scroll animations (reveal + hero parallax)

**Files:**
- Modify: `script.js` (append GSAP wiring)
- Modify: `styles.css` (no changes expected, listed for completeness — skip if nothing to add)

**Interfaces:**
- Consumes: every `.reveal`-classed element from Tasks 2–8, and `.hero-bg` from Task 2.
- Produces: nothing further downstream — this is the last logic task.

- [ ] **Step 1: Append GSAP wiring to `script.js`**

Add at the end of the `DOMContentLoaded` handler:

```js
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!prefersReducedMotion && typeof gsap !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger);

    document.querySelectorAll('.reveal').forEach((el) => {
      gsap.fromTo(
        el,
        { opacity: 0, y: 40 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: 'power2.out',
          scrollTrigger: { trigger: el, start: 'top 85%' },
        }
      );
    });

    gsap.to('.hero-bg', {
      yPercent: 15,
      ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
    });
  }
```

Note: elements are not hidden by default CSS — if GSAP/CDN fails to load, or `prefers-reduced-motion` is set, `.reveal` elements simply remain at their natural, fully visible state. This satisfies the "no animation-gated visibility" constraint without extra fallback code.

- [ ] **Step 2: Verify in browser**

Reload. Use `preview_eval` with expression `typeof window.gsap` and confirm it returns `"object"` or `"function"` (not `"undefined"`). Scroll down via `preview_eval` (`window.scrollTo(0, 1200)`), wait briefly, then use `preview_inspect` on a `.reveal` element below the fold (e.g. a Module 02 feature card) and confirm computed `opacity` is `1`. Use `preview_screenshot` before and after scrolling to visually confirm the parallax/reveal effect.

- [ ] **Step 3: Commit**

```bash
git add script.js
git commit -m "Wire GSAP scroll-reveal and hero parallax"
```

---

### Task 10: Responsive + accessibility pass

**Files:**
- Modify: `styles.css` (fix any overflow/spacing issues found; add focus/aria refinements)
- Modify: `index.html` (add any missing `aria-*` attributes found missing)

**Interfaces:**
- Consumes: the whole page built by Tasks 1–9.
- Produces: nothing downstream — this is a fix-forward QA task, not a new feature.

- [ ] **Step 1: Sweep three breakpoints**

Use `preview_resize` with `preset: "mobile"` (375×812), then `"tablet"` (768×1024), then `"desktop"` (1280×800). At each, take a `preview_screenshot` of the full scroll (screenshot after scrolling through hero, ticker, all 3 modules, process, final CTA, footer via repeated `preview_eval` `window.scrollTo` calls). Note any horizontal overflow, clipped text, or broken grid — fix the underlying CSS rule directly (there is no separate list to "TBD" here; whatever is found gets fixed in this same task).

- [ ] **Step 2: Verify keyboard/focus behavior**

Use `preview_eval` to confirm `document.activeElement` changes as expected when simulating Tab via `preview_click` on the skip link and each nav link, confirming `:focus-visible` outline is present (`preview_inspect` the focused element for `outline-style: solid`). Confirm the mobile nav-toggle button has `aria-controls="site-nav"` and toggles `aria-expanded` correctly (already added in Task 1 — just verify it still works with the full page assembled).

- [ ] **Step 3: Fix and re-verify**

For each issue found in Steps 1–2, edit the relevant rule in `styles.css` or attribute in `index.html`, reload, and re-check with `preview_inspect`/`preview_screenshot` until resolved.

- [ ] **Step 4: Commit**

```bash
git add index.html styles.css
git commit -m "Fix responsive and accessibility issues found in QA pass"
```

---

### Task 11: Final QA — console, network, full-page review

**Files:**
- Modify: any file, only if an issue is found (no changes expected if the page is clean)

**Interfaces:**
- Consumes: the complete page from Tasks 1–10.

- [ ] **Step 1: Check for runtime errors**

Use `preview_console_logs` with `level: "error"` and confirm it is empty.

- [ ] **Step 2: Check for broken requests**

Use `preview_network` with `filter: "failed"` and confirm it is empty (fonts, GSAP CDN scripts, and `assets/hero-bg.jpg` all resolve with 2xx).

- [ ] **Step 3: Full top-to-bottom screenshot pass**

At desktop width, scroll through the entire page in ~800px increments via `preview_eval` (`window.scrollTo`) and `preview_screenshot` at each increment, confirming every section (header, hero, ticker, Module 01/02/03, how-it-works, final CTA, footer) renders as designed with no overlapping text or unstyled fallback fonts.

- [ ] **Step 4: Fix anything found, otherwise commit**

If Steps 1–3 are clean, no code change is needed. If any issue is found, fix it, reload, and re-verify with the same tool before moving on.

```bash
git add -A
git commit -m "Final QA pass for TYREOS landing page" --allow-empty
```
