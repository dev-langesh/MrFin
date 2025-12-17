export const COUNTRY_LOCALE_MAP = {
  IN: "en-IN",
  US: "en-US",
  GB: "en-GB",
  EU: "en-150",
  DE: "de-DE",
  FR: "fr-FR",
  // fallback: en-{CC}
};

/**
 * Formats numbers based on country and options
 */
export function formatNumber(
  value,
  {
    countryCode = "US",
    compact = false,
    style = "decimal", // decimal | currency | percent
    currency,
    minimumFractionDigits,
    maximumFractionDigits,
    signDisplay = "auto",
  } = {}
) {
  if (value === null || value === undefined || value === "") return "0";

  const numericValue = Number(value);
  if (Number.isNaN(numericValue)) return "0";

  const locale =
    COUNTRY_LOCALE_MAP[countryCode] ||
    (countryCode ? `en-${countryCode}` : "en-US");

  const options = {
    style,
    notation: compact ? "compact" : "standard",
    compactDisplay: compact ? "short" : undefined,
    signDisplay,
    minimumFractionDigits:
      minimumFractionDigits ?? (compact ? 0 : style === "currency" ? 2 : 0),
    maximumFractionDigits:
      maximumFractionDigits ?? (compact ? 1 : style === "currency" ? 2 : 2),
  };

  if (style === "currency") {
    options.currency = currency || "USD";
    options.currencyDisplay = "symbol";
  }

  try {
    return new Intl.NumberFormat(locale, options).format(numericValue);
  } catch (err) {
    return new Intl.NumberFormat("en-US", options).format(numericValue);
  }
}
