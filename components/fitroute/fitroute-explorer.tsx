"use client";

import { useEffect, useMemo, useState } from "react";
import { LocateFixed, MapPinned } from "lucide-react";
import { CampusMap } from "@/components/fitroute/campus-map";
import { LocationCard } from "@/components/fitroute/location-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useLiveLocation } from "@/lib/use-live-location";
import { fromCampusLocation, fromOsmPlace, sortByDistance, type MapSpot } from "@/lib/map-spot";
import type { OsmPlace } from "@/lib/osm-places";
import type { CampusLocation } from "@/lib/supabase/types";

type PlacesState = { status: "idle" | "loading" | "ready" | "error"; places: OsmPlace[] };

export function FitRouteExplorer({ curatedLocations, college }: { curatedLocations: CampusLocation[]; college: string | null }) {
  const location = useLiveLocation();
  const [places, setPlaces] = useState<PlacesState>({ status: "idle", places: [] });
  const [selectedId, setSelectedId] = useState<string | null>(null);

  function fetchPlacesFor(lat: number, lng: number) {
    setPlaces({ status: "loading", places: [] });
    fetch(`/api/nearby-places?lat=${lat}&lng=${lng}`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => setPlaces({ status: "ready", places: data.places ?? [] }))
      .catch(() => setPlaces({ status: "error", places: [] }));
  }

  useEffect(() => {
    if (location.status !== "ready") return;
    // Fetching once live coordinates resolve, not state derived from props.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchPlacesFor(location.coords.lat, location.coords.lng);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-fetch only when the resolved position actually moves
  }, [location.status, location.status === "ready" ? location.coords.lat : null, location.status === "ready" ? location.coords.lng : null]);

  const liveCoords = location.status === "ready" ? location.coords : undefined;

  const spots: MapSpot[] = useMemo(() => {
    const curated = curatedLocations.map((loc) => fromCampusLocation(loc, liveCoords));
    const osm = places.places.map((p) => fromOsmPlace(p, liveCoords));
    return sortByDistance([...curated, ...osm]);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- liveCoords is a fresh object each render; its fields are what matter
  }, [curatedLocations, places.places, liveCoords?.lat, liveCoords?.lng]);

  const activeId = selectedId ?? spots[0]?.id ?? null;
  const stillSearching = location.status === "loading" || (location.status === "ready" && places.status === "loading");

  if (stillSearching && spots.length === 0) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-72 w-full rounded-2xl sm:h-96" />
        <Skeleton className="h-28 w-full rounded-2xl" />
      </div>
    );
  }

  if (spots.length === 0) {
    const canRetryLocation = location.status !== "ready";
    return (
      <EmptyState
        icon={MapPinned}
        title="Nothing nearby yet"
        description={
          canRetryLocation
            ? "Enable location access to discover nearby parks, tracks, and gyms" + (college ? ` — or ask your coordinator to add official spots for ${college}.` : ".")
            : college
              ? "No nearby spots found on OpenStreetMap, and your coordinator hasn't added any official locations yet."
              : "No nearby spots found on OpenStreetMap."
        }
        action={
          canRetryLocation ? (
            <Button size="sm" onClick={location.retry}>
              <LocateFixed /> Enable location
            </Button>
          ) : undefined
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      {location.status !== "ready" && (
        <button
          onClick={location.retry}
          className="flex w-full items-center justify-between gap-3 rounded-xl border border-dashed border-border px-4 py-2.5 text-left text-sm text-muted-foreground hover:bg-muted"
        >
          <span>Showing {curatedLocations.length ? "your college's official spots" : "cached results"} only — enable location to discover more nearby.</span>
          <LocateFixed className="size-4 shrink-0" />
        </button>
      )}
      <CampusMap spots={spots} selectedId={activeId} onSelect={setSelectedId} liveCoords={liveCoords} />
      <div className="space-y-3">
        {spots.map((spot) => (
          <LocationCard key={spot.id} spot={spot} selected={spot.id === activeId} onSelect={() => setSelectedId(spot.id)} />
        ))}
      </div>
    </div>
  );
}
