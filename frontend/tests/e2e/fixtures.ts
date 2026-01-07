/**
 * Playwright fixtures for E2E tests.
 * 
 * Provides authenticated pages and test data helpers.
 */
import { test as base } from "@playwright/test";
import path from "path";

// Extend base test with custom fixtures
export const test = base.extend({
  // Authenticated page as client user
  authenticatedPage: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: path.join(__dirname, "../.auth/user.json"),
    });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },

  // Authenticated page as admin user
  adminPage: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: path.join(__dirname, "../.auth/admin.json"),
    });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },
});

export { expect } from "@playwright/test";









