import { test, expect, request, APIRequestContext } from '@playwright/test';

/**
 * E2E Task Lifecycle Tests
 *
 * Covers:
 *  1. Register + login via API to obtain a JWT token
 *  2. Create a new task (via UI quick-add modal AND via API)
 *  3. Verify task appears in the task list (API)
 *  4. Edit the task title (API PATCH/PUT)
 *  5. Mark the task as complete (API PUT)
 *  6. Verify completed state (API GET, completed=true)
 *  7. Delete the task (API DELETE)
 *  8. Verify task is removed from the list (API GET returns 404 / not in list)
 *
 * The backend runs on http://localhost:3456
 * The frontend Vite dev server runs on http://localhost:5173
 */

const API_BASE = 'http://localhost:3456';

// Unique test user per run to avoid conflicts
const TEST_EMAIL = `e2e_tasks_${Date.now()}@test.example`;
const TEST_PASSWORD = 'TestPass123!';
const TEST_NAME = 'E2E Tasks User';

interface TaskResponse {
  task: {
    id: string;
    title: string;
    completed: number | boolean;
    description?: string;
    priority?: number;
    due_date?: string | null;
  };
}

interface TaskListResponse {
  tasks: Array<{
    id: string;
    title: string;
    completed: number | boolean;
  }>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function registerAndLogin(apiCtx: APIRequestContext): Promise<string> {
  // Register a fresh user
  const reg = await apiCtx.post(`${API_BASE}/api/auth/register`, {
    data: { name: TEST_NAME, email: TEST_EMAIL, password: TEST_PASSWORD },
  });
  if (!reg.ok()) {
    // If already registered from a previous aborted run, just login
    const login = await apiCtx.post(`${API_BASE}/api/auth/login`, {
      data: { email: TEST_EMAIL, password: TEST_PASSWORD },
    });
    expect(login.ok()).toBeTruthy();
    const body = await login.json();
    return body.token as string;
  }
  const body = await reg.json();
  return body.token as string;
}

// ---------------------------------------------------------------------------
// Suite: Full task lifecycle via API
// ---------------------------------------------------------------------------

test.describe('Task CRUD lifecycle (API)', () => {
  let apiCtx: APIRequestContext;
  let token: string;
  let taskId: string;

  test.beforeAll(async ({ playwright }) => {
    apiCtx = await playwright.request.newContext();
    token = await registerAndLogin(apiCtx);
  });

  test.afterAll(async () => {
    await apiCtx.dispose();
  });

  // -------------------------------------------------------------------------
  // 1. Create a new task
  // -------------------------------------------------------------------------
  test('01 - create a new task', async () => {
    const res = await apiCtx.post(`${API_BASE}/api/tasks`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        title: 'My E2E Test Task',
        description: 'Created by Playwright e2e test',
        priority: 2,
      },
    });

    expect(res.status()).toBe(201);
    const body: TaskResponse = await res.json();
    expect(body.task).toBeDefined();
    expect(body.task.title).toBe('My E2E Test Task');
    expect(body.task.completed).toBeFalsy();

    // Store id for subsequent tests
    taskId = body.task.id;
    expect(taskId).toBeTruthy();
  });

  // -------------------------------------------------------------------------
  // 2. Verify task appears in the task list
  // -------------------------------------------------------------------------
  test('02 - task appears in list after creation', async () => {
    expect(taskId).toBeTruthy();

    const res = await apiCtx.get(`${API_BASE}/api/tasks`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.ok()).toBeTruthy();
    const body: TaskListResponse = await res.json();
    expect(body.tasks).toBeDefined();

    const found = body.tasks.find((t) => t.id === taskId);
    expect(found).toBeDefined();
    expect(found!.title).toBe('My E2E Test Task');
  });

  // -------------------------------------------------------------------------
  // 3. Edit (update) the task title
  // -------------------------------------------------------------------------
  test('03 - edit task title', async () => {
    expect(taskId).toBeTruthy();

    const res = await apiCtx.put(`${API_BASE}/api/tasks/${taskId}`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { title: 'My E2E Test Task - Edited' },
    });

    expect(res.ok()).toBeTruthy();
    const body: TaskResponse = await res.json();
    expect(body.task.title).toBe('My E2E Test Task - Edited');
  });

  // -------------------------------------------------------------------------
  // 4. Verify edited title persists in list
  // -------------------------------------------------------------------------
  test('04 - edited title reflected in task list', async () => {
    expect(taskId).toBeTruthy();

    const res = await apiCtx.get(`${API_BASE}/api/tasks`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.ok()).toBeTruthy();
    const body: TaskListResponse = await res.json();
    const found = body.tasks.find((t) => t.id === taskId);
    expect(found).toBeDefined();
    expect(found!.title).toBe('My E2E Test Task - Edited');
  });

  // -------------------------------------------------------------------------
  // 5. Mark the task as complete
  // -------------------------------------------------------------------------
  test('05 - mark task as complete', async () => {
    expect(taskId).toBeTruthy();

    const res = await apiCtx.put(`${API_BASE}/api/tasks/${taskId}`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { completed: true },
    });

    expect(res.ok()).toBeTruthy();
    const body: TaskResponse = await res.json();
    // Backend stores completed as integer 1 or boolean true
    expect(body.task.completed == 1 || body.task.completed === true).toBeTruthy();
  });

  // -------------------------------------------------------------------------
  // 6. Verify task shows in completed state
  // -------------------------------------------------------------------------
  test('06 - completed task appears in completed filter', async () => {
    expect(taskId).toBeTruthy();

    // Query only completed tasks
    const res = await apiCtx.get(`${API_BASE}/api/tasks?completed=true`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.ok()).toBeTruthy();
    const body: TaskListResponse = await res.json();
    const found = body.tasks.find((t) => t.id === taskId);
    expect(found).toBeDefined();
    expect(found!.completed == 1 || found!.completed === true).toBeTruthy();
  });

  // -------------------------------------------------------------------------
  // 7. Verify task does NOT appear in active (incomplete) list
  // -------------------------------------------------------------------------
  test('07 - completed task absent from active tasks list', async () => {
    expect(taskId).toBeTruthy();

    const res = await apiCtx.get(`${API_BASE}/api/tasks?completed=false`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.ok()).toBeTruthy();
    const body: TaskListResponse = await res.json();
    const found = body.tasks.find((t) => t.id === taskId);
    expect(found).toBeUndefined();
  });

  // -------------------------------------------------------------------------
  // 8. Fetch individual task by ID — should be completed
  // -------------------------------------------------------------------------
  test('08 - fetch task by id shows completed state', async () => {
    expect(taskId).toBeTruthy();

    const res = await apiCtx.get(`${API_BASE}/api/tasks/${taskId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.ok()).toBeTruthy();
    const body: TaskResponse = await res.json();
    expect(body.task.completed == 1 || body.task.completed === true).toBeTruthy();
  });

  // -------------------------------------------------------------------------
  // 9. Delete the task
  // -------------------------------------------------------------------------
  test('09 - delete task', async () => {
    expect(taskId).toBeTruthy();

    const res = await apiCtx.delete(`${API_BASE}/api/tasks/${taskId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.message).toContain('deleted');
  });

  // -------------------------------------------------------------------------
  // 10. Verify task is removed (404 on direct fetch)
  // -------------------------------------------------------------------------
  test('10 - deleted task returns 404', async () => {
    expect(taskId).toBeTruthy();

    const res = await apiCtx.get(`${API_BASE}/api/tasks/${taskId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status()).toBe(404);
  });

  // -------------------------------------------------------------------------
  // 11. Verify task absent from full list
  // -------------------------------------------------------------------------
  test('11 - deleted task absent from task list', async () => {
    expect(taskId).toBeTruthy();

    // completed=true would include it if soft-deleted; we check both
    const res = await apiCtx.get(`${API_BASE}/api/tasks?completed=true`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.ok()).toBeTruthy();
    const body: TaskListResponse = await res.json();
    const found = body.tasks.find((t) => t.id === taskId);
    expect(found).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Suite: UI quick-add modal task creation
// ---------------------------------------------------------------------------

test.describe('Task creation via UI quick-add modal', () => {
  let apiCtx: APIRequestContext;
  let token: string;

  test.beforeAll(async ({ playwright }) => {
    apiCtx = await playwright.request.newContext();
    // Use same test user — re-login if already exists
    try {
      const reg = await apiCtx.post(`${API_BASE}/api/auth/register`, {
        data: {
          name: TEST_NAME + '_ui',
          email: `ui_${TEST_EMAIL}`,
          password: TEST_PASSWORD,
        },
      });
      if (reg.ok()) {
        const b = await reg.json();
        token = b.token;
      } else {
        const login = await apiCtx.post(`${API_BASE}/api/auth/login`, {
          data: { email: `ui_${TEST_EMAIL}`, password: TEST_PASSWORD },
        });
        const b = await login.json();
        token = b.token;
      }
    } catch {
      // fallback: try login
      const login = await apiCtx.post(`${API_BASE}/api/auth/login`, {
        data: { email: `ui_${TEST_EMAIL}`, password: TEST_PASSWORD },
      });
      const b = await login.json();
      token = b.token;
    }
  });

  test.afterAll(async () => {
    await apiCtx.dispose();
  });

  test('quick-add modal opens via Add Task button', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // TopBar has an "Add Task" button — click it
    const addBtn = page.getByRole('button', { name: /add task/i });
    await addBtn.click();

    // Modal should be visible
    const modal = page.getByRole('dialog', { name: /quick add task/i });
    await expect(modal).toBeVisible();
  });

  test('quick-add modal closes on Escape', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const addBtn = page.getByRole('button', { name: /add task/i });
    await addBtn.click();

    const modal = page.getByRole('dialog', { name: /quick add task/i });
    await expect(modal).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible();
  });

  test('quick-add modal submits task and shows toast', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Open modal
    const addBtn = page.getByRole('button', { name: /add task/i });
    await addBtn.click();

    const modal = page.getByRole('dialog', { name: /quick add task/i });
    await expect(modal).toBeVisible();

    // Fill in the task name
    const titleInput = modal.locator('#qa-title');
    await titleInput.fill('UI Created Task via Playwright');

    // Submit
    await modal.getByRole('button', { name: /add task/i }).click();

    // Modal should close
    await expect(modal).not.toBeVisible();

    // Toast notification should appear briefly
    const toast = page.locator('.fixed.bottom-6.right-6');
    await expect(toast).toBeVisible({ timeout: 3000 });
    await expect(toast).toContainText('Task added');
  });

  test('quick-add Ctrl+Q keyboard shortcut opens modal', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.keyboard.press('Control+q');

    const modal = page.getByRole('dialog', { name: /quick add task/i });
    await expect(modal).toBeVisible();

    // Press Escape to close cleanly
    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible();
  });

  test('quick-add form requires title — empty submit stays open', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const addBtn = page.getByRole('button', { name: /add task/i });
    await addBtn.click();

    const modal = page.getByRole('dialog', { name: /quick add task/i });
    await expect(modal).toBeVisible();

    // Try to submit without filling title
    await modal.getByRole('button', { name: /add task/i }).click();

    // Modal must remain open (HTML5 required validation or JS guard)
    await expect(modal).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Suite: API error handling & edge cases
// ---------------------------------------------------------------------------

test.describe('Task API edge cases', () => {
  let apiCtx: APIRequestContext;
  let token: string;

  test.beforeAll(async ({ playwright }) => {
    apiCtx = await playwright.request.newContext();
    token = await registerAndLogin(apiCtx);
  });

  test.afterAll(async () => {
    await apiCtx.dispose();
  });

  test('create task without auth returns 401', async () => {
    const res = await apiCtx.post(`${API_BASE}/api/tasks`, {
      data: { title: 'No auth task' },
    });
    expect(res.status()).toBe(401);
  });

  test('create task without title returns 400', async () => {
    const res = await apiCtx.post(`${API_BASE}/api/tasks`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { description: 'No title task' },
    });
    expect(res.status()).toBe(400);
  });

  test('get non-existent task returns 404', async () => {
    const res = await apiCtx.get(`${API_BASE}/api/tasks/non-existent-id-xyz`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(404);
  });

  test('update non-existent task returns 404', async () => {
    const res = await apiCtx.put(`${API_BASE}/api/tasks/non-existent-id-xyz`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { title: 'Ghost task' },
    });
    expect(res.status()).toBe(404);
  });

  test('delete non-existent task returns 404', async () => {
    const res = await apiCtx.delete(`${API_BASE}/api/tasks/non-existent-id-xyz`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(404);
  });

  test('create task with very long title returns 400', async () => {
    const res = await apiCtx.post(`${API_BASE}/api/tasks`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { title: 'A'.repeat(501) },
    });
    expect(res.status()).toBe(400);
  });

  test('health check returns 200', async () => {
    const res = await apiCtx.get(`${API_BASE}/api/health`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.status).toBe('ok');
  });
});

// ---------------------------------------------------------------------------
// Suite: Multiple tasks ordering and isolation
// ---------------------------------------------------------------------------

test.describe('Multiple tasks management', () => {
  let apiCtx: APIRequestContext;
  let token: string;
  const createdIds: string[] = [];

  test.beforeAll(async ({ playwright }) => {
    apiCtx = await playwright.request.newContext();
    token = await registerAndLogin(apiCtx);
  });

  test.afterAll(async () => {
    // Clean up all created tasks
    for (const id of createdIds) {
      await apiCtx.delete(`${API_BASE}/api/tasks/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {/* ignore if already deleted */});
    }
    await apiCtx.dispose();
  });

  test('create multiple tasks and verify count', async () => {
    const titles = ['Task Alpha', 'Task Beta', 'Task Gamma'];
    for (const title of titles) {
      const res = await apiCtx.post(`${API_BASE}/api/tasks`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { title },
      });
      expect(res.status()).toBe(201);
      const body: TaskResponse = await res.json();
      createdIds.push(body.task.id);
    }

    const list = await apiCtx.get(`${API_BASE}/api/tasks?completed=false`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(list.ok()).toBeTruthy();
    const body: TaskListResponse = await list.json();
    // All 3 should exist
    for (const id of createdIds) {
      expect(body.tasks.find((t) => t.id === id)).toBeDefined();
    }
  });

  test('complete one task does not affect others', async () => {
    expect(createdIds.length).toBeGreaterThanOrEqual(3);

    // Complete only the first task
    const completeRes = await apiCtx.put(`${API_BASE}/api/tasks/${createdIds[0]}`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { completed: true },
    });
    expect(completeRes.ok()).toBeTruthy();

    // Others should still be active
    const activeRes = await apiCtx.get(`${API_BASE}/api/tasks?completed=false`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const activeBody: TaskListResponse = await activeRes.json();
    expect(activeBody.tasks.find((t) => t.id === createdIds[1])).toBeDefined();
    expect(activeBody.tasks.find((t) => t.id === createdIds[2])).toBeDefined();
    // First should not be in active list
    expect(activeBody.tasks.find((t) => t.id === createdIds[0])).toBeUndefined();
  });

  test('delete one task does not affect others', async () => {
    expect(createdIds.length).toBeGreaterThanOrEqual(2);

    const delRes = await apiCtx.delete(`${API_BASE}/api/tasks/${createdIds[1]}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(delRes.ok()).toBeTruthy();

    // Verify deleted
    const getRes = await apiCtx.get(`${API_BASE}/api/tasks/${createdIds[1]}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(getRes.status()).toBe(404);

    // Third task should still exist
    const getThirdRes = await apiCtx.get(`${API_BASE}/api/tasks/${createdIds[2]}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(getThirdRes.ok()).toBeTruthy();
  });
});
