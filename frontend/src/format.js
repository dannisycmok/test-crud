const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

/**
 * Format a numeric price for display.
 * @param {unknown} value
 * @returns {string}
 */
export function formatMoney(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) {
    return "—";
  }
  return currencyFormatter.format(amount);
}

/**
 * Format a YYYY-MM-DD value without shifting the calendar day.
 * @param {unknown} value
 * @returns {string}
 */
export function formatDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return "—";
  }
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

/**
 * Today's date in the form expected by a date input.
 * @returns {string}
 */
export function todayInputValue() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}
