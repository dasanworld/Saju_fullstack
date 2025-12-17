import { test as setup, expect } from "@playwright/test";

const AUTH_FILE = "playwright/.auth/user.json";

setup("authenticate", async ({ page }) => {
  const testEmail = process.env.TEST_USER_EMAIL || "test@example.com";
  const testPassword = process.env.TEST_USER_PASSWORD || "testpassword123";

  await page.goto("/sign-in");
  await page.waitForLoadState("domcontentloaded");

  // 이메일 입력
  const emailInput = page.locator('input[type="email"]').first();
  await emailInput.waitFor({ state: "visible", timeout: 5000 });
  await emailInput.fill(testEmail);
  await page.getByRole("button", { name: /^Continue$/, exact: true }).click();

  // 비밀번호 입력
  const passwordInput = page.locator('input[type="password"]');
  await passwordInput.waitFor({ state: "visible", timeout: 5000 });
  await passwordInput.fill(testPassword);
  await page.getByRole("button", { name: /^Continue$/, exact: true }).last().click();

  // 대시보드로 리다이렉트 확인
  await page.waitForURL(/.*dashboard/, { timeout: 15000 });
  await expect(page).toHaveURL(/.*dashboard/);

  // 인증 상태 저장
  await page.context().storageState({ path: AUTH_FILE });
});
