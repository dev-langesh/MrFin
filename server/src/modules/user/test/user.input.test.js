const request = require("supertest");
const express = require("express");
const {
  validateInput,
} = require("../../../middleware/validateInput.middleware");
const { updateProfileSchema } = require("../user.inputSchema");

const app = express();
app.use(express.json());

// Mock route for testing validation
app.post("/test-validation", validateInput(updateProfileSchema), (req, res) => {
  res.status(200).json({ status: "success" });
});

describe("User Input Validation", () => {
  const expect400 = async (promise) => {
    const res = await promise;
    expect(res.status).toBe(400);
    expect(res.body.validationErrors).toBeDefined();
  };

  describe("updateProfileSchema", () => {
    it("should accept valid payload", async () => {
      const res = await request(app).post("/test-validation").send({
        name: "New Name",
        country: "US",
      });
      expect(res.status).toBe(200);
    });

    test.each([
      ["name only", { name: "New Name" }],
      ["country only", { country: "US" }],
    ])("should accept partial payload: %s", async (_, payload) => {
      await request(app).post("/test-validation").send(payload).expect(200);
    });

    test.each([
      ["empty name", { name: "" }],
      ["empty country", { country: "" }],
      ["unknown field", { unknown: "field" }],
      ["extra field with valid data", { name: "Valid", extra: 123 }],
    ])("should return 400 when %s", async (_, payload) => {
      await expect400(request(app).post("/test-validation").send(payload));
    });
  });
});
