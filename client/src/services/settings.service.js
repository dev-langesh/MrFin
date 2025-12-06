import { getSettings, updateSettings } from "@/api/settingsApi";

export const fetchSettingsService = async () => {
  const response = await getSettings();
  return response.data;
};

export const saveSettingsService = async (settings) => {
  const response = await updateSettings(settings);
  return response.data;
};
