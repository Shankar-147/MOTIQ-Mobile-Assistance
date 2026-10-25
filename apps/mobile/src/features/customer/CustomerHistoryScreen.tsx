import React, { useCallback, useMemo, useState } from "react";
import { RefreshControl, ScrollView, SectionList, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ClipboardList, LifeBuoy } from "lucide-react-native";
import { IssueType, RequestStatus } from "@motiq/types";
import { CustomerStackParamList, CustomerTabParamList } from "../../navigation/types";
import { requestApi } from "../../api/requestApi";
import { Button, Chip, EmptyState, Skeleton } from "../../components/ui";
import { RequestCard } from "../../components/RequestCard";
import { COLORS, FONTS } from "../../theme/colors";
import { groupByDate, timeLabel } from "../../utils/dateGroups";

type Props = CompositeScreenProps<
  BottomTabScreenProps<CustomerTabParamList, "History">,
  NativeStackScreenProps<CustomerStackParamList>
>;

interface RequestRow {
  id: string;
  issueType: IssueType;
  status: RequestStatus;
  createdAt: string;
  vehicleSnapshotMake?: string | null;
  vehicleSnapshotModel?: string | null;
}

type Filter = "all" | "active" | "completed" | "other";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "completed", label: "Completed" },
  { key: "other", label: "Not completed" },
];

const TERMINAL_STATUSES = new Set<RequestStatus>([
  RequestStatus.COMPLETED,
  RequestStatus.CANCELLED_BY_CUSTOMER,
  RequestStatus.CANCELLED_BY_PROVIDER,
  RequestStatus.EXPIRED,
  RequestStatus.FAILED,
]);

function matchesFilter(request: RequestRow, filter: Filter): boolean {
  switch (filter) {
    case "active":
      return !TERMINAL_STATUSES.has(request.status);
    case "completed":
      return request.status === RequestStatus.COMPLETED;
    case "other":
      return TERMINAL_STATUSES.has(request.status) && request.status !== RequestStatus.COMPLETED;
    default:
      return true;
  }
}

function vehicleLabel(request: RequestRow): string | null {
  const make = request.vehicleSnapshotMake?.trim();
  if (!make || make.toLowerCase() === "unspecified") return null;
  const model = request.vehicleSnapshotModel?.trim();
  return model && model.toLowerCase() !== "unspecified" ? `${make} ${model}` : make;
}

/** Ch71's mobile Customer app Requests tab — filter chips and cards grouped
 * by when the request was made. */
export function CustomerHistoryScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");

  const loadFirstPage = useCallback(() => {
    return requestApi
      .listMine({ limit: 25 })
      .then((response) => {
        const body = response.data as { data: RequestRow[]; pagination: { nextCursor: string | null } };
        setRequests(body.data);
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
    const response = await requestApi.listMine({ cursor, limit: 25 });
    const body = response.data as { data: RequestRow[]; pagination: { nextCursor: string | null } };
    setRequests((existing) => [...existing, ...body.data]);
    setCursor(body.pagination.nextCursor);
  }

  const sections = useMemo(
    () =>
      groupByDate(
        requests.filter((r) => matchesFilter(r, filter)),
        (r) => r.createdAt,
        new Date(),
      ),
    [requests, filter],
  );

  const now = new Date();

  const header = (
    <View style={{ gap: 14, paddingBottom: 8 }}>
      <View>
        <Text style={{ fontFamily: FONTS.display, fontSize: 30, color: COLORS.text }}>Your requests</Text>
        <Text style={{ fontFamily: FONTS.body, fontSize: 14, color: COLORS.textSecondary, marginTop: 2 }}>
          {requests.length === 0 ? "Nothing here yet" : `${requests.length} so far`}
        </Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {FILTERS.map((item) => (
          <Chip key={item.key} label={item.label} selected={filter === item.key} onPress={() => setFilter(item.key)} />
        ))}
      </ScrollView>
    </View>
  );

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.bg, paddingTop: insets.top + 16, paddingHorizontal: 20, gap: 14 }}>
        <Skeleton width="55%" height={32} />
        <Skeleton height={76} radius={22} />
        <Skeleton height={76} radius={22} />
        <Skeleton height={76} radius={22} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: 32, flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.accent} colors={[COLORS.accent]} progressBackgroundColor={COLORS.surface} />}
        ListHeaderComponent={header}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        renderSectionHeader={({ section }) => (
          <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 12.5, letterSpacing: 0.6, color: COLORS.textSecondary, textTransform: "uppercase", marginTop: 18, marginBottom: 10, paddingHorizontal: 4 }}>
            {section.title}
          </Text>
        )}
        renderItem={({ item }) => (
          <RequestCard
            issueType={item.issueType}
            status={item.status}
            vehicleLabel={vehicleLabel(item)}
            timeLabel={timeLabel(item.createdAt, now)}
            active={!TERMINAL_STATUSES.has(item.status)}
            onPress={() => navigation.navigate("RequestDetail", { serviceRequestId: item.id })}
          />
        )}
        ListEmptyComponent={
          <View style={{ flex: 1, justifyContent: "center", paddingVertical: 32 }}>
            <EmptyState
              icon={ClipboardList}
              title={requests.length === 0 ? "No requests yet" : "Nothing in this filter"}
              description={requests.length === 0 ? "Your first request will show up here." : "Try another filter."}
            />
            {requests.length === 0 ? (
              <View style={{ paddingHorizontal: 20 }}>
                <Button label="Request help" icon={LifeBuoy} onPress={() => navigation.navigate("Home")} />
              </View>
            ) : null}
          </View>
        }
        ListFooterComponent={
          cursor ? (
            <View style={{ paddingTop: 16 }}>
              <Button label="Load more" variant="outline" onPress={loadMore} />
            </View>
          ) : null
        }
      />
    </View>
  );
}
