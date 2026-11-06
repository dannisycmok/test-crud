import { HttpError } from "./errors.js";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Ensure the JSON body is a plain object.
 * @param {unknown} body
 */
export function requireObject(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new HttpError(400, "Request body must be a JSON object");
  }
}

/**
 * Parse a route or body id into a positive integer.
 * @param {unknown} value
 * @param {string} label
 * @returns {number}
 */
export function parsePositiveInt(value, label) {
  const parsed = typeof value === "number" ? value : Number(String(value ?? "").trim());
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new HttpError(400, `${label} must be a positive integer`);
  }
  return parsed;
}

/**
 * Trim a required text field and enforce a maximum length.
 * @param {unknown} value
 * @param {string} label
 * @param {number} maxLength
 * @returns {string}
 */
export function parseRequiredText(value, label, maxLength) {
  if (typeof value !== "string") {
    throw new HttpError(400, `${label} must be a string`);
  }
  const trimmed = value.trim();
  if (!trimmed) {
    throw new HttpError(400, `${label} is required`);
  }
  if (trimmed.length > maxLength) {
    throw new HttpError(400, `${label} must be at most ${maxLength} characters`);
  }
  return trimmed;
}

/**
 * Trim an optional text field.
 * @param {unknown} value
 * @param {string} label
 * @param {number} maxLength
 * @returns {string}
 */
export function parseOptionalText(value, label, maxLength) {
  if (value === undefined || value === null) {
    return "";
  }
  if (typeof value !== "string") {
    throw new HttpError(400, `${label} must be a string`);
  }
  const trimmed = value.trim();
  if (trimmed.length > maxLength) {
    throw new HttpError(400, `${label} must be at most ${maxLength} characters`);
  }
  return trimmed;
}

/**
 * Parse a non-negative price rounded to cents.
 * @param {unknown} value
 * @returns {number}
 */
export function parsePrice(value) {
  const price = typeof value === "number" ? value : Number(String(value ?? "").trim());
  if (!Number.isFinite(price) || price < 0) {
    throw new HttpError(400, "price must be a number greater than or equal to 0");
  }
  if (price > 1_000_000) {
    throw new HttpError(400, "price must be at most 1000000");
  }
  return Math.round(price * 100) / 100;
}

/**
 * Parse a non-negative integer quantity.
 * @param {unknown} value
 * @returns {number}
 */
export function parseQty(value) {
  const qty = typeof value === "number" ? value : Number(String(value ?? "").trim());
  if (!Number.isInteger(qty) || qty < 0) {
    throw new HttpError(400, "qty must be an integer greater than or equal to 0");
  }
  if (qty > 1_000_000) {
    throw new HttpError(400, "qty must be at most 1000000");
  }
  return qty;
}

/**
 * Normalize and validate an email address.
 * @param {unknown} value
 * @returns {string}
 */
export function parseEmail(value) {
  const email = parseRequiredText(value, "email", 254).toLowerCase();
  if (!EMAIL_PATTERN.test(email)) {
    throw new HttpError(400, "email must be a valid email address");
  }
  return email;
}

/**
 * Validate a password that will be stored as a hash.
 * @param {unknown} value
 * @returns {string}
 */
export function parsePassword(value) {
  if (typeof value !== "string") {
    throw new HttpError(400, "password must be a string");
  }
  if (value.length < 6 || value.length > 72) {
    throw new HttpError(400, "password must be between 6 and 72 characters");
  }
  return value;
}

/**
 * Validate an ISO calendar date (YYYY-MM-DD).
 * @param {unknown} value
 * @returns {string}
 */
export function parseOrderDate(value) {
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) {
    throw new HttpError(400, "order_date must use YYYY-MM-DD format");
  }
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new HttpError(400, "order_date is not a valid calendar date");
  }
  return value;
}
