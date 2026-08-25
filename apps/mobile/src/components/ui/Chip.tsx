import React from "react";
import { HStack, Pressable, Text } from "@gluestack-ui/themed";
import type { LucideIcon } from "lucide-react-native";
import { MIN_TOUCH_TARGET_SIZE } from "../../accessibility/a11y";

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
  const tint = selected ? "#FFFFFF" : "#4338CA";
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
      borderColor={selected ? "$primary600" : "$borderLight300"}
      bg={selected ? "$primary600" : "$white"}
    >
      <HStack alignItems="center" space="xs">
        {Icon ? <Icon size={16} color={tint} /> : null}
        <Text color={selected ? "$white" : "$textLight700"} fontWeight={selected ? "$bold" : "$normal"} size="sm">
          {label}
        </Text>
      </HStack>
    </Pressable>
  );
}
