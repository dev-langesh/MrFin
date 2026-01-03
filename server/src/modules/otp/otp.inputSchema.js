const { z } = require("zod");

const sendOtpSchema = z.object({
  body: z
    .object({
      notificationType: z.enum(["email", "sms"], {
        required_error: "Notification type is required",
        invalid_type_error: "Notification type must be either 'email' or 'sms'",
      }),
      to: z
        .string({ required_error: "'To' field is required" })
        .trim()
        .min(1, { message: "'To' field cannot be empty" }),
      template: z.string().trim().optional(),
    })
    .strict(),
});

const verifyOtpSchema = z.object({
  body: z
    .object({
      otp: z
        .string({ required_error: "OTP is required" })
        .trim()
        .length(6, { message: "OTP must be exactly 6 digits" }),
      to: z
        .string({ required_error: "'To' field is required" })
        .trim()
        .min(1, { message: "'To' field cannot be empty" }),
    })
    .strict(),
});

const otpInputSchema = {
  sendOtpSchema,
  verifyOtpSchema,
};

module.exports = { otpInputSchema };
