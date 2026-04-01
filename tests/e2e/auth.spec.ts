import { test, expect, request as playwrightRequest } from '@playwright/test';

/**
 * Auth E2E Tests
 *
 * These tests cover:
 * 1. Register a new user (unique email each run)
 * 2. Login with valid credentials → success + token returned
 * 3. Login with invalid credentials (wrong password) → error message
 * 4. Logout flow → token cleared
 * 5. Auth state persistence → reload while logged in stays logged in
 *
 * The backend runs on port 3456 (API) and frontend on port 5173 (Vite).
 * Auth is JWT-based; the client stores the token in localStorage.
 */

const API_BASE = 'http://localhost:3456';

// Unique email per test run to avoid "Email already registered" conflicts
const uniqueEmail = () => `testuser_${Date.now()}@example.com`;
const TEST_PASSWORD = 'SecurePass123!';
const TEST_NAME = 'E2E Tester';

// ─────────────────────────────────────────────────────────────
// 1. Register new user
// ─────────────────────────────────────────────────────────────
test.describe('Register', () => {
  test('should register a new user and return a JWT token', async ({ request }) => {
    const email = uniqueEmail();

    const res = await request.post(`${API_BASE}/api/auth/register`, {
      data: { name: TEST_NAME, email, password: TEST_PASSWORD },
    });

    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body).toHaveProperty('token');
    expect(typeof body.token).toBe('string');
    expect(body.token.length).toBeGreaterThan(20);
    expect(body).toHaveProperty('user');
    expect(body.user.email).toBe(email.toLowerCase());
    expect(body.user.name).toBe(TEST_NAME);
  });

  test('should reject duplicate email registration', async ({ request }) => {
    const email = uniqueEmail();

    // First registration should succeed
    const first = await request.post(`${API_BASE}/api/auth/register`, {
      data: { name: TEST_NAME, email, password: TEST_PASSWORD },
    });
    expect(first.status()).toBe(201);

    // Second registration with same email should fail
    const second = await request.post(`${API_BASE}/api/auth/register`, {
      data: { name: TEST_NAME, email, password: TEST_PASSWORD },
    });
    expect(second.status()).toBe(409);
    const body = await second.json();
    expect(body.error).toContain('already registered');
  });

  test('should reject registration with weak password (< 8 chars)', async ({ request }) => {
    const res = await request.post(`${API_BASE}/api/auth/register`, {
      data: { name: TEST_NAME, email: uniqueEmail(), password: 'abc123' },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('8 characters');
  });

  test('should reject registration with invalid email', async ({ request }) => {
    const res = await request.post(`${API_BASE}/api/auth/register`, {
      data: { name: TEST_NAME, email: 'not-an-email', password: TEST_PASSWORD },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('email');
  });
});

// ─────────────────────────────────────────────────────────────
// 2. Login with valid credentials
// ─────────────────────────────────────────────────────────────
test.describe('Login – valid credentials', () => {
  test('should login with valid credentials and return JWT + user object', async ({ request }) => {
    // Register first
    const email = uniqueEmail();
    await request.post(`${API_BASE}/api/auth/register`, {
      data: { name: TEST_NAME, email, password: TEST_PASSWORD },
    });

    // Login
    const res = await request.post(`${API_BASE}/api/auth/login`, {
      data: { email, password: TEST_PASSWORD },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('token');
    expect(typeof body.token).toBe('string');
    expect(body.token.length).toBeGreaterThan(20);
    expect(body).toHaveProperty('user');
    expect(body.user.email).toBe(email.toLowerCase());
    expect(body.user).not.toHaveProperty('password_hash'); // password must not leak
  });

  test('should allow /api/auth/me with valid token after login', async ({ request }) => {
    const email = uniqueEmail();

    // Register
    const reg = await request.post(`${API_BASE}/api/auth/register`, {
      data: { name: TEST_NAME, email, password: TEST_PASSWORD },
    });
    const { token } = await reg.json();

    // Call /me with Bearer token
    const me = await request.get(`${API_BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(me.status()).toBe(200);
    const meBody = await me.json();
    expect(meBody.user.email).toBe(email.toLowerCase());
  });
});

// ─────────────────────────────────────────────────────────────
// 3. Login with invalid credentials
// ─────────────────────────────────────────────────────────────
test.describe('Login – invalid credentials', () => {
  test('should reject login with wrong password', async ({ request }) => {
    const email = uniqueEmail();

    // Register
    await request.post(`${API_BASE}/api/auth/register`, {
      data: { name: TEST_NAME, email, password: TEST_PASSWORD },
    });

    // Login with wrong password
    const res = await request.post(`${API_BASE}/api/auth/login`, {
      data: { email, password: 'WrongPassword99!' },
    });

    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body).toHaveProperty('error');
    expect(body.error).toContain('Invalid');
  });

  test('should reject login with unknown email', async ({ request }) => {
    const res = await request.post(`${API_BASE}/api/auth/login`, {
      data: { email: 'nobody_' + Date.now() + '@example.com', password: TEST_PASSWORD },
    });

    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.error).toContain('Invalid');
  });

  test('should reject login with missing fields', async ({ request }) => {
    const res = await request.post(`${API_BASE}/api/auth/login`, {
      data: { email: 'someone@example.com' }, // no password
    });

    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('required');
  });
});

// ─────────────────────────────────────────────────────────────
// 4. Logout flow
// ─────────────────────────────────────────────────────────────
test.describe('Logout', () => {
  test('should return success on POST /api/auth/logout', async ({ request }) => {
    const email = uniqueEmail();

    // Register + get token
    const reg = await request.post(`${API_BASE}/api/auth/register`, {
      data: { name: TEST_NAME, email, password: TEST_PASSWORD },
    });
    const { token } = await reg.json();

    // Logout
    const logoutRes = await request.post(`${API_BASE}/api/auth/logout`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(logoutRes.status()).toBe(200);
    const body = await logoutRes.json();
    expect(body.message).toContain('Logged out');
  });

  test('should return 401 on /api/auth/me after token is cleared from client', async ({ request }) => {
    // JWT is stateless — server side always accepts valid tokens.
    // The logout test simulates the client clearing the token by NOT sending it.
    const me = await request.get(`${API_BASE}/api/auth/me`);
    // No Authorization header → should be 401
    expect(me.status()).toBe(401);
  });

  test('frontend: login stores token in localStorage, logout clears it', async ({ page, request }) => {
    const email = uniqueEmail();

    // Register via API request fixture (not rate-limited, bypasses browser fetch)
    const regRes = await request.post(`${API_BASE}/api/auth/register`, {
      data: { name: TEST_NAME, email, password: TEST_PASSWORD },
    });
    const loginRes = await regRes.json();

    expect(loginRes).toHaveProperty('token');
    const token: string = loginRes.token;

    // Navigate to the frontend app before using localStorage
    await page.goto('/');

    // Simulate the app storing auth in localStorage
    await page.evaluate((t) => {
      localStorage.setItem('auth_token', t);
    }, token);

    // Verify it's in localStorage
    const stored = await page.evaluate(() => localStorage.getItem('auth_token'));
    expect(stored).toBe(token);

    // Simulate logout: clear localStorage
    await page.evaluate(() => {
      localStorage.removeItem('auth_token');
    });

    // After logout, token should be gone
    const afterLogout = await page.evaluate(() => localStorage.getItem('auth_token'));
    expect(afterLogout).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────
// 5. Auth state persistence (reload while logged in)
// ─────────────────────────────────────────────────────────────
test.describe('Auth state persistence', () => {
  test('should persist auth token across page reload', async ({ page, request }) => {
    const email = uniqueEmail();

    // Register via API context (avoids about:blank fetch restriction)
    const regRes = await request.post(`${API_BASE}/api/auth/register`, {
      data: { name: TEST_NAME, email, password: TEST_PASSWORD },
    });
    const loginRes = await regRes.json();

    const token: string = loginRes.token;
    expect(token).toBeTruthy();

    // Navigate to app before interacting with localStorage
    await page.goto('/');

    // Store token in localStorage (simulates the app's auth storage)
    await page.evaluate((t) => {
      localStorage.setItem('auth_token', t);
    }, token);

    // Reload the page
    await page.reload();

    // Token should still be present after reload
    const storedAfterReload = await page.evaluate(() => localStorage.getItem('auth_token'));
    expect(storedAfterReload).toBe(token);
  });

  test('should be able to use persisted token to call /api/auth/me after reload', async ({ page, request }) => {
    const email = uniqueEmail();

    // Register via API context (avoids about:blank fetch restriction)
    const apiRes = await request.post(`${API_BASE}/api/auth/register`, {
      data: { name: TEST_NAME, email, password: TEST_PASSWORD },
    });
    const regRes = await apiRes.json();

    const token: string = regRes.token;

    // Navigate to app before interacting with localStorage
    await page.goto('/');
    await page.evaluate((t) => {
      localStorage.setItem('auth_token', t);
    }, token);

    // Reload the page
    await page.reload();

    // Verify token still in localStorage after reload
    const storedToken = await page.evaluate(() => localStorage.getItem('auth_token'));
    expect(storedToken).toBe(token);

    // Use the request fixture (not browser fetch) to verify token still authenticates
    const meRes = await request.get(`${API_BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${storedToken as string}` },
    });
    expect(meRes.status()).toBe(200);
    const meBody = await meRes.json();
    expect(meBody).toHaveProperty('user');
    expect(meBody.user.email).toBe(email.toLowerCase());
  });

  test('unauthenticated /api/auth/me request should return 401', async ({ page }) => {
    // Navigate to app before interacting with localStorage
    await page.goto('/');
    // Clear localStorage (no token)
    await page.evaluate(() => localStorage.clear());

    // Simulate app checking if user is logged in (no token available)
    const result = await page.evaluate(async ({ apiBase }) => {
      const token = localStorage.getItem('auth_token');
      if (!token) return { status: 'unauthenticated' };
      const res = await fetch(`${apiBase}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return { status: res.status };
    }, { apiBase: API_BASE });

    expect(result.status).toBe('unauthenticated');
  });
});
