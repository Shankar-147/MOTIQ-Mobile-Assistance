import React from "react";
import { Switch } from "@gluestack-ui/themed";

interface ToggleProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  accessibilityLabel: string;
  disabled?: boolean;
}

/** The project's one on/off switch — reminder-preference toggles route
 * through this instead of a hand-rolled switch, per CLAUDE.md's
 * gluestack-ui component-first rule. */
export function Toggle({ value, onValueChange, accessibilityLabel, disabled = false }: ToggleProps) {
  return (
    <Switch
      value={value}
      onValueChange={onValueChange}
      isDisabled={disabled}
      accessibilityLabel={accessibilityLabel}
      trackColor={{ false: "$backgroundLight300", true: "$primary600" }}
      thumbColor="$white"
    />
  );
}
