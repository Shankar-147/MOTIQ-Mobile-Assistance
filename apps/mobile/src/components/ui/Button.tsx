import React from "react";
import { Button as GSButton, ButtonText, ButtonSpinner } from "@gluestack-ui/themed";
import type { LucideIcon } from "lucide-react-native";
import { MIN_TOUCH_TARGET_SIZE } from "../../accessibility/a11y";

export type ButtonVariant = "primary" | "danger" | "success" | "outline";

// "outline" deliberately maps to the "primary" action, not "secondary" —
// gluestack's stock "secondary" scale renders outline buttons in a flat
// gray with no relation to the brand palette. Using "primary" here keeps
// text/icon/border all in the same indigo as every filled primary button.
const ACTION_MAP: Record<ButtonVariant, "primary" | "secondary" | "positive" | "negative"> = {
  primary: "primary",
  danger: "negative",
  success: "positive",
  outline: "primary",
};

const ICON_COLOR: Record<ButtonVariant, string> = {
  primary: "#FFFFFF",
  danger: "#FFFFFF",
  success: "#FFFFFF",
  outline: "#4F46E5",
};

interface AppButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
  fullWidth?: boolean;
  icon?: LucideIcon;
}

/** The project's one Button — every screen routes through this instead of a
 * hand-rolled `Pressable` + `StyleSheet`, per CLAUDE.md's gluestack-ui
 * component-first rule. */
export function Button({
  label,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
  accessibilityLabel,
  fullWidth = true,
  icon: Icon,
}: AppButtonProps) {
  return (
    <GSButton
      action={ACTION_MAP[variant]}
      variant={variant === "outline" ? "outline" : "solid"}
      size="lg"
      borderRadius="$xl"
      minHeight={MIN_TOUCH_TARGET_SIZE}
      w={fullWidth ? "$full" : undefined}
      isDisabled={disabled || loading}
      onPress={onPress}
      accessibilityLabel={accessibilityLabel ?? label}
    >
      {loading ? <ButtonSpinner mr="$2" color="$white" /> : Icon ? <Icon size={18} color={ICON_COLOR[variant]} style={{ marginRight: 8 }} /> : null}
      <ButtonText fontWeight="$bold">{label}</ButtonText>
    </GSButton>
  );
}
