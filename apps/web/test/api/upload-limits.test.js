/**
 * @vitest-environment node
 */

import { describe, expect, it } from "vitest";

import {
  DEFAULT_API_BODY_LIMIT_BYTES,
  MAX_UPLOAD_FILE_SIZE_BYTES,
  getApiBodyLimitBytes,
} from "@/utils/uploadLimits";

describe("uploadLimits", () => {
  it("keeps the default API body limit for non-upload routes", () => {
    expect(getApiBodyLimitBytes("/api/bookings")).toBe(DEFAULT_API_BODY_LIMIT_BYTES);
  });

  it("uses the 10 MB upload limit for upload routes", () => {
    expect(getApiBodyLimitBytes("/api/upload")).toBe(MAX_UPLOAD_FILE_SIZE_BYTES);
  });

  it("treats nested upload paths as upload routes", () => {
    expect(getApiBodyLimitBytes("/api/upload/presign")).toBe(MAX_UPLOAD_FILE_SIZE_BYTES);
  });
});
