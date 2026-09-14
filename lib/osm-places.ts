// Live nearby fitness spots from OpenStreetMap's free Overpass API — no key,
// no coordinator setup needed. Lets FitRoute work for any student anywhere,
// not just colleges someone has manually curated locations for.

export interface OsmPlace {
  id: string;
  name: string;
  activityType: string;
  lat: number;
  lng: number;
}

const TAG_LABELS: Record<string, string> = {
  pitch: "Sports Pitch",
  sports_centre: "Sports Centre",
  fitness_centre: "Gym",
  track: "Running Track",
  stadium: "Stadium",
  swimming_pool: "Swimming Pool",
  park: "Park",
  gym: "Gym",
};

interface OverpassElement {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

function buildQuery(lat: number, lng: number, radiusM: number) {
  const around = `(around:${radiusM},${lat},${lng})`;
  return `[out:json][timeout:15];(
    node["leisure"~"^(pitch|sports_centre|fitness_centre|track|stadium|swimming_pool|park)$"]${around};
    way["leisure"~"^(pitch|sports_centre|fitness_centre|track|stadium|swimming_pool|park)$"]${around};
    node["amenity"="gym"]${around};
    way["amenity"="gym"]${around};
  );out center tags;`;
}

function labelFor(tags: Record<string, string>) {
  const key = tags.leisure ?? tags.amenity ?? "";
  return TAG_LABELS[key] ?? "Fitness Spot";
}

/** Round to ~110m grid so nearby GPS jitter reuses the same cached fetch. */
function roundCoord(n: number) {
  return Math.round(n * 1000) / 1000;
}

export async function fetchNearbyPlaces(lat: number, lng: number, radiusM = 3000): Promise<OsmPlace[]> {
  const rLat = roundCoord(lat);
  const rLng = roundCoord(lng);
  const query = buildQuery(rLat, rLng, radiusM);

  try {
    const res = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      body: `data=${encodeURIComponent(query)}`,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        // Overpass returns 406 without an explicit Accept header, and its
        // usage policy asks for an identifying User-Agent.
        Accept: "application/json",
        "User-Agent": "Moveup/1.0 (SIH26196 student fitness app)",
      },
      next: { revalidate: 900 },
    });
    if (!res.ok) throw new Error(`Overpass request failed: ${res.status}`);
    const data: { elements: OverpassElement[] } = await res.json();

    return data.elements
      .filter((el) => el.tags?.name)
      .map((el) => {
        const pos = el.type === "node" ? { lat: el.lat!, lng: el.lon! } : { lat: el.center!.lat, lng: el.center!.lon };
        return {
          id: `${el.type}/${el.id}`,
          name: el.tags!.name,
          activityType: labelFor(el.tags!),
          lat: pos.lat,
          lng: pos.lng,
        };
      })
      .slice(0, 20);
  } catch (error) {
    // Overpass is a shared free instance — occasionally slow/rate-limited.
    // Fail soft for the caller (falls back to curated-only locations), but
    // never swallow the real reason silently.
    console.error("fetchNearbyPlaces failed:", error);
    return [];
  }
}
