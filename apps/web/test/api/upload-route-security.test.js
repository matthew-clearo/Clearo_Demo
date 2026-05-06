/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  MAX_UPLOAD_FILE_SIZE_BYTES,
  UPLOAD_FILE_TOO_LARGE_MESSAGE,
} from "@/utils/uploadLimits";

const authMock = vi.fn();
const storePrivateReferralFileMock = vi.fn();

class ReferralFileScanError extends Error {
  constructor(message, scanStatus = "scan_failed") {
    super(message);
    this.name = "ReferralFileScanError";
    this.code = "REFERRAL_FILE_SCAN_REJECTED";
    this.statusCode = 400;
    this.scanStatus = scanStatus;
  }
}

vi.mock("@/auth", () => ({
  auth: authMock,
}));

vi.mock("@/app/api/utils/ddosProtection", () => ({
  withFullProtection: async (_request, _key, handler) => handler(),
  withFullProtectionAndCsrf: async (_request, _key, handler) => handler(),
}));

vi.mock("@/app/api/utils/logger", () => ({
  default: {
    error: vi.fn(),
  },
}));

vi.mock("@/app/api/utils/referralFiles", () => ({
  ReferralFileScanError,
  storePrivateReferralFile: storePrivateReferralFileMock,
}));

describe("POST /api/upload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when the malware scanner rejects the upload", async () => {
    authMock.mockResolvedValue({ user: { id: 42 } });
    storePrivateReferralFileMock.mockRejectedValueOnce(
      new ReferralFileScanError("Upload rejected because malware was detected.", "malicious"),
    );

    const formData = new FormData();
    formData.set(
      "file",
      new File([new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d])], "scan.pdf", {
        type: "application/pdf",
      }),
    );

    const { POST } = await import("@/app/api/upload/route");
    const response = await POST(
      new Request("http://localhost/api/upload", {
        method: "POST",
        body: formData,
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Upload rejected because malware was detected.",
      code: "REFERRAL_FILE_SCAN_REJECTED",
      scanStatus: "malicious",
    });
  });

  it("returns 413 when the file exceeds the 10 MB contract", async () => {
    authMock.mockResolvedValue({ user: { id: 42 } });

    const formData = new FormData();
    formData.set(
      "file",
      new File([new Uint8Array(MAX_UPLOAD_FILE_SIZE_BYTES + 1)], "scan.pdf", {
        type: "application/pdf",
      }),
    );

    const { POST } = await import("@/app/api/upload/route");
    const response = await POST(
      new Request("http://localhost/api/upload", {
        method: "POST",
        body: formData,
      }),
    );

    expect(response.status).toBe(413);
    await expect(response.json()).resolves.toEqual({
      error: UPLOAD_FILE_TOO_LARGE_MESSAGE,
    });
    expect(storePrivateReferralFileMock).not.toHaveBeenCalled();
  });
});
