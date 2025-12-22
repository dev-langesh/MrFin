const { z } = require("zod");
const { config } = require("../../config/constants");

// Reusable basic date validation for query params (not strict on future like transaction creation)
const queryDateSchema = z
  .string()
  .refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date format" });

const getTimeSeriesSchema = z.object({
  query: z
    .object({
      startDate: queryDateSchema.optional(),
      endDate: queryDateSchema.optional(),
      allTime: z.enum(["true", "false"]).optional(),
    })
    .strict()
    .refine(
      (data) => {
        if (data.allTime === "true") return true;
        // If not allTime, check date logic if provided
        if (data.startDate && data.endDate) {
          return new Date(data.startDate) <= new Date(data.endDate);
        }
        return true;
      },
      { message: "startDate must be before or equal to endDate" }
    ),
});

const getCategoryDistributionSchema = z.object({
  query: z
    .object({
      startDate: queryDateSchema.optional(),
      endDate: queryDateSchema.optional(),
      txnType: z.enum(config.txnTypes).optional(),
      allTime: z.enum(["true", "false"]).optional(),
    })
    .strict()
    .refine(
      (data) => {
        if (data.allTime === "true") return true;
        if (data.startDate && data.endDate) {
          return new Date(data.startDate) <= new Date(data.endDate);
        }
        return true;
      },
      { message: "startDate must be before or equal to endDate" }
    ),
});

const analyticsInputSchema = {
  getTimeSeriesSchema,
  getCategoryDistributionSchema,
};

module.exports = { analyticsInputSchema };
