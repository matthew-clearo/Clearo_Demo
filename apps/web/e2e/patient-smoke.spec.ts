import { expect, test } from "@playwright/test";
import { requireEnv } from "./helpers/env";

test.describe("patient smoke", () => {
  test("patient can sign in, open search, and view a clinic detail page", async ({
    page,
  }) => {
    const patientEmail = requireEnv("E2E_PATIENT_EMAIL");
    const patientPassword = requireEnv("E2E_PATIENT_PASSWORD");

    await page.goto("/account/signin?callbackUrl=/search");

    await expect(page.getByRole("heading", { name: "Sign in to Clearo" })).toBeVisible();
    await page.getByPlaceholder("you@example.com").fill(patientEmail);
    await page.getByPlaceholder("Enter your password").fill(patientPassword);
    await page.getByRole("button", { name: "Sign In" }).click();

    await page.waitForURL("**/search**");
    await expect(page).toHaveURL(/\/search/);

    const clinicLink = page.locator('a[href^="/clinic/"]').first();
    await expect(clinicLink).toBeVisible({ timeout: 15000 });
    await clinicLink.click();

    await page.waitForURL("**/clinic/**");
    await expect(page).toHaveURL(/\/clinic\//);
    await expect(
      page.getByRole("button", { name: /book/i }).first(),
    ).toBeVisible({ timeout: 15000 });
  });
});
