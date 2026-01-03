const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const { userService } = require("../user.service");
const { User } = require("../user.model");
const { AuthErrors } = require("../../../errors/authErrors");

describe("User Service Integration", () => {
  let mongoServer;

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
  });

  describe("createUser", () => {
    it("should create a new user successfully", async () => {
      const userData = {
        name: "Test User",
        email: "test@example.com",
        password: "password123",
        country: "US",
      };

      const user = await userService.createUser(userData);

      expect(user).toBeDefined();
      expect(user.email).toBe(userData.email);
      expect(user.role).toBe("user");
    });

    it("should throw USER_ALREADY_EXISTS if email provided", async () => {
      await User.create({
        name: "Existing",
        email: "test@example.com",
        password: "password",
        country: "US",
      });

      const userData = {
        name: "Test User",
        email: "test@example.com",
        password: "password123",
        country: "US",
      };

      await expect(userService.createUser(userData)).rejects.toThrow(
        AuthErrors.USER_ALREADY_EXISTS.message
      );
    });
  });

  describe("findUserByEmail", () => {
    it("should return user if exists", async () => {
      await User.create({
        name: "Test",
        email: "find@example.com",
        password: "password",
        country: "US",
      });

      const user = await userService.findUserByEmail("find@example.com");
      expect(user).toBeDefined();
      expect(user.email).toBe("find@example.com");
    });

    it("should throw USER_NOT_FOUND if not exists and throwIfNotFound is true", async () => {
      await expect(
        userService.findUserByEmail("missing@example.com")
      ).rejects.toThrow(AuthErrors.USER_NOT_FOUND.message);
    });

    it("should return null if not exists and throwIfNotFound is false", async () => {
      const user = await userService.findUserByEmail(
        "missing@example.com",
        false,
        false
      );
      expect(user).toBeNull();
    });

    it("should include password if requested", async () => {
      await User.create({
        name: "Test",
        email: "pwd@example.com",
        password: "password",
        country: "US",
      });

      const user = await userService.findUserByEmail(
        "pwd@example.com",
        true // includePassword
      );
      expect(user.password).toBeDefined();
    });
  });

  describe("findUserById", () => {
    it("should return user by ID", async () => {
      const created = await User.create({
        name: "Test",
        email: "id@example.com",
        password: "password",
        country: "US",
      });

      const user = await userService.findUserById(created._id);
      expect(user).toBeDefined();
      expect(user.email).toBe("id@example.com");
    });

    it("should throw USER_NOT_FOUND if invalid ID", async () => {
      const fakeId = new mongoose.Types.ObjectId();
      await expect(userService.findUserById(fakeId)).rejects.toThrow(
        AuthErrors.USER_NOT_FOUND.message
      );
    });
  });

  describe("updateUser", () => {
    it("should update allowed fields", async () => {
      const created = await User.create({
        name: "Old Name",
        email: "update@example.com",
        password: "password",
        country: "US",
      });

      const updated = await userService.updateUser(created._id, {
        name: "New Name",
        country: "GB",
        role: "admin", // Should be ignored
      });

      expect(updated.name).toBe("New Name");
      expect(updated.country).toBe("GB");
      expect(updated.role).toBe("user"); // Not changed
    });
  });

  describe("verifyUserByEmail", () => {
    it("should set verified to true", async () => {
      await User.create({
        name: "Test",
        email: "verify@example.com",
        password: "password",
        country: "US",
        verified: false,
      });

      const user = await userService.verifyUserByEmail("verify@example.com");
      expect(user.verified).toBe(true);
    });
  });
});
