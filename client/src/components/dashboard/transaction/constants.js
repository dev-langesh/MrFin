export const transactionFormExpenseCategoryOptions = [
  "Food",
  "Fuel",
  "Shoping",
  "Internet",
  "Education",
  "Entertainment",
  "Travel",
  "Health",
  "Bills",
  "Others",
];

export const transactionFormTxnTypeOptions = [
  {
    label: "Expense",
    value: "expense",
  },
  {
    label: "Revenue",
    value: "revenue",
  },
];

export const transactionFormTableHeaders = [
  { label: "Txn Date", key: "txnDate" },
  { label: "Txn Type", key: "txnType" },
  { label: "Source", key: "source" },
  { label: "Payment Gateway", key: "paymentGateway" },
  { label: "Description", key: "description" },
  { label: "Expense Category", key: "expenseCategory" },
  { label: "Amount", key: "amount", className: "text-right" },
];

export const transactionFormSources = ["Freelance", "Fiverr"];

export const transactionFormPaymentGateways = ["UPI", "PayPal", "Payoneer"];
