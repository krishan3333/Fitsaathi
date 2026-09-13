"use client";

// Extracted from components/fitroute/gps-session-dialog.tsx so Squad Sessions
// (components/squad/squad-live-board.tsx) can reuse the same tracking loop —
// both need live distance + the actual start/end GPS fixes (squad finalize
// needs the fixes themselves to check colocation, not just a distance total).
import { useEffect, useRef, useState } from "react";
import { haversineKm } from "./geo";

export type GpsTrackerStatus = "idle" | "tracking" | "error";

export interface GpsPoint {
  lat: number;
  lng: number;
}

export interface GpsTrackerState {
  status: GpsTrackerStatus;
  distanceKm: number;
  elapsedSec: number;
  error: string | null;
  startPoint: GpsPoint | null;
  lastPoint: GpsPoint | null;
}

export function useGpsTracker() {
  const [state, setState] = useState<GpsTrackerState>({
    status: "idle",
    distanceKm: 0,
    elapsedSec: 0,
    error: null,
    startPoint: null,
    lastPoint: null,
  });

  const watchIdRef = useRef<number | null>(null);
  const startedAtRef = useRef<number>(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function stop() {
    if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    if (tickRef.current) clearInterval(tickRef.current);
    watchIdRef.current = null;
    tickRef.current = null;
  }

  function start() {
    if (!("geolocation" in navigator)) {
      setState((s) => ({ ...s, status: "error", error: "GPS isn't available on this device/browser." }));
      return;
    }
    startedAtRef.current = Date.now();
    setState({ status: "tracking", distanceKm: 0, elapsedSec: 0, error: null, startPoint: null, lastPoint: null });

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        // A fix worse than 50m accuracy is noise, not a real position — drop
        // it rather than let it swing the anchor point. Movement under 3m
        // between fixes is normal GPS jitter while stationary — count it as
        // still-at-the-anchor rather than accumulating fake distance, but
        // still keep the anchor itself as the *first* fix seen so a long
        // stationary stretch doesn't slowly drift the start point.
        if (pos.coords.accuracy > 50) return;
        const point: GpsPoint = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setState((s) => {
          if (!s.lastPoint) return { ...s, startPoint: point, lastPoint: point };
          const movedKm = haversineKm(s.lastPoint, point);
          if (movedKm < 0.003) return s;
          return { ...s, distanceKm: s.distanceKm + movedKm, lastPoint: point };
        });
      },
      () => setState((s) => ({ ...s, status: "error", error: "Couldn't access your location — check permissions." })),
      { enableHighAccuracy: true, maximumAge: 5000 }
    );

    tickRef.current = setInterval(() => {
      setState((s) => ({ ...s, elapsedSec: Math.round((Date.now() - startedAtRef.current) / 1000) }));
    }, 1000);
  }

  useEffect(() => stop, []);

  return { ...state, start, stop };
}
