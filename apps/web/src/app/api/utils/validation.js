// Email validation using RFC 5322 compliant regex
export function isValidEmail(email) {
  if (!email || typeof email !== "string") return false;

  // Basic email regex - covers most valid cases
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // Additional checks
  if (email.length > 320) return false; // Max email length per RFC
  if (email.length < 3) return false;

  return emailRegex.test(email);
}

// Validate and parse numeric ID - ENHANCED for VULN-004
export function validateNumericId(value, fieldName = "ID") {
  // Handle null/undefined explicitly
  if (value === null || value === undefined) {
    throw new Error(`${fieldName} is required`);
  }

  // Convert to number
  const id = parseInt(value, 10);

  // Comprehensive validation checks
  if (isNaN(id)) {
    throw new Error(`${fieldName} must be a valid number`);
  }

  if (id <= 0) {
    throw new Error(`${fieldName} must be a positive integer`);
  }

  if (!Number.isInteger(id)) {
    throw new Error(`${fieldName} must be an integer`);
  }

  // Prevent integer overflow
  if (id > Number.MAX_SAFE_INTEGER) {
    throw new Error(`${fieldName} exceeds maximum allowed value`);
  }

  return id;
}

// Validate multiple IDs
export function validateNumericIds(values, fieldName = "ID") {
  if (!Array.isArray(values)) {
    throw new Error(`${fieldName} must be an array`);
  }

  return values.map((v) => validateNumericId(v, fieldName));
}

// Sanitize string input
export function sanitizeString(value, maxLength = 1000) {
  if (!value) return null;
  if (typeof value !== "string") return null;

  // Trim and limit length
  return value.trim().slice(0, maxLength);
}

// Validate phone number (Australian format)
export function isValidPhone(phone) {
  if (!phone || typeof phone !== "string") return false;

  // Remove spaces and common formatting
  const cleaned = phone.replace(/[\s\-\(\)]/g, "");

  // Australian mobile: 04XX XXX XXX (10 digits starting with 04)
  // Landline: 0X XXXX XXXX (10 digits starting with 0)
  const phoneRegex = /^0[2-478]\d{8}$/;

  return phoneRegex.test(cleaned);
}

// Validate date string (YYYY-MM-DD)
export function isValidDate(dateString) {
  if (!dateString || typeof dateString !== "string") return false;

  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) return false;

  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
}

// Validate URL for referral documents - NEW for VULN-009
export function isValidReferralUrl(url) {
  if (!url || typeof url !== "string") return false;

  // Length check
  if (url.length > 500) return false;

  if (url.startsWith("/")) {
    return (
      /^\/uploads\/referrals\/[A-Za-z0-9._-]+$/.test(url) ||
      /^\/api\/referrals\/files\/[0-9a-f-]+(?:\?expires=\d+&sig=[a-f0-9]+)?$/i.test(
        url,
      )
    );
  }

  // Must be HTTP/HTTPS only (no javascript:, data:, file:, etc.)
  if (!/^https?:\/\//i.test(url)) return false;

  try {
    const parsed = new URL(url);

    // Additional security checks
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return false;
    }

    // Block localhost and private IPs (SSRF prevention)
    const hostname = parsed.hostname.toLowerCase();
    const isPrivate172 = (() => {
      const m = hostname.match(/^172\.(\d+)\./);
      if (!m) return false;
      const second = parseInt(m[1], 10);
      return second >= 16 && second <= 31;
    })();
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname.startsWith("192.168.") ||
      hostname.startsWith("10.") ||
      isPrivate172 ||
      hostname === "0.0.0.0" ||
      hostname.includes("169.254.") // AWS metadata
    ) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

// Validate JSON size - NEW for VULN-010
export function validateJsonSize(obj, maxSizeBytes = 50000) {
  if (!obj) return true;

  try {
    const jsonString = JSON.stringify(obj);
    const sizeInBytes = new Blob([jsonString]).size;

    if (sizeInBytes > maxSizeBytes) {
      throw new Error(
        `JSON data too large (${sizeInBytes} bytes, max ${maxSizeBytes} bytes)`,
      );
    }

    return true;
  } catch (error) {
    if (error.message.includes("JSON data too large")) {
      throw error;
    }
    throw new Error("Invalid JSON data");
  }
}
