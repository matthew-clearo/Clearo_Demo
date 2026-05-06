/**
 * @vitest-environment node
 */

import crypto from "crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const phiQueryMock = vi.fn();
const phiTransactionMock = vi.fn();
const loggerErrorMock = vi.fn();

function encryptForTest(payload, hexKey) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-gcm", Buffer.from(hexKey, "hex"), iv);
  let encrypted = cipher.update(JSON.stringify(payload), "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

vi.mock("@neondatabase/serverless", () => ({
  neon: vi.fn(() => {
    phiQueryMock.transaction = phiTransactionMock;
    return phiQueryMock;
  }),
}));

vi.mock("@/app/api/utils/logger", () => ({
  default: {
    error: loggerErrorMock,
  },
}));

describe("phiVault audit enforcement", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    phiQueryMock.mockReset();
    phiTransactionMock.mockReset();
    process.env.PHI_VAULT_DATABASE_URL = "postgres://example.test/db";
    process.env.PHI_ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
    process.env.PHI_KEY_VERSION = "v1";
  });

  it("fails closed when a PHI read CTE query fails", async () => {
    const encrypted = encryptForTest({ email: "patient@example.com" }, process.env.PHI_ENCRYPTION_KEY);

    // First call: the token lookup succeeds
    phiQueryMock.mockResolvedValueOnce([
      {
        phi_record_id: 42,
        encrypted_data: encrypted,
        expires_at: null,
      },
    ]);

    // Second call: the CTE query (update + audit log) fails
    phiQueryMock.mockRejectedValueOnce(new Error("CTE audit/update failed"));

    // Third call (failure audit log) succeeds
    phiQueryMock.mockResolvedValueOnce([]);

    const { detokenizePHI } = await import("@/app/api/utils/phiVault");

    await expect(
      detokenizePHI("token-123", {
        userId: 7,
        requestPath: "/api/admin/patients/123",
      }),
    ).rejects.toThrow("Failed to detokenize PHI");

    expect(loggerErrorMock).toHaveBeenCalled();
  });

  it("writes durable delete audits before removing the PHI record", async () => {
    // First call: token lookup
    phiQueryMock.mockResolvedValueOnce([{ phi_record_id: 42 }]);

    // The delete path now uses sql.transaction(fn) with a non-interactive
    // function-returning-array pattern.  The mock receives the fn, calls it,
    // and returns a resolved promise.
    const txnFn = vi.fn().mockReturnValue("stub-query");
    phiTransactionMock.mockImplementationOnce((fn) => {
      const queries = fn(txnFn);
      // Verify the callback returns an array of queries
      expect(Array.isArray(queries)).toBe(true);
      expect(queries).toHaveLength(3);
      return Promise.resolve(queries);
    });

    const { deleteTokenizedPHI } = await import("@/app/api/utils/phiVault");

    await expect(
      deleteTokenizedPHI("token-123", {
        userId: 7,
        requestPath: "/api/admin/patients/123",
      }),
    ).resolves.toBe(true);

    expect(phiTransactionMock).toHaveBeenCalledOnce();
    // txnFn was called 3 times: audit log INSERT, DELETE tokens, DELETE phi
    expect(txnFn).toHaveBeenCalledTimes(3);
    expect(txnFn.mock.calls[0][0]).toContain("INSERT INTO phi_access_logs");
    expect(txnFn.mock.calls[1][0]).toContain("DELETE FROM phi_tokens");
    expect(txnFn.mock.calls[2][0]).toContain("DELETE FROM encrypted_phi");
  });

  it("uses the configured PHI key version for new writes", async () => {
    process.env.PHI_KEY_VERSION = "v7";

    // tokenizePHI now uses a single CTE query via phiVaultQuery (not transaction).
    // The mock just needs to return successfully for the CTE insert.
    phiQueryMock.mockResolvedValueOnce([]);

    const { tokenizePHI } = await import("@/app/api/utils/phiVault");

    const token = await tokenizePHI({ email: "patient@example.com" }, "booking", 9, {
      userId: 7,
      requestPath: "/api/bookings",
    });

    expect(typeof token).toBe("string");

    // The CTE query is a single call to phiQueryMock
    expect(phiQueryMock).toHaveBeenCalledOnce();

    // Verify the query contains all three operations
    const queryText = phiQueryMock.mock.calls[0][0];
    expect(queryText).toContain("INSERT INTO encrypted_phi");
    expect(queryText).toContain("INSERT INTO phi_tokens");
    expect(queryText).toContain("INSERT INTO phi_access_logs");

    // Verify the key version is passed correctly (2nd param)
    const params = phiQueryMock.mock.calls[0][1];
    expect(params[1]).toBe("v7");
  });
});
