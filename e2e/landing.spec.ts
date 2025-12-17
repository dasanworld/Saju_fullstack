import { test, expect } from "@playwright/test";

test.describe("Landing Page", () => {
  test("should display main heading and CTA", async ({ page }) => {
    // Given
    await page.goto("/");

    // Then
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.getByRole("link", { name: /시작|Start/i })).toBeVisible();
  });

  test("should navigate to sign-in page", async ({ page }) => {
    // Given
    await page.goto("/");

    // When
    await page.getByRole("link", { name: /로그인|Sign in/i }).click();

    // Then
    await expect(page).toHaveURL(/.*sign-in/);
  });
});
