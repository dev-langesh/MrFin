const { generateOtp } = require("../generateOtp");
const { config } = require("../../../../config/constants");

describe("generateOtp", () => {
  it("should generate OTP of correct length", () => {
    const otp = generateOtp();
    expect(otp).toHaveLength(config.otp.length);
  });

  it("should generate numeric OTP", () => {
    const otp = generateOtp();
    expect(otp).toMatch(/^\d+$/);
  });
});
