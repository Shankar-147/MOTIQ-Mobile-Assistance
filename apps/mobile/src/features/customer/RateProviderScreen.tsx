import React, { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { CustomerStackParamList } from "../../navigation/types";
import { requestApi } from "../../api/requestApi";
import { MIN_TOUCH_TARGET_SIZE, A11Y_LABELS } from "../../accessibility/a11y";

type Props = NativeStackScreenProps<CustomerStackParamList, "RateProvider">;

const STAR_VALUES = [1, 2, 3, 4, 5];

export function RateProviderScreen({ route, navigation }: Props) {
  const { serviceRequestId } = route.params;
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setSubmitting(true);
    try {
      await requestApi.submitRating(serviceRequestId, stars, comment || undefined);
      navigation.navigate("CreateRequest");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>How was your service?</Text>
      <View style={styles.starRow}>
        {STAR_VALUES.map((value) => (
          <Pressable
            key={value}
            accessibilityRole="button"
            accessibilityLabel={`Rate ${value} stars`}
            style={styles.star}
            onPress={() => setStars(value)}
          >
            <Text style={value <= stars ? styles.starFilled : styles.starEmpty}>★</Text>
          </Pressable>
        ))}
      </View>

      <TextInput
        style={[styles.input, styles.multiline]}
        placeholder="Leave a comment (optional)"
        value={comment}
        onChangeText={setComment}
        multiline
        accessibilityLabel="Comment"
      />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={A11Y_LABELS.submitRatingButton}
        style={styles.button}
        disabled={submitting}
        onPress={handleSubmit}
      >
        <Text style={styles.buttonText}>{submitting ? "Submitting…" : "Submit rating"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 12 },
  label: { fontSize: 16, fontWeight: "600" },
  starRow: { flexDirection: "row", gap: 8 },
  star: { minWidth: MIN_TOUCH_TARGET_SIZE, minHeight: MIN_TOUCH_TARGET_SIZE, alignItems: "center", justifyContent: "center" },
  starFilled: { fontSize: 32, color: "#f59e0b" },
  starEmpty: { fontSize: 32, color: "#cbd5e1" },
  input: {
    minHeight: MIN_TOUCH_TARGET_SIZE,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  multiline: { minHeight: 80, textAlignVertical: "top", paddingVertical: 12 },
  button: {
    minHeight: MIN_TOUCH_TARGET_SIZE,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1d4ed8",
    borderRadius: 8,
    marginTop: 12,
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
