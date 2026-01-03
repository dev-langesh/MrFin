const { z } = require("zod");

const registerSchema = z.object({
  body: z.object({
    name: z
      .string({
        required_error: "Name is required",
      })
      .trim()
      .min(2, { message: "Name must be at least 2 characters" })
      .max(50, { message: "Name must be at most 50 characters" }),

    email: z
      .string({ required_error: "Email is required" })
      .trim()
      .toLowerCase()
      .email({ message: "Enter a valid email address" }),

    password: z
      .string({ required_error: "Password is required" })
      .min(8, { message: "Password must be at least 8 characters long" })
      .max(20, { message: "Password must be at most 20 characters" })
      .regex(/[A-Z]/, {
        message: "Password must contain at least one uppercase letter",
      })
      .regex(/[a-z]/, {
        message: "Password must contain at least one lowercase letter",
      })
      .regex(/[0-9]/, { message: "Password must contain at least one number" })
      .regex(/[^A-Za-z0-9]/, {
        message: "Password must contain at least one special character",
      }),
    country: z
      .string({ required_error: "Country is required" })
      .trim()
      .min(1, { message: "Country is required" }),
    currency: z.string().trim().optional(),
  }),
});

const loginSchema = z.object({
  body: z.object({
    email: z
      .string({ required_error: "Email is required" })
      .trim()
      .toLowerCase()
      .email({ message: "Enter a valid email address" }),
    password: z
      .string({ required_error: "Password is required" })
      .min(8, { message: "Password must be at least 8 characters" })
      .max(20, { message: "Password must be at most 20 characters" }),
  }),
});

const googleLoginSchema = z.object({
  body: z.object({
    code: z
      .string({ required_error: "Authorization code is required" })
      .trim()
      .min(1, { message: "Authorization code cannot be empty" }),
  }),
});

const googleCompleteSchema = z.object({
  body: z.object({
    registrationToken: z
      .string({
        required_error: "Registration token is required",
      })
      .trim()
      .min(1, { message: "Registration token cannot be empty" }),
    country: z
      .string({ required_error: "Country is required" })
      .trim()
      .min(1, { message: "Country is required" }),
    currency: z
      .string({ required_error: "Currency is required" })
      .trim()
      .min(1, { message: "Currency is required" }),
  }),
});

// Used for endpoints that just require the verified OTP token
const verifyEmailSchema = z.object({
  body: z.object({
    otpToken: z
      .string({ required_error: "OTP Token is required" })
      .trim()
      .min(1, { message: "OTP Token cannot be empty" }),
  }),
});

const resetPasswordSchema = z.object({
  body: z.object({
    otpToken: z
      .string({ required_error: "OTP Check Token is required" })
      .trim()
      .min(1, { message: "Token cannot be empty" }),
    password: z
      .string({ required_error: "New password is required" })
      .min(8, { message: "Password must be at least 8 characters" })
      .max(20, { message: "Password must be at most 20 characters" })
      .regex(/[A-Z]/, { message: "Must include at least one uppercase letter" })
      .regex(/[a-z]/, { message: "Must include at least one lowercase letter" })
      .regex(/[0-9]/, { message: "Must include at least one number" })
      .regex(/[^A-Za-z0-9]/, {
        message: "Must include at least one special character",
      }),
  }),
});

const authInputSchema = {
  registerSchema,
  loginSchema,
  googleLoginSchema,
  googleCompleteSchema,
  verifyEmailSchema,
  resetPasswordSchema,
};

module.exports = { authInputSchema };
