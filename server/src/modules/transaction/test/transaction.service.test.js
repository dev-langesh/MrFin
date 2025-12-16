const { transactionService } = require("../transaction.service");
const { Transaction } = require("../transaction.model");
const { analyticsService } = require("../../analytics/analytics.service");
const mongoose = require("mongoose");
const { TransactionErrors } = require("../../../errors/transactionErrors");

jest.mock("../transaction.model");
jest.mock("../../analytics/analytics.service");

describe("Transaction Service", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  const mockTxnData = {
    userId: "user123",
    amount: 100,
    txnType: "income",
    category: "Salary",
    txnDate: new Date(),

    description: "Test",
  };

  describe("createTransaction", () => {
    it("should create transaction and update income analytics", async () => {
      Transaction.create.mockResolvedValue({ ...mockTxnData, _id: "txn1" });
      analyticsService.updateAnalyticsOnAdd.mockResolvedValue();

      const result = await transactionService.createTransaction(mockTxnData);

      expect(Transaction.create).toHaveBeenCalledWith(mockTxnData);
      expect(analyticsService.updateAnalyticsOnAdd).toHaveBeenCalledWith(
        { income: 100 },
        "user123",
        mockTxnData.txnDate
      );
      expect(result).toHaveProperty("_id", "txn1");
    });

    it("should create transaction and update expense analytics", async () => {
      const expenseData = { ...mockTxnData, txnType: "expense", amount: 50 };
      Transaction.create.mockResolvedValue({ ...expenseData, _id: "txn2" });

      await transactionService.createTransaction(expenseData);

      expect(analyticsService.updateAnalyticsOnAdd).toHaveBeenCalledWith(
        { expenses: 50 },
        "user123",
        expenseData.txnDate
      );
    });

    it("should throw error if create fails", async () => {
      Transaction.create.mockRejectedValue(new Error("DB Error"));
      await expect(
        transactionService.createTransaction(mockTxnData)
      ).rejects.toThrow(TransactionErrors.CREATE_FAILED.message);
    });
  });

  describe("createTransactions (Bulk)", () => {
    it("should create multiple transactions", async () => {
      Transaction.insertMany.mockResolvedValue([mockTxnData, mockTxnData]);
      await transactionService.createTransactions([mockTxnData, mockTxnData]);
      expect(Transaction.insertMany).toHaveBeenCalled();
      expect(analyticsService.updateAnalyticsBatch).toHaveBeenCalled();
    });
  });

  describe("getTransaction", () => {
    it("should return transaction if found", async () => {
      Transaction.findById.mockReturnValue({
        lean: jest.fn().mockReturnValue(mockTxnData),
      });
      const txn = await transactionService.getTransaction(
        new mongoose.Types.ObjectId()
      );
      expect(txn).toEqual(mockTxnData);
    });

    it("should throw INVALID_ID for bad id", async () => {
      await expect(transactionService.getTransaction("badId")).rejects.toThrow(
        TransactionErrors.INVALID_ID.message
      );
    });

    it("should throw NOT_FOUND if not exists", async () => {
      Transaction.findById.mockReturnValue({
        lean: jest.fn().mockReturnValue(null),
      });
      await expect(
        transactionService.getTransaction(new mongoose.Types.ObjectId())
      ).rejects.toThrow(TransactionErrors.NOT_FOUND.message);
    });
  });

  describe("updateTransaction", () => {
    it("should update transaction and sync analytics", async () => {
      const id = new mongoose.Types.ObjectId();
      const oldTxn = {
        ...mockTxnData,
        _id: id,
        amount: 100,
        txnType: "income",
        save: jest.fn().mockResolvedValue({ ...mockTxnData, amount: 200 }),
      };
      Transaction.findById.mockResolvedValue(oldTxn);

      await transactionService.updateTransaction(id, { amount: 200 });

      expect(oldTxn.save).toHaveBeenCalled();
      expect(analyticsService.updateAnalyticsOnEdit).toHaveBeenCalledWith(
        expect.objectContaining({
          oldIncome: 100,
          newIncome: 200,
        }),
        "user123"
      );
    });

    it("should handle type change income -> expense", async () => {
      const id = new mongoose.Types.ObjectId();
      const oldTxn = {
        ...mockTxnData,
        _id: id,
        amount: 100,
        txnType: "income",
        save: jest.fn().mockResolvedValue({
          ...mockTxnData,
          amount: 100,
          txnType: "expense",
        }),
      };
      Transaction.findById.mockResolvedValue(oldTxn);

      await transactionService.updateTransaction(id, { txnType: "expense" });

      expect(analyticsService.updateAnalyticsOnEdit).toHaveBeenCalledWith(
        expect.objectContaining({
          oldIncome: 100,
          newIncome: 0,
          oldExpenses: 0,
          newExpenses: 100,
        }),
        "user123"
      );
    });
  });

  describe("deleteTransaction", () => {
    it("should delete and revert analytics", async () => {
      const id = new mongoose.Types.ObjectId();
      const txn = { ...mockTxnData, deleteOne: jest.fn() };
      Transaction.findById.mockResolvedValue(txn);

      await transactionService.deleteTransaction(id);

      expect(txn.deleteOne).toHaveBeenCalled();
      expect(analyticsService.updateAnalyticsOnDelete).toHaveBeenCalledWith(
        { income: 100 },
        "user123",
        mockTxnData.txnDate
      );
    });
  });

  describe("getTransactions", () => {
    it("should build query and return results", async () => {
      const mockFind = jest.fn().mockReturnThis();
      const mockSort = jest.fn().mockReturnThis();
      const mockSkip = jest.fn().mockReturnThis();
      const mockLimit = jest.fn().mockReturnThis();
      const mockLean = jest.fn().mockResolvedValue([mockTxnData]);

      Transaction.countDocuments.mockResolvedValue(1);
      Transaction.find.mockReturnValue({
        sort: mockSort,
        skip: mockSkip,
        limit: mockLimit,
        lean: mockLean,
      });

      const result = await transactionService.getTransactions(
        { userId: "123", txnType: "income" },
        { page: 1 }
      );

      expect(Transaction.find).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "123",
          txnType: "income",
        })
      );
      expect(result.transactions).toHaveLength(1);
    });
  });
});
