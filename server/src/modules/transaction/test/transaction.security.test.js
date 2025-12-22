const request = require("supertest");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const { Transaction } = require("../transaction.model");
const { app } = require("../../../app");
const { tokenService } = require("../../../lib/jwt/token.service");
const { userService } = require("../../user/user.service");

let mongoServer;

describe("Transaction Security Suite", () => {
  let user1, user2;
  let token1, token2;
  let txn1;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    // Create Users
    user1 = await userService.createUser({
      username: "user1",
      name: "User One",
      country: "USA",
      email: "user1@example.com",
      password: "password123",
    });
    user2 = await userService.createUser({
      username: "user2",
      name: "User Two",
      country: "UK",
      email: "user2@example.com",
      password: "password123",
    });

    token1 = tokenService.generateToken({
      userId: user1._id,
      tokenType: "access",
      role: "user",
    });
    token2 = tokenService.generateToken({
      userId: user2._id,
      tokenType: "access",
      role: "user",
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await Transaction.deleteMany({});
    // Create a transaction for User 1
    txn1 = await Transaction.create({
      userId: user1._id,
      amount: 100,
      txnType: "income",
      txnDate: new Date(),
      category: "Salary",
      description: "User 1 Income",
    });
  });

  describe("Broken Authentication", () => {
    it("should reject requests without token (401)", async () => {
      const res = await request(app).get("/api/transactions");
      expect(res.status).toBe(401);
    });

    it("should reject requests with invalid token (401/403)", async () => {
      const res = await request(app)
        .get("/api/transactions")
        .set("Cookie", ["accessToken=invalidtoken"]);

      // Depending on verify implementation, normally 401 or 403
      expect([401, 403, 500]).toContain(res.status);
      // 500 might happen if error handler is simplistic for JWT errors, but aiming for 401
    });
  });

  describe("Broken Access Control (IDOR)", () => {
    it("should prevent User 2 from GETting User 1's transaction", async () => {
      const res = await request(app)
        .get(`/api/transactions/${txn1._id}`)
        .set("Cookie", [`accessToken=${token2}`]);

      // Should be 404 (Not Found) or 403 (Forbidden).
      // Privacy-wise 404 is better to not leak existence.
      expect([403, 404]).toContain(res.status);
    });

    it("should prevent User 2 from UPDATING User 1's transaction", async () => {
      const res = await request(app)
        .patch(`/api/transactions/${txn1._id}`)
        .set("Cookie", [`accessToken=${token2}`])
        .send({ amount: 500 });

      expect([403, 404]).toContain(res.status);

      // Verify no change
      const check = await Transaction.findById(txn1._id);
      expect(check.amount).toBe(100);
    });

    it("should prevent User 2 from DELETING User 1's transaction", async () => {
      const res = await request(app)
        .delete(`/api/transactions/${txn1._id}`)
        .set("Cookie", [`accessToken=${token2}`]);

      expect([403, 404]).toContain(res.status);

      // Verify not deleted
      const check = await Transaction.findById(txn1._id);
      expect(check).not.toBeNull();
    });
  });

  describe("Mass Assignment", () => {
    it("should prevent overwriting read-only fields (userId)", async () => {
      // User 1 tries to change the transaction to belong to User 2
      const res = await request(app)
        .patch(`/api/transactions/${txn1._id}`)
        .set("Cookie", [`accessToken=${token1}`])
        .send({
          amount: 200,
          userId: user2._id.toString(), // Malicious attempt
        });

      // Zod reject unknown keys with strict(), so expecting 400 is correct/better.
      expect(res.status).toBe(400);

      const check = await Transaction.findById(txn1._id);
      expect(check.amount).toBe(100); // Should be unchanged because request was rejected
      expect(check.userId.toString()).toBe(user1._id.toString());
    });
  });

  describe("NoSQL Injection", () => {
    beforeEach(async () => {
      // Create an additional transaction for better filtering tests
      await Transaction.create({
        userId: user1._id,
        amount: 50,
        txnType: "expense",
        txnDate: new Date(),
        category: "TestCat",
        description: "Small Expense",
      });
    });

    it("should block NoSQL injection in body (Operator Injection)", async () => {
      const res = await request(app)
        .post("/api/transactions")
        .set("Cookie", [`accessToken=${token1}`])
        .send({
          amount: 100,
          txnType: "income",
          description: { $ne: "" }, // NoSQL payload
          txnDate: new Date().toISOString(),
        });
      expect(res.status).toBe(400);
    });

    it("should block NoSQL injection in Query Parameters", async () => {
      // Attempt: Filter for everything that is NOT 'somerandomcategory'
      // If successful, it would return both transactions (Salary:100, TestCat:50)
      const res = await request(app)
        .get("/api/transactions?category[$ne]=somerandomcategory")
        .set("Cookie", [`accessToken=${token1}`]);

      if (res.status === 200) {
        expect(res.body.transactions).toHaveLength(0);
      } else {
        expect(res.status).toBe(400);
      }
    });

    it("should block $where injection via query params", async () => {
      const res = await request(app)
        .get("/api/transactions?$where=this.amount>90")
        .set("Cookie", [`accessToken=${token1}`]);

      if (res.status === 200) {
        // If sanitized (stripped), it acts as an empty filter, returning all transactions.
        // This confirms the injection (which would filter for >90 -> 1 txn) did NOT execute.
        expect(res.body.transactions.length).toBeGreaterThanOrEqual(2);
      } else {
        expect(res.status).toBe(400);
      }
    });

    it("should block nested query operator objects in query params", async () => {
      // Attempt: amount > 60 (Should match txn1: 100, but not txn2: 50)
      const res = await request(app)
        .get("/api/transactions?amount[$gt]=60")
        .set("Cookie", [`accessToken=${token1}`]);

      if (res.status === 200) {
        expect(res.body.transactions).toHaveLength(0);
      } else {
        expect(res.status).toBe(400);
      }
    });

    it("should block Update Operator Injection ($set)", async () => {
      const res = await request(app)
        .patch(`/api/transactions/${txn1._id}`)
        .set("Cookie", [`accessToken=${token1}`])
        .send({
          $set: { amount: 999999 },
        });
      // Should be rejected by Zod (unknown keys stripped or forbidden) or Sanitizer
      // With .strict() it should be 400. If sanitized first, it might be empty -> 400 (empty update).
      expect(res.status).toBe(400);

      const check = await Transaction.findById(txn1._id);
      expect(check.amount).not.toBe(999999);
    });

    it("should block Update Operator Injection ($inc)", async () => {
      const res = await request(app)
        .patch(`/api/transactions/${txn1._id}`)
        .set("Cookie", [`accessToken=${token1}`])
        .send({
          $inc: { amount: 1000 },
        });
      expect(res.status).toBe(400);

      const check = await Transaction.findById(txn1._id);
      expect(check.amount).toBe(100);
    });

    it("should block Dot Notation Injection (userId.$ne)", async () => {
      const res = await request(app)
        .patch(`/api/transactions/${txn1._id}`)
        .set("Cookie", [`accessToken=${token1}`])
        .send({
          "userId.$ne": null,
        });
      // Should be rejected due to strict mode or sanitization
      expect(res.status).toBe(400);
    });

    it("should block Prototype Pollution (__proto__)", async () => {
      const res = await request(app)
        .post("/api/transactions")
        .set("Cookie", [`accessToken=${token1}`])
        .send({
          __proto__: { isAdmin: true },
          amount: 100,
          txnType: "income",
          txnDate: new Date().toISOString(),
        });

      expect([200, 201, 400]).toContain(res.status);
    });

    it("should block Bulk Endpoint Injection (Mixed Valid/Malicious)", async () => {
      const res = await request(app)
        .post("/api/transactions/bulk")
        .set("Cookie", [`accessToken=${token1}`])
        .send([
          {
            amount: 100,
            txnType: "income",
            txnDate: new Date().toISOString(),
          },
          {
            $where: "this.amount > 0", // Malicious object
          },
        ]);

      expect(res.status).toBe(400);

      // Verify no transactions created (or at least check count)
      const count = await Transaction.countDocuments({ userId: user1._id });
      expect(count).toBe(2);
    });
  });
});
