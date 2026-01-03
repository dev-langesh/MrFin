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

describe("User Integration", () => {
  let mongoServer;
  let accessToken;
  let user;

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

    // Create a user and generate token
    user = await User.create({
      name: "Test User",
      email: "test@example.com",
      password: "password123",
      country: "US",
    });

    accessToken = jwt.sign(
      { userId: user._id, role: user.role, tokenType: "access" },
      env.ACCESS_TOKEN_SECRET,
      { expiresIn: "15m" }
    );
  });

  describe("GET /api/users/profile", () => {
    it("should return user profile if authenticated", async () => {
      const res = await request(app)
        .get("/api/users/profile")
        .set("Cookie", [`accessToken=${accessToken}`]);

      expect(res.status).toBe(200);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe("test@example.com");
    });

    it("should return 401 if not authenticated", async () => {
      const res = await request(app).get("/api/users/profile");
      expect(res.status).toBe(401);
    });
  });

  describe("PATCH /api/users/profile", () => {
    it("should update profile successfully", async () => {
      const res = await request(app)
        .patch("/api/users/profile")
        .set("Cookie", [`accessToken=${accessToken}`])
        .send({
          name: "Updated Name",
          country: "GB",
        });

      expect(res.status).toBe(200);
      expect(res.body.user.name).toBe("Updated Name");
      expect(res.body.user.country).toBe("GB");

      const dbUser = await User.findById(user._id);
      expect(dbUser.name).toBe("Updated Name");
    });

    it("should ignore not allowed fields", async () => {
      const res = await request(app)
        .patch("/api/users/profile")
        .set("Cookie", [`accessToken=${accessToken}`])
        .send({
          role: "admin",
          email: "hacked@example.com",
        });

      expect(res.status).toBe(400);

      const dbUser = await User.findById(user._id);
      expect(dbUser.role).toBe("user");
      expect(dbUser.email).toBe("test@example.com");
    });

    it("should validation error for empty fields if provided", async () => {
      const res = await request(app)
        .patch("/api/users/profile")
        .set("Cookie", [`accessToken=${accessToken}`])
        .send({
          name: "",
        });

      expect(res.status).toBe(400); // Zod validation
    });
  });
});
