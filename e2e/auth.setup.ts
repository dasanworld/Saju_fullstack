import { test as setup, expect } from "@playwright/test";

const AUTH_FILE = "playwright/.auth/user.json";

/**
 * Clerk authentication setup for E2E tests
 * Logs in a test user and saves the session state
 */
setup("authenticate", async ({ page }) => {
  const testEmail = process.env.TEST_USER_EMAIL || "test@example.com";
  const testPassword = process.env.TEST_USER_PASSWORD || "testpassword123";

  // Navigate to sign-in page
  await page.goto("/sign-in");

  // Wait for Clerk component to load
  await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {
    // Network idle may not always complete, continue anyway
  });

  // Fill email field - try multiple selectors for robustness
  const emailInput = page.locator('input[type="email"]').first();
  await emailInput.waitFor({ state: "visible", timeout: 5000 });
  await emailInput.fill(testEmail);

  // Click Continue button with exact match
  const emailContinueBtn = page.getByRole("button", { name: /^Continue$/, exact: true });
  await emailContinueBtn.click();

  // Wait for password field to appear (account identifier step to password step)
  await page.locator('input[type="password"]').waitFor({ state: "visible", timeout: 5000 });

  // Fill password field
  const passwordInput = page.locator('input[type="password"]');
  await passwordInput.fill(testPassword);

  // Click Continue button for password submission
  const passwordContinueBtn = page.getByRole("button", { name: /^Continue$/, exact: true }).last();
  await passwordContinueBtn.click();

  // Wait for successful authentication and redirect
  await page.waitForURL(/.*dashboard/, { timeout: 15000 });

  // Verify we're on dashboard
  await expect(page).toHaveURL(/.*dashboard/);

  // Save authenticated session state
  await page.context().storageState({ path: AUTH_FILE });
});
