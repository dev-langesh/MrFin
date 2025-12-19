const request = require("supertest");
const express = require("express");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const cookieParser = require("cookie-parser");
const { transactionRouter } = require("../transaction.routes");
const { errorHandler } = require("../../../middleware/errorHandler.middleware");
const { Transaction } = require("../transaction.model");
const { Analytics } = require("../../analytics/analytics.model");
const { DailyAnalytics } = require("../../analytics/dailyAnalytics.model");
const { MonthlyAnalytics } = require("../../analytics/monthlyAnalytics.model");
const { transactionService } = require("../transaction.service");

// --- MOCK DATE SETUP ---
// We will use jest.useFakeTimers in the test blocks

const app = express();
app.use(express.json());
app.use(cookieParser());

// Mock Auth Middleware
const TEST_USER_ID = new mongoose.Types.ObjectId("507f1f77bcf86cd799439011");
jest.mock("../../../middleware/validateToken.middleware", () => ({
  validateToken: (req, res, next) => {
    req.user = { id: "507f1f77bcf86cd799439011" };
    next();
  },
}));

app.use("/api/transactions", transactionRouter);
app.use(errorHandler);

// --- CONSISTENCY CHECKER HELPER ---
async function verifyConsistency(userId, currentDate) {
  // 1. Fetch RAW Truth
  const txns = await Transaction.find({ userId }).lean();

  // 2. Fetch Stored Analytics
  const storedAnalytics = await Analytics.findOne({ userId }).lean();
  const storedDaily = await DailyAnalytics.find({ userId }).lean();
  const storedMonthly = await MonthlyAnalytics.find({ userId }).lean();

  // 3. Compute EXPECTED Daily
  const expectedDaily = {};
  txns.forEach((txn) => {
    if (txn.txnType === "transfer") return;
    const d = new Date(txn.txnDate);
    const dayKey = d.toISOString().split("T")[0]; // YYYY-MM-DD (UTC) assuming txnDate is stored as Date object
    const startOfDay = new Date(
      Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())
    ).toISOString();

    if (!expectedDaily[startOfDay]) {
      expectedDaily[startOfDay] = {
        income: 0,
        expense: 0,
        investment: 0,
        incomeCategories: {},
        expenseCategories: {},
        investmentCategories: {},
      };
    }
    const bucket = expectedDaily[startOfDay];
    const amt = Number(txn.amount);
    const cat = txn.category || "Uncategorized";

    if (txn.txnType === "income") {
      bucket.income += amt;
      bucket.incomeCategories[cat] = (bucket.incomeCategories[cat] || 0) + amt;
    } else if (txn.txnType === "expense") {
      bucket.expense += amt;
      bucket.expenseCategories[cat] =
        (bucket.expenseCategories[cat] || 0) + amt;
    } else if (txn.txnType === "investment") {
      bucket.investment += amt;
      bucket.investmentCategories[cat] =
        (bucket.investmentCategories[cat] || 0) + amt;
    }
  });

  // Verify Daily
  storedDaily.forEach((doc) => {
    const key = doc.date.toISOString();
    const expected = expectedDaily[key];

    if (!expected) {
      expect(doc.totals.income).toBe(0);
      expect(doc.totals.expense).toBe(0);
      expect(doc.totals.investment).toBe(0);
      return;
    }

    expect(doc.totals.income).toBe(expected.income);
    expect(doc.totals.expense).toBe(expected.expense);
    expect(doc.totals.investment).toBe(expected.investment);

    // Check categories
    for (const [cat, val] of Object.entries(expected.incomeCategories)) {
      expect(doc.incomeCategories[cat]).toBe(val);
    }
    for (const [cat, val] of Object.entries(expected.expenseCategories)) {
      expect(doc.expenseCategories[cat]).toBe(val);
    }
    for (const [cat, val] of Object.entries(expected.investmentCategories)) {
      expect(doc.investmentCategories[cat]).toBe(val);
    }
  });

  // 4. Compute EXPECTED Monthly
  const expectedMonthly = {}; // Key: "YYYY-M"
  txns.forEach((txn) => {
    if (txn.txnType === "transfer") return;
    const d = new Date(txn.txnDate);
    const y = d.getFullYear();
    const m = d.getMonth() + 1; // 1-12
    const key = `${y}-${m}`;

    if (!expectedMonthly[key]) {
      expectedMonthly[key] = {
        income: 0,
        expense: 0,
        investment: 0,
        incomeCategories: {},
        expenseCategories: {},
        investmentCategories: {},
      };
    }
    const bucket = expectedMonthly[key];
    const amt = Number(txn.amount);
    const cat = txn.category || "Uncategorized";

    if (txn.txnType === "income") {
      bucket.income += amt;
      bucket.incomeCategories[cat] = (bucket.incomeCategories[cat] || 0) + amt;
    } else if (txn.txnType === "expense") {
      bucket.expense += amt;
      bucket.expenseCategories[cat] =
        (bucket.expenseCategories[cat] || 0) + amt;
    } else if (txn.txnType === "investment") {
      bucket.investment += amt;
      bucket.investmentCategories[cat] =
        (bucket.investmentCategories[cat] || 0) + amt;
    }
  });

  // Verify Monthly
  storedMonthly.forEach((doc) => {
    const key = `${doc.year}-${doc.month}`;
    const expected = expectedMonthly[key];

    if (!expected) {
      expect(doc.totals.income).toBe(0);
      expect(doc.totals.expense).toBe(0);
      expect(doc.totals.investment).toBe(0);
      return;
    }

    expect(doc.totals.income).toBe(expected.income);
    expect(doc.totals.expense).toBe(expected.expense);
    expect(doc.totals.investment).toBe(expected.investment);

    for (const [cat, val] of Object.entries(expected.incomeCategories)) {
      expect(doc.incomeCategories[cat]).toBe(val);
    }
    for (const [cat, val] of Object.entries(expected.expenseCategories)) {
      expect(doc.expenseCategories[cat]).toBe(val);
    }
    for (const [cat, val] of Object.entries(expected.investmentCategories)) {
      expect(doc.investmentCategories[cat]).toBe(val);
    }
  });

  // 5. Compute EXPECTED Summary (Analytics)
  // Based on 'currentDate' for what defines "Current" vs "Previous"
  const now = new Date(currentDate);
  const currYear = now.getFullYear();
  const currMonth = now.getMonth();
  const currQuarter = Math.floor(currMonth / 3);

  const checkPrevMonth = (d) => {
    const y = d.getFullYear();
    const m = d.getMonth();
    return (
      (y === currYear && m === currMonth - 1) ||
      (currMonth === 0 && y === currYear - 1 && m === 11)
    );
  };
  const checkPrevQuarter = (d) => {
    const y = d.getFullYear();
    const q = Math.floor(d.getMonth() / 3);
    const m = d.getMonth();
    // Analytics service Logic:
    // (currentQuarter > 0 && txYear === currentYear && txQuarter === currentQuarter - 1) ||
    // (currentQuarter === 0 && txYear === currentYear - 1 && txQuarter === 3)
    return (
      (currQuarter > 0 && y === currYear && q === currQuarter - 1) ||
      (currQuarter === 0 && y === currYear - 1 && q === 3)
    );
  };

  const expSummary = {
    income: { total: 0, annual: 0, quarter: 0, month: 0 },
    expenses: { total: 0, annual: 0, quarter: 0, month: 0 },
    investments: { total: 0, annual: 0, quarter: 0, month: 0 },
    previousIncome: { annual: 0, quarter: 0, month: 0 },
    previousExpenses: { annual: 0, quarter: 0, month: 0 },
    previousInvestments: { annual: 0, quarter: 0, month: 0 },
  };

  txns.forEach((txn) => {
    if (txn.txnType === "transfer") return;
    const d = new Date(txn.txnDate);
    const y = d.getFullYear();
    const m = d.getMonth();
    const q = Math.floor(m / 3);
    const amt = Number(txn.amount);

    const typeKey =
      txn.txnType === "income"
        ? "income"
        : txn.txnType === "expense"
        ? "expenses"
        : "investments";
    const prevKey =
      txn.txnType === "income"
        ? "previousIncome"
        : txn.txnType === "expense"
        ? "previousExpenses"
        : "previousInvestments";

    // Total
    expSummary[typeKey].total += amt;

    // Current Period
    if (y === currYear) {
      expSummary[typeKey].annual += amt;
      if (m === currMonth) expSummary[typeKey].month += amt;
      if (q === currQuarter) expSummary[typeKey].quarter += amt;
    }

    // Previous Period
    if (y === currYear - 1) expSummary[prevKey].annual += amt;
    if (checkPrevMonth(d)) expSummary[prevKey].month += amt;
    if (checkPrevQuarter(d)) expSummary[prevKey].quarter += amt;
  });

  // Verify Summary
  // Note: storedAnalytics can be null if no txns ever created, but normally created on registration.
  // In test we create it manually.
  expect(storedAnalytics).toBeDefined();

  ["income", "expenses", "investments"].forEach((k) => {
    expect(storedAnalytics[k].total).toBe(expSummary[k].total);
    expect(storedAnalytics[k].annual).toBe(expSummary[k].annual);
    expect(storedAnalytics[k].quarter).toBe(expSummary[k].quarter);
    expect(storedAnalytics[k].month).toBe(expSummary[k].month);
  });

  ["previousIncome", "previousExpenses", "previousInvestments"].forEach((k) => {
    expect(storedAnalytics[k].annual).toBe(expSummary[k].annual);
    expect(storedAnalytics[k].quarter).toBe(expSummary[k].quarter);
    expect(storedAnalytics[k].month).toBe(expSummary[k].month);
  });
}

describe("Transaction Consistency Test Suite", () => {
  let mongoServer;
  const CURRENT_DATE = new Date(2025, 5, 15); // June 15, 2025

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
    jest.useFakeTimers({ doNotFake: ["nextTick", "setImmediate"] });
  });

  afterAll(async () => {
    jest.useRealTimers();
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    jest.setSystemTime(CURRENT_DATE);
    await Transaction.deleteMany({});
    await Analytics.deleteMany({});
    await DailyAnalytics.deleteMany({});
    await MonthlyAnalytics.deleteMany({});
    await Analytics.create({ userId: TEST_USER_ID });
  });

  afterEach(() => {
    jest.setSystemTime(CURRENT_DATE);
  });

  // 1. CREATE SCENARIOS
  it("Scenario 1: Consistency after Creates in Different Intervals", async () => {
    const scenarios = [
      {
        label: "Current Month",
        date: new Date(2025, 5, 10),
        type: "income",
        amount: 1000,
        category: "Salary",
      },
      {
        label: "Prev Month",
        date: new Date(2025, 4, 10),
        type: "expense",
        amount: 200,
        category: "Rent",
      },
      {
        label: "Prev Quarter",
        date: new Date(2025, 1, 10),
        type: "investment",
        amount: 500,
        category: "Stocks",
      }, // Feb is Q1, June is Q2. Q1 is Prev Q? Math.floor(5/3)=1 (Q2). Math.floor(1/3)=0 (Q1). Yes.
      {
        label: "Prev Year",
        date: new Date(2024, 11, 20),
        type: "income",
        amount: 10000,
        category: "Bonus",
      },
    ];

    for (const s of scenarios) {
      await request(app)
        .post("/api/transactions")
        .send({
          txnDate: s.date,
          txnType: s.type,
          amount: s.amount,
          category: s.category,
        })
        .expect(201);

      await verifyConsistency(TEST_USER_ID, CURRENT_DATE);
    }
  });

  // 2. UPDATE SCENARIOS
  it("Scenario 2: Consistency after Field Updates", async () => {
    // Setup Initial
    const res = await request(app)
      .post("/api/transactions")
      .send({
        txnDate: new Date(2025, 5, 1),
        txnType: "income",
        amount: 500,
        category: "Freelance",
      });
    const txnId = res.body._id;
    await verifyConsistency(TEST_USER_ID, CURRENT_DATE);

    // A. Update Amount
    await request(app)
      .put(`/api/transactions/${txnId}`)
      .send({ amount: 750 })
      .expect(200);
    await verifyConsistency(TEST_USER_ID, CURRENT_DATE);

    // B. Update Type (Income -> Expense) and Category
    await request(app)
      .put(`/api/transactions/${txnId}`)
      .send({ txnType: "expense", category: "Software" })
      .expect(200);
    await verifyConsistency(TEST_USER_ID, CURRENT_DATE);

    // C. Update Date (Move to Prev Year)
    await request(app)
      .put(`/api/transactions/${txnId}`)
      .send({ txnDate: new Date(2024, 5, 1) })
      .expect(200);
    await verifyConsistency(TEST_USER_ID, CURRENT_DATE);
  });

  // 3. DELETE SCENARIOS
  it("Scenario 3: Consistency after Deletion", async () => {
    const res = await request(app)
      .post("/api/transactions")
      .send({
        txnDate: new Date(2025, 5, 2),
        txnType: "expense",
        amount: 50,
        category: "Food",
      });
    const txnId = res.body._id;
    await verifyConsistency(TEST_USER_ID, CURRENT_DATE);

    await request(app).delete(`/api/transactions/${txnId}`).expect(200);
    await verifyConsistency(TEST_USER_ID, CURRENT_DATE);
  });

  // 4. MIXED / CHAOS
  it("Scenario 4: Mixed Operations (Chaos)", async () => {
    // Perform 200 random operations for robustness
    const ids = [];
    const types = ["income", "expense", "investment", "transfer"];
    const categories = ["A", "B", "C", "D", "E"];

    for (let i = 0; i < 200; i++) {
      const rand = Math.random();

      if (rand < 0.5 || ids.length === 0) {
        // CREATE
        // Random date within [CurrentYear - 2, CurrentYear] range
        const currentYear = CURRENT_DATE.getFullYear();
        const year = currentYear - Math.floor(Math.random() * 3);
        const month = Math.floor(Math.random() * 12);
        const day = Math.floor(Math.random() * 28) + 1;
        const date = new Date(year, month, day);

        const res = await request(app)
          .post("/api/transactions")
          .send({
            txnDate: date,
            txnType: types[Math.floor(Math.random() * types.length)],
            amount: Math.floor(Math.random() * 1000) + 10,
            category: categories[Math.floor(Math.random() * categories.length)],
          });
        if (res.status === 201) ids.push(res.body._id);
      } else if (rand < 0.8) {
        // UPDATE
        const id = ids[Math.floor(Math.random() * ids.length)];
        const updates = {};

        // Randomly choose fields to update
        if (Math.random() < 0.5)
          updates.amount = Math.floor(Math.random() * 2000) + 10;
        if (Math.random() < 0.4)
          updates.txnType = types[Math.floor(Math.random() * types.length)];
        if (Math.random() < 0.4)
          updates.category =
            categories[Math.floor(Math.random() * categories.length)];
        if (Math.random() < 0.4) {
          const currentYear = CURRENT_DATE.getFullYear();
          const year = currentYear - Math.floor(Math.random() * 3);
          updates.txnDate = new Date(
            year,
            Math.floor(Math.random() * 12),
            Math.floor(Math.random() * 28) + 1
          );
        }

        // Ensure at least one update
        if (Object.keys(updates).length === 0) updates.amount = 100;

        // console.log(`[Iter ${i}] Updating ${id} with`, updates);

        await request(app)
          .put(`/api/transactions/${id}`)
          .send(updates)
          .expect(200);
      } else {
        // DELETE
        const idx = Math.floor(Math.random() * ids.length);
        const id = ids[idx];
        await request(app).delete(`/api/transactions/${id}`).expect(200);
        ids.splice(idx, 1);
      }

      await verifyConsistency(TEST_USER_ID, CURRENT_DATE);
    }
  });
});
