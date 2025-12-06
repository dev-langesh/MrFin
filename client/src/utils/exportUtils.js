import { saveAs } from "file-saver";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";

/**
 * Main export function
 * @param {Array} data - Array of transaction objects
 * @param {string} format - "csv" | "json" | "excel" | "pdf"
 * @param {string} filename - Base filename without extension
 */
export const exportData = (
  data,
  formatType,
  filename = "transactions",
  dateFormat = "PP"
) => {
  const timestamp = format(new Date(), "yyyy-MM-dd_HH-mm");
  const fullFilename = `${filename}_${timestamp}`;

  switch (formatType) {
    case "csv":
      exportToCSV(data, fullFilename, dateFormat);
      break;
    case "json":
      exportToJSON(data, fullFilename);
      break;
    case "excel":
      exportToExcel(data, fullFilename, dateFormat);
      break;
    case "pdf":
      exportToPDF(data, fullFilename, dateFormat);
      break;
    default:
      console.error("Unsupported export format");
  }
};

const processDataForExport = (data, dateFormat) => {
  return data.map((item) => ({
    Date: format(new Date(item.txnDate), dateFormat),
    Type: item.txnType,
    Category: item.category || "",
    Amount: item.amount,
    Description: item.description || "",
  }));
};

const exportToJSON = (data, filename) => {
  const jsonString = `data:text/json;chatset=utf-8,${encodeURIComponent(
    JSON.stringify(data, null, 2)
  )}`;
  const link = document.createElement("a");
  link.href = jsonString;
  link.download = `${filename}.json`;
  link.click();
};

const exportToCSV = (data, filename, dateFormat) => {
  const processedData = processDataForExport(data, dateFormat);
  if (processedData.length === 0) return;

  const headers = Object.keys(processedData[0]);
  const csvContent = [
    headers.join(","),
    ...processedData.map((row) =>
      headers
        .map((fieldName) => {
          const value = row[fieldName];
          // Escape quotes and wrap in quotes if contains comma
          return typeof value === "string" && value.includes(",")
            ? `"${value.replace(/"/g, '""')}"`
            : value;
        })
        .join(",")
    ),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  saveAs(blob, `${filename}.csv`);
};

const exportToExcel = (data, filename, dateFormat) => {
  const processedData = processDataForExport(data, dateFormat);
  const worksheet = XLSX.utils.json_to_sheet(processedData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Transactions");
  XLSX.writeFile(workbook, `${filename}.xlsx`);
};

const exportToPDF = (data, filename, dateFormat) => {
  const doc = new jsPDF();

  const processedData = processDataForExport(data, dateFormat);
  const tableColumn = ["Date", "Type", "Category", "Amount", "Description"];
  const tableRows = processedData.map((item) => [
    item.Date,
    item.Type,
    item.Category,
    item.Amount,
    item.Description,
  ]);

  doc.text("Transaction Report", 14, 15);
  doc.setFontSize(10);
  doc.text(`Generated on: ${format(new Date(), "PPP p")}`, 14, 22);

  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: 30,
    theme: "grid",
    styles: { fontSize: 8 },
    headStyles: { fillColor: [37, 99, 235] }, // Blue-600
  });

  doc.save(`${filename}.pdf`);
};
