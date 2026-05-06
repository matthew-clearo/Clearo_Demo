/**
 * @vitest-environment node
 */

import { describe, expect, it } from "vitest";
import { validateMigrations } from "../scripts/validate-migrations.mjs";

describe("migration layout", () => {
  it("keeps apps/web migrations self-contained and canonical", async () => {
    await expect(validateMigrations()).resolves.toBeUndefined();
  });
});
