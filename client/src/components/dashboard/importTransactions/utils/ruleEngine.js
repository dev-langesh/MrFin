/**
 * Applies transformation rules to the mapped data.
 *
 * @param {Array} mappedData - The data with mapped fields (original keys).
 * @param {Array} rules - The list of rules to apply.
 * @param {Object} mappedFields - The mapping of standard fields to original CSV headers.
 * @param {Array} importedData - The original imported data (for fallback lookup).
 * @returns {Array} - The transformed data ready for the transaction table.
 */
export function applyRulesToData(
  mappedData,
  rules,
  mappedFields,
  importedData
) {
  if (!mappedData || mappedData.length === 0) return [];

  // Pre-compute keys for faster access
  const creditKey = mappedFields.credit;
  const debitKey = mappedFields.debit;
  const txnDateKey = mappedFields.txnDate;
  const descKey = mappedFields.description;

  const finalData = [];

  for (let i = 0; i < mappedData.length; i++) {
    // Create a mutable copy of the row with original index
    // We use a shallow copy because we only modify top-level properties
    let row = {
      ...mappedData[i],
      _originalIndex: mappedData[i]._originalIndex ?? i,
    };
    let keepRow = true;
    let rowAppliedRules = [];

    for (let j = 0; j < rules.length; j++) {
      const rule = rules[j];
      const matches = checkCondition(row, rule, importedData);

      if (matches) {
        if (rule.action === "delete") {
          keepRow = false;
          break; // Stop processing rules for this row if deleted
        } else if (rule.action === "update") {
          row[rule.target] = rule.targetValue;
          rowAppliedRules.push({ index: j + 1, name: rule.name });
        }
      }
    }

    if (keepRow) {
      // Transform logic
      // Handle potential undefined/null values gracefully
      const creditStr = row[creditKey] ? String(row[creditKey]) : "0";
      const debitStr = row[debitKey] ? String(row[debitKey]) : "0";

      const credit = parseFloat(creditStr.replace(/,/g, ""));
      const debit = parseFloat(debitStr.replace(/,/g, ""));

      // improved amount calculation: handle NaN
      const validCredit = isNaN(credit) ? 0 : credit;
      const validDebit = isNaN(debit) ? 0 : debit;

      const amount = Math.abs(
        validCredit > 0 ? validCredit : validDebit > 0 ? -validDebit : 0
      );

      finalData.push({
        txnDate: row[txnDateKey],
        description: row[descKey],
        amount: amount,
        txnType: row.txnType,
        category: row.category,
        _originalIndex: row._originalIndex,
        appliedRules: rowAppliedRules,
      });
    }
  }

  return finalData;
}

function checkCondition(row, rule, importedData) {
  // If source is in row (mappedData), use it. Otherwise use importedData.
  let value = row[rule.source];

  if (value === undefined || value === null) {
    // Not in mapped data, check imported data
    const originalIndex = row._originalIndex;
    if (
      originalIndex !== undefined &&
      importedData &&
      importedData[originalIndex]
    ) {
      value = importedData[originalIndex][rule.source];
    }
  }

  // If still undefined, treat as empty string for string ops, or handle accordingly
  if (value === undefined || value === null) {
    value = "";
  }

  const opValue = rule.operationValue;

  // Optimization: Only compute numbers if operation requires it
  const isNumericOp = [">", ">=", "<", "<=", "="].includes(rule.operation);

  if (isNumericOp) {
    const numValue = Number(String(value).replace(/,/g, ""));
    const numOpValue = Number(String(opValue).replace(/,/g, ""));

    if (isNaN(numValue) || isNaN(numOpValue)) return false;

    switch (rule.operation) {
      case "=":
        return numValue === numOpValue; // Strict equality for numbers
      case "<":
        return numValue < numOpValue;
      case "<=":
        return numValue <= numOpValue;
      case ">":
        return numValue > numOpValue;
      case ">=":
        return numValue >= numOpValue;
    }
  }

  // String operations
  const strValue = String(value).toLowerCase();
  const strOpValue = String(opValue).toLowerCase();

  switch (rule.operation) {
    case "=":
      return strValue === strOpValue;
    case "!=":
      return strValue !== strOpValue; // Loose equality was used before, keeping it loose or strict? Let's use strict for string comparison after normalization
    case "contains":
      return strValue.includes(strOpValue);
    case "not-contain":
      return !strValue.includes(strOpValue);
    case "starts-with":
      return strValue.startsWith(strOpValue);
    case "ends-with":
      return strValue.endsWith(strOpValue);
    case "exists":
      return value !== "" && value !== undefined && value !== null;
    case "not-exists":
      return value === "" || value === undefined || value === null;
    default:
      return false;
  }
}
