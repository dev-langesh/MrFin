import csv from "csvtojson";

export function detectDelimiter(content) {
  const delimiters = [",", ";", "|", "\t", " "];
  const counts = delimiters.map((d) => ({
    delimiter: d,
    count: (content.match(new RegExp(`\\${d}`, "g")) || []).length,
  }));

  // Sort by count descending
  counts.sort((a, b) => b.count - a.count);
  return counts[0].count > 0 ? counts[0].delimiter : ",";
}

export function detectQuote(content, delimiter) {
  // Simple heuristic: check if " is used more often near delimiters
  const quoteCount = (content.match(/"/g) || []).length;
  const singleQuoteCount = (content.match(/'/g) || []).length;
  return quoteCount >= singleQuoteCount ? '"' : "'";
}

export function readFilePreview(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result.slice(0, 5000)); // Read first 5KB
    reader.onerror = (e) => reject(e);
    reader.readAsText(file);
  });
}

export async function processFile(fileContent, options) {
  return new Promise(async (resolve, reject) => {
    try {
      let csvData = fileContent;

      // Safe remove logic
      if (options.removeCharacters) {
        // Escape special regex characters
        const escapedChars = options.removeCharacters.replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&"
        );
        const regex = new RegExp(`[${escapedChars}]`, "g");
        csvData = csvData.replace(regex, "");
      }

      try {
        const json = await csv({
          delimiter: options.delimiter,
          trim: true,
          quote: options.quote,
          checkType: true, // Auto-convert numbers/booleans
          noheader: !options.hasHeader,
          headers: !options.hasHeader ? undefined : undefined, // Let csvtojson handle logic or strict defined headers if needed, but for dynamic we use noheader toggle
        }).fromString(csvData);

        // Validation: Check if parsing resulted in meaningful data
        if (json.length === 0) {
          throw new Error("Parsed data is empty.");
        }

        // Check if mostly single column (likely wrong delimiter)
        if (json.length > 0) {
          const keys = Object.keys(json[0]);
          if (
            keys.length < 2 &&
            csvData.includes(options.delimiter === "," ? ";" : ",")
          ) {
            // Heuristic warning logic
          }
        }

        resolve(json);
      } catch (parseError) {
        reject(new Error("Failed to parse CSV. Please check your options."));
      }
    } catch (e) {
      reject(e);
    }
  });
}
