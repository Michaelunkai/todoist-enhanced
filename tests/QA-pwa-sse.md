# QA: PWA + SSE Verification — Todos #71-74

**Date:** 2026-03-31
**Project:** todoist-enhanced (React+Vite+Tailwind, Node/Express backend)
**Tasks:** #71 Manifest/SW verify | #72 PWA install | #73 Offline mode | #74 SSE/real-time
**Deployment status:** App not deployed to standalone Netlify site; legacy vanilla build at `https://ob-autodeploy.netlify.app`. React/Vite client runs locally on port 5173 against API on port 3456.

---

## Todo #71 — Manifest.json & Service Worker Audit

### manifest.json — Field Audit

**File:** `public/manifest.json`

| Field | Value | Status |
|-------|-------|--------|
| `name` | `"Todoist Enhanced"` | PASS |
| `short_name` | `"Todoist+"` | PASS |
| `description` | `"Ultimate task manager with enhanced features"` | PASS |
| `start_url` | `"/"` | PASS |
| `display` | `"standalone"` | PASS |
| `background_color` | `"#fafafa"` | PASS |
| `theme_color` | `"#db4c3f"` (Todoist red) | PASS |
| `orientation` | `"any"` | PASS |
| `categories` | `["productivity", "utilities"]` | PASS |
| `icons` | 8 sizes: 72, 96, 128, 144, 152, 192, 384, 512 | PASS (count) |
| `icons[192].purpose` | `"any maskable"` | PASS |
| `shortcuts` | 2 entries: "Add Task" (`/?action=add`), "Today" (`/?view=today`) | PASS |

**PWA minimum icon requirements:** 192x192 and 512x512 — both present. PASS.

**Critical gaps:**
- `public/icons/` directory contains only `favicon.svg` and `icons.svg` — **no PNG icon files exist** (icon-72.png through icon-512.png are all missing). The manifest references 8 PNG files that are absent. Browser will fail to load icons; PWA installability prompt will fire but icons will be broken/fallback.
- Shortcut icons (`icons/add-task.png`, `icons/today.png`) also missing.
- The manifest lives in `public/` (vanilla JS build root), not in `client/public/` (React/Vite build root). The React app's `client/index.html` does NOT link to any manifest. The React app is therefore **not PWA-connected** — no `<link rel="manifest">` tag exists.

### Service Worker Audit

**File:** `public/sw.js`
**Cache name:** `todoist-enhanced-v1`

**Strategy:** Cache-first with network fallback for static assets; network-first with offline JSON stub for `/api/` routes.

| Feature | Status |
|---------|--------|
| Install — pre-cache static shell | Implemented |
| Fetch — cache-first (non-API GET) | Implemented |
| Fetch — network-first (API routes) | Implemented |
| Activate — old cache cleanup | Implemented |
| Background Sync (`sync-tasks` tag) | Stub only — `syncTasks()` logs but does nothing |
| SW registration in React app | NOT registered — `client/index.html` has no SW registration |
| SW registration in vanilla app | `public/index.html` registers SW (legacy build) |

**Verdict #71:** The manifest.json is structurally complete and all required PWA fields are present. However, the app is functionally NOT connected as a PWA in the React/Vite build — the manifest and SW belong to the legacy vanilla build only. Icon PNG files are missing from disk, which would break the install icon display.

---

## Todo #72 — PWA Install Assessment

### Installability Criteria Check

| Criterion | Met? | Notes |
|-----------|------|-------|
| HTTPS (or localhost) | Yes (Netlify HTTPS / localhost) | |
| Valid manifest with `name`, `start_url`, `display:standalone` | Yes (manifest fields valid) | |
| Service worker registered | **No** (React build has no SW) | Only vanilla build has SW |
| Manifest linked in HTML | **No** (React `index.html` has no `<link rel="manifest">`) | |
| Icons 192x192 + 512x512 referenced | Yes (in manifest) | But PNG files are missing from disk |
| `start_url` reachable | Yes (`"/"`) | |

### PWA Install Test Result (Code-Review Verdict)

**FAIL — App is not installable in its current React/Vite state.**

- The React/Vite build (`client/`) has no manifest link and no SW registration. Chrome DevTools Application panel would show no manifest and no service worker for this version.
- The legacy vanilla build (`public/`) has both, but missing icon PNGs means Chrome's install prompt would show a blank/broken icon.
- To make the React app installable, `vite-plugin-pwa` must be added to `client/vite.config.js` OR `client/index.html` needs `<link rel="manifest" href="/manifest.json">` + manual SW registration in `main.jsx`.

---

## Todo #73 — Offline Mode Assessment

### Service Worker Caching — Offline Shell Coverage

**Cached URLs (from `public/sw.js` install list):**
```
/ | /index.html | /styles.css | /dark-mode.css | /advanced-styles.css
/app.js | /natural-dates.js | /subtasks.js | /enhanced-features.js
/advanced-features.js | /manifest.json
```

These map to the **vanilla JS build** (`public/`), not the React/Vite build.

**React build offline behavior:**
- No Vite PWA plugin configured (`client/vite.config.js` has only `tailwindcss()` and `react()` plugins).
- No SW registration in `client/src/main.jsx`.
- React build assets (hashed JS/CSS chunks) are NOT pre-cached.
- Result: React app has **no offline support** — DevTools Network → Offline would show a blank/error page.

### Offline Detection in React App

The React app does implement client-side offline detection:
- `client/src/hooks/useOfflineDetector.js` — uses `navigator.onLine` + `window` `online`/`offline` events.
- `client/src/components/OfflineBanner.jsx` — orange fixed banner slides in when offline.
- `client/src/utils/offlineFetch.js` — queues mutations to `localStorage['pending_mutations']` when offline; replays on reconnect.

**Gap:** `offlineFetch` is not universally adopted — components using raw `fetch()` will throw when offline rather than queue.

### DevTools Network → Offline Simulation Result (Code-Review Verdict)

| Scenario | Vanilla Build (`public/`) | React Build (`client/`) |
|----------|--------------------------|------------------------|
| SW registered | Yes | No |
| Shell served from cache when offline | Yes (if SW installed first) | No — blank page |
| Offline banner shown | N/A (no React in vanilla) | Yes (OfflineBanner component works) |
| API calls while offline | Returns `{ offline: true }` JSON stub | Throws (unless offlineFetch used) |

**Verdict #73:** Vanilla build has functional offline shell caching. React/Vite build has offline UX (banner + queue) but NO service worker — the shell is NOT cached and offline mode would show an error page in the React app.

---

## Todo #74 — SSE / Real-Time Multi-Tab Sync Assessment

**Reference:** See `tests/QA-realtime-sync.md` (detailed audit from Todo #64).

### SSE Implementation Status

**Result: SSE is NOT implemented.**

Code audit of all `.js`, `.jsx`, `.ts`, `.tsx` files across `client/src/`, `routes/`, `server.js`, and `middleware/` confirmed zero occurrences of:
- `EventSource`
- `text/event-stream`
- `SSE` / `sse`
- `emit` (broadcast pattern)
- `connected clients` registry

### Current Update Strategy

- **Pull model only:** `fetchTasks()` called on component mount and after local mutations.
- No polling interval configured.
- No WebSocket connection.
- No BroadcastChannel for cross-tab communication.

### Multi-Tab Sync Test (Code-Review Verdict)

| Step | Expected (SSE) | Actual |
|------|---------------|--------|
| Tab 1: create task | POST succeeds, Tab 1 updates | Tab 1 updates (local fetchTasks()) |
| Tab 2: receive update within 2s | PASS | **FAIL** — no push mechanism |
| Tab 2: auto-refresh without manual reload | PASS | **FAIL** — no polling |
| Tab 2: shows task after F5 reload | N/A | PASS — fetches fresh on mount |

**Verdict #74:** Cross-tab real-time sync does not work. Task created in Tab 1 is invisible in Tab 2 until manual page reload. SSE is architecturally feasible (Express server, single DB) but not implemented. Estimated implementation effort: 2-3 hours (see QA-realtime-sync.md §6 for proposed implementation).

---

## Summary Table

| Todo | Feature | Status | Blocking Issue |
|------|---------|--------|----------------|
| #71 | manifest.json fields | PASS (all required fields present) | Icon PNGs missing from disk; manifest not linked in React build |
| #71 | Service worker | PARTIAL — vanilla build only | Not registered in React/Vite build |
| #72 | PWA installability | FAIL | No manifest link + no SW in React app |
| #73 | Offline shell (SW cache) | FAIL (React build) / PASS (vanilla) | No Vite PWA plugin; React build not cached |
| #73 | Offline banner + queue | PASS (code correct) | offlineFetch not universally adopted |
| #74 | SSE / real-time sync | FAIL | SSE not implemented anywhere in codebase |

---

## Recommended Fixes (Priority Order)

1. **Add `vite-plugin-pwa` to `client/vite.config.js`** — auto-generates manifest link, SW registration, and pre-caches Vite build assets. Resolves #71, #72, #73 for React build.
2. **Generate icon PNG files** — run `sharp` or similar to produce all 8 sizes from an SVG source. Place in `client/public/icons/`.
3. **Add `<link rel="manifest" href="/manifest.json">` to `client/index.html`** — minimum fix for manifest linking.
4. **Implement SSE endpoint** — `GET /api/events` with client registry + broadcast after task mutations. Add `EventSource` in `App.jsx`. Resolves #74.
5. **Adopt `offlineFetch` globally** — replace raw `fetch()` calls in all components with `offlineFetch()` for full offline queue coverage.
