import { z } from "zod";

const profileSchema = z.object({
  name: z
    .string({
      required_error: "Name is required",
    })
    .min(2, { message: "Name must be at least 2 characters" })
    .max(50, { message: "Name must be at most 50 characters" })
    .regex(/^[a-zA-Z ]+$/, {
      message: "Name must contain only letters and spaces",
    }),
  country: z
    .string({ required_error: "Country is required" })
    .min(1, { message: "Country is required" }),
});

export const userInputSchema = {
  profileSchema,
};
