import { test, expect } from "@playwright/test";

test.describe("Landing Page", () => {
  test("should display main heading and CTA", async ({ page }) => {
    // Given: Navigate to landing page
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    // Then: Verify main content is visible
    const heading = page.locator("h1").first();
    await expect(heading).toBeVisible({ timeout: 5000 });
    await expect(heading).toHaveText(/사주|Saju|divination/i);

    // And: Verify call-to-action button is visible
    const ctaButton = page.getByRole("link", { name: /시작|start/i });
    await expect(ctaButton).toBeVisible({ timeout: 5000 });
  });

  test("should navigate to sign-in page", async ({ page }) => {
    // Given: Navigate to landing page
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    // When: Click sign-in link
    const signInLink = page.getByRole("link", { name: /로그인|sign in/i });
    await expect(signInLink).toBeVisible({ timeout: 5000 });
    await signInLink.click();

    // Then: Verify navigation to sign-in page
    await page.waitForURL(/.*sign-in/, { timeout: 10000 });
    await expect(page).toHaveURL(/.*sign-in/);

    // And: Verify Clerk sign-in component is loaded
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible({ timeout: 5000 });
  });

  test("should navigate to sign-up page from landing", async ({ page }) => {
    // Given: Navigate to landing page
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    // When: Click sign-up link
    const signUpLink = page.getByRole("link", { name: /회원가입|sign up/i });
    await expect(signUpLink).toBeVisible({ timeout: 5000 });
    await signUpLink.click();

    // Then: Verify navigation to sign-up page
    await page.waitForURL(/.*sign-up/, { timeout: 10000 });
    await expect(page).toHaveURL(/.*sign-up/);

    // And: Verify Clerk sign-up component is loaded
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible({ timeout: 5000 });
  });
});
