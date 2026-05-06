import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { isDemoMode } from "./demoMode";

const SIGNED_URL_TTL_SECONDS = 5 * 60;
const S3_DOWNLOAD_TTL_SECONDS = 60;
const SCAN_CLEAN_STATUSES = new Set(["clean", "ok", "passed"]);
const SCAN_MALICIOUS_STATUSES = new Set(["malicious", "infected", "virus", "threat"]);

const MIME_SIGNATURES = [
  {
    mimeType: "application/pdf",
    extension: ".pdf",
    matches(buffer) {
      return buffer.length >= 5 && buffer.subarray(0, 5).toString("ascii") === "%PDF-";
    },
  },
  {
    mimeType: "image/jpeg",
    extension: ".jpg",
    matches(buffer) {
      return (
        buffer.length >= 3 &&
        buffer[0] === 0xff &&
        buffer[1] === 0xd8 &&
        buffer[2] === 0xff
      );
    },
  },
  {
    mimeType: "image/png",
    extension: ".png",
    matches(buffer) {
      return (
        buffer.length >= 8 &&
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47 &&
        buffer[4] === 0x0d &&
        buffer[5] === 0x0a &&
        buffer[6] === 0x1a &&
        buffer[7] === 0x0a
      );
    },
  },
  {
    mimeType: "image/webp",
    extension: ".webp",
    matches(buffer) {
      return (
        buffer.length >= 12 &&
        buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
        buffer.subarray(8, 12).toString("ascii") === "WEBP"
      );
    },
  },
];

let s3Client = null;

function getRuntimeEnvironment() {
  return String(
    process.env.NEXT_PUBLIC_APP_ENV || process.env.APP_ENV || process.env.NODE_ENV || "development",
  )
    .trim()
    .toLowerCase();
}

function getReferralSigningSecret() {
  const configuredSecret = process.env.REFERRAL_FILE_SIGNING_SECRET;
  if (configuredSecret) {
    return configuredSecret;
  }

  const environment = getRuntimeEnvironment();
  if (environment !== "development" && environment !== "test") {
    throw new Error(
      "REFERRAL_FILE_SIGNING_SECRET must be set outside development and test environments.",
    );
  }

  return process.env.AUTH_SECRET || "dev-referral-secret";
}

export class ReferralFileScanError extends Error {
  constructor(message, scanStatus = "scan_failed", scanDetails = null) {
    super(message);
    this.name = "ReferralFileScanError";
    this.code = "REFERRAL_FILE_SCAN_REJECTED";
    this.statusCode = 400;
    this.scanStatus = scanStatus;
    this.scanDetails = scanDetails;
  }
}

function signReferralFile(fileId, expires) {
  return createHmac("sha256", getReferralSigningSecret())
    .update(`${fileId}:${expires}`)
    .digest("hex");
}

function getObjectKey(fileId) {
  return `referrals/${fileId}`;
}

function isSafeHex(value) {
  return typeof value === "string" && /^[a-f0-9]+$/i.test(value);
}

function sanitizeMetadataValue(value, fallback = "") {
  return String(value || fallback)
    .slice(0, 200)
    .replace(/[^A-Za-z0-9._ -]/g, "_");
}

async function parseScanResponse(response) {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return response.json().catch(() => null);
  }

  const text = await response.text().catch(() => "");
  return text ? { status: text } : null;
}

async function scanReferralFile({
  fileId,
  buffer,
  mimeType,
  originalFileName,
}) {
  if (isDemoMode()) {
    return { status: "clean", provider: "demo", fileId };
  }

  const scanUrl = process.env.REFERRAL_MALWARE_SCAN_URL;
  if (!scanUrl) {
    throw new ReferralFileScanError(
      "Upload rejected because malware scanning is unavailable.",
      "scan_failed",
    );
  }

  const response = await fetch(scanUrl, {
    method: "POST",
    headers: {
      "content-type": "application/octet-stream",
      "x-file-id": String(fileId),
      "x-file-mime-type": String(mimeType),
      "x-file-name": sanitizeMetadataValue(originalFileName, `referral-${fileId}`),
      ...(process.env.REFERRAL_MALWARE_SCAN_API_KEY
        ? { authorization: `Bearer ${process.env.REFERRAL_MALWARE_SCAN_API_KEY}` }
        : {}),
    },
    body: buffer,
    cache: "no-store",
  });

  const result = await parseScanResponse(response);
  const status = String(result?.status || "").trim().toLowerCase();

  if (!response.ok) {
    throw new ReferralFileScanError(
      "Upload rejected because the malware scan did not complete successfully.",
      "scan_failed",
      result,
    );
  }

  if (SCAN_CLEAN_STATUSES.has(status)) {
    return result;
  }

  if (SCAN_MALICIOUS_STATUSES.has(status)) {
    throw new ReferralFileScanError(
      "Upload rejected because malware was detected.",
      "malicious",
      result,
    );
  }

  throw new ReferralFileScanError(
    "Upload rejected because the malware scan returned an invalid status.",
    "scan_failed",
    result,
  );
}

function getS3Bucket() {
  const bucket = process.env.REFERRAL_S3_BUCKET;
  if (!bucket) {
    throw new Error("REFERRAL_S3_BUCKET is required for referral storage.");
  }
  return bucket;
}

function getS3Client() {
  if (s3Client) {
    return s3Client;
  }

  const region = process.env.REFERRAL_S3_REGION || process.env.AWS_REGION;
  if (!region) {
    throw new Error("REFERRAL_S3_REGION or AWS_REGION is required for referral storage.");
  }

  const clientConfig = {
    region,
  };

  if (process.env.REFERRAL_S3_ENDPOINT) {
    clientConfig.endpoint = process.env.REFERRAL_S3_ENDPOINT;
  }

  if (process.env.REFERRAL_S3_FORCE_PATH_STYLE === "true") {
    clientConfig.forcePathStyle = true;
  }

  if (process.env.REFERRAL_S3_ACCESS_KEY_ID && process.env.REFERRAL_S3_SECRET_ACCESS_KEY) {
    clientConfig.credentials = {
      accessKeyId: process.env.REFERRAL_S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.REFERRAL_S3_SECRET_ACCESS_KEY,
    };
  }

  s3Client = new S3Client(clientConfig);
  return s3Client;
}

function createReferralMetadata({
  fileId,
  ownerUserId,
  mimeType,
  extension,
  originalFileName,
}) {
  return {
    fileId,
    ownerUserId: String(ownerUserId || ""),
    mimeType,
    extension,
    originalFileName: originalFileName || null,
    createdAt: new Date().toISOString(),
  };
}

async function streamToBuffer(body) {
  if (!body) {
    return Buffer.alloc(0);
  }

  if (typeof body.transformToByteArray === "function") {
    return Buffer.from(await body.transformToByteArray());
  }

  const chunks = [];
  for await (const chunk of body) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
}

async function storeS3ReferralFile({ buffer, metadata }) {
  const client = getS3Client();
  const bucket = getS3Bucket();
  const objectKey = getObjectKey(metadata.fileId);
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: objectKey,
    Body: buffer,
    ContentType: metadata.mimeType,
    Metadata: {
      owneruserid: sanitizeMetadataValue(metadata.ownerUserId),
      originalfilename: sanitizeMetadataValue(metadata.originalFileName, `referral${metadata.extension}`),
      extension: sanitizeMetadataValue(metadata.extension),
      createdat: sanitizeMetadataValue(metadata.createdAt),
    },
    ServerSideEncryption: process.env.REFERRAL_S3_KMS_KEY_ID ? "aws:kms" : "AES256",
    SSEKMSKeyId: process.env.REFERRAL_S3_KMS_KEY_ID || undefined,
  });

  await client.send(command);
}

async function readLocalReferralMetadata(fileId) {
  await mkdir(PRIVATE_UPLOAD_ROOT, { recursive: true });
  const metadataRaw = await readFile(getMetadataPath(fileId), "utf8");
  return JSON.parse(metadataRaw);
}

async function readS3ReferralMetadata(fileId) {
  const client = getS3Client();
  const bucket = getS3Bucket();
  const result = await client.send(
    new HeadObjectCommand({
      Bucket: bucket,
      Key: getObjectKey(fileId),
    }),
  );

  return {
    fileId,
    ownerUserId: result.Metadata?.owneruserid || "",
    originalFileName: result.Metadata?.originalfilename || null,
    extension: result.Metadata?.extension || "",
    createdAt: result.Metadata?.createdat || null,
    mimeType: result.ContentType || "application/octet-stream",
  };
}

export function sniffReferralMimeType(buffer) {
  for (const candidate of MIME_SIGNATURES) {
    if (candidate.matches(buffer)) {
      return candidate;
    }
  }
  return null;
}

export async function ensureReferralStorage() {
  if (isDemoMode()) {
    return;
  }

  getS3Client();
  getS3Bucket();
}

export async function storePrivateReferralFile({
  buffer,
  mimeType,
  originalFileName = null,
  ownerUserId,
}) {
  const detected = sniffReferralMimeType(buffer);
  if (!detected || detected.mimeType !== mimeType) {
    const error = new Error("Uploaded file content does not match the declared MIME type.");
    error.statusCode = 400;
    throw error;
  }

  const fileId = randomUUID();
  const metadata = createReferralMetadata({
    fileId,
    ownerUserId,
    mimeType: detected.mimeType,
    extension: detected.extension,
    originalFileName,
  });

  await scanReferralFile({
    fileId,
    buffer,
    mimeType: detected.mimeType,
    originalFileName,
  });

  if (isDemoMode()) {
    return {
      fileId,
      mimeType: detected.mimeType,
      url: createSignedReferralFileUrl(fileId),
      demo: true,
    };
  }

  await storeS3ReferralFile({ buffer, metadata });

  return {
    fileId,
    mimeType: detected.mimeType,
    url: createSignedReferralFileUrl(fileId),
  };
}

export async function readStoredReferralMetadata(fileId) {
  if (isDemoMode()) {
    return {
      fileId,
      ownerUserId: null,
      mimeType: "application/pdf",
      extension: ".pdf",
      originalFileName: "demo-referral.pdf",
      createdAt: new Date().toISOString(),
      demo: true,
    };
  }

  return readS3ReferralMetadata(fileId);
}

export async function readStoredReferralFile(fileId) {
  if (isDemoMode()) {
    const buffer = Buffer.from(
      "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 0>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n",
      "utf8",
    );
    return {
      buffer,
      filePath: null,
      metadata: await readStoredReferralMetadata(fileId),
      size: buffer.length,
    };
  }

  const client = getS3Client();
  const bucket = getS3Bucket();
  const result = await client.send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: getObjectKey(fileId),
    }),
  );
  const buffer = await streamToBuffer(result.Body);
  const metadata = await readS3ReferralMetadata(fileId);

  return {
    buffer,
    filePath: null,
    metadata,
    size: buffer.length,
  };
}

export async function deleteStoredReferralFile(fileId) {
  if (!fileId) {
    return false;
  }

  if (isDemoMode()) {
    return true;
  }

  const client = getS3Client();
  const bucket = getS3Bucket();
  await client.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: getObjectKey(fileId),
    }),
  );

  return true;
}

export async function createProviderReferralDownloadUrl(fileId, metadata) {
  if (isDemoMode()) {
    return null;
  }

  const client = getS3Client();
  const bucket = getS3Bucket();
  const downloadName = sanitizeMetadataValue(
    metadata?.originalFileName,
    `referral${metadata?.extension || ""}`,
  );

  return getSignedUrl(
    client,
    new GetObjectCommand({
      Bucket: bucket,
      Key: getObjectKey(fileId),
      ResponseContentType: metadata?.mimeType || "application/octet-stream",
      ResponseContentDisposition: `inline; filename="${downloadName}"`,
    }),
    { expiresIn: S3_DOWNLOAD_TTL_SECONDS },
  );
}

export function createSignedReferralFileUrl(fileId, ttlSeconds = SIGNED_URL_TTL_SECONDS) {
  const expires = Math.floor(Date.now() / 1000) + ttlSeconds;
  const sig = signReferralFile(fileId, expires);
  return `/api/referrals/files/${fileId}?expires=${expires}&sig=${sig}`;
}

export function verifySignedReferralFileUrl(fileId, expires, sig) {
  if (!fileId || !expires || !sig) {
    return false;
  }

  const expiry = Number.parseInt(String(expires), 10);
  if (!Number.isFinite(expiry) || expiry < Math.floor(Date.now() / 1000)) {
    return false;
  }

  if (!isSafeHex(sig)) {
    return false;
  }

  const expected = signReferralFile(fileId, expiry);
  const left = Buffer.from(expected, "utf8");
  const right = Buffer.from(String(sig), "utf8");

  if (left.length !== right.length) {
    return false;
  }

  return timingSafeEqual(left, right);
}

export function extractReferralFileId(value) {
  if (!value || typeof value !== "string") {
    return null;
  }

  if (value.startsWith("/api/referrals/files/")) {
    try {
      const parsed = new URL(value, "http://localhost");
      const parts = parsed.pathname.split("/");
      return parts[parts.length - 1] || null;
    } catch {
      return null;
    }
  }

  return null;
}
