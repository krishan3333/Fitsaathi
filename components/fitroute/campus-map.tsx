"use client";

import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import type { StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { MapSpot } from "@/lib/map-spot";

const CROWD_COLOR: Record<string, string> = { Low: "#22c55e", Medium: "#f59e0b", High: "#ef4444" };
const OSM_MARKER_COLOR = "#94a3b8"; // neutral slate — visually distinct from curated (crowd-coded) pins

const OSM_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
    },
  },
  layers: [{ id: "osm", type: "raster", source: "osm" }],
};

export function CampusMap({
  spots,
  selectedId,
  onSelect,
  liveCoords,
}: {
  spots: MapSpot[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  liveCoords?: { lat: number; lng: number };
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || (spots.length === 0 && !liveCoords)) return;
    // Guard against a dashboard URL being pasted in place of the key — that
    // would build a broken style URL and leave a blank map, so fall back to OSM.
    const rawKey = process.env.NEXT_PUBLIC_MAPTILER_KEY?.trim();
    const maptilerKey = rawKey && !rawKey.includes("/") ? rawKey : undefined;
    const center: [number, number] = liveCoords ? [liveCoords.lng, liveCoords.lat] : [spots[0].lng, spots[0].lat];

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: maptilerKey ? `https://api.maptiler.com/maps/streets-v2/style.json?key=${maptilerKey}` : OSM_STYLE,
      center,
      zoom: 15,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    mapRef.current = map;

    if (liveCoords) {
      const el = document.createElement("div");
      el.setAttribute("aria-label", "Your location");
      el.style.cssText = "width:14px;height:14px;border-radius:9999px;border:3px solid white;box-shadow:0 0 0 2px #3b82f6,0 1px 4px rgba(0,0,0,.5);background:#3b82f6;";
      new maplibregl.Marker({ element: el }).setLngLat([liveCoords.lng, liveCoords.lat]).addTo(map);
    }

    for (const spot of spots) {
      const el = document.createElement("button");
      el.setAttribute("aria-label", spot.name);
      const color = spot.source === "curated" ? CROWD_COLOR[spot.crowdLevel ?? "Low"] ?? "#332e8f" : OSM_MARKER_COLOR;
      el.style.cssText = `width:16px;height:16px;border-radius:9999px;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,.4);background:${color};cursor:pointer;`;
      el.onclick = () => onSelect(spot.id);
      new maplibregl.Marker({ element: el }).setLngLat([spot.lng, spot.lat]).addTo(map);
    }

    return () => map.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- rebuild only when the spot set or position actually changes, not on every object identity change
  }, [spots, liveCoords?.lat, liveCoords?.lng]);

  useEffect(() => {
    if (!selectedId || !mapRef.current) return;
    const spot = spots.find((s) => s.id === selectedId);
    if (spot) mapRef.current.flyTo({ center: [spot.lng, spot.lat], zoom: 17 });
  }, [selectedId, spots]);

  return <div ref={containerRef} className="h-72 w-full overflow-hidden rounded-2xl border border-border sm:h-96" />;
}
