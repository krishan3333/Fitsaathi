import { NextResponse } from "next/server";
import { fetchAqi, fetchWeather, getGreenWindow } from "@/lib/weather";

// Default to the seeded campus (Campus Green Loop) when no coords are given.
const DEFAULT_LAT = 28.746;
const DEFAULT_LNG = 77.118;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get("lat") ?? DEFAULT_LAT);
  const lng = Number(searchParams.get("lng") ?? DEFAULT_LNG);

  try {
    const [weather, aqi] = await Promise.all([fetchWeather(lat, lng), fetchAqi(lat, lng)]);
    const greenWindow = getGreenWindow(weather, aqi);
    return NextResponse.json({ weather, aqi, greenWindow });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Weather lookup failed" },
      { status: 502 }
    );
  }
}
