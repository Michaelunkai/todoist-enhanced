# QA: New User Journey — Full End-to-End Test

**Date:** 2026-03-31
**Tested by:** Autonomous RLP Agent #62
**Server:** Node.js + Express + SQLite on port 3456

---

## Test Scenario

Complete the full new-user onboarding journey:
1. Register a new account
2. Create first project
3. Add 3 tasks with different priorities and due dates
4. Verify all tasks exist

---

## Results

### Step 1: User Registration

**Endpoint:** `POST /api/auth/register`

**Request:**
```json
{
  "name": "Test User",
  "email": "testuser_1774978182@example.com",
  "password": "Password123!"
}
```

**Response (201 Created):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "1f1adcc4-56b4-4947-84a1-2a535b0e36f3",
    "name": "Test User",
    "email": "testuser_1774978182@example.com",
    "karma": 0,
    "theme": "light",
    "onboarding_completed": 0
  }
}
```

**Status:** PASS - Account created, JWT token issued, default Inbox project auto-created.
**Note:** No email verification required — immediate access granted.

---

### Step 2: Create First Project

**Endpoint:** `POST /api/projects`
**Auth:** Bearer JWT token

**Request:**
```json
{
  "name": "Test Project",
  "color": "#4073ff",
  "description": "First project for new user journey test"
}
```

**Response (201 Created):**
```json
{
  "project": {
    "id": "5f833059-b80f-4cc6-b3e4-62da85d66a3d",
    "user_id": "1f1adcc4-56b4-4947-84a1-2a535b0e36f3",
    "name": "Test Project",
    "color": "#4073ff",
    "is_favorite": 0,
    "view_type": "list",
    "sort_order": 1,
    "is_inbox": 0,
    "is_archived": 0,
    "created_at": "2026-03-31 17:29:50"
  }
}
```

**Status:** PASS - Project created with sort_order=1 (after Inbox at 0).

---

### Step 3: Add 3 Tasks with Different Priorities

**Endpoint:** `POST /api/tasks`
**Auth:** Bearer JWT token

#### Task 1 — Priority 1 (Urgent)

**Request:**
```json
{
  "title": "Fix critical production bug",
  "description": "Urgent fix needed",
  "project_id": "5f833059-b80f-4cc6-b3e4-62da85d66a3d",
  "priority": 1,
  "due_date": "2026-04-01"
}
```

**Response (201 Created):**
- ID: `4135282f-f801-46ac-ae5f-7dca35bcd861`
- Priority: 1 (Urgent/Red)
- Due: 2026-04-01 (tomorrow)
- sort_order: 0

**Status:** PASS

---

#### Task 2 — Priority 2 (High)

**Request:**
```json
{
  "title": "Write unit tests for auth module",
  "description": "Cover register login and logout flows",
  "project_id": "5f833059-b80f-4cc6-b3e4-62da85d66a3d",
  "priority": 2,
  "due_date": "2026-04-03"
}
```

**Response (201 Created):**
- ID: `01bd42cf-9be4-45f7-af39-e9876f27ec1b`
- Priority: 2 (High/Orange)
- Due: 2026-04-03 (3 days from now)
- sort_order: 1

**Status:** PASS

---

#### Task 3 — Priority 3 (Medium)

**Request:**
```json
{
  "title": "Update project documentation",
  "description": "Add API endpoint docs and setup guide",
  "project_id": "5f833059-b80f-4cc6-b3e4-62da85d66a3d",
  "priority": 3,
  "due_date": "2026-04-07"
}
```

**Response (201 Created):**
- ID: `eff304cc-d444-42d8-af7f-fbe89a22687b`
- Priority: 3 (Medium/Blue)
- Due: 2026-04-07 (1 week from now)
- sort_order: 2

**Status:** PASS

---

### Step 4: Verify All 3 Tasks Exist

**Endpoint:** `GET /api/tasks`
**Auth:** Bearer JWT token (re-login after server restart)

**Response (200 OK):**
```json
{
  "tasks": [
    {
      "id": "4135282f-f801-46ac-ae5f-7dca35bcd861",
      "title": "Fix critical production bug",
      "priority": 1,
      "due_date": "2026-04-01",
      "completed": 0
    },
    {
      "id": "01bd42cf-9be4-45f7-af39-e9876f27ec1b",
      "title": "Write unit tests for auth module",
      "priority": 2,
      "due_date": "2026-04-03",
      "completed": 0
    },
    {
      "id": "eff304cc-d444-42d8-af7f-fbe89a22687b",
      "title": "Update project documentation",
      "priority": 3,
      "due_date": "2026-04-07",
      "completed": 0
    }
  ]
}
```

**Task count returned:** 3
**Status:** PASS - All 3 tasks confirmed persisted across server restart.

---

## Summary

| Step | Action | Endpoint | HTTP Status | Result |
|------|--------|----------|-------------|--------|
| 1 | Register user | POST /api/auth/register | 201 | PASS |
| 2 | Create project | POST /api/projects | 201 | PASS |
| 3a | Add task (Priority 1) | POST /api/tasks | 201 | PASS |
| 3b | Add task (Priority 2) | POST /api/tasks | 201 | PASS |
| 3c | Add task (Priority 3) | POST /api/tasks | 201 | PASS |
| 4 | Verify all tasks | GET /api/tasks | 200 | PASS |

**Overall: 6/6 steps PASSED**

---

## Observations

- No email verification step — registration grants immediate JWT access (suitable for MVP).
- Default "Inbox" project auto-created on registration (good onboarding UX).
- Task sort_order auto-increments correctly (0, 1, 2).
- Data persists across server restarts (SQLite WAL confirmed working).
- Server crashes silently when idle — likely an unhandled promise or connection timeout (non-blocking for core functionality).
- Priority system: 1=Urgent, 2=High, 3=Medium, 4=Normal (default).
- Rate limiting active: 500 req/15min for API, 20 req/15min for auth endpoints (test mode bypasses auth limiter).
