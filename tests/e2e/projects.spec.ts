import { test, expect } from '@playwright/test';

/**
 * Projects E2E Tests
 *
 * These tests cover:
 * 1. Create a new project with a unique name
 * 2. Add 3 tasks to that project
 * 3. Verify the project's task_count badge shows 3
 * 4. Delete the project
 * 5. Verify the project is removed from the project list
 * 6. Verify the tasks belonging to that project are no longer accessible
 *
 * Auth is JWT-based. Each test registers a fresh user to avoid cross-test
 * state pollution. All interactions are via the REST API (port 3456), matching
 * the pattern established in auth.spec.ts.
 */

const API_BASE = 'http://localhost:3456';

// Helpers
const uniqueEmail = () => `proj_test_${Date.now()}_${Math.random().toString(36).slice(2)}@example.com`;
const TEST_PASSWORD = 'SecurePass123!';
const TEST_NAME = 'Projects E2E Tester';

/**
 * Register a fresh user and return their auth token + user object.
 */
async function registerUser(request: any): Promise<{ token: string; userId: string }> {
  const email = uniqueEmail();
  const res = await request.post(`${API_BASE}/api/auth/register`, {
    data: { name: TEST_NAME, email, password: TEST_PASSWORD },
  });
  expect(res.status()).toBe(201);
  const body = await res.json();
  return { token: body.token, userId: body.user.id };
}

// ─────────────────────────────────────────────────────────────
// 1. Create project
// ─────────────────────────────────────────────────────────────
test.describe('Create project', () => {
  test('should create a new project with a unique name', async ({ request }) => {
    const { token } = await registerUser(request);
    const projectName = `E2E Project ${Date.now()}`;

    const res = await request.post(`${API_BASE}/api/projects`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { name: projectName, color: '#6366f1' },
    });

    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body).toHaveProperty('project');
    expect(body.project.name).toBe(projectName);
    expect(body.project.color).toBe('#6366f1');
    expect(body.project.id).toBeTruthy();
  });

  test('should reject project creation with empty name', async ({ request }) => {
    const { token } = await registerUser(request);

    const res = await request.post(`${API_BASE}/api/projects`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { name: '' },
    });

    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('required');
  });

  test('should reject project creation without authentication', async ({ request }) => {
    const res = await request.post(`${API_BASE}/api/projects`, {
      data: { name: 'Unauthenticated Project' },
    });

    expect(res.status()).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────
// 2. Add 3 tasks to a project
// ─────────────────────────────────────────────────────────────
test.describe('Add tasks to project', () => {
  test('should add 3 tasks to a project and retrieve them', async ({ request }) => {
    const { token } = await registerUser(request);
    const projectName = `Task Project ${Date.now()}`;

    // Create project
    const projRes = await request.post(`${API_BASE}/api/projects`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { name: projectName },
    });
    expect(projRes.status()).toBe(201);
    const { project } = await projRes.json();

    // Add 3 tasks
    const taskTitles = ['Task Alpha', 'Task Beta', 'Task Gamma'];
    const createdTaskIds: string[] = [];

    for (const title of taskTitles) {
      const taskRes = await request.post(`${API_BASE}/api/tasks`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { title, project_id: project.id },
      });
      expect(taskRes.status()).toBe(201);
      const { task } = await taskRes.json();
      expect(task.project_id).toBe(project.id);
      createdTaskIds.push(task.id);
    }

    expect(createdTaskIds).toHaveLength(3);

    // Retrieve tasks filtered by project_id
    const listRes = await request.get(
      `${API_BASE}/api/tasks?project_id=${project.id}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    expect(listRes.status()).toBe(200);
    const { tasks } = await listRes.json();
    expect(tasks).toHaveLength(3);

    const returnedTitles = tasks.map((t: any) => t.title).sort();
    expect(returnedTitles).toEqual([...taskTitles].sort());
  });
});

// ─────────────────────────────────────────────────────────────
// 3. Verify count badge shows 3 on the project
// ─────────────────────────────────────────────────────────────
test.describe('Project task_count badge', () => {
  test('should report task_count of 3 after adding 3 incomplete tasks', async ({ request }) => {
    const { token } = await registerUser(request);
    const projectName = `Badge Project ${Date.now()}`;

    // Create project
    const projRes = await request.post(`${API_BASE}/api/projects`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { name: projectName },
    });
    expect(projRes.status()).toBe(201);
    const { project } = await projRes.json();

    // Add 3 tasks
    for (let i = 1; i <= 3; i++) {
      const taskRes = await request.post(`${API_BASE}/api/tasks`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { title: `Badge Task ${i}`, project_id: project.id },
      });
      expect(taskRes.status()).toBe(201);
    }

    // GET /api/projects returns task_count (count of incomplete tasks per project)
    const projectsRes = await request.get(`${API_BASE}/api/projects`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(projectsRes.status()).toBe(200);
    const { projects } = await projectsRes.json();

    const targetProject = projects.find((p: any) => p.id === project.id);
    expect(targetProject).toBeDefined();
    // task_count is the badge value shown in the sidebar
    expect(targetProject.task_count).toBe(3);
  });

  test('task_count should not count completed tasks', async ({ request }) => {
    const { token } = await registerUser(request);
    const projectName = `Completed Badge Project ${Date.now()}`;

    // Create project
    const projRes = await request.post(`${API_BASE}/api/projects`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { name: projectName },
    });
    const { project } = await projRes.json();

    // Add 3 tasks and complete 1
    const taskIds: string[] = [];
    for (let i = 1; i <= 3; i++) {
      const taskRes = await request.post(`${API_BASE}/api/tasks`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { title: `Mixed Task ${i}`, project_id: project.id },
      });
      const { task } = await taskRes.json();
      taskIds.push(task.id);
    }

    // Complete the first task
    const completeRes = await request.patch(`${API_BASE}/api/tasks/${taskIds[0]}/complete`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    // Accept 200 or 204 — both are valid success responses
    expect([200, 204]).toContain(completeRes.status());

    // Badge should now show 2 (only incomplete tasks)
    const projectsRes = await request.get(`${API_BASE}/api/projects`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const { projects } = await projectsRes.json();
    const targetProject = projects.find((p: any) => p.id === project.id);
    expect(targetProject.task_count).toBe(2);
  });
});

// ─────────────────────────────────────────────────────────────
// 4 & 5. Delete project and verify it is removed
// ─────────────────────────────────────────────────────────────
test.describe('Delete project', () => {
  test('should delete the project and remove it from the project list', async ({ request }) => {
    const { token } = await registerUser(request);
    const projectName = `Delete Me ${Date.now()}`;

    // Create project
    const projRes = await request.post(`${API_BASE}/api/projects`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { name: projectName },
    });
    expect(projRes.status()).toBe(201);
    const { project } = await projRes.json();

    // Confirm it exists in the list
    const beforeDelete = await request.get(`${API_BASE}/api/projects`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const { projects: projectsBefore } = await beforeDelete.json();
    expect(projectsBefore.some((p: any) => p.id === project.id)).toBe(true);

    // Delete the project
    const deleteRes = await request.delete(`${API_BASE}/api/projects/${project.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(deleteRes.status()).toBe(200);
    const deleteBody = await deleteRes.json();
    expect(deleteBody.message).toContain('deleted');

    // Verify it no longer appears in the project list
    const afterDelete = await request.get(`${API_BASE}/api/projects`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const { projects: projectsAfter } = await afterDelete.json();
    expect(projectsAfter.some((p: any) => p.id === project.id)).toBe(false);
  });

  test('should return 404 when fetching a deleted project by id', async ({ request }) => {
    const { token } = await registerUser(request);

    // Create + delete a project
    const projRes = await request.post(`${API_BASE}/api/projects`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { name: `Ephemeral ${Date.now()}` },
    });
    const { project } = await projRes.json();

    await request.delete(`${API_BASE}/api/projects/${project.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    // GET by ID should now return 404
    const getRes = await request.get(`${API_BASE}/api/projects/${project.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(getRes.status()).toBe(404);
  });

  test('should not allow deleting the Inbox project', async ({ request }) => {
    const { token } = await registerUser(request);

    // Fetch projects — Inbox is always created on registration
    const listRes = await request.get(`${API_BASE}/api/projects`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const { projects } = await listRes.json();
    const inbox = projects.find((p: any) => p.is_inbox === 1 || p.is_inbox === true);
    expect(inbox).toBeDefined();

    const deleteRes = await request.delete(`${API_BASE}/api/projects/${inbox.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(deleteRes.status()).toBe(403);
    const body = await deleteRes.json();
    expect(body.error).toContain('Inbox');
  });
});

// ─────────────────────────────────────────────────────────────
// 6. After deleting project, verify tasks are no longer accessible
// ─────────────────────────────────────────────────────────────
test.describe('Tasks removed after project deletion', () => {
  test('should no longer return project tasks after the project is deleted', async ({ request }) => {
    const { token } = await registerUser(request);
    const projectName = `Task Cleanup ${Date.now()}`;

    // Create project
    const projRes = await request.post(`${API_BASE}/api/projects`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { name: projectName },
    });
    const { project } = await projRes.json();

    // Add 3 tasks to the project
    const taskIds: string[] = [];
    for (let i = 1; i <= 3; i++) {
      const taskRes = await request.post(`${API_BASE}/api/tasks`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { title: `Cleanup Task ${i}`, project_id: project.id },
      });
      const { task } = await taskRes.json();
      taskIds.push(task.id);
    }

    // Verify all 3 tasks exist and belong to the project
    const beforeRes = await request.get(
      `${API_BASE}/api/tasks?project_id=${project.id}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const { tasks: tasksBefore } = await beforeRes.json();
    expect(tasksBefore).toHaveLength(3);

    // Delete the project
    const deleteRes = await request.delete(`${API_BASE}/api/projects/${project.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(deleteRes.status()).toBe(200);

    // Querying tasks by deleted project_id should return 0 tasks
    const afterProjectRes = await request.get(
      `${API_BASE}/api/tasks?project_id=${project.id}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const { tasks: tasksAfterByProject } = await afterProjectRes.json();
    expect(tasksAfterByProject).toHaveLength(0);

    // Each individual task should also be inaccessible (404)
    for (const taskId of taskIds) {
      const taskRes = await request.get(`${API_BASE}/api/tasks/${taskId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(taskRes.status()).toBe(404);
    }
  });

  test('full lifecycle: create project → 3 tasks → badge=3 → delete → tasks gone', async ({ request }) => {
    const { token } = await registerUser(request);
    const projectName = `Lifecycle ${Date.now()}`;

    // ── Step 1: Create project ──────────────────────────────────
    const projRes = await request.post(`${API_BASE}/api/projects`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { name: projectName, color: '#10b981' },
    });
    expect(projRes.status()).toBe(201);
    const { project } = await projRes.json();
    expect(project.name).toBe(projectName);

    // ── Step 2: Add 3 tasks ─────────────────────────────────────
    const taskTitles = ['First Task', 'Second Task', 'Third Task'];
    const taskIds: string[] = [];

    for (const title of taskTitles) {
      const taskRes = await request.post(`${API_BASE}/api/tasks`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { title, project_id: project.id },
      });
      expect(taskRes.status()).toBe(201);
      const { task } = await taskRes.json();
      expect(task.project_id).toBe(project.id);
      taskIds.push(task.id);
    }
    expect(taskIds).toHaveLength(3);

    // ── Step 3: Verify badge count = 3 ─────────────────────────
    const badgeRes = await request.get(`${API_BASE}/api/projects`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(badgeRes.status()).toBe(200);
    const { projects } = await badgeRes.json();
    const found = projects.find((p: any) => p.id === project.id);
    expect(found).toBeDefined();
    expect(found.task_count).toBe(3);

    // ── Step 4: Delete project ──────────────────────────────────
    const deleteRes = await request.delete(`${API_BASE}/api/projects/${project.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(deleteRes.status()).toBe(200);

    // ── Step 5: Verify project is gone from list ────────────────
    const listAfterRes = await request.get(`${API_BASE}/api/projects`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const { projects: projectsAfter } = await listAfterRes.json();
    expect(projectsAfter.some((p: any) => p.id === project.id)).toBe(false);

    // ── Step 6: Verify tasks are no longer accessible ───────────
    const tasksAfterRes = await request.get(
      `${API_BASE}/api/tasks?project_id=${project.id}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const { tasks: tasksAfter } = await tasksAfterRes.json();
    expect(tasksAfter).toHaveLength(0);

    for (const taskId of taskIds) {
      const t = await request.get(`${API_BASE}/api/tasks/${taskId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(t.status()).toBe(404);
    }
  });
});
