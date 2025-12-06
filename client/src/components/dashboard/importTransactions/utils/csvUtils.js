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

export async function processFile(file, options) {
  return new Promise((resolve, reject) => {
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        let csvData = event.target.result;

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
          }).fromString(csvData);

          // Validation: Check if parsing resulted in meaningful data
          if (json.length === 0) {
            throw new Error("Parsed data is empty.");
          }

          // Check if mostly single column (likely wrong delimiter)
          const keys = Object.keys(json[0]);
          if (
            keys.length < 2 &&
            csvData.includes(options.delimiter === "," ? ";" : ",")
          ) {
            // Heuristic warning, handled by caller or returned as warning
            // We can return an object { data: json, warning: "..." } if needed
            // For now, let's just return the data and let the UI handle warnings if we want to move that logic too.
            // The original code showed a toast. We can return a warning flag.
          }

          resolve(json);
        } catch (parseError) {
          reject(new Error("Failed to parse CSV. Please check your options."));
        }
      };
      reader.onerror = () => reject(new Error("Failed to read file."));
      reader.readAsText(file);
    } catch (e) {
      reject(e);
    }
  });
}
