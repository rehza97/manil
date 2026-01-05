/**
 * Authentication setup for E2E tests.
 * 
 * Creates test users and stores auth tokens in storage state.
 */
import { test as setup, expect } from "@playwright/test";
import path from "path";

const authFile = path.join(__dirname, "../.auth/user.json");

setup("authenticate as client user", async ({ page }) => {
  // Navigate to login page
  await page.goto("/login");

  // Fill in login form (adjust selectors based on your login form)
  await page.fill('input[name="email"]', "client@test.com");
  await page.fill('input[name="password"]', "testpassword123");
  await page.click('button[type="submit"]');

  // Wait for successful login (adjust selector based on your app)
  await page.waitForURL("/dashboard");

  // Save signed-in state
  await page.context().storageState({ path: authFile });
});

setup("authenticate as admin user", async ({ page }) => {
  // Navigate to login page
  await page.goto("/login");

  // Fill in login form
  await page.fill('input[name="email"]', "admin@test.com");
  await page.fill('input[name="password"]', "adminpassword123");
  await page.click('button[type="submit"]');

  // Wait for successful login
  await page.waitForURL("/corporate");

  // Save signed-in state
  const adminAuthFile = path.join(__dirname, "../.auth/admin.json");
  await page.context().storageState({ path: adminAuthFile });
});








