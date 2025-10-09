const TransactionErrors = {
  INVALID_ID: {
    errorCode: 4001,
    message: "Invalid transaction ID.",
    statusCode: 400,
  },
  NOT_FOUND: {
    errorCode: 4002,
    message: "Transaction not found.",
    statusCode: 404,
  },
  CREATE_FAILED: {
    errorCode: 4003,
    message: "Failed to create transaction. Please try again.",
    statusCode: 500,
  },
  UPDATE_FAILED: {
    errorCode: 4004,
    message: "Failed to update transaction. Please try again.",
    statusCode: 500,
  },
  DELETE_FAILED: {
    errorCode: 4005,
    message: "Failed to delete transaction. Please try again.",
    statusCode: 500,
  },
  PAGE_OUT_OF_BOUNDS: {
    errorCode: 4006,
    message: "Requested page is out of bounds.",
    statusCode: 400,
  },
};

module.exports = { TransactionErrors };
