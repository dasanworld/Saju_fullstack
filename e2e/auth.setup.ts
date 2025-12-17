import { test as setup, expect } from "@playwright/test";

const AUTH_FILE = "playwright/.auth/user.json";

setup("authenticate", async ({ page }) => {
  await page.goto("/sign-in");

  await page.getByLabel("Email address").fill(process.env.TEST_USER_EMAIL || "test@example.com");
  await page.getByRole("button", { name: "Continue" }).click();

  await page.getByLabel("Password").fill(process.env.TEST_USER_PASSWORD || "testpassword123");
  await page.getByRole("button", { name: "Continue" }).click();

  await page.waitForURL("/dashboard", { timeout: 10000 });

  await expect(page).toHaveURL(/.*dashboard/);

  await page.context().storageState({ path: AUTH_FILE });
});
