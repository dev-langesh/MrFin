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
        expect.objectContaining({
          userId: mockTxnData.userId,
          amount: mockTxnData.amount,
          txnType: mockTxnData.txnType,
        })
      );
      expect(result).toHaveProperty("_id", "txn1");
    });

    it("should create transaction and update expense analytics", async () => {
      const expenseData = { ...mockTxnData, txnType: "expense", amount: 50 };
      Transaction.create.mockResolvedValue({ ...expenseData, _id: "txn2" });

      await transactionService.createTransaction(expenseData);

      expect(analyticsService.updateAnalyticsOnAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: expenseData.userId,
          amount: expenseData.amount,
          txnType: expenseData.txnType,
        })
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

    it("should throw error if bulk create fails", async () => {
      Transaction.insertMany.mockRejectedValue(new Error("Bulk Fail"));
      await expect(
        transactionService.createTransactions([mockTxnData])
      ).rejects.toThrow(TransactionErrors.CREATE_FAILED.message);
    });
  });

  describe("getTransaction", () => {
    it("should return transaction if found", async () => {
      Transaction.findOne.mockReturnValue({
        lean: jest.fn().mockReturnValue(mockTxnData),
      });
      const txn = await transactionService.getTransaction(
        new mongoose.Types.ObjectId(),
        "user123"
      );
      expect(txn).toEqual(mockTxnData);
      expect(Transaction.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ userId: "user123" })
      );
    });

    it("should throw INVALID_ID for bad id", async () => {
      await expect(transactionService.getTransaction("badId")).rejects.toThrow(
        TransactionErrors.INVALID_ID.message
      );
    });

    it("should throw NOT_FOUND if not exists", async () => {
      Transaction.findOne.mockReturnValue({
        lean: jest.fn().mockReturnValue(null),
      });
      await expect(
        transactionService.getTransaction(
          new mongoose.Types.ObjectId(),
          "user123"
        )
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
      Transaction.findOne.mockResolvedValue(oldTxn);

      await transactionService.updateTransaction(id, "user123", {
        amount: 200,
      });

      expect(oldTxn.save).toHaveBeenCalled();
      expect(analyticsService.updateAnalyticsOnEdit).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 100,
          txnType: "income",
        }),
        expect.objectContaining({
          amount: 200,
          txnType: "income",
        })
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
      Transaction.findOne.mockResolvedValue(oldTxn);

      await transactionService.updateTransaction(id, "user123", {
        txnType: "expense",
      });

      expect(analyticsService.updateAnalyticsOnEdit).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 100,
          txnType: "income",
          txnDate: expect.any(Date),
        }),
        expect.objectContaining({
          amount: 100,
          txnType: "expense",
          txnDate: expect.any(Date),
        })
      );
    });

    it("should throw NOT_FOUND if transaction does not exist", async () => {
      Transaction.findOne.mockResolvedValue(null);
      await expect(
        transactionService.updateTransaction(
          new mongoose.Types.ObjectId(),
          "user123",
          {
            amount: 100,
          }
        )
      ).rejects.toThrow(TransactionErrors.NOT_FOUND.message);
    });

    it("should throw UPDATE_FAILED if save fails", async () => {
      const id = new mongoose.Types.ObjectId();
      const mockTxn = {
        ...mockTxnData,
        _id: id,
        save: jest.fn().mockRejectedValue(new Error("DB Error")),
      };
      Transaction.findOne.mockResolvedValue(mockTxn);

      await expect(
        transactionService.updateTransaction(id, "user123", { amount: 200 })
      ).rejects.toThrow(TransactionErrors.UPDATE_FAILED.message);
    });
  });

  describe("deleteTransaction", () => {
    it("should delete and revert analytics", async () => {
      const id = new mongoose.Types.ObjectId();
      const txn = { ...mockTxnData, deleteOne: jest.fn() };
      Transaction.findOne.mockResolvedValue(txn);

      await transactionService.deleteTransaction(id, "user123");

      expect(txn.deleteOne).toHaveBeenCalled();
      expect(analyticsService.updateAnalyticsOnDelete).toHaveBeenCalledWith(
        txn
      );
    });

    it("should throw NOT_FOUND if transaction to delete does not exist", async () => {
      Transaction.findOne.mockResolvedValue(null);
      await expect(
        transactionService.deleteTransaction(
          new mongoose.Types.ObjectId(),
          "user123"
        )
      ).rejects.toThrow(TransactionErrors.NOT_FOUND.message);
    });

    it("should throw DELETE_FAILED if delete fails", async () => {
      const id = new mongoose.Types.ObjectId();
      const txn = { deleteOne: jest.fn().mockRejectedValue(new Error("Fail")) };
      Transaction.findOne.mockResolvedValue(txn);

      await expect(
        transactionService.deleteTransaction(id, "user123")
      ).rejects.toThrow(TransactionErrors.DELETE_FAILED.message);
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

    it("should handle filters (category array, description)", async () => {
      const mockFind = jest.fn().mockReturnThis();
      const mockSort = jest.fn().mockReturnThis();
      const mockSkip = jest.fn().mockReturnThis();
      const mockLimit = jest.fn().mockReturnThis();
      const mockLean = jest.fn().mockResolvedValue([]);
      Transaction.find.mockReturnValue({
        sort: mockSort,
        skip: mockSkip,
        limit: mockLimit,
        lean: mockLean,
      });
      Transaction.countDocuments.mockResolvedValue(1);

      await transactionService.getTransactions(
        {
          category: ["A", "B"],
          description: "test",
        },
        {}
      );

      expect(Transaction.find).toHaveBeenCalledWith(
        expect.objectContaining({
          category: { $in: ["A", "B"] },
          description: { $regex: "test", $options: "i" },
        })
      );
    });

    it("should handle empty result explicitly", async () => {
      Transaction.countDocuments.mockResolvedValue(0);
      const res = await transactionService.getTransactions({}, {});
      expect(res).toEqual({ transactions: [], total: 0 });
      expect(Transaction.find).not.toHaveBeenCalled();
    });
  });
});
