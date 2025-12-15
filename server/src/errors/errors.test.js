const { AnalyticsErrors } = require("./analyticsErrors");
const { AuthErrors } = require("./authErrors");
const { NotificationErrors } = require("./notificationErrors");
const { SettingsErrors } = require("./settingsErrors");
const { TransactionErrors } = require("./transactionErrors");

const errorModules = [
  { name: "Analytics Errors", errors: AnalyticsErrors },
  { name: "Auth Errors", errors: AuthErrors },
  { name: "Notification Errors", errors: NotificationErrors },
  { name: "Settings Errors", errors: SettingsErrors },
  { name: "Transaction Errors", errors: TransactionErrors },
];

describe("App Errors", () => {
  const errorPrefixes = {
    "Auth Errors": 1,
    "Transaction Errors": 4,
    "Settings Errors": 5,
    "Notification Errors": 6,
    "Analytics Errors": 7,
  };

  const allCodes = new Set();
  const allErrors = [];

  errorModules.forEach(({ name, errors }) => {
    allErrors.push(
      ...Object.values(errors).map((e) => ({ ...e, module: name }))
    );
  });

  // Global Uniqueness Check
  it("should have globally unique error codes across all modules", () => {
    const codes = allErrors.map((e) => e.errorCode);
    const uniqueCodes = new Set(codes);

    // Find duplicates for better error message
    const duplicates = codes.filter(
      (item, index) => codes.indexOf(item) !== index
    );
    if (duplicates.length > 0) {
      console.error("Duplicate Error Codes Found:", duplicates);
    }

    expect(codes.length).toBe(uniqueCodes.size);
  });

  errorModules.forEach(({ name, errors }) => {
    describe(name, () => {
      it("should have correct structure", () => {
        Object.values(errors).forEach((error) => {
          expect(error).toHaveProperty("errorCode");
          expect(error).toHaveProperty("message");
          expect(error).toHaveProperty("statusCode");
        });
      });

      it(`should have error codes starting with correct prefix (${errorPrefixes[name]})`, () => {
        const allowedPrefixes = Array.isArray(errorPrefixes[name])
          ? errorPrefixes[name]
          : [errorPrefixes[name]];

        Object.values(errors).forEach((error) => {
          const prefix = parseInt(error.errorCode.toString().substring(0, 1));
          const prefix4digit = parseInt(
            error.errorCode.toString().substring(0, 4)
          );

          expect(allowedPrefixes).toContain(prefix);
        });
      });
    });
  });
});
