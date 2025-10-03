const { validateToken } = require("../../middleware/validateToken.middleware");
const { validateInput } = require("../../middleware/validateInput.middleware");
const { revenueController } = require("./revenue.controller");
const {
  addRevenueSchema,
  editRevenueSchema,
  getRevenueFilterSchema,
} = require("./revenue.inputSchema");

const router = require("express").Router();

// Add revenue
router.post(
  "/",
  validateToken,
  validateInput(addRevenueSchema),
  revenueController.addRevenue
);

// Get all revenues with filters
router.get(
  "/",
  validateToken,
  validateInput(getRevenueFilterSchema),
  revenueController.getRevenues
);

// Get single revenue
router.get("/:id", validateToken, revenueController.getRevenue);

// Delete revenue
router.delete("/:id", validateToken, revenueController.deleteRevenue);

// Edit revenue
router.put(
  "/:id",
  validateToken,
  validateInput(editRevenueSchema),
  revenueController.editRevenue
);

module.exports = { revenueRouter: router };
