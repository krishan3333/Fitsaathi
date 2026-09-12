// Unifies coordinator-curated DB locations and live OpenStreetMap results
// into one shape the map/list components can render without caring where a
// spot came from.
import { haversineKm } from "./geo";
import type { OsmPlace } from "./osm-places";
import type { CampusLocation, CrowdLevel, SafetyRating } from "./supabase/types";

export type MapSpot = {
  id: string;
  name: string;
  activityType: string;
  lat: number;
  lng: number;
  source: "curated" | "osm";
  distanceKm?: number; // live distance from the student, once position is known
  loopKm?: number; // curated-only: the coordinator's stated route/venue length
  estimatedSteps?: number; // curated-only
  crowdLevel?: CrowdLevel; // curated-only
  safetyRating?: SafetyRating; // curated-only
  hasWater?: boolean; // curated-only
  isOpen?: boolean; // curated-only
};

function liveDistance(lat: number, lng: number, live?: { lat: number; lng: number }) {
  return live ? haversineKm(live, { lat, lng }) : undefined;
}

export function fromCampusLocation(loc: CampusLocation, live?: { lat: number; lng: number }): MapSpot {
  return {
    id: loc.id,
    name: loc.name,
    activityType: loc.activity_type,
    lat: loc.lat,
    lng: loc.lng,
    source: "curated",
    distanceKm: liveDistance(loc.lat, loc.lng, live),
    loopKm: Number(loc.distance_km),
    estimatedSteps: loc.estimated_steps,
    crowdLevel: loc.crowd_level,
    safetyRating: loc.safety_rating,
    hasWater: loc.has_water,
    isOpen: loc.is_open,
  };
}

export function fromOsmPlace(place: OsmPlace, live?: { lat: number; lng: number }): MapSpot {
  return {
    id: place.id,
    name: place.name,
    activityType: place.activityType,
    lat: place.lat,
    lng: place.lng,
    source: "osm",
    distanceKm: liveDistance(place.lat, place.lng, live),
  };
}

export function sortByDistance(spots: MapSpot[]) {
  return [...spots].sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
}
