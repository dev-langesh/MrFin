const { revenueService } = require("./revenue.service");
const asyncHandler = require("express-async-handler");

// Add revenue
async function addRevenue(req, res) {
  const revenue = await revenueService.addRevenue(req.body);
  res.status(201).json(revenue);
}

// Get all revenues
async function getRevenues(req, res) {
  const data = await revenueService.getRevenues(req.query);
  res.status(200).json(data);
}

// Get revenue by ID
async function getRevenue(req, res) {
  const revenue = await revenueService.getRevenueById(req.params.id);
  if (!revenue) {
    return res.status(404).json({ message: "Revenue not found" });
  }
  res.status(200).json(revenue);
}

// Delete revenue
async function deleteRevenue(req, res) {
  const revenue = await revenueService.deleteRevenue(req.params.id);
  if (!revenue) {
    return res.status(404).json({ message: "Revenue not found" });
  }
  res.status(200).json({ message: "Revenue deleted successfully" });
}

// Edit revenue
async function editRevenue(req, res) {
  const revenue = await revenueService.editRevenue(req.params.id, req.body);
  if (!revenue) {
    return res.status(404).json({ message: "Revenue not found" });
  }
  res.status(200).json(revenue);
}

// Wrap each function with asyncHandler
const revenueController = {
  addRevenue: asyncHandler(addRevenue),
  getRevenues: asyncHandler(getRevenues),
  getRevenue: asyncHandler(getRevenue),
  deleteRevenue: asyncHandler(deleteRevenue),
  editRevenue: asyncHandler(editRevenue),
};

module.exports = { revenueController };
