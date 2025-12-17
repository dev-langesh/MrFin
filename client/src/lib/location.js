export async function getUserCountryCode() {
  try {
    const res = await fetch("https://ipapi.co/json/");
    const data = await res.json();
    return data.country_code; // e.g. "US", "IN"
  } catch {
    return null;
  }
}
