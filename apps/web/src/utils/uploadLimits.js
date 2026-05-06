export const BYTES_PER_MB = 1024 * 1024;

export const DEFAULT_API_BODY_LIMIT_BYTES = Math.floor(4.5 * BYTES_PER_MB);
export const MAX_UPLOAD_FILE_SIZE_BYTES = 10 * BYTES_PER_MB;
export const MAX_UPLOAD_FILE_SIZE_LABEL = "10 MB";
export const UPLOAD_FILE_TOO_LARGE_MESSAGE = `Upload failed: Files must be ${MAX_UPLOAD_FILE_SIZE_LABEL} or smaller.`;

export function isUploadApiPath(path = "") {
  return path === "/api/upload" || path.startsWith("/api/upload/");
}

export function getApiBodyLimitBytes(path = "") {
  return isUploadApiPath(path)
    ? MAX_UPLOAD_FILE_SIZE_BYTES
    : DEFAULT_API_BODY_LIMIT_BYTES;
}
