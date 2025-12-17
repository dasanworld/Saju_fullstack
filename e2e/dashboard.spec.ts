import { test, expect } from "@playwright/test";

test.describe("Dashboard - 핵심 시나리오", () => {
  test("should display dashboard after authentication", async ({ page }) => {
    // Given: 인증된 사용자 상태
    // When: 대시보드 접근
    await page.goto("/dashboard");

    // Then: 대시보드 메인 콘텐츠 표시 확인
    await page.waitForLoadState("domcontentloaded");
    const mainContent = page.locator("main");
    await expect(mainContent).toBeVisible({ timeout: 5000 });
  });

  test("should handle API mocking for test creation", async ({ page }) => {
    // Given: AI 분석 API 모킹
    await page.route("**/api/test/stream/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        body: 'data: {"text": "사주 분석 결과"}\n\ndata: {"done": true}\n\n',
      });
    });

    // When: 대시보드 접근
    await page.goto("/dashboard");

    // Then: 대시보드 로드 완료
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("main")).toBeVisible({ timeout: 5000 });
  });
});
