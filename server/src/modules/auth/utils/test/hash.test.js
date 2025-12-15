const { generateHash, compareHash } = require("../hash");
const bcrypt = require("bcrypt");

jest.mock("bcrypt");

describe("Hash Utils", () => {
  describe("generateHash", () => {
    it("should hash data", async () => {
      bcrypt.hash.mockResolvedValue("hashedData");
      const result = await generateHash("data");
      expect(result).toBe("hashedData");
      expect(bcrypt.hash).toHaveBeenCalled();
    });
  });

  describe("compareHash", () => {
    it("should compare hash", async () => {
      bcrypt.compare.mockResolvedValue(true);
      const result = await compareHash("data", "hash");
      expect(result).toBe(true);
      expect(bcrypt.compare).toHaveBeenCalledWith("data", "hash");
    });
  });
});
