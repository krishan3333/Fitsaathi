// Open-Meteo (no key needed) for weather + air quality, with a small mock AQI
// fallback if the network call fails. AQI_API_KEY is kept as an env slot for
// swapping in a keyed provider (e.g. IQAir) later — see .env.example.

export interface WeatherSnapshot {
  tempC: number;
  precipitationMm: number;
  windKph: number;
  weatherCode: number;
  isRainy: boolean;
  isVeryHot: boolean;
}

export interface AqiSnapshot {
  aqi: number;
  category: "Good" | "Moderate" | "Poor";
  isMock: boolean;
}

export type GreenWindowStatus = "green" | "yellow" | "red";

export interface GreenWindow {
  status: GreenWindowStatus;
  message: string;
}

const RAINY_CODES = new Set([51, 53, 55, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99]);

export async function fetchWeather(lat: number, lng: number): Promise<WeatherSnapshot> {
  const res = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,precipitation,weather_code,wind_speed_10m`,
    { next: { revalidate: 600 } }
  );
  if (!res.ok) throw new Error(`Open-Meteo request failed: ${res.status}`);
  const data = await res.json();
  const current = data.current;
  const tempC = current.temperature_2m as number;
  const weatherCode = current.weather_code as number;
  return {
    tempC,
    precipitationMm: current.precipitation as number,
    windKph: current.wind_speed_10m as number,
    weatherCode,
    isRainy: RAINY_CODES.has(weatherCode) || current.precipitation > 0.2,
    isVeryHot: tempC >= 35,
  };
}

export async function fetchAqi(lat: number, lng: number): Promise<AqiSnapshot> {
  try {
    const res = await fetch(
      `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lng}&current=us_aqi`,
      { next: { revalidate: 600 } }
    );
    if (!res.ok) throw new Error(`AQI request failed: ${res.status}`);
    const data = await res.json();
    const aqi = Math.round(data.current.us_aqi as number);
    return { aqi, category: categorizeAqi(aqi), isMock: false };
  } catch {
    // Deterministic mock so the UI still has something sensible to show.
    const aqi = 95;
    return { aqi, category: categorizeAqi(aqi), isMock: true };
  }
}

function categorizeAqi(aqi: number): AqiSnapshot["category"] {
  if (aqi > 150) return "Poor";
  if (aqi > 100) return "Moderate";
  return "Good";
}

export function getGreenWindow(weather: WeatherSnapshot, aqi: AqiSnapshot): GreenWindow {
  if (weather.isRainy || weather.isVeryHot || aqi.category === "Poor") {
    return {
      status: "red",
      message: "Outdoor conditions are not suitable now. Try a 10-minute indoor mobility workout at Hostel Workout Zone.",
    };
  }
  if (weather.tempC >= 30 || aqi.category === "Moderate") {
    return {
      status: "yellow",
      message: "Conditions are okay but not ideal — keep outdoor sessions short and carry water.",
    };
  }
  return { status: "green", message: "Good time for outdoor activity." };
}
