import { Page, expect } from "@playwright/test";

/**
 * Helper utilities for E2E tests
 */

/**
 * Wait for page to be fully loaded and stable
 */
export async function waitForPageReady(page: Page, timeout = 10000) {
  await page.waitForLoadState("domcontentloaded", { timeout });
  await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {
    // Network idle may timeout, but page is still usable
  });
}

/**
 * Authenticate user through Clerk sign-in flow
 */
export async function authenticateUser(
  page: Page,
  email: string,
  password: string,
  timeout = 15000
) {
  // Navigate to sign-in page
  await page.goto("/sign-in");
  await waitForPageReady(page);

  // Fill email
  const emailInput = page.locator('input[type="email"]').first();
  await emailInput.waitFor({ state: "visible", timeout: 5000 });
  await emailInput.fill(email);

  // Click Continue for email
  const emailContinueBtn = page.getByRole("button", { name: /^Continue$/, exact: true });
  await emailContinueBtn.click();

  // Wait for password field and fill it
  const passwordInput = page.locator('input[type="password"]');
  await passwordInput.waitFor({ state: "visible", timeout: 5000 });
  await passwordInput.fill(password);

  // Click Continue for password
  const passwordContinueBtn = page
    .getByRole("button", { name: /^Continue$/, exact: true })
    .last();
  await passwordContinueBtn.click();

  // Wait for successful authentication
  await page.waitForURL(/.*dashboard/, { timeout });
  await expect(page).toHaveURL(/.*dashboard/);
}

/**
 * Setup API mocks for external services
 */
export async function setupAPIMocks(page: Page) {
  // Mock AI analysis streaming API
  await page.route("**/api/test/stream/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "text/event-stream",
      body: 'data: {"text": "사주 분석 결과입니다."}\n\ndata: {"done": true}\n\n',
    });
  });

  // Mock payment API
  await page.route("**/api/payments/**", async (route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          data: { message: "결제가 완료되었습니다" },
        }),
      });
    } else {
      await route.continue();
    }
  });

  // Mock AI generation API
  await page.route("**/api/generate/**", async (route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          data: { analysis: "AI 생성 분석 결과입니다." },
        }),
      });
    } else {
      await route.continue();
    }
  });
}

/**
 * Navigate to a protected page and verify access
 */
export async function navigateToProtectedPage(page: Page, path: string) {
  await page.goto(path);
  await waitForPageReady(page);

  // Verify main content is visible
  const mainContent = page.locator("main");
  await expect(mainContent).toBeVisible({ timeout: 5000 });
}

/**
 * Find and click a button or link by accessible name with options
 */
export async function clickByRole(
  page: Page,
  role: "button" | "link" = "button",
  namePattern: string | RegExp,
  options = {}
) {
  const element = page.getByRole(role, { name: namePattern, ...options });
  await expect(element).toBeVisible({ timeout: 5000 });
  await element.click();
}

/**
 * Wait for and verify URL change
 */
export async function verifyNavigation(page: Page, urlPattern: string | RegExp) {
  await page.waitForURL(urlPattern, { timeout: 10000 });
  await expect(page).toHaveURL(urlPattern);
}

/**
 * Check if element is visible without throwing error
 */
export async function isElementVisible(page: Page, selector: string): Promise<boolean> {
  return await page.locator(selector).isVisible({ timeout: 2000 }).catch(() => false);
}
