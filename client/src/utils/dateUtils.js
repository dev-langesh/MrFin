import { isValid, parse, parseISO, format } from "date-fns";

export function toISODateString(str, dateFormat) {
  if (!str) return null;

  // Trim first to handle trailing spaces
  const trimmed = String(str).trim();

  // Remove time component before parsing
  // Matches T or space followed by time-like patterns
  const dateOnlyStr = trimmed
    .replace(
      /[\sT]\d{1,2}:\d{1,2}(:\d{1,2})?(\.\d+)?(Z|[+-]\d{2}:?\d{2})?$/,
      ""
    )
    .trim();

  let date;

  if (/^\d+$/.test(dateOnlyStr)) {
    const num = Number(dateOnlyStr);
    date = new Date(dateOnlyStr.length <= 10 ? num * 1000 : num);
  } else {
    // Try parsing as ISO first (handles yyyy-MM-dd)
    const isoDate = parseISO(dateOnlyStr);
    if (isValid(isoDate)) {
      date = isoDate;
    } else {
      const formatVariations = generateFormatPermutations(dateFormat);
      for (const fmt of formatVariations) {
        try {
          const parsed = parse(dateOnlyStr, fmt, new Date());
          if (isValid(parsed)) {
            date = parsed;
            break;
          }
        } catch (e) {
          continue;
        }
      }
    }
  }

  if (!date) {
    const nativeDate = new Date(dateOnlyStr);
    if (isValid(nativeDate)) {
      date = nativeDate;
    }
  }

  if (date && isValid(date)) {
    // Set time to midnight UTC to ignore time component
    date.setHours(0, 0, 0, 0);
    // Adjust for timezone offset to keep the date correct
    const offset = date.getTimezoneOffset() * 60000;
    const adjustedDate = new Date(date.getTime() - offset);
    return adjustedDate.toISOString();
  }

  return false;
}

export function formatDateSafe(dateStr, dateFormat = "yyyy-MM-dd") {
  try {
    if (!dateStr) return "";
    const date = parseISO(dateStr);
    if (isValid(date)) {
      return format(date, dateFormat);
    }
    return dateStr;
  } catch (e) {
    return dateStr;
  }
}

export function generateFormatPermutations(baseFormat) {
  const formats = new Set();

  // Generate variations for separators
  const separators = ["-", "/", "."];
  const parts = baseFormat.split(/[-/.]/);

  if (parts.length === 3) {
    separators.forEach((sep) => {
      const fmt = parts.join(sep);
      formats.add(fmt);
      formats.add(fmt.replace("MM", "MMM"));
      formats.add(fmt.replace("MM", "MMMM"));
    });
  } else {
    // Fallback if format doesn't match expected structure
    formats.add(baseFormat);
    formats.add(baseFormat.replace("MM", "MMM"));
    formats.add(baseFormat.replace("MM", "MMMM"));
  }

  return Array.from(formats);
}
