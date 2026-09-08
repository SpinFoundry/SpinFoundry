# SpinFoundry — System Memory & Agent Operating Rules

Welcome to the **SpinFoundry** architecture manual. This document serves as the long-term system memory and operational protocol for autonomous AI agents, automated workflows, and human contributors maintaining and expanding the platform.

---

## 1. Executive Summary & Core Philosophy

SpinFoundry is hosted on **Cloudflare Pages** (`spinfoundry.pages.dev`) via GitHub (`SpinFoundry/SpinFoundry`). It operates as a dual-purpose platform:
1. **Personal Micro-App Lab:** Specialized, single-purpose tools for calculations, simulations, utilities, and daily workflows.
2. **SEO & High-Intent Revenue Engine:** Laser-targeted, intent-driven tools generating passive value via niche affiliates, digital tools, and micro-sponsorships.

### Core Infrastructure Invariants

* **100% Client-Side, Zero Runtime Build:** Pure Vanilla HTML5 and ES6 JavaScript. No React, no Vue, no Svelte, no npm/Vite runtime bundling of the site itself. Everything the browser downloads is static, zero-dependency, and instantly executable.
* **Precompiled Styling (Tailwind CLI):** Tailwind CSS is precompiled into a single purged, minified static stylesheet at `/assets/styles.css`. The Tailwind Play CDN (`<script src="https://cdn.tailwindcss.com">`) is **strictly prohibited in production** to protect Core Web Vitals and First Contentful Paint (FCP).
* **Cloudflare Pages Native Routing:** Every tool lives in its own isolated subfolder containing a standalone `index.html` (e.g. `/dough-hydration-calculator/index.html`), accessible at `/dough-hydration-calculator/`.
* **Deterministic Core Logic:** All calculations, conversions, and algorithms execute natively in client-side JavaScript. No approximation, no statistical estimates, and **no AI/LLM in the calculation path**.
* **Sober, Minimalist Aesthetic:** SpinFoundry prioritizes clean, high-contrast, light-mode typography (`bg-neutral-50 text-neutral-900`) and bare-bones, clutter-free utility interfaces. Visual noise, complex nested ribbons, and gratuitous dark-mode neon gradients are avoided in favor of functional elegance and fast task completion.

---

## 2. Repository Layout

```text
/
├── index.html                  # Main Catalog Hub (Directory with search & filter)
├── registry.json               # Single source of truth for all tools and categories
├── sitemap.xml                 # Search engine index — strictly synced with registry.json
├── AGENTS.md                   # System memory & tool registry rules (this file)
├── tailwind.config.js          # Tailwind CLI content scanning configuration
├── assets/
│   ├── input.css               # Tailwind source directives & custom base styles
│   └── styles.css              # Compiled, purged, minified static production CSS
└── [tool-folder-name]/         # Standalone micro-app
    └── index.html              # Self-contained app linking /assets/styles.css
```

---

## 3. Global Categories & Taxonomy

`registry.json` defines the taxonomy for the entire platform. The 8 canonical categories are locked:

| Slug | Category Label | Emoji | Purpose |
| :--- | :--- | :---: | :--- |
| `finance` | Finance & Wealth | 📊 | Compounding, amortization, tax, FIRE, and currency tools |
| `nutrition` | Nutrition & Kitchen | 🥗 | Baker's percentages, macros, fermentation, recipe scaling |
| `conversions` | Measures & Conversions | 📏 | Unit conversions, engineering, geometry, and coordinates |
| `simulations` | Simulations & Physics | 🧪 | Canvas physics, celestial orbits, cellular automata |
| `games` | Mini-Games & Puzzles | 🕹️ | Word games, logic puzzles, retro simulators |
| `coffee-brew` | Coffee & Fermentation | ☕ | Espresso ratios, pour-over extraction, kombucha, brewing |
| `garden` | Home & Garden | 🌿 | Soil amendments, plant spacing, sun angle, compost ratios |
| `dev-tools` | Dev & Design | 🛠️ | Regex testing, CSS gradient generators, color contrast, cron |

---

## 4. The 4-Way Invariant (Adding a Micro-App)

Whenever an agent or contributor adds a new micro-app, the following **4-way synchronization** must occur. Treat any discrepancy between these files as a critical bug:

1. **Standalone Directory:** Create `/[tool-slug]/index.html` linking `/assets/styles.css`.
2. **Registry Entry:** Append the tool object to `registry.json` under `"tools"`.
3. **Static Catalog Hub Card:** In `/index.html`, add the static `<article>` card inside `#toolsGrid` between `<!-- TOOLS_GRID_START -->` and `<!-- TOOLS_GRID_END -->`.
4. **Sitemap Entry:** In `sitemap.xml`, add the `<url>` block pointing to `https://spinfoundry.pages.dev/[tool-slug]/`.

### `registry.json` Tool Schema

```json
{
  "id": "tool-slug-name",
  "title": "Clear, High-Intent Tool Title",
  "description": "Crisp 1-2 sentence description highlighting the specific problem solved.",
  "category": "category-slug",
  "path": "/tool-slug-name/",
  "dateAdded": "YYYY-MM-DD"
}
```

---

## 5. CSS Compilation Protocol

When new Tailwind utility classes are introduced in `/index.html` or any tool subfolder, the static stylesheet `/assets/styles.css` must be recompiled.

Using the standalone Tailwind CLI executable or Node:
```powershell
# Using standalone tailwindcss executable:
tailwindcss.exe -i ./assets/input.css -o ./assets/styles.css --minify

# Or if Node/npx is available:
npx tailwindcss -i ./assets/input.css -o ./assets/styles.css --minify
```

---

## 6. Micro-App Architectural Standards

Every micro-app must implement:
* **Top Navigation Chrome:** Link back to Hub (`← SpinFoundry Hub`), category badge, and GitHub repository link.
* **Full SEO Layer:** `title`, meta `description`, OpenGraph cards, Twitter cards, canonical URL, and JSON-LD `WebApplication` schema.
* **State Persistence:** Inputs must automatically serialize to `localStorage` (scoped with a unique key like `spinfoundry_[tool-slug]`) and restore on page load.
* **Export / Share Utility:** Include a "Copy as text" or "Export" button with responsive clipboard feedback.
* **Contextual Affiliate / Monetization Module:** Beneath primary results, provide 2–4 high-relevance, tasteful affiliate recommendation cards with clear disclosure.
* **Mobile-First Responsiveness:** Fully usable on 360px mobile screens up to 4K desktop displays.
