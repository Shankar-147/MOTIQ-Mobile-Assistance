import React from "react";
import { Center, Text, VStack } from "@gluestack-ui/themed";
import type { LucideIcon } from "lucide-react-native";
import { COLORS } from "../../theme/colors";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
}

/** The project's one "nothing here yet" state — every list screen (History,
 * Jobs, KYC documents) routes through this instead of a bare line of gray
 * text, so an empty list reads as designed, not unfinished. */
export function EmptyState({ icon: Icon, title, description }: EmptyStateProps) {
  return (
    <Center flex={1} p="$8">
      <VStack alignItems="center" space="sm">
        <Center w={64} h={64} borderRadius="$full" bg={COLORS.accentTint} mb="$2">
          <Icon size={28} color={COLORS.accent} />
        </Center>
        <Text fontWeight="$bold" size="md" color="$textLight900" textAlign="center">
          {title}
        </Text>
        {description ? (
          <Text color="$textLight500" textAlign="center" size="sm">
            {description}
          </Text>
        ) : null}
      </VStack>
    </Center>
  );
}
