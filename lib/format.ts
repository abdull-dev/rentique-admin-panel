// Shared money formatting. This is a PKR marketplace — never render `$`.

// Show up to 2 decimals so a payout carrying paisa (rental − commission) is
// reported exactly — never rounded — wherever an amount is displayed.
const PKR_FORMAT = new Intl.NumberFormat("en-PK", {
  style: "currency",
  currency: "PKR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/** Formats a rupee amount (Decimal string or number) as `PKR 1,234.50`. */
export function formatPKR(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "PKR 0";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "PKR 0";
  return PKR_FORMAT.format(num);
}
