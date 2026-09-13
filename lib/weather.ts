// Open-Meteo (no key needed) for weather + air quality, with a small mock AQI
// fallback if the network call fails. AQI_API_KEY is kept as an env slot for
// swapping in a keyed provider (e.g. IQAir) later — see .env.example.

import { APP_TZ } from "./time";

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

/** Core red/yellow/green thresholds, shared by the current-conditions check
 * (getGreenWindow) and the hour-by-hour Fit Window engine (lib/fit-window.ts).
 * `aqi` is nullable because a single missing hour in the forecast shouldn't
 * force red — it just drops out of the AQI half of the check. */
export function classifyConditions(tempC: number, isRainy: boolean, aqi: number | null): GreenWindowStatus {
  const aqiCategory = aqi == null ? null : categorizeAqi(aqi);
  if (isRainy || tempC >= 35 || aqiCategory === "Poor") return "red";
  if (tempC >= 30 || aqiCategory === "Moderate") return "yellow";
  return "green";
}

export function getGreenWindow(weather: WeatherSnapshot, aqi: AqiSnapshot): GreenWindow {
  const status = classifyConditions(weather.tempC, weather.isRainy, aqi.aqi);
  if (status === "red") {
    return {
      status,
      message: "Outdoor conditions are not suitable now. Try a 10-minute indoor mobility workout at Hostel Workout Zone.",
    };
  }
  if (status === "yellow") {
    return {
      status,
      message: "Conditions are okay but not ideal — keep outdoor sessions short and carry water.",
    };
  }
  return { status, message: "Good time for outdoor activity." };
}

export interface HourlyConditions {
  hour: number; // 0-23, Asia/Kolkata local hour
  tempC: number;
  isRainy: boolean;
  aqi: number | null;
  status: GreenWindowStatus;
}

/** Today's hour-by-hour forecast for a college's coordinates, in IST. Missing
 * hours (API gap, or the AQI feed not covering an hour the weather feed
 * does) are simply absent from the returned array — callers treat a missing
 * hour as yellow, never as an outage. */
export async function fetchHourlyForecast(lat: number, lng: number): Promise<HourlyConditions[]> {
  // Rounded to 2dp so a whole college shares the 15-minute cache instead of
  // every student's slightly different GPS fix busting it individually.
  const rlat = Math.round(lat * 100) / 100;
  const rlng = Math.round(lng * 100) / 100;

  const [weatherRes, aqiRes] = await Promise.all([
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${rlat}&longitude=${rlng}&hourly=temperature_2m,precipitation,precipitation_probability,weather_code&timezone=${encodeURIComponent(APP_TZ)}&forecast_days=1`,
      { next: { revalidate: 900 } }
    ),
    fetch(
      `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${rlat}&longitude=${rlng}&hourly=us_aqi&timezone=${encodeURIComponent(APP_TZ)}&forecast_days=1`,
      { next: { revalidate: 900 } }
    ).catch(() => null),
  ]);
  if (!weatherRes.ok) throw new Error(`Open-Meteo hourly request failed: ${weatherRes.status}`);
  const weatherData = await weatherRes.json();
  const aqiData = aqiRes && aqiRes.ok ? await aqiRes.json() : null;

  const aqiByHour = new Map<number, number>();
  if (aqiData?.hourly?.time) {
    (aqiData.hourly.time as string[]).forEach((iso, i) => {
      const hh = Number(iso.slice(11, 13));
      const aqiValue = aqiData.hourly.us_aqi[i];
      if (aqiValue != null) aqiByHour.set(hh, Math.round(aqiValue));
    });
  }

  const times: string[] = weatherData.hourly?.time ?? [];
  const temps: number[] = weatherData.hourly?.temperature_2m ?? [];
  const precip: number[] = weatherData.hourly?.precipitation ?? [];
  const precipProb: number[] = weatherData.hourly?.precipitation_probability ?? [];
  const codes: number[] = weatherData.hourly?.weather_code ?? [];

  return times.map((iso, i) => {
    const hour = Number(iso.slice(11, 13));
    const tempC = temps[i];
    const isRainy = RAINY_CODES.has(codes[i]) || precip[i] > 0.2 || precipProb[i] >= 60;
    const aqi = aqiByHour.get(hour) ?? null;
    return { hour, tempC, isRainy, aqi, status: classifyConditions(tempC, isRainy, aqi) };
  });
}
