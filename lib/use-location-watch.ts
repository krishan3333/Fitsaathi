"use client";

import { useEffect, useRef, useState } from "react";

export type LocationWatchState =
  | { status: "idle" }
  | { status: "watching"; coords: { lat: number; lng: number }; at: number }
  | { status: "error"; message: string };

/** Continuous location updates via watchPosition, for a live Safety Session
 * — distinct from lib/use-live-location.ts's one-shot fetch (used by
 * FitRoute), which stays untouched so its behavior can't regress. */
export function useLocationWatch(enabled: boolean) {
  const [state, setState] = useState<LocationWatchState>({ status: "idle" });
  const watchId = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) {
      // Resetting to idle when the session stops watching, not state derived
      // from props on every render.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState({ status: "idle" });
      return;
    }
    if (!("geolocation" in navigator)) {
      setState({ status: "error", message: "This browser doesn't support location access." });
      return;
    }

    watchId.current = navigator.geolocation.watchPosition(
      (pos) => setState({ status: "watching", coords: { lat: pos.coords.latitude, lng: pos.coords.longitude }, at: Date.now() }),
      () => setState({ status: "error", message: "Location access was denied." }),
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 20000 }
    );

    return () => {
      if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    };
  }, [enabled]);

  return state;
}
