const asyncHandler = require("express-async-handler");
const { settingsService } = require("./settings.service");

async function getSettings(req, res) {
  const settings = await settingsService.getSettings(req.user.id);
  res.json(settings);
}

async function updateSettings(req, res) {
  const settings = await settingsService.updateSettings(req.user.id, req.body);
  res.json(settings);
}

const settingsController = {
  getSettings: asyncHandler(getSettings),
  updateSettings: asyncHandler(updateSettings),
};

module.exports = { settingsController };
