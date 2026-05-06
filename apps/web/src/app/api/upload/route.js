import { withFullProtectionAndCsrf } from "@/app/api/utils/ddosProtection";
import logger from "@/app/api/utils/logger";
import { auth } from "@/auth";
import {
  ReferralFileScanError,
  storePrivateReferralFile,
} from "@/app/api/utils/referralFiles";
import {
  MAX_UPLOAD_FILE_SIZE_BYTES,
  UPLOAD_FILE_TOO_LARGE_MESSAGE,
} from "@/utils/uploadLimits";
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export async function POST(request) {
  return withFullProtectionAndCsrf(request, "upload", async () => {
    try {
      const session = await auth(request);
      if (!session || !session.user?.id) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }

      const contentType = request.headers.get("content-type") || "";
      if (!contentType.includes("multipart/form-data")) {
        return Response.json(
          { error: "Only file uploads are supported." },
          { status: 400 },
        );
      }

      const formData = await request.formData();
      const file = formData.get("file");

      if (!(file instanceof File)) {
        return Response.json({ error: "No file provided." }, { status: 400 });
      }

      if (!ALLOWED_MIME_TYPES.has(file.type)) {
        return Response.json(
          { error: "Unsupported file type. Upload a PDF or image." },
          { status: 400 },
        );
      }

      if (file.size > MAX_UPLOAD_FILE_SIZE_BYTES) {
        return Response.json(
          { error: UPLOAD_FILE_TOO_LARGE_MESSAGE },
          { status: 413 },
        );
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const stored = await storePrivateReferralFile({
        buffer,
        mimeType: file.type,
        originalFileName: file.name || null,
        ownerUserId: session.user.id,
      });

      return Response.json({
        url: stored.url,
        mimeType: stored.mimeType,
      });
    } catch (error) {
      if (error instanceof ReferralFileScanError) {
        return Response.json(
          {
            error: error.message,
            code: error.code,
            scanStatus: error.scanStatus,
          },
          { status: 400 },
        );
      }

      logger.error({ err: error }, "POST /api/upload error");
      return Response.json(
        { error: "Could not upload file." },
        { status: 500 },
      );
    }
  });
}
