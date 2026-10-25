import React from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "../theme/colors";
import { Skeleton } from "./ui";
import { GeoPoint, LiveTrackingMap } from "./LiveTrackingMap";

interface MapBackdropProps {
  position: GeoPoint | null;
  moving?: GeoPoint | null;
  movingLabel?: string;
  routeGeometry?: GeoPoint[] | null;
  /** Keeps the recenter button clear of a bottom sheet. */
  bottomInset?: number;
  /** Floating controls (back / SOS / banners) drawn above the map inside the
   * safe area. */
  children?: React.ReactNode;
}

/** Full-bleed dark map with a safe-area overlay for floating controls. With
 * no position yet it shows a placeholder rather than a map at 0,0. */
export function MapBackdrop({ position, moving = null, movingLabel, routeGeometry, bottomInset, children }: MapBackdropProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.fill}>
      {position ? (
        <LiveTrackingMap
          pickup={position}
          moving={moving}
          movingLabel={movingLabel}
          routeGeometry={routeGeometry}
          bottomInset={bottomInset}
        />
      ) : (
        <View style={[styles.fill, styles.placeholder]}>
          <Skeleton width="60%" height={14} />
        </View>
      )}
      <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, { paddingTop: insets.top + 8, paddingHorizontal: 16 }]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: COLORS.bg },
  placeholder: { alignItems: "center", justifyContent: "center" },
});
