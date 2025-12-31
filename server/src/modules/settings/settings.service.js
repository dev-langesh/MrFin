const { Settings } = require("./settings.model");
const { AppError } = require("../../utils/error");
const { SettingsErrors } = require("../../errors/settingsErrors");

async function getSettings(userId) {
  try {
    let settings = await Settings.findOne({ userId });

    if (!settings) {
      // Create default settings if not found
      settings = await Settings.create({
        userId,
        importTransactionSettings: {
          preProcess: {},
          mapFields: {},
          rules: [],
          defaultRules: [],
        },
        transactionSettings: {
          categories: [],
        },
      });
    }

    return settings;
  } catch (error) {
    throw new AppError(SettingsErrors.FETCH_FAILED);
  }
}

async function updateSettings(userId, data) {
  try {
    const settings = await Settings.findOneAndUpdate(
      { userId },
      { $set: data },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    return settings;
  } catch (error) {
    throw new AppError(SettingsErrors.UPDATE_FAILED);
  }
}

const settingsService = {
  getSettings,
  updateSettings,
};

module.exports = { settingsService };
