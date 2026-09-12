/** Great-circle distance between two lat/lng points, in kilometers. */
export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// ponytail: flat 1300 steps/km average regardless of activity type or user stride,
// an estimate only (never claimed as pedometer-accurate). Upgrade path: derive
// per-activity-type multipliers (walk vs run) or a per-user calibrated stride length.
export function estimateStepsFromDistance(distanceKm: number) {
  return Math.round(distanceKm * 1300);
}
