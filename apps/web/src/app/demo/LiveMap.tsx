"use client";

import React, { useEffect, useRef, useState } from "react";

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    L?: any;
  }
}

export interface LatLng {
  latitude: number;
  longitude: number;
}

let leafletPromise: Promise<any> | null = null;

/** Loads Leaflet once from the CDN (same library the mobile app's map uses). */
function loadLeaflet(): Promise<any> {
  if (window.L) return Promise.resolve(window.L);
  if (leafletPromise) return leafletPromise;
  leafletPromise = new Promise((resolve, reject) => {
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(css);
    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload = () => resolve(window.L);
    script.onerror = () => reject(new Error("Could not load the map library (check internet)."));
    document.head.appendChild(script);
  });
  return leafletPromise;
}

interface LiveMapProps {
  pickup: LatLng;
  provider?: LatLng | null;
  className?: string;
}

/** Dark map with the customer's pickup point and, once known, the provider's live position. */
export function LiveMap({ pickup, provider, className }: LiveMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const providerMarkerRef = useRef<any>(null);
  const lineRef = useRef<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadLeaflet()
      .then((L) => {
        if (cancelled || !containerRef.current || mapRef.current) return;
        const map = L.map(containerRef.current, { zoomControl: false, attributionControl: false }).setView(
          [pickup.latitude, pickup.longitude],
          15,
        );
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(map);
        const pickupIcon = L.divIcon({
          className: "",
          html: '<div style="width:18px;height:18px;border-radius:50%;background:#22E58B;border:3px solid #0B0B0F;box-shadow:0 0 0 6px rgba(34,229,139,.25)"></div>',
          iconSize: [18, 18],
          iconAnchor: [9, 9],
        });
        L.marker([pickup.latitude, pickup.longitude], { icon: pickupIcon }).addTo(map);
        mapRef.current = map;
      })
      .catch((e: Error) => setError(e.message));
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      providerMarkerRef.current = null;
      lineRef.current = null;
    };
  }, [pickup.latitude, pickup.longitude]);

  useEffect(() => {
    const map = mapRef.current;
    const L = window.L;
    if (!map || !L || !provider) return;
    const position: [number, number] = [provider.latitude, provider.longitude];
    if (!providerMarkerRef.current) {
      const icon = L.divIcon({
        className: "",
        html: '<div style="width:34px;height:34px;border-radius:12px;background:#fff;border:3px solid #0B0B0F;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 2px 8px rgba(0,0,0,.5)">🚛</div>',
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      });
      providerMarkerRef.current = L.marker(position, { icon }).addTo(map);
    } else {
      providerMarkerRef.current.setLatLng(position);
    }
    const line: [number, number][] = [position, [pickup.latitude, pickup.longitude]];
    if (!lineRef.current) {
      lineRef.current = L.polyline(line, { color: "#22E58B", weight: 4, dashArray: "8,8" }).addTo(map);
    } else {
      lineRef.current.setLatLngs(line);
    }
    map.fitBounds(L.latLngBounds(line), { padding: [50, 50], maxZoom: 16 });
  }, [provider, pickup.latitude, pickup.longitude]);

  return (
    <div className={className} style={{ position: "relative", background: "#0B0B0F" }}>
      <style>{`.demo-dark-map .leaflet-tile-pane{filter:invert(1) hue-rotate(180deg) brightness(.85) saturate(.7)}`}</style>
      <div ref={containerRef} className="demo-dark-map" style={{ position: "absolute", inset: 0 }} />
      {error ? (
        <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: "#A1A3AD", fontSize: 13 }}>
          {error}
        </div>
      ) : null}
    </div>
  );
}
