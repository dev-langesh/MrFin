const { analyticsService } = require("../analytics/analytics.service");
const { Revenue } = require("./revenue.model");

async function getRevenues(filters) {
  const {
    startDate,
    endDate,
    source,
    paymentGateway,
    sort = "desc",
    page = 1,
    limit = 10,
  } = filters;

  const query = {};

  if (startDate && endDate) {
    query.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
  }
  if (source) query.source = source;
  if (paymentGateway) query.paymentGateway = paymentGateway;

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const revenues = await Revenue.find(query)
    .sort({ createdAt: sort === "asc" ? 1 : -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Revenue.countDocuments(query);

  return { revenues, total, page: parseInt(page), limit: parseInt(limit) };
}

async function addRevenue(data) {
  const revenue = await Revenue.create(data);

  // Update analytics using new schema
  await analyticsService.updateAnalyticsOnAdd(
    {
      earnings: data.amount,
      expenses: 0, // revenue does not affect expenses
    },
    data.date
  );

  return revenue;
}

async function getRevenueById(id) {
  return await Revenue.findById(id);
}

async function deleteRevenue(id) {
  const revenue = await Revenue.findByIdAndDelete(id);
  if (revenue) {
    await analyticsService.updateAnalyticsOnDelete(
      {
        earnings: revenue.amount,
        expenses: 0,
      },
      revenue.date
    );
  }
  return revenue;
}

async function editRevenue(id, data) {
  const old = await Revenue.findById(id);
  const updated = await Revenue.findByIdAndUpdate(id, data, { new: true });

  if (old && updated) {
    await analyticsService.updateAnalyticsOnEdit({
      oldEarnings: old.amount,
      newEarnings: updated.amount,
      oldExpenses: 0,
      newExpenses: 0,
      oldDate: old.date,
      newDate: updated.date,
    });
  }

  return updated;
}

const revenueService = {
  addRevenue,
  getRevenues,
  getRevenueById,
  deleteRevenue,
  editRevenue,
};

module.exports = { revenueService };
