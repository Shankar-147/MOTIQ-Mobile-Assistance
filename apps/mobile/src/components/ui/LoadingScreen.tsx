import React from "react";
import { Box, VStack } from "@gluestack-ui/themed";
import { COLORS } from "../../theme/colors";
import { Skeleton } from "./Skeleton";

/** The project's one full-screen loading state — a few skeleton blocks on the
 * app background instead of a spinner. */
export function LoadingScreen() {
  return (
    <Box flex={1} bg={COLORS.bg} p="$5" pt="$16" accessibilityRole="progressbar" accessibilityLabel="Loading">
      <VStack space="lg">
        <Skeleton width="55%" height={28} />
        <Skeleton height={96} radius={22} />
        <Skeleton height={96} radius={22} />
        <Skeleton height={56} radius={16} />
      </VStack>
    </Box>
  );
}
