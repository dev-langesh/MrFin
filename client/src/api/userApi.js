import { protectedApi } from "./axios";

export const userApi = {
  getProfile: async () => {
    const response = await protectedApi.get("/users/profile");
    return response.data;
  },
  updateProfile: async (data) => {
    const response = await protectedApi.patch("/users/profile", data);
    return response.data.user;
  },
};
