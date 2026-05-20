import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { ParkrunLocation } from "@/lib/parkrun.functions";

interface ParkrunMapProps {
  locations: ParkrunLocation[];
  height?: number;
  center?: [number, number];
  zoom?: number;
}

// Bundle marker icon URLs — Leaflet's default icon resolution breaks in Vite.
import iconUrl from "leaflet/dist/images/marker-icon.png";
import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";

const defaultIcon = L.icon({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export function ParkrunMap({
  locations,
  height = 480,
  center = [54.5, -3.0],
  zoom = 5,
}: ParkrunMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center,
      zoom,
      scrollWheelZoom: false,
    });
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 18,
    }).addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const layer = L.layerGroup().addTo(map);
    const bounds: L.LatLngTuple[] = [];
    for (const l of locations) {
      if (l.lat == null || l.lng == null) continue;
      const m = L.marker([l.lat, l.lng], { icon: defaultIcon }).bindPopup(
        `<a href="/parkrun-events/${l.slug}" style="font-weight:600">${l.name}</a><br/>${l.distance ?? ""}`,
      );
      m.addTo(layer);
      bounds.push([l.lat, l.lng]);
    }
    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [20, 20], maxZoom: 12 });
    }
    return () => {
      layer.remove();
    };
  }, [locations]);

  return (
    <div
      ref={containerRef}
      className="w-full rounded-2xl border border-border overflow-hidden"
      style={{ height }}
    />
  );
}
