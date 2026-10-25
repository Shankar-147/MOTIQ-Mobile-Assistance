import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { Center, Heading, HStack, Pressable, Text, VStack } from "@gluestack-ui/themed";
import { Star } from "lucide-react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { CustomerStackParamList } from "../../navigation/types";
import { requestApi } from "../../api/requestApi";
import { A11Y_LABELS, MIN_TOUCH_TARGET_SIZE } from "../../accessibility/a11y";
import { Button, Chip, Input } from "../../components/ui";
import { COLORS } from "../../theme/colors";

type Props = NativeStackScreenProps<CustomerStackParamList, "RateProvider">;

const STAR_VALUES = [1, 2, 3, 4, 5];
const QUICK_TAGS = ["On time", "Polite", "Skilled", "Clean work"];

export function RateProviderScreen({ route, navigation }: Props) {
  const { serviceRequestId } = route.params;
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  function toggleTag(tag: string) {
    setTags((current) => (current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag]));
  }

  async function handleSubmit() {
    if (submitting) return;
    setSubmitting(true);
    try {
      // Quick tags are UI sugar — folded into the existing comment string so
      // the API contract is unchanged.
      const finalComment = [comment.trim(), tags.join(", ")].filter(Boolean).join(" · ");
      await requestApi.submitRating(serviceRequestId, stars, finalComment || undefined);
      navigation.navigate("MainTabs");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: COLORS.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={{ padding: 24, flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <VStack space="lg">
          <Center py="$4">
            <Heading size="2xl" textAlign="center" color={COLORS.text}>
              How was your service?
            </Heading>
          </Center>

          <HStack space="xs" justifyContent="center">
            {STAR_VALUES.map((value) => (
              <Pressable
                key={value}
                accessibilityRole="button"
                accessibilityLabel={`Rate ${value} stars`}
                onPress={() => setStars(value)}
                minWidth={MIN_TOUCH_TARGET_SIZE}
                minHeight={MIN_TOUCH_TARGET_SIZE}
                alignItems="center"
                justifyContent="center"
              >
                <Star
                  size={42}
                  color={value <= stars ? COLORS.accent : COLORS.border}
                  fill={value <= stars ? COLORS.accent : "transparent"}
                />
              </Pressable>
            ))}
          </HStack>

          <VStack space="xs">
            <Text size="sm" color={COLORS.textSecondary} fontWeight="$semibold">
              What went well?
            </Text>
            <HStack flexWrap="wrap" gap="$2">
              {QUICK_TAGS.map((tag) => (
                <Chip key={tag} label={tag} selected={tags.includes(tag)} onPress={() => toggleTag(tag)} />
              ))}
            </HStack>
          </VStack>

          <Input label="Comment (optional)" value={comment} onChangeText={setComment} placeholder="Leave a comment" multiline />

          <Button
            label={submitting ? "Submitting…" : "Submit rating"}
            accessibilityLabel={A11Y_LABELS.submitRatingButton}
            disabled={submitting}
            loading={submitting}
            onPress={handleSubmit}
          />
        </VStack>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
