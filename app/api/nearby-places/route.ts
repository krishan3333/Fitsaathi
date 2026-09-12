import { NextResponse } from "next/server";
import { fetchNearbyPlaces } from "@/lib/osm-places";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "lat and lng query params are required" }, { status: 400 });
  }

  const places = await fetchNearbyPlaces(lat, lng);
  return NextResponse.json({ places });
}
