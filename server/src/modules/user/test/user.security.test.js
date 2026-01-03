const request = require("supertest");
const express = require("express");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const cookieParser = require("cookie-parser");
const { userRouter } = require("../user.routes");
const { errorHandler } = require("../../../middleware/errorHandler.middleware");
const { User } = require("../user.model");
const jwt = require("jsonwebtoken");
const { env } = require("../../../config/env");

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use("/api/users", userRouter); // Mount at /api/users
app.use(errorHandler);

describe("User Security Tests", () => {
  let mongoServer;
  let user;
  let accessToken;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    user = await User.create({
      name: "Victim",
      email: "victim@example.com",
      password: "password",
      country: "US",
      role: "user",
      verified: false,
    });

    accessToken = jwt.sign(
      { userId: user._id, role: user.role, tokenType: "access" },
      env.ACCESS_TOKEN_SECRET,
      { expiresIn: "15m" }
    );
  });

  describe("Authentication", () => {
    it("should block unauthenticated access to GET /profile", async () => {
      const res = await request(app).get("/api/users/profile");
      expect(res.status).toBe(401);
    });

    it("should block unauthenticated access to PATCH /profile", async () => {
      const res = await request(app).patch("/api/users/profile").send({
        name: "Hacker",
      });
      expect(res.status).toBe(401);
    });
  });

  describe("Field Injection / Tampering Prevention", () => {
    const validUpdate = { name: "Updated Name" };

    // Granular tests for restricted fields
    test.each([
      ["role", { role: "admin" }],
      ["email", { email: "hacked@example.com" }],
      ["password", { password: "newpassword" }],
      ["verified", { verified: true }],
      ["_id", { _id: new mongoose.Types.ObjectId() }],
      ["googleId", { googleId: "fake-google-id" }],
      ["provider", { provider: "facebook" }],
      ["createdAt", { createdAt: new Date().toISOString() }],
      ["updatedAt", { updatedAt: new Date().toISOString() }],
      ["randomField", { randomField: "malicious" }],
    ])(
      "should reject update containing restricted field: %s",
      async (_, payload) => {
        const res = await request(app)
          .patch("/api/users/profile")
          .set("Cookie", [`accessToken=${accessToken}`])
          .send({ ...validUpdate, ...payload });

        expect(res.status).toBe(400); // Strict schema validation check
      }
    );

    it("should ensure db is not modified even if status was 200 (double verify)", async () => {
      // This test explicitly checks DB state after a failed injection attempt (expecting 400 now)
      await request(app)
        .patch("/api/users/profile")
        .set("Cookie", [`accessToken=${accessToken}`])
        .send({ role: "admin" });

      const dbUser = await User.findById(user._id);
      expect(dbUser.role).toBe("user");
    });
  });
});
