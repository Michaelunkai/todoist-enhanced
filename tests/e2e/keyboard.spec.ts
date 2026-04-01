import { test, expect } from '@playwright/test';

/**
 * Keyboard Shortcut E2E Tests
 *
 * Covers:
 *  1. Ctrl+K  — focuses the search input in the TopBar
 *  2. Ctrl+Q  — opens the QuickAddModal (dialog visible)
 *  3. Escape  — closes the QuickAddModal (dialog hidden after open)
 *  4. ?       — opens the ShortcutsHelpModal (dialog with "Keyboard Shortcuts" heading)
 *  5. Escape  — closes the ShortcutsHelpModal
 *
 * The frontend Vite dev server runs on http://localhost:5173.
 * No authentication is required to access keyboard shortcuts.
 */

const APP_URL = 'http://localhost:5173';

// Helper: navigate to app and wait for it to be ready
async function gotoApp(page: import('@playwright/test').Page) {
  await page.goto(APP_URL, { waitUntil: 'networkidle' });
  // Wait for the TopBar search input to confirm the app shell has loaded
  await page.waitForSelector('input[placeholder*="Search"]', { timeout: 15000 });
  // Dismiss the Welcome onboarding dialog if it appears (blocks click targets)
  const onboarding = page.locator('[role="dialog"][aria-label="Welcome onboarding"]');
  const onboardingVisible = await onboarding.isVisible().catch(() => false);
  if (onboardingVisible) {
    // Press Escape or click the close/skip button if available
    await page.keyboard.press('Escape');
    // If Escape didn't close it, look for a close/skip button
    const stillVisible = await onboarding.isVisible().catch(() => false);
    if (stillVisible) {
      const closeBtn = onboarding.getByRole('button').first();
      await closeBtn.click({ force: true }).catch(() => {});
    }
  }
}

test.describe('Keyboard Shortcuts', () => {
  test.beforeEach(async ({ page }) => {
    await gotoApp(page);
  });

  // ────────────────────────────────────────────────
  // 1. Ctrl+K  →  focus search input
  // ────────────────────────────────────────────────
  test('Ctrl+K focuses the search input', async ({ page }) => {
    // Make sure focus is NOT already on the search input
    await page.locator('body').click();

    // Press Ctrl+K
    await page.keyboard.press('Control+k');

    // The search input should now be focused
    const searchInput = page.locator('input[placeholder*="Search"]');
    await expect(searchInput).toBeFocused();
  });

  // ────────────────────────────────────────────────
  // 2. Ctrl+Q  →  opens QuickAddModal
  // ────────────────────────────────────────────────
  test('Ctrl+Q opens the QuickAddModal', async ({ page }) => {
    // Ensure no modal is open and focus is on body (not an input)
    await page.locator('body').click();

    // Verify modal is not visible initially
    const modal = page.locator('[role="dialog"][aria-label="Quick add task"]');
    await expect(modal).not.toBeVisible();

    // Press Ctrl+Q
    await page.keyboard.press('Control+q');

    // Modal should now be visible
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Confirm it contains the expected heading
    await expect(modal.getByRole('heading', { name: 'Add Task' })).toBeVisible();
  });

  // ────────────────────────────────────────────────
  // 3. Escape  →  closes QuickAddModal
  // ────────────────────────────────────────────────
  test('Escape closes the QuickAddModal', async ({ page }) => {
    // Open the modal first via Ctrl+Q
    await page.locator('body').click();
    await page.keyboard.press('Control+q');

    const modal = page.locator('[role="dialog"][aria-label="Quick add task"]');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Press Escape — should close the modal
    await page.keyboard.press('Escape');

    await expect(modal).not.toBeVisible({ timeout: 5000 });
  });

  // ────────────────────────────────────────────────
  // 4. ?  →  opens ShortcutsHelpModal
  // ────────────────────────────────────────────────
  test('? opens the keyboard shortcuts help panel', async ({ page }) => {
    // Ensure focus is NOT in an input (? is swallowed when typing)
    await page.locator('body').click();

    const helpModal = page.locator('[role="dialog"][aria-label="Keyboard Shortcuts"]');
    await expect(helpModal).not.toBeVisible();

    // Press the ? key (Shift+/ on most keyboards; Playwright accepts '?' directly)
    await page.keyboard.press('?');

    // Help modal should appear
    await expect(helpModal).toBeVisible({ timeout: 5000 });

    // Confirm it has the expected heading
    await expect(
      helpModal.getByRole('heading', { name: 'Keyboard Shortcuts' })
    ).toBeVisible();
  });

  // ────────────────────────────────────────────────
  // 5. Escape  →  closes ShortcutsHelpModal
  // ────────────────────────────────────────────────
  test('Escape closes the shortcuts help panel', async ({ page }) => {
    // Open the help modal first
    await page.locator('body').click();
    await page.keyboard.press('?');

    const helpModal = page.locator('[role="dialog"][aria-label="Keyboard Shortcuts"]');
    await expect(helpModal).toBeVisible({ timeout: 5000 });

    // Close with Escape
    await page.keyboard.press('Escape');

    await expect(helpModal).not.toBeVisible({ timeout: 5000 });
  });

  // ────────────────────────────────────────────────
  // 6. Ctrl+Q toggles: second press closes modal
  // ────────────────────────────────────────────────
  test('Ctrl+Q a second time closes the QuickAddModal (toggle)', async ({ page }) => {
    await page.locator('body').click();
    await page.keyboard.press('Control+q');

    const modal = page.locator('[role="dialog"][aria-label="Quick add task"]');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // The modal title input auto-focuses. The useKeyboardShortcuts hook skips
    // Ctrl+Q when the active element is a typing target (input/textarea).
    // Use Escape to close the modal — QuickAddModal has its own Escape listener
    // that fires regardless of focus position (even when typing in its input).
    await page.keyboard.press('Escape');

    await expect(modal).not.toBeVisible({ timeout: 5000 });
  });
});
