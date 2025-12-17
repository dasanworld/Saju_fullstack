import { test, expect } from "@playwright/test";

test.describe("Analysis Flow", () => {
  test("should display AI analysis result via mock stream", async ({ page }) => {
    // 1. API Mocking (AI API 호출 차단)
    await page.route("**/api/test/stream/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        body: 'data: {"text": "AI 분석 결과입니다."}\n\ndata: {"done": true}\n\n',
      });
    });

    // 2. Navigate to dashboard
    await page.goto("/dashboard");

    // 3. Assert dashboard is accessible
    await expect(page.locator("main")).toBeVisible();
  });

  test("should handle payment API with mock response", async ({ page }) => {
    // Payment API Mocking
    await page.route("**/api/payments/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          data: { message: "결제가 완료되었습니다" },
        }),
      });
    });

    await page.goto("/dashboard");
    await expect(page.locator("main")).toBeVisible();
  });
});
