const { z } = require("zod");

const updateProfileSchema = z.object({
  body: z
    .object({
      name: z.string().min(1, "Name cannot be empty").optional(),
      country: z.string().min(1, "Country cannot be empty").optional(),
    })
    .strict(),
});

module.exports = { updateProfileSchema };
