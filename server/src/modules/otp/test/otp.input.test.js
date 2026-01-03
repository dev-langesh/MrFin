const request = require("supertest");
const express = require("express");
const {
  validateInput,
} = require("../../../middleware/validateInput.middleware");
const { otpInputSchema } = require("../otp.inputSchema");

const app = express();
app.use(express.json());

// Mock routes
app.post("/send", validateInput(otpInputSchema.sendOtpSchema), (req, res) =>
  res.sendStatus(200)
);
app.post("/verify", validateInput(otpInputSchema.verifyOtpSchema), (req, res) =>
  res.sendStatus(200)
);

describe("OTP Input Validation", () => {
  describe("POST /api/otp/send", () => {
    test.each([
      ["missing notificationType", { to: "test@example.com" }],
      [
        "invalid notificationType",
        { to: "test@example.com", notificationType: "push" },
      ],
      ["missing to", { notificationType: "email" }],
      ["empty to", { notificationType: "email", to: "" }],
      [
        "extra field",
        { notificationType: "email", to: "test@example.com", extra: "123" },
      ], // Strict check implied if schema strict
    ])("should return 400 when %s", async (_, payload) => {
      await request(app).post("/send").send(payload).expect(400);
    });

    it("should accept valid payload", async () => {
      await request(app)
        .post("/send")
        .send({
          notificationType: "email",
          to: "test@example.com",
          template: "otp",
        })
        .expect(200);
    });
  });

  describe("POST /api/otp/verify", () => {
    test.each([
      ["missing otp", { to: "test@example.com" }],
      ["short otp", { to: "test@example.com", otp: "123" }],
      ["long otp", { to: "test@example.com", otp: "1234567" }],
      ["missing to", { otp: "123456" }],
      ["empty to", { otp: "123456", to: "" }],
    ])("should return 400 when %s", async (_, payload) => {
      await request(app).post("/verify").send(payload).expect(400);
    });

    it("should accept valid payload", async () => {
      await request(app)
        .post("/verify")
        .send({
          otp: "123456",
          to: "test@example.com",
        })
        .expect(200);
    });
  });
});
