const request = require("supertest");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const { Transaction } = require("../transaction.model");
const { app } = require("../../../app");
const { tokenService } = require("../../../lib/jwt/token.service");
const { userService } = require("../../user/user.service");

let mongoServer;

describe("Transaction Input Validation Integration", () => {
  let user;
  let token;
  let txnId;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    user = await userService.createUser({
      username: "input_test_user",
      name: "Input Tester",
      email: "input@test.com",
      password: "password123",
      country: "US",
      verified: true,
    });

    token = tokenService.generateToken({
      userId: user._id,
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
    const txn = await Transaction.create({
      userId: user._id,
      amount: 100,
      txnType: "income",
      txnDate: new Date(),
      category: "Salary",
      description: "Initial",
    });
    txnId = txn._id;
  });

  const validTxn = {
    txnDate: new Date().toISOString(),
    txnType: "income",
    amount: 100,
    category: "Salary",
    description: "Monthly Salary",
  };

  describe("POST /api/transactions (Create)", () => {
    it("should create a transaction with valid input", async () => {
      const res = await request(app)
        .post("/api/transactions")
        .set("Cookie", [`accessToken=${token}`])
        .send(validTxn);

      expect(res.status).toBe(201);
      // Controller returns the transaction object directly (no data wrapper)
      expect(res.body.amount).toBe(100);
      expect(res.body.category).toBe("Salary");
    });

    it("should trim strings (category, description)", async () => {
      const res = await request(app)
        .post("/api/transactions")
        .set("Cookie", [`accessToken=${token}`])
        .send({
          ...validTxn,
          category: "  Salary  ",
          description: "  Trim Me  ",
        });

      expect(res.status).toBe(201);
      expect(res.body.category).toBe("Salary");
      expect(res.body.description).toBe("Trim Me");
    });

    it("should fail on missing required fields (amount)", async () => {
      const { amount, ...missingAmount } = validTxn;
      const res = await request(app)
        .post("/api/transactions")
        .set("Cookie", [`accessToken=${token}`])
        .send(missingAmount);

      expect(res.status).toBe(400);
      // validateInput returns { validationErrors: [] }
      expect(res.body).toHaveProperty("validationErrors");
      expect(res.body.validationErrors[0]).toMatch(/Amount is required/i);
    });

    it("should fail on invalid txnType enum", async () => {
      const res = await request(app)
        .post("/api/transactions")
        .set("Cookie", [`accessToken=${token}`])
        .send({ ...validTxn, txnType: "invalid_type" });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("validationErrors");
    });

    it("should fail on negative amount", async () => {
      const res = await request(app)
        .post("/api/transactions")
        .set("Cookie", [`accessToken=${token}`])
        .send({ ...validTxn, amount: -50 });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("validationErrors");
    });

    it("should fail on invalid date format", async () => {
      const res = await request(app)
        .post("/api/transactions")
        .set("Cookie", [`accessToken=${token}`])
        .send({ ...validTxn, txnDate: "not-a-date" });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("validationErrors");
    });

    it("should fail on future date", async () => {
      const future = new Date();
      future.setDate(future.getDate() + 2); // 2 days in future
      const res = await request(app)
        .post("/api/transactions")
        .set("Cookie", [`accessToken=${token}`])
        .send({ ...validTxn, txnDate: future.toISOString() });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("validationErrors");
    });

    it("should fail if description > 100 chars", async () => {
      const res = await request(app)
        .post("/api/transactions")
        .set("Cookie", [`accessToken=${token}`])
        .send({ ...validTxn, description: "a".repeat(101) });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("validationErrors");
    });

    it("should fail if category > 30 chars", async () => {
      const res = await request(app)
        .post("/api/transactions")
        .set("Cookie", [`accessToken=${token}`])
        .send({ ...validTxn, category: "a".repeat(31) });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("validationErrors");
    });

    it("should fail if category contains invalid characters", async () => {
      const res = await request(app)
        .post("/api/transactions")
        .set("Cookie", [`accessToken=${token}`])
        .send({ ...validTxn, category: "Bad@Category!" });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("validationErrors");
      expect(res.body.validationErrors[0]).toMatch(/Only alphanumeric/i);
    });
  });

  describe("POST /api/transactions/bulk (Bulk Create)", () => {
    it("should create multiple transactions", async () => {
      const res = await request(app)
        .post("/api/transactions/bulk")
        .set("Cookie", [`accessToken=${token}`])
        .send([validTxn, { ...validTxn, amount: 200 }]);

      expect(res.status).toBe(201);
      // Service returns array of documents
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(2);
    });

    it("should succeed with empty array (Schema allows it, though logic might do nothing)", async () => {
      const res = await request(app)
        .post("/api/transactions/bulk")
        .set("Cookie", [`accessToken=${token}`])
        .send([]);

      expect(res.status).toBe(201);
      expect(res.body).toHaveLength(0); // Assuming insertMany returns empty array
    });

    it("should fail if payload is not an array", async () => {
      const res = await request(app)
        .post("/api/transactions/bulk")
        .set("Cookie", [`accessToken=${token}`])
        .send(validTxn); // Object, not array

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("validationErrors");
    });

    it("should fail if any item in array is invalid", async () => {
      const res = await request(app)
        .post("/api/transactions/bulk")
        .set("Cookie", [`accessToken=${token}`])
        .send([validTxn, { ...validTxn, amount: -10 }]);

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("validationErrors");
    });
  });

  describe("PATCH /api/transactions/:id (Update)", () => {
    it("should allow partial update", async () => {
      const res = await request(app)
        .patch(`/api/transactions/${txnId}`)
        .set("Cookie", [`accessToken=${token}`])
        .send({ amount: 500 });

      expect(res.status).toBe(200);
      // Returns updated transaction directly
      expect(res.body.amount).toBe(500);
      expect(res.body.description).toBe("Initial"); // Unchanged
    });

    it("should fail update with invalid value", async () => {
      const res = await request(app)
        .patch(`/api/transactions/${txnId}`)
        .set("Cookie", [`accessToken=${token}`])
        .send({ amount: -500 });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("validationErrors");
    });

    it("should fail update with invalid category format", async () => {
      const res = await request(app)
        .patch(`/api/transactions/${txnId}`)
        .set("Cookie", [`accessToken=${token}`])
        .send({ category: "Invalid@" });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("validationErrors");
    });

    it("should fail update with future date", async () => {
      const future = new Date();
      future.setDate(future.getDate() + 5);
      const res = await request(app)
        .patch(`/api/transactions/${txnId}`)
        .set("Cookie", [`accessToken=${token}`])
        .send({ txnDate: future.toISOString() });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("validationErrors");
    });
  });

  describe("GET /api/transactions (List & Filter)", () => {
    it("should list transactions (defaults)", async () => {
      const res = await request(app)
        .get("/api/transactions")
        .set("Cookie", [`accessToken=${token}`]);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.transactions)).toBe(true);
    });

    it("should validate page param must be numeric string", async () => {
      // Schema requires page to be a numeric string
      const res = await request(app)
        .get("/api/transactions?page=abc")
        .set("Cookie", [`accessToken=${token}`]);

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("validationErrors");
    });

    it("should validate date filters", async () => {
      const res = await request(app)
        .get("/api/transactions?startDate=invalid-date")
        .set("Cookie", [`accessToken=${token}`]);

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("validationErrors");
    });

    it("should fail on unknown query params (strict schema)", async () => {
      const res = await request(app)
        .get("/api/transactions?unknownParam=123")
        .set("Cookie", [`accessToken=${token}`]);

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("validationErrors");
    });

    it("should validate limit param (numeric string or 'all')", async () => {
      // Valid 'all'
      const resAll = await request(app)
        .get("/api/transactions?limit=all")
        .set("Cookie", [`accessToken=${token}`]);
      expect(resAll.status).toBe(200);

      // Invalid string
      const resInvalid = await request(app)
        .get("/api/transactions?limit=invalid")
        .set("Cookie", [`accessToken=${token}`]);
      expect(resInvalid.status).toBe(400);
    });

    it("should validate sort param (asc/desc)", async () => {
      const res = await request(app)
        .get("/api/transactions?sort=invalid")
        .set("Cookie", [`accessToken=${token}`]);
      expect(res.status).toBe(400);
    });

    it("should validate category filter format", async () => {
      const res = await request(app)
        .get("/api/transactions?category=Bad@Category")
        .set("Cookie", [`accessToken=${token}`]);
      expect(res.status).toBe(400);
    });
  });

  describe("DELETE /api/transactions/:id", () => {
    it("should handle valid ID", async () => {
      const res = await request(app)
        .delete(`/api/transactions/${txnId}`)
        .set("Cookie", [`accessToken=${token}`]);

      expect(res.status).toBe(200);
    });
  });
});
