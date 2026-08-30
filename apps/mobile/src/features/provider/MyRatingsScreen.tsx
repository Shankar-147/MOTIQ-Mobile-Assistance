import React, { useCallback, useState } from "react";
import { FlatList, HStack, Pressable, Text, VStack } from "@gluestack-ui/themed";
import { useFocusEffect } from "@react-navigation/native";
import { Star } from "lucide-react-native";
import { IssueType } from "@motiq/types";
import { providerApi } from "../../api/providerApi";
import { EmptyState } from "../../components/ui";

interface RatingRow {
  id: string;
  serviceRequestId: string;
  stars: number;
  comment: string | null;
  createdAt: string;
  issueType: IssueType;
}

/** Ch72's mobile Provider app rating-history screen — new in this phase (a
 * provider could previously only see the aggregate ratingAverage, never an
 * individual review). Deliberately shows no customer identity — the backend
 * payload doesn't include it either, see RatingService.listForProvider(). */
export function MyRatingsScreen() {
  const [ratings, setRatings] = useState<RatingRow[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadFirstPage = useCallback(() => {
    setLoading(true);
    providerApi
      .listOwnRatings({ limit: 25 })
      .then((response) => {
        const body = response.data as { data: RatingRow[]; pagination: { nextCursor: string | null } };
        setRatings(body.data);
        setCursor(body.pagination.nextCursor);
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadFirstPage();
    }, [loadFirstPage]),
  );

  async function loadMore() {
    if (!cursor) {
      return;
    }
    const response = await providerApi.listOwnRatings({ cursor, limit: 25 });
    const body = response.data as { data: RatingRow[]; pagination: { nextCursor: string | null } };
    setRatings((existing) => [...existing, ...body.data]);
    setCursor(body.pagination.nextCursor);
  }

  if (!loading && ratings.length === 0) {
    return (
      <EmptyState icon={Star} title="No ratings yet" description="Reviews from completed jobs will show up here." />
    );
  }

  return (
    <FlatList
      flex={1}
      bg="$backgroundLight0"
      data={ratings}
      keyExtractor={(item) => (item as RatingRow).id}
      renderItem={({ item }: { item: unknown }) => {
        const rating = item as RatingRow;
        return (
          <VStack px="$5" py="$4" borderBottomWidth={1} borderBottomColor="$borderLight200">
            <HStack alignItems="center" justifyContent="space-between">
              <HStack alignItems="center" space="xs">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Star
                    key={index}
                    size={16}
                    color="#D97706"
                    fill={index < rating.stars ? "#D97706" : "none"}
                  />
                ))}
              </HStack>
              <Text size="sm" color="$textLight500" textTransform="capitalize">
                {rating.issueType.replace("_", " ")}
              </Text>
            </HStack>
            {rating.comment ? (
              <Text color="$textLight700" mt="$2">
                {rating.comment}
              </Text>
            ) : null}
            <Text size="sm" color="$textLight500" mt="$1">
              {new Date(rating.createdAt).toLocaleString()}
            </Text>
          </VStack>
        );
      }}
      ListFooterComponent={
        cursor ? (
          <Pressable accessibilityRole="button" py="$4" alignItems="center" onPress={loadMore}>
            <Text color="$primary600" fontWeight="$semibold">
              Load more
            </Text>
          </Pressable>
        ) : (
          <VStack />
        )
      }
    />
  );
}
