import React from "react";
import {
  FormControl,
  FormControlLabel,
  FormControlLabelText,
  Input as GSInput,
  InputField,
} from "@gluestack-ui/themed";
import { MIN_TOUCH_TARGET_SIZE } from "../../accessibility/a11y";

interface AppInputProps {
  label?: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  accessibilityLabel?: string;
}

/** The project's one text input — every form routes through this instead of
 * a hand-rolled `TextInput` + `StyleSheet`, per CLAUDE.md's gluestack-ui
 * component-first rule. */
export function Input({ label, value, onChangeText, placeholder, multiline = false, accessibilityLabel }: AppInputProps) {
  return (
    <FormControl>
      {label ? (
        <FormControlLabel mb="$1">
          <FormControlLabelText>{label}</FormControlLabelText>
        </FormControlLabel>
      ) : null}
      <GSInput variant="outline" size="lg" minHeight={multiline ? 90 : MIN_TOUCH_TARGET_SIZE} borderRadius="$lg">
        <InputField
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          multiline={multiline}
          textAlignVertical={multiline ? "top" : "center"}
          py={multiline ? "$3" : undefined}
          accessibilityLabel={accessibilityLabel ?? label ?? placeholder}
        />
      </GSInput>
    </FormControl>
  );
}
