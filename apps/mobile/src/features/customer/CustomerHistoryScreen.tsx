import React, { useCallback, useState } from "react";
import { FlatList, HStack, Pressable, Text, VStack } from "@gluestack-ui/themed";
import { useFocusEffect } from "@react-navigation/native";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ClipboardList } from "lucide-react-native";
import { IssueType, RequestStatus } from "@motiq/types";
import { CustomerStackParamList, CustomerTabParamList } from "../../navigation/types";
import { requestApi } from "../../api/requestApi";
import { Badge, EmptyState } from "../../components/ui";
import { statusBadgeTone } from "./statusBadgeTone";

type Props = CompositeScreenProps<
  BottomTabScreenProps<CustomerTabParamList, "History">,
  NativeStackScreenProps<CustomerStackParamList>
>;

interface RequestRow {
  id: string;
  issueType: IssueType;
  status: RequestStatus;
  createdAt: string;
}

/** Ch71's mobile Customer app History tab. */
export function CustomerHistoryScreen({ navigation }: Props) {
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadFirstPage = useCallback(() => {
    setLoading(true);
    requestApi
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
      loadFirstPage();
    }, [loadFirstPage]),
  );

  async function loadMore() {
    if (!cursor) {
      return;
    }
    const response = await requestApi.listMine({ cursor, limit: 25 });
    const body = response.data as { data: RequestRow[]; pagination: { nextCursor: string | null } };
    setRequests((existing) => [...existing, ...body.data]);
    setCursor(body.pagination.nextCursor);
  }

  if (!loading && requests.length === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="No requests yet"
        description="Your first request will show up here."
      />
    );
  }

  return (
    <FlatList
      flex={1}
      bg="$backgroundLight0"
      data={requests}
      keyExtractor={(item) => (item as RequestRow).id}
      renderItem={({ item }: { item: unknown }) => {
        const request = item as RequestRow;
        return (
          <Pressable
            px="$5"
            py="$4"
            borderBottomWidth={1}
            borderBottomColor="$borderLight200"
            onPress={() => navigation.navigate("RequestDetail", { serviceRequestId: request.id })}
          >
            <HStack alignItems="center" justifyContent="space-between">
              <Text fontWeight="$semibold" size="md" textTransform="capitalize">
                {request.issueType.replace("_", " ")}
              </Text>
              <Badge label={request.status.replace(/_/g, " ")} tone={statusBadgeTone(request.status)} />
            </HStack>
            <Text size="sm" color="$textLight500" mt="$1">
              {new Date(request.createdAt).toLocaleString()}
            </Text>
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
