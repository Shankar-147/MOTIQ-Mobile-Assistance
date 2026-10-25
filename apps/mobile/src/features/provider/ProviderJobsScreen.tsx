import React, { useCallback, useMemo, useState } from "react";
import { RefreshControl, ScrollView, SectionList, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Briefcase } from "lucide-react-native";
import { AssignmentStatus, IssueType, RequestStatus } from "@motiq/types";
import { providerApi } from "../../api/providerApi";
import { Button, Chip, EmptyState, Skeleton, StatBlock } from "../../components/ui";
import { JobCard } from "../../components/JobCard";
import { groupByDate, timeLabel } from "../../utils/dateGroups";
import { COLORS, FONTS } from "../../theme/colors";

interface JobRow {
  id: string;
  status: AssignmentStatus;
  offeredAt: string;
  distanceMeters: number | null;
  serviceRequest: { id: string; issueType: IssueType; status: RequestStatus; createdAt: string };
}

interface EarningsSummary {
  totalEarnings: string;
  pendingAmount: string;
  completedPayoutCount: number;
}

type Filter = "all" | "active" | "completed" | "missed";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "completed", label: "Completed" },
  { key: "missed", label: "Declined / missed" },
];

const TERMINAL_REQUEST_STATUSES = new Set<RequestStatus>([
  RequestStatus.COMPLETED,
  RequestStatus.CANCELLED_BY_CUSTOMER,
  RequestStatus.CANCELLED_BY_PROVIDER,
  RequestStatus.EXPIRED,
  RequestStatus.FAILED,
]);

/** Filter groups over an Assignment: "Active" = an offer or accepted job whose
 * request is still open; "Completed" = the request finished; "Declined /
 * missed" = the provider declined, the offer timed out, or it was reassigned. */
function matchesFilter(job: JobRow, filter: Filter): boolean {
  switch (filter) {
    case "active":
      return (
        (job.status === AssignmentStatus.OFFERED || job.status === AssignmentStatus.ACCEPTED) &&
        !TERMINAL_REQUEST_STATUSES.has(job.serviceRequest.status)
      );
    case "completed":
      return job.serviceRequest.status === RequestStatus.COMPLETED;
    case "missed":
      return (
        job.status === AssignmentStatus.REJECTED ||
        job.status === AssignmentStatus.TIMED_OUT ||
        job.status === AssignmentStatus.SUPERSEDED
      );
    default:
      return true;
  }
}

/** Ch72's mobile job-history screen — an earnings summary above every
 * Assignment this provider was ever offered, grouped by day. Read-only (no
 * resume-into-ActiveJob action here; see docs/roadmap.md). The list endpoint
 * carries no per-job amount, so cards show distance and time, not earnings. */
export function ProviderJobsScreen() {
  const insets = useSafeAreaInsets();
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState<EarningsSummary | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

  const loadFirstPage = useCallback(async () => {
    try {
      const [jobsResponse, earningsResponse] = await Promise.allSettled([
        providerApi.listOwnJobs({ limit: 25 }),
        providerApi.getEarnings(),
      ]);
      if (jobsResponse.status === "fulfilled") {
        const body = jobsResponse.value.data as { data: JobRow[]; pagination: { nextCursor: string | null } };
        setJobs(body.data);
        setCursor(body.pagination.nextCursor);
      }
      if (earningsResponse.status === "fulfilled") {
        setSummary(earningsResponse.value.data as EarningsSummary);
      }
    } finally {
      setLoading(false);
    }
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
    const response = await providerApi.listOwnJobs({ cursor, limit: 25 });
    const body = response.data as { data: JobRow[]; pagination: { nextCursor: string | null } };
    setJobs((existing) => [...existing, ...body.data]);
    setCursor(body.pagination.nextCursor);
  }

  const sections = useMemo(
    () =>
      groupByDate(
        jobs.filter((job) => matchesFilter(job, filter)),
        (job) => job.offeredAt,
        new Date(),
      ),
    [jobs, filter],
  );
  const now = new Date();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.bg, paddingTop: insets.top + 16, paddingHorizontal: 20, gap: 14 }}>
        <Skeleton width="45%" height={32} />
        <Skeleton height={130} radius={22} />
        <Skeleton height={72} radius={22} />
        <Skeleton height={72} radius={22} />
      </View>
    );
  }

  const header = (
    <View style={{ gap: 16, paddingBottom: 8 }}>
      <Text style={{ fontFamily: FONTS.display, fontSize: 30, color: COLORS.text }}>Your jobs</Text>

      <View
        style={{
          backgroundColor: COLORS.surface,
          borderRadius: 22,
          borderWidth: 1,
          borderColor: COLORS.border,
          padding: 18,
          gap: 6,
        }}
      >
        <StatBlock
          label="Total earnings"
          value={`₹${Number(summary?.totalEarnings ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          accent
        />
        <Text style={{ fontFamily: FONTS.body, fontSize: 13.5, color: COLORS.textSecondary }}>
          {summary?.completedPayoutCount ?? 0} paid job{summary?.completedPayoutCount === 1 ? "" : "s"} · ₹
          {Number(summary?.pendingAmount ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} pending
        </Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {FILTERS.map((item) => (
          <Chip key={item.key} label={item.label} selected={filter === item.key} onPress={() => setFilter(item.key)} />
        ))}
      </ScrollView>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: 32, flexGrow: 1 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.accent}
            colors={[COLORS.accent]}
            progressBackgroundColor={COLORS.surface}
          />
        }
        ListHeaderComponent={header}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        renderSectionHeader={({ section }) => (
          <Text
            style={{
              fontFamily: FONTS.bodyBold,
              fontSize: 12.5,
              letterSpacing: 0.6,
              color: COLORS.textSecondary,
              textTransform: "uppercase",
              marginTop: 18,
              marginBottom: 10,
              paddingHorizontal: 4,
            }}
          >
            {section.title}
          </Text>
        )}
        renderItem={({ item }) => (
          <JobCard
            issueType={item.serviceRequest.issueType}
            status={item.status}
            distanceMeters={item.distanceMeters}
            timeLabel={timeLabel(item.offeredAt, now)}
          />
        )}
        ListEmptyComponent={
          <View style={{ flex: 1, justifyContent: "center", paddingVertical: 32 }}>
            <EmptyState
              icon={Briefcase}
              title={jobs.length === 0 ? "No jobs yet" : "Nothing in this filter"}
              description={jobs.length === 0 ? "Jobs offered to you will show up here." : "Try another filter."}
            />
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
