const request = require("supertest");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const { app } = require("../../../app"); // Assuming app export
const { Transaction } = require("../transaction.model");
const { User } = require("../../user/user.model");
const { tokenService } = require("../../../lib/jwt/token.service");

describe("Transaction Security Suite", () => {
  let mongoServer;
  let user1, user2;
  let token1;
  let txn1;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    // Create 2 users
    user1 = await User.create({
      name: "User One",
      email: "secure1@example.com",
      password: "password123",
      country: "US",
      verified: true,
    });

    user2 = await User.create({
      name: "User Two",
      email: "secure2@example.com",
      password: "password123",
      country: "GB",
      verified: true,
    });

    token1 = tokenService.generateToken({
      userId: user1._id,
      role: "user",
      tokenType: "access",
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await Transaction.deleteMany({});

    txn1 = await Transaction.create({
      userId: user1._id,
      amount: 100,
      txnType: "income",
      txnDate: new Date(),
      category: "Salary",
    });
  });

  describe("Field Injection / Tampering Checks", () => {
    const validUpdate = { amount: 200 };

    it("should return 400 when attempting to update userId (Injection)", async () => {
      const res = await request(app)
        .patch(`/api/transactions/${txn1._id}`)
        .set("Cookie", [`accessToken=${token1}`])
        .send({
          ...validUpdate,
          userId: user2._id.toString(), // Try to assign to another user
        });

      expect(res.status).toBe(400); // Strict schema should reject unknown/forbidden fields or explicit logic check
    });

    it("should return 400 when attempting to update _id (Immutable)", async () => {
      const res = await request(app)
        .patch(`/api/transactions/${txn1._id}`)
        .set("Cookie", [`accessToken=${token1}`])
        .send({
          ...validUpdate,
          _id: new mongoose.Types.ObjectId().toString(),
        });

      expect(res.status).toBe(400);
    });

    it("should return 400 when attempting to update createdAt (Timestamp)", async () => {
      const res = await request(app)
        .patch(`/api/transactions/${txn1._id}`)
        .set("Cookie", [`accessToken=${token1}`])
        .send({
          ...validUpdate,
          createdAt: new Date().toISOString(),
        });

      expect(res.status).toBe(400);
    });

    it("should return 400 when attempting to update updatedAt (Managed)", async () => {
      const res = await request(app)
        .patch(`/api/transactions/${txn1._id}`)
        .set("Cookie", [`accessToken=${token1}`])
        .send({
          ...validUpdate,
          updatedAt: new Date().toISOString(),
        });

      expect(res.status).toBe(400);
    });

    it("should return 400 when attempting to add unknown fields (Strict Schema)", async () => {
      const res = await request(app)
        .patch(`/api/transactions/${txn1._id}`)
        .set("Cookie", [`accessToken=${token1}`])
        .send({
          ...validUpdate,
          randomField: "malicious-data",
        });

      expect(res.status).toBe(400);
    });
  });

  describe("IDOR Protection", () => {
    it("should return 404/403 when accessing another user's transaction", async () => {
      // Create txn owned by User 2
      const txn2 = await Transaction.create({
        userId: user2._id,
        amount: 500,
        txnType: "expense",
        txnDate: new Date(),
      });

      // User 1 tries to access User 2's txn
      const res = await request(app)
        .get(`/api/transactions/${txn2._id}`)
        .set("Cookie", [`accessToken=${token1}`]);

      // Should act as if not found to prevent enumeration, or forbidden
      expect([404, 403]).toContain(res.status);
    });

    it("should return 404/403 when updating another user's transaction", async () => {
      const txn2 = await Transaction.create({
        userId: user2._id,
        amount: 500,
        txnType: "expense",
        txnDate: new Date(),
      });

      const res = await request(app)
        .patch(`/api/transactions/${txn2._id}`)
        .set("Cookie", [`accessToken=${token1}`])
        .send({ amount: 9999 });

      expect([404, 403]).toContain(res.status);
    });

    it("should return 404/403 when deleting another user's transaction", async () => {
      const txn2 = await Transaction.create({
        userId: user2._id,
        amount: 500,
        txnType: "expense",
        txnDate: new Date(),
      });

      const res = await request(app)
        .delete(`/api/transactions/${txn2._id}`)
        .set("Cookie", [`accessToken=${token1}`]);

      expect([404, 403]).toContain(res.status);
    });
  });
});
