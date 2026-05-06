/**
 * UUID Validation Utilities
 * Validates and sanitizes UUID v4 identifiers for secure patient/booking ID handling
 */

const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Validate that a value is a properly formatted UUID v4
 * @param {string} value - The value to validate
 * @param {string} fieldName - Name of the field for error messages
 * @returns {string} - The validated UUID
 * @throws {Error} - If validation fails
 */
export function validateUUID(value, fieldName = "ID") {
  if (!value || typeof value !== "string") {
    const error = new Error(`${fieldName} is required`);
    error.statusCode = 400;
    throw error;
  }

  const trimmed = value.trim();

  if (!UUID_V4_REGEX.test(trimmed)) {
    const error = new Error(`Invalid ${fieldName} format`);
    error.statusCode = 400;
    throw error;
  }

  return trimmed.toLowerCase();
}

/**
 * Check if a value is a valid UUID v4 (non-throwing)
 * @param {string} value - The value to check
 * @returns {boolean} - True if valid UUID v4
 */
export function isValidUUID(value) {
  if (!value || typeof value !== "string") {
    return false;
  }
  return UUID_V4_REGEX.test(value.trim());
}

/**
 * Validate an array of UUIDs
 * @param {string[]} values - Array of UUIDs to validate
 * @param {string} fieldName - Name of the field for error messages
 * @returns {string[]} - Array of validated UUIDs
 * @throws {Error} - If any validation fails
 */
export function validateUUIDs(values, fieldName = "IDs") {
  if (!Array.isArray(values)) {
    const error = new Error(`${fieldName} must be an array`);
    error.statusCode = 400;
    throw error;
  }

  return values.map((value, index) => 
    validateUUID(value, `${fieldName}[${index}]`)
  );
}
