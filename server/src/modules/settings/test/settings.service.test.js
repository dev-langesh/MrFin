const { settingsService } = require("../settings.service");
const { Settings } = require("../settings.model");
const { SettingsErrors } = require("../../../errors/settingsErrors");
const { AppError } = require("../../../utils/error");

jest.mock("../settings.model");

describe("Settings Service", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getSettings", () => {
    it("should return existing settings for a user", async () => {
      const mockSettings = {
        userId: "user123",
        transactionSettings: { categories: ["Food"] },
      };
      Settings.findOne.mockResolvedValue(mockSettings);

      const result = await settingsService.getSettings("user123");

      expect(Settings.findOne).toHaveBeenCalledWith({ userId: "user123" });
      expect(result).toEqual(mockSettings);
    });

    it("should create default settings if not found", async () => {
      Settings.findOne.mockResolvedValue(null);
      const defaultSettings = {
        userId: "user123",
        importTransactionSettings: {
          preProcess: {},
          mapFields: {},
          rules: [],
        },
        transactionSettings: { categories: [] },
      };
      Settings.create.mockResolvedValue(defaultSettings);

      const result = await settingsService.getSettings("user123");

      expect(Settings.findOne).toHaveBeenCalledWith({ userId: "user123" });
      expect(Settings.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: "user123" })
      );
      expect(result).toEqual(defaultSettings);
    });

    it("should throw FETCH_FAILED error on DB failure", async () => {
      Settings.findOne.mockRejectedValue(new Error("DB Error"));

      await expect(settingsService.getSettings("user123")).rejects.toThrow(
        AppError
      );
      await expect(
        settingsService.getSettings("user123")
      ).rejects.toMatchObject({
        errorCode: SettingsErrors.FETCH_FAILED.errorCode,
      });
    });
  });

  describe("updateSettings", () => {
    it("should update settings successfully", async () => {
      const mockSettings = {
        userId: "user123",
        transactionSettings: { categories: ["New"] },
      };
      Settings.findOneAndUpdate.mockResolvedValue(mockSettings);

      const updateData = { transactionSettings: { categories: ["New"] } };
      const result = await settingsService.updateSettings(
        "user123",
        updateData
      );

      expect(Settings.findOneAndUpdate).toHaveBeenCalledWith(
        { userId: "user123" },
        { $set: updateData },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );
      expect(result).toEqual(mockSettings);
    });

    it("should throw UPDATE_FAILED error on DB failure", async () => {
      Settings.findOneAndUpdate.mockRejectedValue(new Error("DB Error"));

      await expect(
        settingsService.updateSettings("user123", {})
      ).rejects.toThrow(AppError);
      await expect(
        settingsService.updateSettings("user123", {})
      ).rejects.toMatchObject({
        errorCode: SettingsErrors.UPDATE_FAILED.errorCode,
      });
    });
  });
});
