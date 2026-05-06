import { expect, test } from "@playwright/test";
import { hasEnv, requireEnv } from "./helpers/env";

test.describe("clinic smoke", () => {
  test("clinic user can sign in and reach the dashboard", async ({ page }) => {
    const clinicEmail = requireEnv("E2E_CLINIC_EMAIL");
    const clinicPassword = requireEnv("E2E_CLINIC_PASSWORD");
    const clinicMfaCode = process.env.E2E_CLINIC_MFA_CODE || "";

    await page.goto("/clinic-admin/signin");

    await expect(page.getByRole("heading", { name: "Clinic Portal Sign In" })).toBeVisible();
    await page.getByPlaceholder("you@clinic.com").fill(clinicEmail);
    await page.getByPlaceholder("Password").fill(clinicPassword);
    await page.getByRole("button", { name: "Sign In" }).click();

    if (hasEnv("E2E_CLINIC_MFA_CODE")) {
      const challengeHeading = page.getByRole("heading", { name: "Clinic MFA verification" });
      if (await challengeHeading.isVisible({ timeout: 5000 }).catch(() => false)) {
        await page.getByPlaceholder("000000 or backup code").fill(clinicMfaCode);
        await page.getByRole("button", { name: /Verify and continue/i }).click();
      }
    }

    await page.waitForURL("**/clinic-admin/dashboard**");
    await expect(page).toHaveURL(/\/clinic-admin\/dashboard/);
    await expect(page.getByText("Clinic Dashboard")).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Team access")).toBeVisible({ timeout: 15000 });
  });
});
