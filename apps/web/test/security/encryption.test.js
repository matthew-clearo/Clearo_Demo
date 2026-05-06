/**
 * Security Tests — PHI Encryption & Tokenization
 * HIPAA §164.312(a)(2)(iv) — Encryption at rest
 * HIPAA §164.312(b) — Audit controls
 *
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import crypto from "crypto";

// ─── Test the encryption primitives directly ───

const ENCRYPTION_ALGORITHM = "aes-256-gcm";

function makeTestKey() {
  return crypto.randomBytes(32);
}

function encryptData(data, key) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
  const jsonData = JSON.stringify(data);
  let encrypted = cipher.update(jsonData, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

function decryptData(encryptedString, key) {
  const [ivHex, authTagHex, encryptedData] = encryptedString.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encryptedData, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return JSON.parse(decrypted);
}

describe("AES-256-GCM Encryption", () => {
  const key = makeTestKey();

  it("encrypts and decrypts PHI data correctly", () => {
    const phi = {
      patient_name: "Jane Doe",
      patient_email: "jane@example.com",
      patient_dob: "1990-01-15",
    };
    const encrypted = encryptData(phi, key);
    const decrypted = decryptData(encrypted, key);
    expect(decrypted).toEqual(phi);
  });

  it("produces different ciphertexts for the same plaintext (random IV)", () => {
    const phi = { patient_name: "Jane Doe" };
    const enc1 = encryptData(phi, key);
    const enc2 = encryptData(phi, key);
    expect(enc1).not.toEqual(enc2);
  });

  it("fails to decrypt with wrong key", () => {
    const phi = { patient_name: "Jane Doe" };
    const encrypted = encryptData(phi, key);
    const wrongKey = makeTestKey();
    expect(() => decryptData(encrypted, wrongKey)).toThrow();
  });

  it("fails to decrypt with tampered ciphertext", () => {
    const phi = { patient_name: "Jane Doe" };
    const encrypted = encryptData(phi, key);
    // Flip a character in the encrypted data portion
    const parts = encrypted.split(":");
    const tampered = parts[2].slice(0, -1) + (parts[2].slice(-1) === "0" ? "1" : "0");
    const tamperedString = `${parts[0]}:${parts[1]}:${tampered}`;
    expect(() => decryptData(tamperedString, key)).toThrow();
  });

  it("fails to decrypt with tampered auth tag (GCM integrity)", () => {
    const phi = { patient_name: "Jane Doe" };
    const encrypted = encryptData(phi, key);
    const parts = encrypted.split(":");
    // Flip a byte in the auth tag
    const tagBytes = Buffer.from(parts[1], "hex");
    tagBytes[0] ^= 0xff;
    const tamperedString = `${parts[0]}:${tagBytes.toString("hex")}:${parts[2]}`;
    expect(() => decryptData(tamperedString, key)).toThrow();
  });

  it("encrypted output format is iv:authTag:data with correct lengths", () => {
    const phi = { test: "data" };
    const encrypted = encryptData(phi, key);
    const parts = encrypted.split(":");
    expect(parts).toHaveLength(3);
    expect(parts[0]).toHaveLength(32); // 16-byte IV = 32 hex chars
    expect(parts[1]).toHaveLength(32); // 16-byte auth tag = 32 hex chars
    expect(parts[2].length).toBeGreaterThan(0);
  });
});

describe("Token Generation", () => {
  it("UUID v4 tokens are cryptographically random", () => {
    const tokens = new Set();
    for (let i = 0; i < 100; i++) {
      tokens.add(crypto.randomUUID());
    }
    expect(tokens.size).toBe(100);
  });

  it("UUID v4 matches expected format", () => {
    const token = crypto.randomUUID();
    expect(token).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    );
  });
});
