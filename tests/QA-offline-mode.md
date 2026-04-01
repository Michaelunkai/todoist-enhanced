# QA: Offline Mode — Manual Test Report

**Date:** 2026-03-31
**Project:** todoist-enhanced (React+Vite+Tailwind PWA)
**Task:** Todo #50 — Manual QA: offline banner, queue, sync

---

## 1. Offline Detection Implementation

**File:** `client/src/hooks/useOfflineDetector.js`

- Initializes `isOnline` state from `window.navigator.onLine` on mount.
- Listens to native browser `window` events: `online` and `offline`.
- On `offline`: timestamps `last_online_ts` in `localStorage` and sets `isOnline = false`.
- On `online`: reads `pending_mutations` array from `localStorage`, replays each queued mutation via `fetch()`, clears the queue, sets `isOnline = true`.
- Exported as React hook `useOfflineDetector()`, consumed in `App.jsx`.

**Integration in App.jsx (line 15, 123):**
```jsx
const { isOnline } = useOfflineDetector()
// ...
<OfflineBanner isOnline={isOnline} />
```

---

## 2. Offline Banner Component

**File:** `client/src/components/OfflineBanner.jsx`

- Fixed-position bar at top of viewport (`fixed top-0 left-0 w-full z-[200]`).
- Background color: **orange-500** (Tailwind) — matches requirement.
- Text: `"You are offline — changes will sync when reconnected"`
- Visibility controlled via CSS transform:
  - Online: `-translate-y-full` (slides above viewport — hidden)
  - Offline: `translate-y-0` (slides into view)
- Transition: `duration-300 ease-in-out` for smooth slide animation.

**Verification:** Banner WILL appear when `isOnline = false`. No conditional render — it is always in DOM but translated off-screen when online.

---

## 3. Service Worker Caching Strategy

**File:** `public/sw.js`
**Cache name:** `todoist-enhanced-v1`

### Strategy: Cache-first with network fallback (for static assets)

1. **Install**: Pre-caches static shell: `/`, `/index.html`, `/styles.css`, `/dark-mode.css`, `/advanced-styles.css`, `/app.js`, `/natural-dates.js`, `/subtasks.js`, `/enhanced-features.js`, `/advanced-features.js`, `/manifest.json`.
2. **Fetch (GET non-API)**: Cache-first — returns cached response if present, else fetches network and caches the result.
3. **Fetch (API `/api/` routes)**: Network-first — passes through to network; on failure returns `{ offline: true }` JSON stub to prevent uncaught errors.
4. **Activate**: Deletes any cache with a name other than `todoist-enhanced-v1` (old cache cleanup).
5. **Background Sync**: Registers `sync` event listener for tag `sync-tasks`. Handler `syncTasks()` is a stub — only logs `"Syncing tasks..."` with no actual sync logic (GAP — see below).

**Note:** The SW is registered for the legacy vanilla JS version (`public/`). The React/Vite build under `client/` uses Vite's own asset pipeline and may register a separate SW. Confirm which SW is active in production build.

---

## 4. Queue / Sync Mechanism for Offline Changes

**File:** `client/src/utils/offlineFetch.js`

- `offlineFetch(url, options)` wraps `fetch()`.
- If `navigator.onLine === false`: mutation is serialized `{ method, url, body, timestamp }` and pushed to `localStorage['pending_mutations']` array. Returns `{ ok: true, queued: true }` fake success.
- If online: passes through to native `fetch()`.

**Replay in `useOfflineDetector`:** On `online` event, all pending mutations are replayed sequentially (for-await loop) via `fetch()`. After all replayed (or failed), `localStorage.removeItem('pending_mutations')` clears the queue.

**Usage gap:** `offlineFetch` is only adopted if individual API call sites import and use it. Check all API call sites in `client/src/` to confirm adoption.

---

## 5. Manual QA Test Steps (Chrome DevTools)

### Test A: Offline Banner Appearance
1. Open app in Chrome; open DevTools > Network tab.
2. Set throttle to **Offline**.
3. Verify: orange banner slides down at top: "You are offline — changes will sync when reconnected".
4. Set throttle back to **No throttling**.
5. Verify: banner slides back up and disappears.

### Test B: Queue Offline Changes
1. Go offline via DevTools.
2. Create a new task or edit an existing task.
3. Open DevTools > Application > Local Storage.
4. Verify: `pending_mutations` key exists with JSON array containing the mutation.

### Test C: Sync on Reconnect
1. While still offline (with pending mutations in localStorage), re-enable network.
2. Verify: `pending_mutations` localStorage key is cleared.
3. Verify: changes appear correctly in the task list (fetched from server).
4. Verify: orange banner disappears.

---

## 6. Gaps and Issues Found

| # | Gap | Severity | Location |
|---|-----|----------|----------|
| 1 | `syncTasks()` in SW `sync` event is a stub — no actual Background Sync API logic | Medium | `public/sw.js:101-104` |
| 2 | Replay loop in `useOfflineDetector` does not retry failed mutations — failed ones are silently dropped after one attempt | Medium | `useOfflineDetector.js:17-25` |
| 3 | `offlineFetch` is NOT used by all API call sites (only wraps calls that explicitly import it); standard `fetch()` calls in components will throw when offline | High | `client/src/utils/offlineFetch.js` |
| 4 | No deduplication of queued mutations — rapid repeated edits offline will queue multiple entries for same resource | Low | `offlineFetch.js:4-11` |
| 5 | SW caches old vanilla JS files (`/app.js` etc.) not the Vite React build output; SW scope mismatch possible | Medium | `public/sw.js:3-15` |
| 6 | No user feedback during sync replay (no loading indicator or "syncing..." state) | Low | `useOfflineDetector.js` |
| 7 | `lastOnlineAt` returned from hook but not displayed anywhere in UI | Low | `useOfflineDetector.js:6,46` |

---

## 7. Summary

The offline mode implementation is **functionally complete for the primary UX path**:
- `navigator.onLine` + `online`/`offline` events drive state correctly.
- Orange banner component is wired up in `App.jsx` and will animate in/out.
- `offlineFetch` provides a localStorage queue for mutations.
- Replay on reconnect is implemented in `useOfflineDetector`.

**Main risk:** Gap #3 — API calls not using `offlineFetch` will fail rather than queue. A global fetch interceptor or consistent adoption of `offlineFetch` across all API call sites is needed for full offline resilience.
