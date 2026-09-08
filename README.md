# SpinFoundry ⚡

> **Zero-Overhead, 100% Client-Side Micro-App Lab & High-Intent Calculation Engine.**  
> Hosted on [Cloudflare Pages](https://spinfoundry.pages.dev) via GitHub [`SpinFoundry/SpinFoundry`](https://github.com/SpinFoundry/SpinFoundry).

---

## 🎯 Philosophy

* **100% Client-Side & Zero Runtime Build:** Pure Vanilla HTML5 and ES6 JavaScript. No React, no Vue, no client-side npm/Vite runtime bundles. Instant FCP, near-instant TTFB, and zero tracking scripts.
* **Precompiled Tailwind CSS:** Compiled and purged down to a single minified `/assets/styles.css` file via Tailwind CLI. No Tailwind Play CDN in production.
* **Cloudflare Pages Native:** Each tool resides in its own isolated subfolder containing a standalone `index.html` (e.g., `/dough-hydration-calculator/index.html`).
* **Deterministic Core Logic:** All calculations, simulations, and algorithms run strictly in native browser JavaScript without approximations or AI in the calculation path.

---

## 📂 Repository Structure

```text
/
├── index.html                  # Main Catalog Hub (Directory with search & filter)
├── registry.json               # Single source of truth for all tools and categories
├── sitemap.xml                 # Search engine index — strictly synced with registry.json
├── AGENTS.md                   # System memory & tool registry rules
├── tailwind.config.js          # Tailwind configuration
├── assets/
│   ├── input.css               # Tailwind source
│   └── styles.css              # Compiled, purged, minified static CSS
└── dough-hydration-calculator/ # Inaugural Micro-App
    └── index.html              # Baker's Percentage & True Hydration Calculator
```

---

## 🛠️ Live Tools

| Tool | Category | URL | Description |
| :--- | :--- | :--- | :--- |
| **Baker's Percentage & True Hydration** | 🥗 Nutrition & Kitchen | [`/dough-hydration-calculator/`](https://spinfoundry.pages.dev/dough-hydration-calculator/) | Formulate bread recipes with true-hydration math for sourdough starters. |

---

## 🚀 Adding New Micro-Apps

SpinFoundry enforces a strict **4-way synchronization** invariant for all new tools:
1. Create isolated folder `/[tool-id]/index.html` referencing `/assets/styles.css`.
2. Add tool entry to `registry.json`.
3. Add the static HTML card into `/index.html` inside `#toolsGrid` between `<!-- TOOLS_GRID_START -->` and `<!-- TOOLS_GRID_END -->`.
4. Add the canonical URL to `sitemap.xml`.
5. Recompile CSS if new utility classes were introduced:
   ```bash
   tailwindcss -i ./assets/input.css -o ./assets/styles.css --minify
   ```

For detailed specifications, refer to [AGENTS.md](./AGENTS.md).

---

## 📄 License

MIT © 2026 SpinFoundry
