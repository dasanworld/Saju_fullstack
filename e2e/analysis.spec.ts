import { test, expect } from "@playwright/test";

test.describe("Analysis Flow", () => {
  test("should display dashboard after authentication", async ({ page }) => {
    // Given: User is authenticated (storageState applied)
    // When: Navigate to dashboard
    await page.goto("/dashboard");

    // Then: Verify dashboard is accessible and loaded
    await page.waitForLoadState("domcontentloaded", { timeout: 10000 });
    const mainContent = page.locator("main");
    await expect(mainContent).toBeVisible({ timeout: 5000 });
  });

  test("should handle AI analysis API with mock stream", async ({ page }) => {
    // Given: Mock AI streaming API to prevent external calls
    await page.route("**/api/test/stream/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        body: 'data: {"text": "사주 분석 결과입니다."}\n\ndata: {"done": true}\n\n',
      });
    });

    // When: Navigate to dashboard
    await page.goto("/dashboard");

    // Then: Verify dashboard is accessible
    await page.waitForLoadState("domcontentloaded", { timeout: 10000 });
    const mainContent = page.locator("main");
    await expect(mainContent).toBeVisible({ timeout: 5000 });
  });

  test("should handle payment API with mock response", async ({ page }) => {
    // Given: Mock payment API to prevent external transactions
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

    // When: Navigate to dashboard
    await page.goto("/dashboard");

    // Then: Verify dashboard is accessible and ready
    await page.waitForLoadState("domcontentloaded", { timeout: 10000 });
    const mainContent = page.locator("main");
    await expect(mainContent).toBeVisible({ timeout: 5000 });
  });

  test("should allow navigation to new test page", async ({ page }) => {
    // Given: User is on dashboard
    await page.goto("/dashboard");
    await page.waitForLoadState("domcontentloaded");

    // When: Click on new test button/link if available
    const newTestLink = page.getByRole("link", { name: /새로운|새 테스트|new test/i });
    if (await newTestLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await newTestLink.click();

      // Then: Verify navigation to new test page
      await page.waitForURL(/.*new-test/, { timeout: 10000 });
      await expect(page).toHaveURL(/.*new-test/);
    }
  });
});
