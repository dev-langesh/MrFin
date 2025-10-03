const { z } = require("zod");

const addRevenueSchema = z.object({
  body: z.object({
    date: z.string().datetime(),
    amount: z.number().positive(),
    source: z.enum(["Fiverr", "Freelance"]),
    description: z.string().optional(),
    paymentGateway: z.enum(["Payoneer", "PayPal", "GPay", "Bank Transfer"]),
  }),
});

const editRevenueSchema = z.object({
  body: z.object({
    date: z.string().datetime().optional(),
    amount: z.number().positive().optional(),
    source: z.enum(["Fiverr", "Freelance"]).optional(),
    description: z.string().optional(),
    paymentGateway: z
      .enum(["Payoneer", "PayPal", "GPay", "Bank Transfer"])
      .optional(),
  }),
});

const getRevenueFilterSchema = z.object({
  query: z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    source: z.enum(["Fiverr", "Freelance"]).optional(),
    paymentGateway: z
      .enum(["Payoneer", "PayPal", "GPay", "Bank Transfer"])
      .optional(),
    sort: z.enum(["asc", "desc"]).optional(),
    page: z.string().optional(),
    limit: z.string().optional(),
  }),
});

module.exports = {
  addRevenueSchema,
  editRevenueSchema,
  getRevenueFilterSchema,
};
