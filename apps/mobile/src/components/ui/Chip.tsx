import React from "react";
import { HStack, Pressable, Text } from "@gluestack-ui/themed";
import type { LucideIcon } from "lucide-react-native";
import { MIN_TOUCH_TARGET_SIZE } from "../../accessibility/a11y";
import { COLORS } from "../../theme/colors";

interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  accessibilityLabel?: string;
  icon?: LucideIcon;
}

/** The project's one selectable pill — issue type, service area, document
 * type, and preferred-language pickers all route through this instead of
 * each hand-rolling its own chip styling. Built on gluestack's `Pressable`,
 * since gluestack-ui doesn't ship a selectable-chip primitive itself (Ch71's
 * "custom primitive only when the library doesn't cover it" case). */
export function Chip({ label, selected, onPress, accessibilityLabel, icon: Icon }: ChipProps) {
  const tint = selected ? COLORS.accent : COLORS.textSecondary;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      minHeight={MIN_TOUCH_TARGET_SIZE}
      px="$4"
      justifyContent="center"
      alignItems="center"
      borderRadius="$full"
      borderWidth={1}
      borderColor={selected ? COLORS.accent : COLORS.border}
      bg={selected ? COLORS.accentTint : COLORS.surfaceRaised}
    >
      <HStack alignItems="center" space="xs">
        {Icon ? <Icon size={16} color={tint} /> : null}
        <Text color={selected ? COLORS.accent : COLORS.text} fontWeight={selected ? "$bold" : "$normal"} size="sm">
          {label}
        </Text>
      </HStack>
    </Pressable>
  );
}
