import { protectedApi } from "./axios";

export const getSettings = () => protectedApi.get("/settings");
export const updateSettings = (data) => protectedApi.put("/settings", data);
