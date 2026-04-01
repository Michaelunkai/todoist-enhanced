# Lighthouse Audit — Todoist Enhanced

## Live URL

**https://ob-autodeploy.netlify.app**

> Note: The intended production URL is `https://todoist-enhanced-michaelunkai.netlify.app` (pending dedicated Netlify site deployment).

---

## Audit Status

| Category         | Target Score | Last Recorded | Status          |
|------------------|:------------:|:-------------:|:---------------:|
| Performance      | > 80         | ~70           | Below Target    |
| Accessibility    | > 90         | ~80           | Below Target    |
| Best Practices   | > 90         | ~88           | Near Target     |
| PWA              | > 80         | ~35           | Critical Gap    |
| SEO              | > 90         | ~65           | Below Target    |

> **Note:** Scores above are estimated from static code analysis of the actual source files (2026-03-31). The live URL https://ob-autodeploy.netlify.app is the ob workspace landing page — todoist-enhanced has NOT been deployed as a standalone site yet. PWA and SEO scores are critically low because no `manifest.json`, no service worker, and no proper `<title>` / `<meta description>` exist in the current codebase. Run an actual Lighthouse audit via Chrome DevTools or PageSpeed Insights after a dedicated deployment to record live numbers.

---

## Estimated Score Basis (Code Analysis — 2026-03-31)

> Scores are conservative estimates. The live `ob-autodeploy.netlify.app` URL serves the ob workspace, not todoist-enhanced standalone. A dedicated deployment is required for accurate live scores.

### Performance ~70
- Vite 8 tree-shaking and Tailwind CSS 4 purging provide good production bundle sizes
- React 19 concurrent rendering reduces TBT
- **Gap:** Large dependency set (Recharts, dnd-kit, Zustand, React Router) pushes bundle > 250 KB
- **Gap:** No `React.lazy` code-splitting — all routes load upfront, hurting TTI
- **Gap:** No explicit image optimization or WebP conversion pipeline in Vite config

### Accessibility ~80
- dnd-kit provides accessible drag-and-drop (keyboard + ARIA roles)
- Tailwind helps enforce consistent spacing/contrast
- **Gap:** Icon-only action buttons likely missing `aria-label` attributes
- **Gap:** `client/index.html` `<title>` is "client" (default template) — screen readers announce wrong page name
- **Gap:** Form inputs may lack associated `<label>` elements

### Best Practices ~88
- Netlify enforces HTTPS + HTTP/2 by default
- `helmet` middleware sets security headers on Express API
- Vite build surfacing of deprecated APIs at compile time
- **Gap:** `client/index.html` missing `<meta name="description">` and proper title

### PWA ~35
- `manifest.json` in `/public/` has full icon set (72–512 px), `start_url: "/"`, `display: standalone`
- `sw.js` in `/public/` caches shell assets
- **Critical Gap:** The React client (`client/`) uses a separate Vite build with no `vite-plugin-pwa` configured — the service worker and manifest in `/public/` are for the legacy vanilla JS version, not the React SPA
- **Critical Gap:** `client/index.html` has no `<link rel="manifest">` tag — PWA manifest is not linked to the React app
- **Critical Gap:** No `registerServiceWorker` call in `client/src/main.jsx`
- To fix: add `vite-plugin-pwa` to `client/vite.config.js` and configure manifest + SW injection

### SEO ~65
- `client/index.html` has `<html lang="en">` and viewport meta tag
- **Gap:** `<title>client</title>` — default Vite template title; should be "Todoist Enhanced"
- **Gap:** No `<meta name="description">` tag
- **Gap:** No canonical URL tag
- **Gap:** React SPA routing without SSR means search crawlers see a blank `<div id="root">`

---

## Target Metrics

### Performance (> 80)
- **First Contentful Paint (FCP):** < 1.8 s
- **Largest Contentful Paint (LCP):** < 2.5 s
- **Total Blocking Time (TBT):** < 200 ms
- **Cumulative Layout Shift (CLS):** < 0.1
- **Speed Index:** < 3.4 s
- **Time to Interactive (TTI):** < 3.8 s

### Accessibility (> 90)
- All images have `alt` attributes
- Color contrast ratio >= 4.5:1 for normal text
- All interactive elements are keyboard-navigable
- ARIA labels present on icon-only buttons
- Logical heading hierarchy (h1 → h2 → h3)
- Form inputs have associated labels

### Best Practices (> 90)
- HTTPS enforced (Netlify default)
- No deprecated APIs used
- No browser errors in console
- Images use modern formats (WebP/AVIF)
- JS not served with vulnerabilities (npm audit clean)

### PWA (> 80)
- Web App Manifest present (`/manifest.json`)
- Service worker registered and active
- Icons at 192x192 and 512x512 provided
- `start_url` defined in manifest
- App works offline (cached shell)
- Installable prompt fires on supported browsers

---

## How to Run the Audit

### Option A — Chrome DevTools (Recommended)

1. Open Chrome and navigate to **https://ob-autodeploy.netlify.app**
2. Open DevTools: `F12` or `Ctrl+Shift+I`
3. Click the **Lighthouse** tab (may be under the `>>` overflow menu)
4. Select categories: Performance, Accessibility, Best Practices, PWA
5. Set device to **Desktop** for baseline; repeat for **Mobile**
6. Click **Analyze page load**
7. Wait ~30–60 s for the report to generate
8. Screenshot or export the report as JSON/HTML
9. Record scores in the table above and commit

### Option B — Lighthouse CLI

```bash
# Install globally (once)
npm install -g lighthouse

# Run audit and save HTML report
lighthouse https://ob-autodeploy.netlify.app \
  --output html \
  --output-path ./tests/lighthouse-report.html \
  --chrome-flags="--headless"

# Open the report
start tests/lighthouse-report.html
```

### Option C — PageSpeed Insights (Quick check)

Visit: **https://pagespeed.web.dev/report?url=https://ob-autodeploy.netlify.app**

No install required; scores update in ~30 s.

---

## Known Improvement Areas

| Issue | Impact | Fix |
|-------|--------|-----|
| Large JS bundle (React + dependencies) | Performance | Code-split with `React.lazy` / dynamic imports |
| Images served as PNG/JPG | Performance | Convert to WebP via Vite imagetools plugin |
| Service worker scope | PWA | Ensure SW registered at root `/`, not `/client/` |
| Missing `<meta name="description">` | SEO | Add description in `index.html` `<head>` |
| Icon-only action buttons | Accessibility | Add `aria-label` to all icon buttons |

---

## Audit History

| Date       | Device  | Perf | A11y | Best Practices | PWA | SEO | Method               |
|------------|---------|:----:|:----:|:--------------:|:---:|:---:|----------------------|
| 2026-03-31 | N/A     | ~70  | ~80  | ~88            | ~35 | ~65 | Static code analysis |

*Note: Scores above are code-analysis estimates. URL audited (https://ob-autodeploy.netlify.app) is the ob workspace landing page — todoist-enhanced is not yet deployed standalone. Update this table with real Lighthouse scores after a dedicated Netlify site deployment.*

---

## References

- [Lighthouse Scoring Docs](https://developer.chrome.com/docs/lighthouse/performance/performance-scoring/)
- [Web Vitals](https://web.dev/vitals/)
- [PWA Checklist](https://web.dev/pwa-checklist/)
- [Accessibility Audits](https://web.dev/accessibility/)
