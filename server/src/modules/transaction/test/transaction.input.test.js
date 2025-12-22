const request = require("supertest");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const { Transaction } = require("../transaction.model");
const { app } = require("../../../app");
const { tokenService } = require("../../../lib/jwt/token.service");
const { userService } = require("../../user/user.service");

let mongoServer;

describe("Transaction Input Validation Exhaustive Suite", () => {
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

  // Helper
  const expect400 = async (promise) => {
    const res = await promise;
    if (res.status !== 400) {
      console.log(
        `[DEBUG] Expected 400, got ${res.status}. Body:`,
        JSON.stringify(res.body, null, 2)
      );
    }
    expect(res.status).toBe(400);
    expect(res.body.validationErrors).toBeDefined();
  };

  const validTxn = {
    txnDate: new Date().toISOString(),
    txnType: "income",
    amount: 100,
    category: "Salary",
    description: "Monthly Salary",
  };

  const withoutKey = (obj, key) => {
    const newObj = { ...obj };
    delete newObj[key];
    return newObj;
  };

  describe("POST /api/transactions (Create)", () => {
    it("should create successfully with valid data", async () => {
      const res = await request(app)
        .post("/api/transactions")
        .set("Cookie", [`accessToken=${token}`])
        .send(validTxn);
      expect(res.status).toBe(201);
    });

    it("should trim strings", async () => {
      const res = await request(app)
        .post("/api/transactions")
        .set("Cookie", [`accessToken=${token}`])
        .send({
          ...validTxn,
          category: "  TrimMe  ",
          description: "  TrimMe  ",
        });
      expect(res.status).toBe(201);
      expect(res.body.category).toBe("TrimMe");
      expect(res.body.description).toBe("TrimMe");
    });

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 2);

    test.each([
      ["missing amount", withoutKey(validTxn, "amount")],
      ["amount string", { ...validTxn, amount: "100" }], // Zod number() expects number, not string
      ["negative amount", { ...validTxn, amount: -10 }],
      ["zero amount", { ...validTxn, amount: 0 }], // positive() excludes 0
      ["missing txnType", withoutKey(validTxn, "txnType")],
      ["invalid txnType", { ...validTxn, txnType: "invalid_type_enum" }], // Clearly invalid
      ["missing txnDate", withoutKey(validTxn, "txnDate")],
      ["invalid txnDate", { ...validTxn, txnDate: "not-a-date" }],
      ["future txnDate", { ...validTxn, txnDate: futureDate.toISOString() }],
      ["long category", { ...validTxn, category: "a".repeat(51) }], // max 30 or 50? Schema says 30 in args
      ["invalid category chars", { ...validTxn, category: "Bad@Val" }],
      ["long description", { ...validTxn, description: "a".repeat(101) }], // max 100
      ["extra field (strict)", { ...validTxn, extra: "field" }],
    ])("should return 400 when %s", async (_, payload) => {
      await expect400(
        request(app)
          .post("/api/transactions")
          .set("Cookie", [`accessToken=${token}`])
          .send(payload)
      );
    });
  });

  describe("PATCH /api/transactions/:id (Update)", () => {
    // Schema requires at least one field && valid checks
    test.each([
      ["empty body", {}],
      ["negative amount", { amount: -10 }],
      ["invalid txnType", { txnType: "invalid" }],
      [
        "future date",
        { txnDate: new Date(Date.now() + 86400000 * 2).toISOString() },
      ],
      ["long category", { category: "a".repeat(50) }], // Schema used 30 limit reusable check
      ["extra field", { extra: 123 }],
    ])("should return 400 when %s", async (_, payload) => {
      await expect400(
        request(app)
          .patch(`/api/transactions/${txnId}`)
          .set("Cookie", [`accessToken=${token}`])
          .send(payload)
      );
    });

    it("should update successfully", async () => {
      const res = await request(app)
        .patch(`/api/transactions/${txnId}`)
        .set("Cookie", [`accessToken=${token}`])
        .send({ amount: 50 });
      expect(res.status).toBe(200);
      expect(res.body.amount).toBe(50);
    });
  });

  describe("POST /api/transactions/bulk (Bulk Create)", () => {
    it("should valid bulk array", async () => {
      const res = await request(app)
        .post("/api/transactions/bulk")
        .set("Cookie", [`accessToken=${token}`])
        .send([validTxn, validTxn]);
      expect(res.status).toBe(201);
      expect(res.body).toHaveLength(2);
    });

    test.each([
      ["not an array", validTxn],
      ["array with invalid item", [validTxn, { ...validTxn, amount: -10 }]],
    ])("should return 400 when %s", async (_, payload) => {
      await expect400(
        request(app)
          .post("/api/transactions/bulk")
          .set("Cookie", [`accessToken=${token}`])
          .send(payload)
      );
    });
  });

  describe("GET /api/transactions (List)", () => {
    // Query params validation
    test.each([
      ["page not number", { page: "abc" }],
      ["limit not number/all", { limit: "abc" }],
      ["invalid startDate", { startDate: "bad-date" }],
      ["invalid endDate", { endDate: "bad-date" }],
      ["invalid txnType", { txnType: "bad-type" }],
      ["invalid category", { category: "Bad@Cat" }],
      ["unknown param", { unknown: "1" }],
      ["invalid sort", { sort: "invalid" }],
    ])("should return 400 when %s", async (_, query) => {
      await expect400(
        request(app)
          .get("/api/transactions")
          .set("Cookie", [`accessToken=${token}`])
          .query(query)
      );
    });

    it("should accept valid query", async () => {
      const res = await request(app)
        .get("/api/transactions")
        .set("Cookie", [`accessToken=${token}`])
        .query({ page: "1", limit: "10", sort: "desc" });
      expect(res.status).toBe(200);
    });
  });
});
