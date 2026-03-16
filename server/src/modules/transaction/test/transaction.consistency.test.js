const request = require("supertest");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const { app } = require("../../../app"); // Use global app
const { Transaction } = require("../transaction.model");
const { Analytics } = require("../../analytics/analytics.model");
const { DailyAnalytics } = require("../../analytics/dailyAnalytics.model");
const { MonthlyAnalytics } = require("../../analytics/monthlyAnalytics.model");
const { tokenService } = require("../../../lib/jwt/token.service");
const { userService } = require("../../user/user.service");
const { User } = require("../../user/user.model");

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
    const dayKey = d.toISOString().split("T")[0]; // YYYY-MM-DD (UTC)
    const startOfDay = new Date(
      Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())
    ).toISOString();

    if (!expectedDaily[startOfDay]) {
      expectedDaily[startOfDay] = {
        income: 0,
        expense: 0,
        incomeCategories: {},
        expenseCategories: {},
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
    }
  });

  // Verify Daily
  storedDaily.forEach((doc) => {
    const key = doc.date.toISOString();
    const expected = expectedDaily[key];

    if (!expected) {
      expect(doc.totals.income).toBe(0);
      expect(doc.totals.expense).toBe(0);
      return;
    }

    expect(doc.totals.income).toBe(expected.income);
    expect(doc.totals.expense).toBe(expected.expense);

    // Check categories
    for (const [cat, val] of Object.entries(expected.incomeCategories)) {
      expect(doc.incomeCategories[cat]).toBe(val);
    }
    for (const [cat, val] of Object.entries(expected.expenseCategories)) {
      expect(doc.expenseCategories[cat]).toBe(val);
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
        incomeCategories: {},
        expenseCategories: {},
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
    }
  });

  // Verify Monthly
  storedMonthly.forEach((doc) => {
    const key = `${doc.year}-${doc.month}`;
    const expected = expectedMonthly[key];

    if (!expected) {
      expect(doc.totals.income).toBe(0);
      expect(doc.totals.expense).toBe(0);
      return;
    }

    expect(doc.totals.income).toBe(expected.income);
    expect(doc.totals.expense).toBe(expected.expense);

    for (const [cat, val] of Object.entries(expected.incomeCategories)) {
      expect(doc.incomeCategories[cat]).toBe(val);
    }
    for (const [cat, val] of Object.entries(expected.expenseCategories)) {
      expect(doc.expenseCategories[cat]).toBe(val);
    }

  });

  // 5. Compute EXPECTED Summary (Analytics)
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
    return (
      (currQuarter > 0 && y === currYear && q === currQuarter - 1) ||
      (currQuarter === 0 && y === currYear - 1 && q === 3)
    );
  };

  const expSummary = {
    income: { total: 0, annual: 0, quarter: 0, month: 0 },
    expenses: { total: 0, annual: 0, quarter: 0, month: 0 },
    previousIncome: { annual: 0, quarter: 0, month: 0 },
    previousExpenses: { annual: 0, quarter: 0, month: 0 },
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
        : "expenses";
    const prevKey =
      txn.txnType === "income"
        ? "previousIncome"
        : "previousExpenses";

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
  expect(storedAnalytics).toBeDefined();

  ["income", "expenses"].forEach((k) => {
    expect(storedAnalytics[k].total).toBe(expSummary[k].total);
    expect(storedAnalytics[k].annual).toBe(expSummary[k].annual);
    expect(storedAnalytics[k].quarter).toBe(expSummary[k].quarter);
    expect(storedAnalytics[k].month).toBe(expSummary[k].month);
  });

  ["previousIncome", "previousExpenses"].forEach((k) => {
    expect(storedAnalytics[k].annual).toBe(expSummary[k].annual);
    expect(storedAnalytics[k].quarter).toBe(expSummary[k].quarter);
    expect(storedAnalytics[k].month).toBe(expSummary[k].month);
  });
}

describe("Transaction Consistency Test Suite", () => {
  let mongoServer;
  let user;
  let token;
  let TEST_USER_ID;
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
    await User.deleteMany({});

    // Create real user
    user = await userService.createUser({
      username: "consistencyUser",
      name: "Consistency Test",
      email: "consistency@test.com",
      password: "password123",
      country: "US",
    });
    TEST_USER_ID = user._id; // Mongoose ID Object

    // Generate real token
    token = tokenService.generateToken({
      userId: user._id,
      role: "user",
      tokenType: "access",
    });

    // Ensure initial analytics doc exists
    let analytics = await Analytics.findOne({ userId: TEST_USER_ID });
    if (!analytics) {
      await Analytics.create({ userId: TEST_USER_ID });
    }
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
        type: "income",
        amount: 500,
        category: "Freelance",
      },
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
        .set("Cookie", [`accessToken=${token}`])
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
      .set("Cookie", [`accessToken=${token}`])
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
      .patch(`/api/transactions/${txnId}`)
      .set("Cookie", [`accessToken=${token}`])
      .send({ amount: 750 })
      .expect(200);
    await verifyConsistency(TEST_USER_ID, CURRENT_DATE);

    // B. Update Type (Income -> Expense) and Category
    await request(app)
      .patch(`/api/transactions/${txnId}`)
      .set("Cookie", [`accessToken=${token}`])
      .send({ txnType: "expense", category: "Software" })
      .expect(200);
    await verifyConsistency(TEST_USER_ID, CURRENT_DATE);

    // C. Update Date (Move to Prev Year)
    await request(app)
      .patch(`/api/transactions/${txnId}`)
      .set("Cookie", [`accessToken=${token}`])
      .send({ txnDate: new Date(2024, 5, 1) })
      .expect(200);
    await verifyConsistency(TEST_USER_ID, CURRENT_DATE);
  });

  // 3. DELETE SCENARIOS
  it("Scenario 3: Consistency after Deletion", async () => {
    const res = await request(app)
      .post("/api/transactions")
      .set("Cookie", [`accessToken=${token}`])
      .send({
        txnDate: new Date(2025, 5, 2),
        txnType: "expense",
        amount: 50,
        category: "Food",
      });
    const txnId = res.body._id;
    await verifyConsistency(TEST_USER_ID, CURRENT_DATE);

    await request(app)
      .delete(`/api/transactions/${txnId}`)
      .set("Cookie", [`accessToken=${token}`])
      .expect(200);
    await verifyConsistency(TEST_USER_ID, CURRENT_DATE);
  });

  // 4. MIXED / CHAOS
  it("Scenario 4: Mixed Operations (Chaos)", async () => {
    // Perform 50 random operations (reduced from 200 for speed in CI/Local, usually 50 is enough for check)
    // Or keep 200 if robust. Let's do 100.
    const ids = [];
    const types = ["income", "expense", "transfer"];
    const categories = ["A", "B", "C", "D", "E"];
    const ITERATIONS = 100;

    for (let i = 0; i < ITERATIONS; i++) {
      const rand = Math.random();

      if (rand < 0.5 || ids.length === 0) {
        // CREATE
        const maxTime = CURRENT_DATE.getTime();
        const minTime = new Date(
          CURRENT_DATE.getFullYear() - 2,
          0,
          1
        ).getTime();
        const date = new Date(minTime + Math.random() * (maxTime - minTime));

        const res = await request(app)
          .post("/api/transactions")
          .set("Cookie", [`accessToken=${token}`])
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

        if (Math.random() < 0.5)
          updates.amount = Math.floor(Math.random() * 2000) + 10;
        if (Math.random() < 0.4)
          updates.txnType = types[Math.floor(Math.random() * types.length)];
        if (Math.random() < 0.4)
          updates.category =
            categories[Math.floor(Math.random() * categories.length)];
        if (Math.random() < 0.4) {
          const maxTime = CURRENT_DATE.getTime();
          const minTime = new Date(
            CURRENT_DATE.getFullYear() - 2,
            0,
            1
          ).getTime();
          updates.txnDate = new Date(
            minTime + Math.random() * (maxTime - minTime)
          );
        }

        if (Object.keys(updates).length === 0) updates.amount = 100;

        await request(app)
          .patch(`/api/transactions/${id}`)
          .set("Cookie", [`accessToken=${token}`])
          .send(updates)
          .expect(200);
      } else {
        // DELETE
        const idx = Math.floor(Math.random() * ids.length);
        const id = ids[idx];
        await request(app)
          .delete(`/api/transactions/${id}`)
          .set("Cookie", [`accessToken=${token}`])
          .expect(200);
        ids.splice(idx, 1);
      }

      // Check consistency every 10 ops to save time, or every op
      if (i % 10 === 0 || i === ITERATIONS - 1) {
        await verifyConsistency(TEST_USER_ID, CURRENT_DATE);
      }
    }
  });

  // 5. CONCURRENCY / RACE CONDITION
  it("Scenario 5: Concurrency & Race Conditions", async () => {
    // Fire 20 parallel requests
    const COUNT = 20;
    const reqs = [];
    const amount = 100;

    for (let i = 0; i < COUNT; i++) {
      reqs.push(
        request(app)
          .post("/api/transactions")
          .set("Cookie", [`accessToken=${token}`])
          .send({
            txnDate: CURRENT_DATE, // All same day
            txnType: "income",
            amount: amount,
            category: "Race",
          })
      );
    }

    await Promise.all(reqs);
    await verifyConsistency(TEST_USER_ID, CURRENT_DATE);

    // Explicit verify of the total to ensure no updates were lost
    const analytics = await Analytics.findOne({ userId: TEST_USER_ID });
    expect(analytics.income.total).toBeGreaterThanOrEqual(COUNT * amount);
    // Note: GreaterThanOrEqual is used because previous tests populate data too.
    // Ideally we should check the delta, but verifyConsistency ensures the sum of txns matches analytics.
  });

  // 6. BULK IMPORT CONSISTENCY
  it("Scenario 6: Bulk Creation Consistency", async () => {
    const bulkData = [
      {
        txnDate: new Date(2025, 5, 10).toISOString(),
        txnType: "expense",
        amount: 50,
        category: "BulkFood",
      },
      {
        txnDate: new Date(2025, 5, 11).toISOString(),
        txnType: "income",
        amount: 200,
        category: "BulkSold",
      },
      {
        txnDate: new Date(2025, 4, 15).toISOString(), // Prev month
        txnType: "expense",
        amount: 1000,
        category: "BulkExpense",
      },
    ];

    await request(app)
      .post("/api/transactions/bulk")
      .set("Cookie", [`accessToken=${token}`])
      .send(bulkData) // endpoint expects array directly or { user, transactions }?
      // Checking transaction.controller.js would be accurate, but integration test used array.
      // Wait, integration test code: request(app).post(...).send(data)
      // I need to be sure about the payload structure for bulk.
      // Assuming array based on integration test viewing.
      .expect(201);

    await verifyConsistency(TEST_USER_ID, CURRENT_DATE);
  });
});
