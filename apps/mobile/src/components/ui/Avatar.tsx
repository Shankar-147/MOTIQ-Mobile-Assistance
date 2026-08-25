import React from "react";
import { Avatar as GSAvatar, AvatarFallbackText } from "@gluestack-ui/themed";

/** The project's one avatar — an initials circle, since neither app stores a
 * real profile photo (Ch71/Ch72 don't specify one). */
export function InitialsAvatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  return (
    <GSAvatar bgColor="$primary600" size={size}>
      <AvatarFallbackText>{name}</AvatarFallbackText>
    </GSAvatar>
  );
}
