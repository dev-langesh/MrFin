const { transactionService } = require("../transaction.service");
const { Transaction } = require("../transaction.model");
const { Analytics } = require("../../analytics/analytics.model");
const { DailyAnalytics } = require("../../analytics/dailyAnalytics.model");
const { MonthlyAnalytics } = require("../../analytics/monthlyAnalytics.model");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const { TransactionErrors } = require("../../../errors/transactionErrors");

describe("Transaction Service", () => {
  let mongoServer;
  const userId = new mongoose.Types.ObjectId().toString();

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
    // Ensure indexes
    await Transaction.ensureIndexes();
    await Analytics.ensureIndexes();
    await DailyAnalytics.ensureIndexes();
    await MonthlyAnalytics.ensureIndexes();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await Transaction.deleteMany({});
    await Analytics.deleteMany({});
    await DailyAnalytics.deleteMany({});
    await MonthlyAnalytics.deleteMany({});
  });

  const mockTxnData = {
    userId,
    amount: 100,
    txnType: "income",
    category: "Salary",
    txnDate: new Date(),
    description: "Test Transaction",
  };

  describe("createTransaction", () => {
    it("should create transaction and update income analytics", async () => {
      // Setup: Create initial analytics (optional, service handles it, but good for consistent state)
      // Actually, getAnalytics (called inside updates) creates it if missing.

      const result = await transactionService.createTransaction(mockTxnData);

      expect(result).toHaveProperty("_id");
      expect(result.amount).toBe(100);

      // Verify Transaction DB
      const txnInDb = await Transaction.findById(result._id);
      expect(txnInDb).toBeDefined();
      expect(txnInDb.description).toBe("Test Transaction");

      // Verify Analytics DB (Integration check)
      const analytics = await Analytics.findOne({ userId });
      expect(analytics).toBeDefined();
      expect(analytics.income.total).toBe(100);
      expect(analytics.income.month).toBe(100);
    });

    it("should create transaction and update expense analytics", async () => {
      const expenseData = { ...mockTxnData, txnType: "expense", amount: 50 };

      const result = await transactionService.createTransaction(expenseData);
      expect(result.txnType).toBe("expense");

      const analytics = await Analytics.findOne({ userId });
      expect(analytics.expenses.total).toBe(50);
      expect(analytics.expenses.month).toBe(50);
    });

    it("should throw error if required fields missing (Mongoose validation)", async () => {
      // Mongoose validation error is usually wrapped or thrown as is.
      // The service wraps creation in try/catch and throws CREATE_FAILED

      await expect(
        transactionService.createTransaction({ userId }) // Missing amount, type etc
      ).rejects.toThrow(TransactionErrors.CREATE_FAILED.message);
    });
  });

  describe("createTransactions (Bulk)", () => {
    it("should create multiple transactions", async () => {
      const txns = [
        mockTxnData,
        { ...mockTxnData, amount: 200, category: "Bonus" },
      ];

      const results = await transactionService.createTransactions(txns);
      expect(results).toHaveLength(2);

      // Verify DB Count
      const count = await Transaction.countDocuments({ userId });
      expect(count).toBe(2);

      // Verify Analytics Aggregation
      const analytics = await Analytics.findOne({ userId });
      expect(analytics.income.total).toBe(300); // 100 + 200
    });
  });

  describe("getTransaction", () => {
    it("should return transaction if found", async () => {
      const created = await Transaction.create(mockTxnData);

      const found = await transactionService.getTransaction(
        created._id,
        userId
      );
      expect(found).toBeDefined();
      expect(found._id.toString()).toBe(created._id.toString());
    });

    it("should throw INVALID_ID for bad id", async () => {
      await expect(transactionService.getTransaction("badId")).rejects.toThrow(
        TransactionErrors.INVALID_ID.message
      );
    });

    it("should throw NOT_FOUND if not exists", async () => {
      const fakeId = new mongoose.Types.ObjectId();
      await expect(
        transactionService.getTransaction(fakeId, userId)
      ).rejects.toThrow(TransactionErrors.NOT_FOUND.message);
    });
  });

  describe("updateTransaction", () => {
    it("should update transaction and sync analytics", async () => {
      // 1. Create
      const created = await transactionService.createTransaction(mockTxnData);

      // Verify initial state
      let analytics = await Analytics.findOne({ userId });
      expect(analytics.income.total).toBe(100);

      // 2. Update (Change amount 100 -> 200)
      await transactionService.updateTransaction(created._id, userId, {
        amount: 200,
      });

      // 3. Verify Transaction
      const updatedTxn = await Transaction.findById(created._id);
      expect(updatedTxn.amount).toBe(200);

      // 4. Verify Analytics (Should add difference: +100)
      analytics = await Analytics.findOne({ userId });
      expect(analytics.income.total).toBe(200);
    });

    it("should handle type change income -> expense", async () => {
      const created = await transactionService.createTransaction(mockTxnData); // Income 100

      await transactionService.updateTransaction(created._id, userId, {
        txnType: "expense",
      });

      const analytics = await Analytics.findOne({ userId });
      // Income should be reverted (-100 => 0)
      expect(analytics.income.total).toBe(0);
      // Expense should be added (+100)
      expect(analytics.expenses.total).toBe(100);
    });

    it("should throw NOT_FOUND if transaction does not exist", async () => {
      const fakeId = new mongoose.Types.ObjectId();
      await expect(
        transactionService.updateTransaction(fakeId, userId, { amount: 200 })
      ).rejects.toThrow(TransactionErrors.NOT_FOUND.message);
    });
  });

  describe("deleteTransaction", () => {
    it("should delete and revert analytics", async () => {
      const created = await transactionService.createTransaction(mockTxnData); // Income 100

      await transactionService.deleteTransaction(created._id, userId);

      // Verify DB
      const found = await Transaction.findById(created._id);
      expect(found).toBeNull();

      // Verify Analytics
      const analytics = await Analytics.findOne({ userId });
      expect(analytics.income.total).toBe(0);
    });

    it("should throw NOT_FOUND if transaction to delete does not exist", async () => {
      const fakeId = new mongoose.Types.ObjectId();
      await expect(
        transactionService.deleteTransaction(fakeId, userId)
      ).rejects.toThrow(TransactionErrors.NOT_FOUND.message);
    });
  });

  describe("getTransactions", () => {
    it("should build query and return results with pagination", async () => {
      // Seed 20 items
      const txns = Array.from({ length: 20 }).map((_, i) => ({
        ...mockTxnData,
        amount: i * 10,
      }));
      await Transaction.insertMany(txns);

      const res = await transactionService.getTransactions(
        { userId },
        { page: 1, limit: 10 }
      );

      expect(res.transactions).toHaveLength(10);
      expect(res.total).toBe(20);
    });

    it("should handle filters (category array, description)", async () => {
      await Transaction.create([
        { ...mockTxnData, category: "Food", description: "Lunch" },
        { ...mockTxnData, category: "Salary", description: "Paycheck" },
      ]);

      const res = await transactionService.getTransactions(
        { userId, category: ["Food"], description: "lun" }, // case insensitive
        {}
      );

      expect(res.transactions).toHaveLength(1);
      expect(res.transactions[0].category).toBe("Food");
    });

    it("should handle empty result explicitly", async () => {
      const res = await transactionService.getTransactions({ userId }, {});
      expect(res.transactions).toEqual([]);
      expect(res.total).toBe(0);
    });
  });
});
