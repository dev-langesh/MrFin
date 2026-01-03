import { api } from "@/api/axios";

export const authApi = {
  login: (body) => api.post("/auth/login", body),
  googleLogin: (body) => api.post("/auth/login/google", body),
  completeGoogleLogin: (body) => api.post("/auth/login/google/complete", body),
  logout: () => api.post("/auth/logout"),
  register: (body) => api.post("/auth/register", body),
  status: () => api.get("/auth/status"),
  rotateTokens: () => api.post("/auth/rotate-tokens"),

  // Auth specific verification using OTP token
  verifyEmail: (body) => api.post("/auth/verify-email", body),

  resetPassword: (body) => api.post("/auth/reset-password", body),
};
