import React, { useCallback, useState } from "react";
import { FlatList, RefreshControl, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Star } from "lucide-react-native";
import { IssueType } from "@motiq/types";
import { providerApi } from "../../api/providerApi";
import { Button, EmptyState, Skeleton } from "../../components/ui";
import { ISSUE_LABELS } from "../../theme/issueIcons";
import { COLORS, FONTS } from "../../theme/colors";

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
  const [refreshing, setRefreshing] = useState(false);

  const loadFirstPage = useCallback(() => {
    return providerApi
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
      void loadFirstPage();
    }, [loadFirstPage]),
  );

  async function handleRefresh() {
    setRefreshing(true);
    await loadFirstPage();
    setRefreshing(false);
  }

  async function loadMore() {
    if (!cursor) {
      return;
    }
    const response = await providerApi.listOwnRatings({ cursor, limit: 25 });
    const body = response.data as { data: RatingRow[]; pagination: { nextCursor: string | null } };
    setRatings((existing) => [...existing, ...body.data]);
    setCursor(body.pagination.nextCursor);
  }

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.bg, padding: 20, gap: 14 }}>
        <Skeleton height={96} radius={22} />
        <Skeleton height={96} radius={22} />
      </View>
    );
  }

  const average = ratings.length > 0 ? ratings.reduce((sum, r) => sum + r.stars, 0) / ratings.length : null;

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: COLORS.bg }}
      contentContainerStyle={{ padding: 20, gap: 10, flexGrow: 1 }}
      data={ratings}
      keyExtractor={(item) => item.id}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={COLORS.accent}
          colors={[COLORS.accent]}
          progressBackgroundColor={COLORS.surface}
        />
      }
      ListHeaderComponent={
        average !== null ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingBottom: 8 }}>
            <Star size={28} color={COLORS.warning} fill={COLORS.warning} />
            <Text style={{ fontFamily: FONTS.display, fontSize: 36, color: COLORS.text }}>{average.toFixed(1)}</Text>
            <Text style={{ fontFamily: FONTS.body, fontSize: 14, color: COLORS.textSecondary }}>
              from {ratings.length}
              {cursor ? "+" : ""} review{ratings.length === 1 ? "" : "s"}
            </Text>
          </View>
        ) : null
      }
      renderItem={({ item: rating }) => (
        <View
          style={{
            backgroundColor: COLORS.surface,
            borderRadius: 22,
            borderWidth: 1,
            borderColor: COLORS.border,
            padding: 16,
            gap: 8,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ flexDirection: "row", gap: 3 }}>
              {Array.from({ length: 5 }).map((_, index) => (
                <Star
                  key={index}
                  size={16}
                  color={index < rating.stars ? COLORS.warning : COLORS.border}
                  fill={index < rating.stars ? COLORS.warning : "transparent"}
                />
              ))}
            </View>
            <Text style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.textSecondary }}>{ISSUE_LABELS[rating.issueType]}</Text>
          </View>
          {rating.comment ? (
            <Text style={{ fontFamily: FONTS.body, fontSize: 15, color: COLORS.text }}>{rating.comment}</Text>
          ) : null}
          <Text style={{ fontFamily: FONTS.body, fontSize: 12.5, color: COLORS.textMuted }}>
            {new Date(rating.createdAt).toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" })}
          </Text>
        </View>
      )}
      ListEmptyComponent={
        <View style={{ flex: 1, justifyContent: "center" }}>
          <EmptyState icon={Star} title="No ratings yet" description="Reviews from completed jobs will show up here." />
        </View>
      }
      ListFooterComponent={
        cursor ? (
          <View style={{ paddingTop: 8 }}>
            <Button label="Load more" variant="outline" onPress={loadMore} />
          </View>
        ) : null
      }
    />
  );
}
