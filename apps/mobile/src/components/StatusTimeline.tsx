import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Check } from "lucide-react-native";
import { COLORS } from "../theme/colors";

export interface TimelineStep {
  key: string;
  label: string;
}

interface StatusTimelineProps {
  steps: TimelineStep[];
  /** Index into `steps` for the current stage. -1 renders every dot as
   * "upcoming" (e.g. a cancelled/failed/expired request — see the callers'
   * status-to-index mapping for why that's the deliberate choice there). */
  currentIndex: number;
}

/** A compact horizontal stepper — replaces a bare status string with a
 * visual sense of "how far along is this," the same information a delivery-
 * app tracking screen leans on heavily and this app previously had none of. */
export function StatusTimeline({ steps, currentIndex }: StatusTimelineProps) {
  return (
    <View style={styles.row}>
      {steps.map((step, index) => {
        const isDone = index < currentIndex;
        const isCurrent = index === currentIndex;
        return (
          <View key={step.key} style={styles.stepWrap}>
            <View style={styles.dotRow}>
              <View
                style={[
                  styles.dot,
                  isDone && styles.dotDone,
                  isCurrent && styles.dotCurrent,
                ]}
              >
                {isDone ? <Check size={9} color="#FFFFFF" strokeWidth={3} /> : null}
              </View>
              {index < steps.length - 1 ? (
                <View style={[styles.line, isDone && styles.lineDone]} />
              ) : null}
            </View>
            <Text
              numberOfLines={1}
              style={[styles.label, (isDone || isCurrent) && styles.labelActive]}
            >
              {step.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-start" },
  stepWrap: { flex: 1, alignItems: "center" },
  dotRow: { flexDirection: "row", alignItems: "center", width: "100%" },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: COLORS.border,
    marginLeft: "auto",
    marginRight: "auto",
    alignItems: "center",
    justifyContent: "center",
  },
  dotDone: { backgroundColor: COLORS.primary },
  dotCurrent: {
    backgroundColor: COLORS.primary,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: "#C7D2FE",
  },
  line: { flex: 1, height: 2, backgroundColor: COLORS.border },
  lineDone: { backgroundColor: COLORS.primary },
  label: { fontSize: 10, color: COLORS.textSecondary, marginTop: 6, textAlign: "center" },
  labelActive: { color: COLORS.textPrimary, fontWeight: "700" },
});
