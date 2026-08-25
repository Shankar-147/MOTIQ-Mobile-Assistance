import React, { useState } from "react";
import { Center, Heading, HStack, Pressable, VStack } from "@gluestack-ui/themed";
import { Star } from "lucide-react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { CustomerStackParamList } from "../../navigation/types";
import { requestApi } from "../../api/requestApi";
import { A11Y_LABELS, MIN_TOUCH_TARGET_SIZE } from "../../accessibility/a11y";
import { Button, Input } from "../../components/ui";

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
      navigation.navigate("MainTabs");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <VStack flex={1} bg="$backgroundLight0" p="$6" space="lg">
      <Center py="$4">
        <Heading size="xl" mb="$1">
          How was your service?
        </Heading>
      </Center>

      <HStack space="sm" justifyContent="center">
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
              size={36}
              color={value <= stars ? "#D97706" : "#CBD5E1"}
              fill={value <= stars ? "#D97706" : "transparent"}
            />
          </Pressable>
        ))}
      </HStack>

      <Input label="Comment (optional)" value={comment} onChangeText={setComment} placeholder="Leave a comment" multiline />

      <Button
        label={submitting ? "Submitting…" : "Submit rating"}
        accessibilityLabel={A11Y_LABELS.submitRatingButton}
        disabled={submitting}
        loading={submitting}
        onPress={handleSubmit}
      />
    </VStack>
  );
}
