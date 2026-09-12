"use client";

import { useEffect, useState } from "react";
import { LocateFixed, MapPinOff } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { GreenWindowCard } from "@/components/fitroute/green-window-card";
import { useLiveLocation } from "@/lib/use-live-location";
import type { GreenWindowStatus } from "@/lib/weather";

type WeatherState =
  | { status: "idle" | "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; weather: { tempC: number }; aqi: { aqi: number }; greenWindow: { status: GreenWindowStatus; message: string } };

/** Real conditions at the student's actual location — not a fixed campus point. */
export function LiveWeatherCard() {
  const location = useLiveLocation();
  const [weather, setWeather] = useState<WeatherState>({ status: "idle" });

  function fetchWeatherFor(lat: number, lng: number) {
    setWeather({ status: "loading" });
    fetch(`/api/weather?lat=${lat}&lng=${lng}`)
      .then((res) => {
        if (!res.ok) throw new Error("Weather lookup failed");
        return res.json();
      })
      .then((data) => setWeather({ status: "ready", ...data }))
      .catch(() => setWeather({ status: "error", message: "Couldn't fetch conditions for your location right now." }));
  }

  useEffect(() => {
    if (location.status !== "ready") return;
    // Fetching once live coordinates resolve, not state derived from props.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchWeatherFor(location.coords.lat, location.coords.lng);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- location.coords is a fresh object each render; compare its fields instead
  }, [location.status, location.status === "ready" ? location.coords.lat : null, location.status === "ready" ? location.coords.lng : null]);

  if (location.status === "loading" || (location.status === "ready" && (weather.status === "idle" || weather.status === "loading"))) {
    return <Skeleton className="h-24 w-full rounded-2xl" />;
  }

  if (location.status === "ready" && weather.status === "ready") {
    return <GreenWindowCard status={weather.greenWindow.status} message={weather.greenWindow.message} tempC={weather.weather.tempC} aqi={weather.aqi.aqi} />;
  }

  const message = location.status !== "ready" ? location.message : weather.status === "error" ? weather.message : "";

  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-3 py-4">
        <div className="flex items-center gap-3">
          <MapPinOff className="size-5 shrink-0 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>
        <Button size="sm" variant="outline" onClick={location.retry}>
          <LocateFixed /> Retry
        </Button>
      </CardContent>
    </Card>
  );
}
