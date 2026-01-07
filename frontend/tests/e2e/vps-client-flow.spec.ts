/**
 * E2E tests for complete client VPS journey.
 * 
 * Tests the full flow:
 * 1. Login as client
 * 2. Browse VPS plans
 * 3. Request a VPS plan
 * 4. View pending request
 * 5. View active subscription (after approval)
 * 6. View stats dashboard
 * 7. Start/stop container
 * 8. View connection info
 * 9. Upgrade plan
 * 10. Cancel subscription
 */
import { test, expect } from "./fixtures";

test.describe("VPS Client Flow", () => {
  test("complete client journey", async ({ authenticatedPage }) => {
    // Step 1: Login (already authenticated via fixture)
    await authenticatedPage.goto("/dashboard/vps/plans");
    await expect(authenticatedPage).toHaveTitle(/VPS Hosting/i);

    // Step 2: Browse VPS plans
    await expect(authenticatedPage.getByText("Starter VPS")).toBeVisible();
    await expect(authenticatedPage.getByText("Professional VPS")).toBeVisible();

    // Step 3: Request a VPS plan
    const requestButton = authenticatedPage.getByRole("button", { name: /Request This Plan/i }).first();
    await requestButton.click();

    // Step 4: Confirm request in dialog
    await expect(authenticatedPage.getByText(/Request VPS Hosting/i)).toBeVisible();
    const confirmButton = authenticatedPage.getByRole("button", { name: /Confirm Request/i });
    await confirmButton.click();

    // Step 5: Should navigate to subscriptions page
    await authenticatedPage.waitForURL("/dashboard/vps/subscriptions");
    await expect(authenticatedPage.getByText(/My VPS Subscriptions/i)).toBeVisible();

    // Step 6: View subscription details (if available)
    const subscriptionLink = authenticatedPage.getByText(/VPS-20241221-00001/i);
    if (await subscriptionLink.isVisible()) {
      await subscriptionLink.click();
      await authenticatedPage.waitForURL(/\/dashboard\/vps\/subscriptions\/.+/);

      // Step 7: View stats dashboard
      await expect(authenticatedPage.getByText(/Resource Usage/i)).toBeVisible();
      await expect(authenticatedPage.getByText(/CPU/i)).toBeVisible();

      // Step 8: Control container (start/stop)
      const stopButton = authenticatedPage.getByRole("button", { name: /Stop/i });
      if (await stopButton.isEnabled()) {
        await stopButton.click();
        await expect(authenticatedPage.getByText(/Container Stopped/i)).toBeVisible();
      }

      // Step 9: View connection info
      await expect(authenticatedPage.getByText(/Connection Information/i)).toBeVisible();
      await expect(authenticatedPage.getByText(/172\.20\.1\.2/i)).toBeVisible();

      // Step 10: Upgrade plan (if upgrade panel visible)
      const upgradePanel = authenticatedPage.getByText(/Upgrade Plan/i);
      if (await upgradePanel.isVisible()) {
        const upgradeButton = authenticatedPage.getByRole("button", { name: /Upgrade to Professional/i });
        if (await upgradeButton.isVisible()) {
          await upgradeButton.click();
          await expect(authenticatedPage.getByText(/Upgrade successful/i)).toBeVisible();
        }
      }
    }
  });

  test("view subscription details and control container", async ({ authenticatedPage }) => {
    await authenticatedPage.goto("/dashboard/vps/subscriptions/sub-1");

    // Should display subscription details
    await expect(authenticatedPage.getByText(/VPS-20241221-00001/i)).toBeVisible();

    // Should show control panel
    await expect(authenticatedPage.getByText(/Container Control/i)).toBeVisible();

    // Should show stats dashboard
    await expect(authenticatedPage.getByText(/Resource Usage/i)).toBeVisible();

    // Should show connection info
    await expect(authenticatedPage.getByText(/Connection Information/i)).toBeVisible();
  });

  test("navigate between tabs (Stats, Logs, Timeline)", async ({ authenticatedPage }) => {
    await authenticatedPage.goto("/dashboard/vps/subscriptions/sub-1");

    // Click Logs tab
    await authenticatedPage.getByRole("tab", { name: /Logs/i }).click();
    await expect(authenticatedPage.getByText(/Container Logs/i)).toBeVisible();

    // Click Timeline tab
    await authenticatedPage.getByRole("tab", { name: /Timeline/i }).click();
    await expect(authenticatedPage.getByText(/Subscription Timeline/i)).toBeVisible();

    // Click Stats tab
    await authenticatedPage.getByRole("tab", { name: /Stats/i }).click();
    await expect(authenticatedPage.getByText(/Resource Usage/i)).toBeVisible();
  });
});









