const path = require("path");

const roles = {
  ADMIN: "admin",
  USER: "user",
  GUEST: "guest",
};

const txnTypes = ["income", "expense", "investment", "transfer"];

const defaultCategories = [
  { txnType: "income", category: "Salary" },
  { txnType: "income", category: "Business" },
  { txnType: "income", category: "Investment Returns" },
  { txnType: "income", category: "Interest" },
  { txnType: "income", category: "Others" },
  { txnType: "expense", category: "Food" },
  { txnType: "expense", category: "Travel" },
  { txnType: "expense", category: "Entertainment" },
  { txnType: "expense", category: "Rent" },
  { txnType: "expense", category: "Bills" },
  { txnType: "expense", category: "Shopping" },
  { txnType: "expense", category: "Others" },
  { txnType: "investment", category: "Stocks" },
  { txnType: "investment", category: "Mutual Funds" },
  { txnType: "investment", category: "Real Estate" },
  { txnType: "investment", category: "Gold" },
  { txnType: "investment", category: "Crypto" },
  { txnType: "investment", category: "Others" },
];

const otp = {
  expirationTime: 5 * 60 * 1000, // 5 minutes
  maxAttempts: 3,
  length: 6,
  attemptsExpiry: 2 * 60 * 60 * 1000, // 2 hours
  resendCooldown: 60 * 1000, // 1 minute
};

const hashing = {
  saltRounds: 10, // Number of rounds for bcrypt hashing
};

const config = {
  roles,
  otp,
  hashing,
  fileUploadPath: path.join(process.cwd(), "uploads"),
  txnTypes,
  defaultCategories,
};

module.exports = {
  config,
};
