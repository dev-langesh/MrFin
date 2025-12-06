import { getSettings, updateSettings } from "@/api/settingsApi";

const fetchSettings = async () => {
  const response = await getSettings();
  return response.data;
};

const saveSettings = async (settings) => {
  const response = await updateSettings(settings);
  return response.data;
};

export const settingsService = {
  fetchSettings,
  saveSettings,
};
