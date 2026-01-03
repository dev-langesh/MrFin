import { api } from "@/api/axios";

export const otpApi = {
  sendOtp: (body) => api.post("/otp/send", body),
  verifyOtp: (body) => api.post("/otp/verify", body),
};
