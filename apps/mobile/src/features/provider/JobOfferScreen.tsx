import React, { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Check, PackageCheck, X } from "lucide-react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { IssueType } from "@motiq/types";
import { ProviderStackParamList } from "../../navigation/types";
import { providerApi } from "../../api/providerApi";
import { requestApi } from "../../api/requestApi";
import { ISSUE_ICONS, ISSUE_LABELS } from "../../theme/issueIcons";
import { A11Y_LABELS } from "../../accessibility/a11y";
import { Button, PulseDot, Skeleton } from "../../components/ui";
import { KeyboardScreen } from "../../components/KeyboardScreen";
import { COLORS, FONTS } from "../../theme/colors";

type Props = NativeStackScreenProps<ProviderStackParamList, "JobOffer">;

interface JobOfferRequestDetails {
  issueType: IssueType;
  description: string | null;
  vehicleSnapshotMake: string;
  vehicleSnapshotModel: string;
  vehicleSnapshotPlateNumber: string;
}

/**
 * Reached only via a tapped push notification's assignmentId/serviceRequestId
 * payload (see App.tsx's addNotificationTapListener wiring) — there is no
 * REST endpoint yet for a provider to poll "what's my current pending
 * offer" (docs/roadmap.md's Reconciliation Notes), so a missed/denied push
 * notification means a missed offer with no in-app recovery path. Flagged,
 * not silently worked around.
 *
 * Fetches the request's own details (issue, vehicle, description) via
 * GET /requests/:id — RequestController.findOne() already allows PROVIDER
 * reads — instead of showing a bare "New job offer" with nothing to decide
 * on. The offer's expiry is server configuration and not sent to the app, so
 * no countdown is shown — only a "respond soon" note.
 */
export function JobOfferScreen({ route, navigation }: Props) {
  const { assignmentId, serviceRequestId } = route.params;
  const insets = useSafeAreaInsets();
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState<JobOfferRequestDetails | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    requestApi
      .getById(serviceRequestId)
      .then((response) => setDetails(response.data as JobOfferRequestDetails))
      .catch(() => setError("Couldn't load this job's details."))
      .finally(() => setLoading(false));
  }, [serviceRequestId]);

  async function handleAccept() {
    setSubmitting(true);
    setError(null);
    try {
      await providerApi.acceptOffer(assignmentId);
      navigation.replace("ActiveJob", { assignmentId, serviceRequestId });
    } catch {
      setError("This offer is no longer available to accept — it may have expired or already been resolved.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReject() {
    setSubmitting(true);
    setError(null);
    try {
      await providerApi.rejectOffer(assignmentId);
      navigation.replace("MainTabs");
    } catch {
      setError("Couldn't decline this offer — it may have already been resolved.");
    } finally {
      setSubmitting(false);
    }
  }

  const Icon = details ? ISSUE_ICONS[details.issueType] : PackageCheck;
  const hasVehicle = details && details.vehicleSnapshotMake !== "Unspecified";

  const rowStyle = {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 12,
  };
  const labelStyle = { fontFamily: FONTS.body, fontSize: 14.5, color: COLORS.textSecondary };
  const valueStyle = { fontFamily: FONTS.bodyBold, fontSize: 14.5, color: COLORS.text, flexShrink: 1, textAlign: "right" as const };

  return (
    <KeyboardScreen contentContainerStyle={{ paddingTop: insets.top + 24, justifyContent: "center", gap: 20 }}>
      <View style={{ alignItems: "center", gap: 12 }}>
        <View
          style={{
            width: 96,
            height: 96,
            borderRadius: 48,
            backgroundColor: COLORS.accentTint,
            borderWidth: 2,
            borderColor: COLORS.accent,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon size={42} color={COLORS.accent} />
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <PulseDot />
          <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 12.5, letterSpacing: 1, color: COLORS.accent }}>NEW JOB OFFER</Text>
        </View>
        <Text style={{ fontFamily: FONTS.display, fontSize: 30, color: COLORS.text, textAlign: "center" }}>
          {details ? ISSUE_LABELS[details.issueType] : "Job offer"}
        </Text>
        <Text style={{ fontFamily: FONTS.body, fontSize: 14, color: COLORS.textSecondary, textAlign: "center" }}>
          Respond soon — offers expire.
        </Text>
      </View>

      {loading ? (
        <View style={{ gap: 12 }}>
          <Skeleton height={44} radius={14} />
          <Skeleton height={44} radius={14} />
        </View>
      ) : details ? (
        <View
          style={{
            backgroundColor: COLORS.surface,
            borderRadius: 22,
            borderWidth: 1,
            borderColor: COLORS.border,
            paddingHorizontal: 16,
            paddingVertical: 4,
          }}
        >
          <View style={rowStyle}>
            <Text style={labelStyle}>Concern</Text>
            <Text style={valueStyle}>{ISSUE_LABELS[details.issueType]}</Text>
          </View>
          <View style={[rowStyle, !hasVehicle && !details.description ? { borderBottomWidth: 0 } : null]}>
            <Text style={labelStyle}>Vehicle</Text>
            <Text style={valueStyle}>
              {hasVehicle ? `${details.vehicleSnapshotMake} ${details.vehicleSnapshotModel}` : "Not specified"}
            </Text>
          </View>
          {hasVehicle ? (
            <View style={[rowStyle, !details.description ? { borderBottomWidth: 0 } : null]}>
              <Text style={labelStyle}>Plate</Text>
              <Text style={valueStyle}>{details.vehicleSnapshotPlateNumber}</Text>
            </View>
          ) : null}
          {details.description ? (
            <View style={{ paddingVertical: 12, gap: 4 }}>
              <Text style={labelStyle}>Customer's note</Text>
              <Text style={{ fontFamily: FONTS.body, fontSize: 15, color: COLORS.text }}>{details.description}</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {error ? (
        <Text style={{ fontFamily: FONTS.body, fontSize: 14, color: COLORS.danger, textAlign: "center" }}>{error}</Text>
      ) : null}

      <View style={{ gap: 10 }}>
        <Button
          label="Accept"
          variant="success"
          icon={Check}
          accessibilityLabel={A11Y_LABELS.acceptOfferButton}
          disabled={submitting}
          onPress={handleAccept}
        />
        <Button
          label="Decline"
          variant="outline"
          icon={X}
          accessibilityLabel={A11Y_LABELS.rejectOfferButton}
          disabled={submitting}
          onPress={handleReject}
        />
      </View>
    </KeyboardScreen>
  );
}
