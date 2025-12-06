import { toISODateString } from "@/utils/dateUtils";

export function validateEntry(entry, mappedFields, dateFormat) {
  // Only include fields that are mapped
  const mappedColumns = [
    mappedFields.txnDate,
    mappedFields.description,
    mappedFields.credit,
    mappedFields.debit,
  ].filter(Boolean); // Filter out undefined/null

  // Create object with only mapped fields using original keys
  const validatedData = mappedColumns.reduce((acc, key) => {
    if (entry[key] !== undefined) {
      acc[key] = entry[key];
    }
    return acc;
  }, {});

  validatedData.errors = {};

  // Validate Date
  if (mappedFields.txnDate) {
    const dateStr = entry[mappedFields.txnDate];
    const isoDate = toISODateString(dateStr, dateFormat);

    if (isoDate) {
      validatedData[mappedFields.txnDate] = isoDate;
    } else {
      validatedData.errors[mappedFields.txnDate] = `Invalid date`;
    }
  }

  // Validate Credit
  if (
    mappedFields.credit &&
    entry[mappedFields.credit] !== undefined &&
    entry[mappedFields.credit] !== null
  ) {
    let val = entry[mappedFields.credit];
    if (typeof val === "string") {
      val = val.replace(/[^0-9.-]/g, "");
    }
    if (val !== "" && isNaN(Number(val))) {
      // Allow empty string for credit if debit is present, but if it has value it must be number
      validatedData.errors[mappedFields.credit] = `Invalid number`;
    } else {
      validatedData[mappedFields.credit] = val;
    }
  }

  // Validate Debit
  if (
    mappedFields.debit &&
    entry[mappedFields.debit] !== undefined &&
    entry[mappedFields.debit] !== null
  ) {
    let val = entry[mappedFields.debit];
    if (typeof val === "string") {
      val = val.replace(/[^0-9.-]/g, "");
    }
    if (val !== "" && isNaN(Number(val))) {
      validatedData.errors[mappedFields.debit] = `Invalid number`;
    } else {
      validatedData[mappedFields.debit] = val;
    }
  }

  // Validate Amount Presence
  const creditVal = mappedFields.credit
    ? validatedData[mappedFields.credit]
    : null;
  const debitVal = mappedFields.debit
    ? validatedData[mappedFields.debit]
    : null;

  // Check if both are missing or empty
  const isCreditEmpty =
    creditVal === undefined || creditVal === null || creditVal === "";
  const isDebitEmpty =
    debitVal === undefined || debitVal === null || debitVal === "";

  if (isCreditEmpty && isDebitEmpty) {
    validatedData.errors.amount = "Either Credit or Debit is required";
  }

  return validatedData;
}
