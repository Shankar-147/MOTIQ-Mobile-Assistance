import React, { useCallback, useState } from "react";
import { FlatList, HStack, Pressable, Text, VStack } from "@gluestack-ui/themed";
import { useFocusEffect } from "@react-navigation/native";
import { Briefcase } from "lucide-react-native";
import { AssignmentStatus, IssueType, RequestStatus } from "@motiq/types";
import { providerApi } from "../../api/providerApi";
import { Badge, BadgeTone, EmptyState } from "../../components/ui";

interface JobRow {
  id: string;
  status: AssignmentStatus;
  offeredAt: string;
  distanceMeters: number | null;
  serviceRequest: { id: string; issueType: IssueType; status: RequestStatus; createdAt: string };
}

const STATUS_TONE: Record<AssignmentStatus, BadgeTone> = {
  [AssignmentStatus.OFFERED]: "warning",
  [AssignmentStatus.ACCEPTED]: "success",
  [AssignmentStatus.REJECTED]: "neutral",
  [AssignmentStatus.TIMED_OUT]: "neutral",
};

/** Ch72's mobile job-history screen — every Assignment this provider was
 * ever offered, read-only (no resume-into-ActiveJob action here; the
 * existing ActiveJob screen assumes a fresh PROVIDER_ACCEPTED start, not a
 * server-fetched status, so wiring resume-from-history is left for whenever
 * that screen is made to fetch its own status — see docs/roadmap.md). */
export function ProviderJobsScreen() {
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadFirstPage = useCallback(() => {
    setLoading(true);
    providerApi
      .listOwnJobs({ limit: 25 })
      .then((response) => {
        const body = response.data as { data: JobRow[]; pagination: { nextCursor: string | null } };
        setJobs(body.data);
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
    const response = await providerApi.listOwnJobs({ cursor, limit: 25 });
    const body = response.data as { data: JobRow[]; pagination: { nextCursor: string | null } };
    setJobs((existing) => [...existing, ...body.data]);
    setCursor(body.pagination.nextCursor);
  }

  if (!loading && jobs.length === 0) {
    return (
      <EmptyState
        icon={Briefcase}
        title="No jobs yet"
        description="Offers you accept or decline will show up here."
      />
    );
  }

  return (
    <FlatList
      flex={1}
      bg="$backgroundLight0"
      data={jobs}
      keyExtractor={(item) => (item as JobRow).id}
      renderItem={({ item }: { item: unknown }) => {
        const job = item as JobRow;
        return (
          <Pressable px="$5" py="$4" borderBottomWidth={1} borderBottomColor="$borderLight200">
            <HStack alignItems="center" justifyContent="space-between">
              <Text fontWeight="$semibold" size="md" textTransform="capitalize">
                {job.serviceRequest.issueType.replace("_", " ")}
              </Text>
              <Badge label={job.status} tone={STATUS_TONE[job.status]} />
            </HStack>
            <Text size="sm" color="$textLight500" mt="$1">
              {new Date(job.offeredAt).toLocaleString()}
            </Text>
            {job.distanceMeters != null ? (
              <Text size="sm" color="$textLight500">
                {(job.distanceMeters / 1000).toFixed(1)} km away
              </Text>
            ) : null}
          </Pressable>
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
