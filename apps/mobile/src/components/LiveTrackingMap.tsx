import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { WebView, WebViewMessageEvent } from "react-native-webview";
import { LocateFixed } from "lucide-react-native";
import { COLORS, SHADOW } from "../theme/colors";

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

interface LiveTrackingMapProps {
  /** The fixed point — the customer's pickup location, on both apps. */
  pickup: GeoPoint;
  /** The moving point — the provider's live position on the Customer app,
   * or the provider's own live position on the Provider app. Null while
   * no location has been received yet. */
  moving: GeoPoint | null;
  /** Label under the moving marker, e.g. a business name or "You". */
  movingLabel?: string;
  /** The real road path between the moving point and pickup, from
   * RoutingService (Ch32/ADR 0012). Null/undefined falls back to the
   * straight dashed connector — a routing-provider outage or throttled fetch
   * never breaks the map, it just loses the "real path" detail. */
  routeGeometry?: GeoPoint[] | null;
  /** Extra bottom offset for the recenter button so it clears a floating
   * bottom card overlay, if the caller renders one. Defaults to 16. */
  bottomInset?: number;
}

/**
 * Ch54/Ch77's live-tracking map — previously TrackRequestScreen/ActiveJobScreen
 * just printed raw lat/lng numbers as text (flagged as the single biggest
 * mobile UX gap for a roadside-assistance app, see docs/roadmap.md). Draws a
 * real road-path polyline when `routeGeometry` is available (Ch32/ADR 0012's
 * previously-unbuilt routing feature); falls back to an honest straight
 * dashed connector when it isn't (routing provider unavailable, or no fetch
 * has completed yet) — never claims a route it doesn't actually have.
 *
 * Rendered via a WebView loading Leaflet + OpenStreetMap tiles rather than
 * react-native-maps/Google Maps: Google Maps SDK for Android requires a
 * billing-account-linked API key, which this project deliberately avoids
 * needing just to show a tracking map. OSM tiles need no API key or billing
 * account at all.
 */
export function LiveTrackingMap({
  pickup,
  moving,
  movingLabel,
  routeGeometry,
  bottomInset = 16,
}: LiveTrackingMapProps) {
  const webviewRef = useRef<WebView>(null);
  const [ready, setReady] = useState(false);

  // The map is centered/initialized on `pickup` once; it isn't expected to
  // change during a single tracking session, so the HTML is only rebuilt
  // (remounting the WebView) if it genuinely does.
  const html = useMemo(() => buildTrackingMapHtml(pickup), [pickup.latitude, pickup.longitude]);

  const pushMovingState = useCallback(() => {
    if (!webviewRef.current || !ready) {
      return;
    }
    if (moving) {
      const label = movingLabel ? JSON.stringify(movingLabel) : "null";
      webviewRef.current.injectJavaScript(
        `window.setMoving(${moving.latitude}, ${moving.longitude}, ${label}); true;`,
      );
    } else {
      webviewRef.current.injectJavaScript("window.clearMoving(); true;");
    }
  }, [moving?.latitude, moving?.longitude, movingLabel, ready]);

  useEffect(() => {
    pushMovingState();
  }, [pushMovingState]);

  useEffect(() => {
    if (!webviewRef.current || !ready) {
      return;
    }
    if (routeGeometry && routeGeometry.length >= 2) {
      webviewRef.current.injectJavaScript(`window.setRoute(${JSON.stringify(routeGeometry)}); true;`);
    } else {
      // Redraw the dashed fallback immediately rather than leaving no
      // connector at all until the next location ping happens to arrive.
      webviewRef.current.injectJavaScript("window.clearRoute(); true;");
      pushMovingState();
    }
  }, [routeGeometry, ready, pushMovingState]);

  function handleMessage(event: WebViewMessageEvent) {
    if (event.nativeEvent.data === "ready") {
      setReady(true);
    }
  }

  function recenter() {
    webviewRef.current?.injectJavaScript("window.recenterMap(); true;");
  }

  return (
    <View style={styles.container}>
      <WebView
        ref={webviewRef}
        key={`${pickup.latitude}-${pickup.longitude}`}
        source={{ html }}
        style={StyleSheet.absoluteFill}
        onMessage={handleMessage}
        javaScriptEnabled
        domStorageEnabled
        originWhitelist={["*"]}
      />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Recenter map"
        style={[styles.recenterButton, { bottom: bottomInset }]}
        onPress={recenter}
      >
        <LocateFixed size={20} color={COLORS.primary} />
      </Pressable>
    </View>
  );
}

function buildTrackingMapHtml(pickup: GeoPoint): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; background: ${COLORS.bg}; }
    .pickup-pin {
      width: 36px; height: 36px; border-radius: 18px; background: ${COLORS.surface};
      border: 2px solid ${COLORS.danger}; display: flex; align-items: center; justify-content: center;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3); font-size: 18px;
    }
    .moving-wrap { display: flex; flex-direction: column; align-items: center; }
    .moving-pin {
      width: 40px; height: 40px; border-radius: 20px; background: ${COLORS.primary};
      border: 2px solid ${COLORS.surface}; display: flex; align-items: center; justify-content: center;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3); color: #FFFFFF; font-size: 18px;
    }
    .moving-label {
      margin-top: 4px; background: ${COLORS.surface}; border-radius: 8px; padding: 2px 8px;
      font-size: 11px; font-weight: 700; color: ${COLORS.textPrimary}; box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      white-space: nowrap;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    var PICKUP_LAT = ${pickup.latitude};
    var PICKUP_LNG = ${pickup.longitude};
    var PRIMARY = ${JSON.stringify(COLORS.primary)};

    var map = L.map('map', { zoomControl: false, attributionControl: false })
      .setView([PICKUP_LAT, PICKUP_LNG], 15);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      subdomains: ['a', 'b', 'c'],
    }).addTo(map);

    var pickupIcon = L.divIcon({
      className: '', html: '<div class="pickup-pin">📍</div>', iconSize: [36, 36], iconAnchor: [18, 18],
    });
    L.marker([PICKUP_LAT, PICKUP_LNG], { icon: pickupIcon }).addTo(map);

    var movingMarker = null;
    var polyline = null; // straight-line fallback connector
    var routeLine = null; // real road path, when RoutingService has one
    var hasRealRoute = false;

    function movingIcon(label) {
      var labelHtml = label ? '<div class="moving-label">' + label + '</div>' : '';
      var html = '<div class="moving-wrap"><div class="moving-pin">&#10148;</div>' + labelHtml + '</div>';
      return L.divIcon({ className: '', html: html, iconSize: [80, 60], iconAnchor: [40, 20] });
    }

    function fitBothPoints(lat, lng) {
      var bounds = L.latLngBounds([PICKUP_LAT, PICKUP_LNG], [lat, lng]);
      map.fitBounds(bounds, { paddingTopLeft: [60, 160], paddingBottomRight: [60, 220] });
    }

    window.setMoving = function (lat, lng, label) {
      if (!movingMarker) {
        movingMarker = L.marker([lat, lng], { icon: movingIcon(label) }).addTo(map);
      } else {
        movingMarker.setLatLng([lat, lng]);
        movingMarker.setIcon(movingIcon(label));
      }
      // The dashed straight-line connector is only the fallback — once a
      // real route exists, it stays hidden rather than drawn underneath it.
      if (!hasRealRoute) {
        if (!polyline) {
          polyline = L.polyline([[PICKUP_LAT, PICKUP_LNG], [lat, lng]], {
            color: PRIMARY, weight: 3, dashArray: '8,8',
          }).addTo(map);
        } else {
          polyline.setLatLngs([[PICKUP_LAT, PICKUP_LNG], [lat, lng]]);
        }
      }
      fitBothPoints(lat, lng);
    };

    window.clearMoving = function () {
      if (movingMarker) {
        map.removeLayer(movingMarker);
        movingMarker = null;
      }
      if (polyline) {
        map.removeLayer(polyline);
        polyline = null;
      }
      window.clearRoute();
      map.setView([PICKUP_LAT, PICKUP_LNG], 15);
    };

    window.setRoute = function (points) {
      hasRealRoute = true;
      if (polyline) {
        map.removeLayer(polyline);
        polyline = null;
      }
      var coords = points.map(function (p) { return [p.latitude, p.longitude]; });
      if (!routeLine) {
        routeLine = L.polyline(coords, { color: PRIMARY, weight: 5 }).addTo(map);
      } else {
        routeLine.setLatLngs(coords);
      }
      map.fitBounds(routeLine.getBounds(), { paddingTopLeft: [60, 160], paddingBottomRight: [60, 220] });
    };

    window.clearRoute = function () {
      hasRealRoute = false;
      if (routeLine) {
        map.removeLayer(routeLine);
        routeLine = null;
      }
    };

    window.recenterMap = function () {
      if (movingMarker) {
        var ll = movingMarker.getLatLng();
        fitBothPoints(ll.lat, ll.lng);
      } else {
        map.setView([PICKUP_LAT, PICKUP_LNG], 15);
      }
    };

    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage('ready');
    }
  </script>
</body>
</html>`;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  recenterButton: {
    position: "absolute",
    right: 16,
    bottom: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
    ...SHADOW,
  },
});
