import React, { useEffect, useRef } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import { LocateFixed, MapPin, Navigation } from "lucide-react-native";
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
  /** Extra bottom offset for the recenter button so it clears a floating
   * bottom card overlay, if the caller renders one. Defaults to 16. */
  bottomInset?: number;
}

/**
 * Ch54/Ch77's live-tracking map — previously TrackRequestScreen/ActiveJobScreen
 * just printed raw lat/lng numbers as text (flagged as the single biggest
 * mobile UX gap for a roadside-assistance app, see docs/roadmap.md). No real
 * route (Ch32's Maps/routing API integration is still future work, ADR
 * 0012) — the dashed line between pickup and the moving marker is an honest
 * straight-line connector, not a claimed route.
 */
export function LiveTrackingMap({ pickup, moving, movingLabel, bottomInset = 16 }: LiveTrackingMapProps) {
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    if (!mapRef.current) {
      return;
    }
    if (moving) {
      mapRef.current.fitToCoordinates([pickup, moving], {
        edgePadding: { top: 160, right: 60, bottom: 220, left: 60 },
        animated: true,
      });
    } else {
      mapRef.current.animateToRegion(
        { ...pickup, latitudeDelta: 0.01, longitudeDelta: 0.01 },
        400,
      );
    }
  }, [pickup.latitude, pickup.longitude, moving?.latitude, moving?.longitude]);

  function recenter() {
    if (!mapRef.current) {
      return;
    }
    if (moving) {
      mapRef.current.fitToCoordinates([pickup, moving], {
        edgePadding: { top: 160, right: 60, bottom: 220, left: 60 },
        animated: true,
      });
    } else {
      mapRef.current.animateToRegion(
        { ...pickup, latitudeDelta: 0.01, longitudeDelta: 0.01 },
        400,
      );
    }
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={{ ...pickup, latitudeDelta: 0.01, longitudeDelta: 0.01 }}
        showsCompass={false}
        toolbarEnabled={false}
        rotateEnabled={false}
      >
        <Marker coordinate={pickup} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false}>
          <View style={styles.pickupPin}>
            <MapPin size={18} color={COLORS.danger} fill={COLORS.danger} strokeWidth={1.5} />
          </View>
        </Marker>

        {moving ? (
          <>
            <Polyline
              coordinates={[pickup, moving]}
              strokeColor={COLORS.primary}
              strokeWidth={3}
              lineDashPattern={[8, 8]}
            />
            <Marker coordinate={moving} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false}>
              <View style={styles.movingPin}>
                <Navigation size={18} color="#FFFFFF" fill="#FFFFFF" />
              </View>
              {movingLabel ? (
                <View style={styles.movingLabelBadge}>
                  <Text style={styles.movingLabelText}>{movingLabel}</Text>
                </View>
              ) : null}
            </Marker>
          </>
        ) : null}
      </MapView>

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

const styles = StyleSheet.create({
  container: { flex: 1 },
  pickupPin: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: COLORS.danger,
    ...SHADOW,
  },
  movingPin: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: COLORS.surface,
    ...SHADOW,
  },
  movingLabelBadge: {
    alignSelf: "center",
    marginTop: 4,
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    ...SHADOW,
  },
  movingLabelText: { fontSize: 11, fontWeight: "700", color: COLORS.textPrimary },
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
