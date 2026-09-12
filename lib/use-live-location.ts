"use client";

import { useEffect, useState } from "react";

export type LiveLocationState =
  | { status: "loading" }
  | { status: "denied" | "unsupported" | "error"; message: string }
  | { status: "ready"; coords: { lat: number; lng: number } };

/** Requests the browser's live GPS position once, with a retry handle for
 * denied/failed states. Shared by anything on FitRoute that wants "where the
 * student actually is" instead of a fixed campus point. */
export function useLiveLocation(): LiveLocationState & { retry: () => void } {
  const [state, setState] = useState<LiveLocationState>({ status: "loading" });

  function check() {
    if (!("geolocation" in navigator)) {
      setState({ status: "unsupported", message: "Your browser doesn't support location access." });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setState({ status: "ready", coords: { lat: pos.coords.latitude, lng: pos.coords.longitude } }),
      () => setState({ status: "denied", message: "Location access was denied — enable it to see what's near you." }),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  }

  function retry() {
    setState({ status: "loading" });
    check();
  }

  useEffect(() => {
    // One-time check of an external system (the browser's geolocation
    // permission) on mount, not state derived from props/other state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    check();
  }, []);

  return { ...state, retry };
}
