import React from "react";
import { Box } from "@gluestack-ui/themed";
import { COLORS } from "../../theme/colors";

/** The project's one card surface — flat surface fill with a hairline
 * border (no shadow: shadows don't read on dark). */
export function Card({ children, ...rest }: React.ComponentProps<typeof Box>) {
  return (
    <Box bg={COLORS.surface} borderRadius={22} borderWidth={1} borderColor={COLORS.border} p="$4" {...rest}>
      {children}
    </Box>
  );
}
