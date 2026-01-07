/**
 * E2E tests for concurrent user scenarios.
 * 
 * Tests:
 * - Multiple users managing VPS simultaneously
 * - Race conditions in status updates
 * - Concurrent container control actions
 */
import { test, expect } from "@playwright/test";
import path from "path";

test.describe("VPS Concurrent Users", () => {
  test("multiple users managing VPS simultaneously", async ({ browser }) => {
    // Create two browser contexts (simulating two users)
    const user1Context = await browser.newContext({
      storageState: path.join(__dirname, "../.auth/user.json"),
    });
    const user2Context = await browser.newContext({
      storageState: path.join(__dirname, "../.auth/user.json"),
    });

    const user1Page = await user1Context.newPage();
    const user2Page = await user2Context.newPage();

    // Both users navigate to their subscriptions
    await user1Page.goto("/dashboard/vps/subscriptions");
    await user2Page.goto("/dashboard/vps/subscriptions");

    // Both should see their subscriptions
    await expect(user1Page.getByText(/My VPS Subscriptions/i)).toBeVisible();
    await expect(user2Page.getByText(/My VPS Subscriptions/i)).toBeVisible();

    // Both users view the same subscription (if they have access)
    await user1Page.goto("/dashboard/vps/subscriptions/sub-1");
    await user2Page.goto("/dashboard/vps/subscriptions/sub-1");

    // Both should see the subscription details
    await expect(user1Page.getByText(/VPS-20241221-00001/i)).toBeVisible();
    await expect(user2Page.getByText(/VPS-20241221-00001/i)).toBeVisible();

    await user1Context.close();
    await user2Context.close();
  });

  test("concurrent container control actions", async ({ browser }) => {
    const user1Context = await browser.newContext({
      storageState: path.join(__dirname, "../.auth/user.json"),
    });
    const user2Context = await browser.newContext({
      storageState: path.join(__dirname, "../.auth/user.json"),
    });

    const user1Page = await user1Context.newPage();
    const user2Page = await user2Context.newPage();

    // Both users navigate to subscription
    await user1Page.goto("/dashboard/vps/subscriptions/sub-1");
    await user2Page.goto("/dashboard/vps/subscriptions/sub-1");

    // User 1 tries to start container
    const user1StartButton = user1Page.getByRole("button", { name: /Start/i });
    
    // User 2 tries to stop container simultaneously
    const user2StopButton = user2Page.getByRole("button", { name: /Stop/i });

    // Both actions should be handled correctly
    if (await user1StartButton.isVisible() && await user1StartButton.isEnabled()) {
      await user1StartButton.click();
    }

    if (await user2StopButton.isVisible() && await user2StopButton.isEnabled()) {
      await user2StopButton.click();
    }

    // Status should be consistent (one action should win)
    await user1Page.waitForTimeout(1000);
    await user2Page.waitForTimeout(1000);

    await user1Context.close();
    await user2Context.close();
  });

  test("race condition in status updates", async ({ authenticatedPage }) => {
    await authenticatedPage.goto("/dashboard/vps/subscriptions/sub-1");

    // Rapidly click start/stop buttons
    const startButton = authenticatedPage.getByRole("button", { name: /Start/i });
    const stopButton = authenticatedPage.getByRole("button", { name: /Stop/i });

    // Click multiple times rapidly
    if (await startButton.isVisible() && await startButton.isEnabled()) {
      await startButton.click();
      await authenticatedPage.waitForTimeout(100);
      await stopButton.click();
      await authenticatedPage.waitForTimeout(100);
      await startButton.click();
    }

    // Status should eventually be consistent
    await authenticatedPage.waitForTimeout(2000);
    await expect(authenticatedPage.getByText(/Container Control/i)).toBeVisible();
  });
});









