import React from "react";
import { Pressable, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { ArrowLeft, X } from "lucide-react-native";
import { COLORS } from "../theme/colors";

interface FloatingBackButtonProps {
  onPress?: () => void;
  icon?: "back" | "close";
}

/** 44pt circular back/close control that floats over map screens in place of
 * the native-stack header. */
export function FloatingBackButton({ onPress, icon = "back" }: FloatingBackButtonProps) {
  const navigation = useNavigation();
  const Icon = icon === "close" ? X : ArrowLeft;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={icon === "close" ? "Close" : "Back"}
      hitSlop={6}
      onPress={onPress ?? (() => navigation.goBack())}
      style={({ pressed }) => [styles.button, pressed && { opacity: 0.8 }]}
    >
      <Icon size={20} color={COLORS.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
});
