const { Revenue } = require("./revenue.model");

async function addRevenue(data) {
  const revenue = new Revenue(data);
  return await revenue.save();
}

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

async function getRevenueById(id) {
  return await Revenue.findById(id);
}

async function deleteRevenue(id) {
  return await Revenue.findByIdAndDelete(id);
}

async function editRevenue(id, data) {
  return await Revenue.findByIdAndUpdate(id, data, { new: true });
}

module.exports = {
  addRevenue,
  getRevenues,
  getRevenueById,
  deleteRevenue,
  editRevenue,
};
