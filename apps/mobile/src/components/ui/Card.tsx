import React from "react";
import { Box } from "@gluestack-ui/themed";

const DEFAULT_SHADOW = {
  shadowColor: "#312E81",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 8,
  elevation: 2,
};

/** The project's one card surface — every grouped chunk of content routes
 * through this instead of a hand-rolled bordered `View`. Carries a subtle
 * default shadow so screens don't each have to remember to add one. */
export function Card({ children, style, ...rest }: React.ComponentProps<typeof Box>) {
  return (
    <Box
      bg="$white"
      borderRadius="$2xl"
      borderWidth={1}
      borderColor="$borderLight200"
      p="$4"
      style={[DEFAULT_SHADOW, style]}
      {...rest}
    >
      {children}
    </Box>
  );
}
