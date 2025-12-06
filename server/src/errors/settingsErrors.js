const SettingsErrors = {
  NOT_FOUND: {
    errorCode: 5001,
    message: "Settings not found.",
    statusCode: 404,
  },
  UPDATE_FAILED: {
    errorCode: 5002,
    message: "Failed to update settings.",
    statusCode: 500,
  },
  FETCH_FAILED: {
    errorCode: 5003,
    message: "Failed to fetch settings.",
    statusCode: 500,
  },
};

module.exports = { SettingsErrors };
