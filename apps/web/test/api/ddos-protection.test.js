/**
 * @vitest-environment node
 */

import { describe, expect, it } from "vitest";

import { checkDDoSProtection } from "@/app/api/utils/ddosProtection";
import { MAX_UPLOAD_FILE_SIZE_BYTES } from "@/utils/uploadLimits";

describe("checkDDoSProtection", () => {
  it("allows absolute requests without an exposed Host header", async () => {
    const request = new Request("http://example.com/api/clinics?city=Sydney");

    const result = await checkDDoSProtection(request);

    expect(result).toBeNull();
  });

  it("uses the multipart upload limit even when the content type includes a boundary", async () => {
    const request = new Request("http://example.com/api/upload", {
      method: "POST",
      headers: {
        "content-type": "multipart/form-data; boundary=----codex",
        "content-length": String(MAX_UPLOAD_FILE_SIZE_BYTES),
      },
    });

    const result = await checkDDoSProtection(request);

    expect(result).toBeNull();
  });

  it("rejects multipart uploads larger than 10 MB", async () => {
    const request = new Request("http://example.com/api/upload", {
      method: "POST",
      headers: {
        "content-type": "multipart/form-data; boundary=----codex",
        "content-length": String(MAX_UPLOAD_FILE_SIZE_BYTES + 1),
      },
    });

    const result = await checkDDoSProtection(request);

    expect(result?.status).toBe(413);
  });
});
