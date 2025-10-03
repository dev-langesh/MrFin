const revenueService = require("./revenue.service");

const revenueController = {
  addRevenue: async (req, res) => {
    try {
      const revenue = await revenueService.addRevenue(req.body);
      res.status(201).json(revenue);
    } catch (err) {
      res
        .status(500)
        .json({ message: "Error adding revenue", error: err.message });
    }
  },

  getRevenues: async (req, res) => {
    try {
      const data = await revenueService.getRevenues(req.query);
      res.status(200).json(data);
    } catch (err) {
      res
        .status(500)
        .json({ message: "Error fetching revenues", error: err.message });
    }
  },

  getRevenue: async (req, res) => {
    try {
      const revenue = await revenueService.getRevenueById(req.params.id);
      if (!revenue)
        return res.status(404).json({ message: "Revenue not found" });
      res.status(200).json(revenue);
    } catch (err) {
      res
        .status(500)
        .json({ message: "Error fetching revenue", error: err.message });
    }
  },

  deleteRevenue: async (req, res) => {
    try {
      const revenue = await revenueService.deleteRevenue(req.params.id);
      if (!revenue)
        return res.status(404).json({ message: "Revenue not found" });
      res.status(200).json({ message: "Revenue deleted successfully" });
    } catch (err) {
      res
        .status(500)
        .json({ message: "Error deleting revenue", error: err.message });
    }
  },

  editRevenue: async (req, res) => {
    try {
      const revenue = await revenueService.editRevenue(req.params.id, req.body);
      if (!revenue)
        return res.status(404).json({ message: "Revenue not found" });
      res.status(200).json(revenue);
    } catch (err) {
      res
        .status(500)
        .json({ message: "Error updating revenue", error: err.message });
    }
  },
};

module.exports = { revenueController };
