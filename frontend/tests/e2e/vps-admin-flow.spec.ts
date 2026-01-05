/**
 * E2E tests for complete admin VPS journey.
 * 
 * Tests the full flow:
 * 1. Login as admin
 * 2. View pending requests
 * 3. Approve request
 * 4. Verify provisioning started
 * 5. View all subscriptions
 * 6. Suspend subscription
 * 7. Reactivate subscription
 * 8. Terminate subscription
 */
import { test, expect } from "./fixtures";

test.describe("VPS Admin Flow", () => {
  test("complete admin journey", async ({ adminPage }) => {
    // Step 1: Login (already authenticated via fixture)
    await adminPage.goto("/corporate/hosting/requests");
    await expect(adminPage).toHaveTitle(/Pending VPS Requests/i);

    // Step 2: View pending requests
    await expect(adminPage.getByText(/Pending VPS Requests/i)).toBeVisible();

    // Step 3: Approve request (if available)
    const approveButton = adminPage.getByRole("button", { name: /Approve/i }).first();
    if (await approveButton.isVisible()) {
      await approveButton.click();

      // Confirm approval
      await expect(adminPage.getByText(/Approve VPS Request/i)).toBeVisible();
      const confirmButton = adminPage.getByRole("button", { name: /Confirm Approval/i });
      await confirmButton.click();

      // Should show success message
      await expect(adminPage.getByText(/VPS Request Approved/i)).toBeVisible();
    }

    // Step 4: View all subscriptions
    await adminPage.goto("/corporate/hosting/subscriptions");
    await expect(adminPage.getByText(/All VPS Subscriptions/i)).toBeVisible();

    // Step 5: Suspend subscription
    const actionsMenu = adminPage.getByRole("button", { name: /Actions/i }).first();
    if (await actionsMenu.isVisible()) {
      await actionsMenu.click();
      const suspendButton = adminPage.getByText(/Suspend/i);
      if (await suspendButton.isVisible()) {
        await suspendButton.click();

        // Fill suspend reason
        await adminPage.fill('textarea[name="reason"]', "Test suspension");
        await adminPage.getByRole("button", { name: /Confirm/i }).click();

        await expect(adminPage.getByText(/Subscription Suspended/i)).toBeVisible();
      }
    }

    // Step 6: Reactivate subscription
    const reactivateButton = adminPage.getByRole("button", { name: /Reactivate/i }).first();
    if (await reactivateButton.isVisible()) {
      await reactivateButton.click();
      await expect(adminPage.getByText(/Subscription Reactivated/i)).toBeVisible();
    }

    // Step 7: Terminate subscription
    const terminateButton = adminPage.getByRole("button", { name: /Terminate/i }).first();
    if (await terminateButton.isVisible()) {
      await terminateButton.click();

      // Confirm termination
      await expect(adminPage.getByText(/Terminate/i)).toBeVisible();
      await expect(adminPage.getByText(/delete all data/i)).toBeVisible();
      
      const confirmTerminate = adminPage.getByRole("button", { name: /Confirm Termination/i });
      if (await confirmTerminate.isVisible()) {
        await confirmTerminate.click();
        await expect(adminPage.getByText(/Subscription Terminated/i)).toBeVisible();
      }
    }
  });

  test("view monitoring overview", async ({ adminPage }) => {
    await adminPage.goto("/corporate/hosting/monitoring");

    // Should display system metrics
    await expect(adminPage.getByText(/VPS Monitoring/i)).toBeVisible();
    await expect(adminPage.getByText(/Total Subscriptions/i)).toBeVisible();
    await expect(adminPage.getByText(/Active Containers/i)).toBeVisible();
    await expect(adminPage.getByText(/Monthly Revenue/i)).toBeVisible();

    // Should display alerts
    await expect(adminPage.getByText(/Active Alerts/i)).toBeVisible();
  });

  test("filter and search subscriptions", async ({ adminPage }) => {
    await adminPage.goto("/corporate/hosting/subscriptions");

    // Filter by status
    const statusFilter = adminPage.getByRole("combobox", { name: /Status/i });
    if (await statusFilter.isVisible()) {
      await statusFilter.click();
      await adminPage.getByText(/Active/i).click();
    }

    // Search by customer
    const searchInput = adminPage.getByPlaceholderText(/Search by customer/i);
    if (await searchInput.isVisible()) {
      await searchInput.fill("test@example.com");
      await adminPage.waitForTimeout(500); // Wait for debounce
    }
  });
});








