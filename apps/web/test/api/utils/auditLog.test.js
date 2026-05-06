/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const sqlMock = vi.fn();
const loggerErrorMock = vi.fn();

vi.mock("@/app/api/utils/sql", () => ({
  default: sqlMock,
}));

vi.mock("@/app/api/utils/logger", () => ({
  default: {
    error: loggerErrorMock,
  },
}));

describe("auditLog", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    sqlMock.mockReset();
  });

  it("logs and continues for non-critical audit failures", async () => {
    sqlMock.mockRejectedValueOnce(new Error("db unavailable"));

    const { logAudit } = await import("@/app/api/utils/auditLog");

    await expect(
      logAudit({
        userId: 12,
        action: "BOOKING_CANCELLED",
        entityType: "booking",
        entityId: 44,
        request: new Request("http://localhost/api/bookings/44/cancel"),
      }),
    ).resolves.toBeUndefined();

    expect(loggerErrorMock).toHaveBeenCalledOnce();
  });

  it("fails closed for PHI audit failures", async () => {
    sqlMock.mockRejectedValueOnce(new Error("db unavailable"));

    const { logAudit, AuditLogWriteError } = await import("@/app/api/utils/auditLog");

    await expect(
      logAudit({
        userId: 1,
        action: "PHI_VIEWED",
        entityType: "phi_access",
        entityId: 9,
        request: new Request("http://localhost/api/referrals/files/file-id"),
      }),
    ).rejects.toBeInstanceOf(AuditLogWriteError);

    expect(loggerErrorMock).toHaveBeenCalledOnce();
  });
});
