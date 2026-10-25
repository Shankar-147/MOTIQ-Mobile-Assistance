import React from "react";
import { Button as GSButton, ButtonText, ButtonSpinner } from "@gluestack-ui/themed";
import type { LucideIcon } from "lucide-react-native";
import { COLORS } from "../../theme/colors";

export type ButtonVariant = "primary" | "danger" | "success" | "outline";

interface VariantStyle {
  bg: string;
  fg: string;
  border: string;
}

const VARIANT: Record<ButtonVariant, VariantStyle> = {
  primary: { bg: COLORS.accent, fg: COLORS.accentInk, border: COLORS.accent },
  success: { bg: COLORS.accent, fg: COLORS.accentInk, border: COLORS.accent },
  danger: { bg: COLORS.danger, fg: "#FFFFFF", border: COLORS.danger },
  outline: { bg: COLORS.surfaceRaised, fg: COLORS.text, border: COLORS.border },
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
 * component-first rule. 56pt tall, radius 16; dark ink on the green fill. */
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
  const v = VARIANT[variant];
  return (
    <GSButton
      action="primary"
      variant="solid"
      size="lg"
      borderRadius={16}
      minHeight={56}
      bg={v.bg}
      borderWidth={1}
      borderColor={v.border}
      w={fullWidth ? "$full" : undefined}
      isDisabled={disabled || loading}
      onPress={onPress}
      accessibilityLabel={accessibilityLabel ?? label}
      py="$3"
      opacity={disabled ? 0.45 : 1}
      sx={{ ":active": { opacity: 0.85 } }}
    >
      {loading ? <ButtonSpinner mr="$2" color={v.fg} /> : Icon ? <Icon size={18} color={v.fg} style={{ marginRight: 8 }} /> : null}
      <ButtonText color={v.fg} fontWeight="$bold" textAlign="center" flexShrink={1} flexWrap="wrap">
        {label}
      </ButtonText>
    </GSButton>
  );
}
