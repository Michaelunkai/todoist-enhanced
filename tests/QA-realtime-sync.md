# QA: Real-Time Sync (SSE / Multi-Tab) — Manual Test Report

**Date:** 2026-03-31
**Project:** todoist-enhanced (Node.js + Express + SQLite, port 3456)
**Task:** Todo #64 — Test real-time sync across two browser tabs

---

## 1. SSE Implementation Audit

### Finding: No SSE Endpoint Exists

A thorough code audit of the entire project confirms **no Server-Sent Events (SSE) implementation is present**.

Searches performed:
- Pattern `EventSource|sse|SSE|text/event-stream|emit|broadcast` across all `.js`, `.jsx`, `.ts`, `.tsx` files
- Direct HTTP probe of common SSE endpoint patterns:
  - `GET /api/events` → 401 (route exists but requires auth, not SSE)
  - `GET /sse` → 404 (not found)
  - `GET /api/stream` → 401 (not SSE route)

**SSE Endpoint URL:** NONE — not implemented.

---

## 2. Current Real-Time Update Strategy

The app uses **manual fetch-on-demand** (pull model, not push):

### Client-side (App.jsx)
```js
// Fetch all tasks once on mount
const fetchTasks = useCallback(async () => {
  const res = await fetch(`${API_BASE}/api/tasks`)
  if (res.ok) {
    const data = await res.json()
    setTasks(data)
  }
}, [])

useEffect(() => {
  fetchTasks()
}, [fetchTasks])

// Re-fetch after creating a task
const handleQuickAddSubmit = async (taskData) => {
  // ... POST /api/tasks ...
  if (res.ok) {
    fetchTasks()  // manual refresh in THIS tab only
  }
}
```

### Server-side (routes/tasks.js)
- `POST /api/tasks` creates a task and returns it in the response body.
- No broadcast, no emit, no connected-clients registry.

---

## 3. Multi-Tab Sync Test Results

### Test: Create task in Tab 1, observe Tab 2

| Step | Expected (with SSE) | Actual Result |
|------|---------------------|---------------|
| Open app in Tab 1 | Tasks load | Tasks load on mount |
| Open same app URL in Tab 2 | Tasks load | Tasks load on mount |
| Create task in Tab 1 | Tab 2 updates within 2s | **FAIL** — Tab 2 does NOT update |
| Wait 60s | Tab 2 auto-refreshes | **FAIL** — No polling, no auto-refresh |
| Manually reload Tab 2 (F5) | N/A | Tab 2 shows new task after reload |

**Result: Real-time cross-tab sync is NOT functional.** A task created in Tab 1 only appears in Tab 2 after a manual page reload.

---

## 4. Expected vs Actual Sync Latency

| Metric | Expected (SSE) | Actual (current) |
|--------|---------------|------------------|
| Cross-tab sync latency | < 2 seconds | Never (manual reload required) |
| Polling interval | N/A (push) | No polling configured |
| Same-tab update after create | Immediate | Immediate (local fetchTasks() call) |

---

## 5. Events Emitted

**No SSE events are emitted.** The following events would need to be implemented for real-time sync:

| Event Name (proposed) | Trigger |
|-----------------------|---------|
| `task-created` | POST /api/tasks succeeds |
| `task-updated` | PUT /api/tasks/:id succeeds |
| `task-deleted` | DELETE /api/tasks/:id succeeds |
| `task-completed` | PUT /api/tasks/:id with completed=true |

---

## 6. What Would Be Required to Implement SSE

### Server (server.js / new route)
```js
// Connected SSE clients registry
const clients = new Map()  // userId -> [res, ...]

// SSE endpoint
app.get('/api/events', authMiddleware, (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders()

  const userId = req.user.id
  if (!clients.has(userId)) clients.set(userId, [])
  clients.get(userId).push(res)

  req.on('close', () => {
    const conns = clients.get(userId) || []
    clients.set(userId, conns.filter(c => c !== res))
  })
})

// Broadcast helper (call from tasks route after mutation)
function broadcastToUser(userId, event, data) {
  const conns = clients.get(userId) || []
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
  conns.forEach(res => res.write(payload))
}
```

### Client (App.jsx)
```js
useEffect(() => {
  const es = new EventSource(`${API_BASE}/api/events`, { withCredentials: true })
  es.addEventListener('task-created', (e) => {
    const { task } = JSON.parse(e.data)
    setTasks(prev => [...prev, task])
  })
  es.addEventListener('task-updated', (e) => {
    const { task } = JSON.parse(e.data)
    setTasks(prev => prev.map(t => t.id === task.id ? task : t))
  })
  es.addEventListener('task-deleted', (e) => {
    const { id } = JSON.parse(e.data)
    setTasks(prev => prev.filter(t => t.id !== id))
  })
  return () => es.close()
}, [])
```

---

## 7. Server Status at Time of Test

```
GET http://localhost:3456/api/health
→ {"status":"ok","timestamp":"...","version":"1.0.0"}
Server: RUNNING on port 3456
```

---

## 8. Summary

- **SSE is NOT implemented** in this project.
- The app uses manual pull: `fetchTasks()` is called on mount and after the local user creates/modifies a task.
- **Two-tab sync does not work** — tasks created in Tab 1 are invisible in Tab 2 until a manual reload.
- The architecture is otherwise SSE-ready (Express server, single SQLite DB, auth middleware available).
- Estimated implementation effort: ~2-3 hours to add `/api/events` endpoint and client-side EventSource listeners.
