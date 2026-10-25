import React from "react";
import { BackHandler, Pressable, StyleSheet, View } from "react-native";
import { BottomSheet } from "./BottomSheet";

interface SheetModalProps {
  visible: boolean;
  onClose: () => void;
  height: number;
  children: React.ReactNode;
}

/** A dimmed backdrop plus a BottomSheet for short edit forms. Tapping the
 * backdrop or the Android back button closes it. Renders nothing when
 * hidden, so each open starts fresh. */
export function SheetModal({ visible, onClose, height, children }: SheetModalProps) {
  React.useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [visible, onClose]);

  if (!visible) return null;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close"
        onPress={onClose}
        style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.55)" }]}
      />
      <BottomSheet snapPoints={[height]}>{children}</BottomSheet>
    </View>
  );
}
