import React, { useCallback, useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import * as Location from "expo-location";
import { ArrowRight, Plus, Truck } from "lucide-react-native";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AssignmentStatus, IssueType, PresenceStatus, ProviderVerificationStatus, RequestStatus } from "@motiq/types";
import { ProviderStackParamList, ProviderTabParamList } from "../../navigation/types";
import { providerApi } from "../../api/providerApi";
import { providerFleetVehicleApi } from "../../api/providerFleetVehicleApi";
import { consentApi } from "../../api/consentApi";
import { connectTrackingSocket, disconnectTrackingSocket, sendPresenceHeartbeat } from "../../realtime/trackingSocket";
import { startForegroundLocationTracking, stopLocationTracking } from "./locationTracking";
import { registerForPushNotifications } from "../../notifications/pushRegistration";
import { usePendingOfferStore } from "../../store/pendingOfferStore";
import { A11Y_LABELS } from "../../accessibility/a11y";
import { Badge, BottomSheet, Button, PulseDot, SlideToConfirm } from "../../components/ui";
import { MapBackdrop } from "../../components/MapBackdrop";
import { OfflineBanner } from "../../components/OfflineBanner";
import { JobCard } from "../../components/JobCard";
import { verificationBadgeTone } from "./verificationBadgeTone";
import { SosButton } from "../sos/SosButton";
import { formatRelativeTime } from "./relativeTime";
import { useDeviceLocation } from "../customer/useDeviceLocation";
import { COLORS, FONTS } from "../../theme/colors";

type Props = CompositeScreenProps<
  BottomTabScreenProps<ProviderTabParamList, "Home">,
  NativeStackScreenProps<ProviderStackParamList>
>;

const HEARTBEAT_INTERVAL_MS = 20_000;
const RECENT_JOBS_LIMIT = 3;
const RECENT_JOBS_REFRESH_MS = 8_000;
const SHEET_SNAPS = [400, 660];

interface OwnProfileSummary {
  businessName: string;
  verificationStatus: ProviderVerificationStatus;
  ratingAverage: string;
  completedJobCount: number;
}

interface RecentJob {
  id: string;
  status: AssignmentStatus;
  offeredAt: string;
  distanceMeters: number | null;
  serviceRequest: { id: string; issueType: IssueType; status: RequestStatus };
}

const TERMINAL_REQUEST_STATUSES = new Set<RequestStatus>([
  RequestStatus.COMPLETED,
  RequestStatus.CANCELLED_BY_CUSTOMER,
  RequestStatus.CANCELLED_BY_PROVIDER,
  RequestStatus.EXPIRED,
  RequestStatus.FAILED,
]);

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: COLORS.surfaceRaised, borderRadius: 16, padding: 12, gap: 2 }}>
      <Text style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.textSecondary }}>{label}</Text>
      <Text numberOfLines={1} adjustsFontSizeToFit style={{ fontFamily: FONTS.display, fontSize: 22, color: COLORS.text }}>
        {value}
      </Text>
    </View>
  );
}

/**
 * Ch72's Home tab — map-first. The presence/tracking/heartbeat logic
 * (mirroring the server's PresenceStatus state machine, Ch76) is unchanged;
 * this is the presentation: the provider's position on a dark map, a
 * slide-to-go-online control in a draggable sheet, stats and recent jobs.
 */
export function GoOnlineScreen({ navigation }: Props) {
  const [online, setOnline] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<OwnProfileSummary | null>(null);
  const [fleetVehicleCount, setFleetVehicleCount] = useState<number | null>(null);
  const [totalEarnings, setTotalEarnings] = useState<string | null>(null);
  const [recentJobs, setRecentJobs] = useState<RecentJob[]>([]);
  const pendingOffer = usePendingOfferStore((state) => state.pendingOffer);
  const setPendingOffer = usePendingOfferStore((state) => state.setPendingOffer);
  const { position } = useDeviceLocation();

  // The way back into work in progress: there is no endpoint for "my pending
  // offer", and a missed push would otherwise strand an accepted job, so the
  // newest still-open assignment (offered or accepted) is surfaced here.
  const openJob = recentJobs.find(
    (job) =>
      (job.status === AssignmentStatus.ACCEPTED || job.status === AssignmentStatus.OFFERED) &&
      !TERMINAL_REQUEST_STATUSES.has(job.serviceRequest.status),
  );

  useEffect(() => {
    registerForPushNotifications().catch(() => undefined);
  }, []);

  useEffect(() => {
    providerApi
      .getOwnProfile()
      .then((response) => setProfile(response.data as OwnProfileSummary))
      .catch(() => undefined);
  }, []);

  useFocusEffect(
    useCallback(() => {
      providerFleetVehicleApi
        .listMine()
        .then((response) => setFleetVehicleCount((response.data as { data: unknown[] }).data.length))
        .catch(() => undefined);

      providerApi
        .getEarnings()
        .then((response) => setTotalEarnings((response.data as { totalEarnings: string }).totalEarnings))
        .catch(() => undefined);

      const loadRecentJobs = () =>
        providerApi
          .listOwnJobs({ limit: RECENT_JOBS_LIMIT })
          .then((response) => setRecentJobs((response.data as { data: RecentJob[] }).data))
          .catch(() => undefined);
      loadRecentJobs();
      // No push or offer-polling endpoint exists, so while Home is open the
      // job list refreshes on a timer — that is how a new offer surfaces.
      const refresh = setInterval(loadRecentJobs, RECENT_JOBS_REFRESH_MS);
      return () => clearInterval(refresh);
    }, []),
  );

  useEffect(() => {
    if (pendingOffer) {
      setPendingOffer(null);
      navigation.navigate("JobOffer", pendingOffer);
    }
  }, [pendingOffer, setPendingOffer, navigation]);

  useEffect(() => {
    if (!online) {
      return;
    }
    const heartbeat = setInterval(sendPresenceHeartbeat, HEARTBEAT_INTERVAL_MS);
    return () => clearInterval(heartbeat);
  }, [online]);

  async function handleToggle() {
    setError(null);
    setSubmitting(true);
    try {
      if (online) {
        stopLocationTracking();
        disconnectTrackingSocket();
        await providerApi.updatePresence(PresenceStatus.OFFLINE);
        setOnline(false);
        return;
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setError("Location permission is required to go online.");
        return;
      }
      // Accuracy.BestForNavigation forces the GPS provider path rather than
      // network/fused-only resolution — on at least one dev Android emulator
      // (Play-services image, no real cell/WiFi signals to derive a network
      // fix from), the default Balanced accuracy left getCurrentPositionAsync
      // hanging/rejecting indefinitely with "Current location is unavailable"
      // even after injecting a mock GPS fix via the emulator console, while
      // BestForNavigation picked up the injected fix immediately. Harmless on
      // a real device, which has an actual GPS radio either way.
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.BestForNavigation,
      });
      // Ch128 — must precede any presence update carrying a location, which
      // the backend now gates on this consent existing (ConsentService).
      await consentApi.grantLocationTracking();
      await providerApi.updatePresence(PresenceStatus.ONLINE, {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
      connectTrackingSocket();
      await startForegroundLocationTracking();
      setOnline(true);
    } catch {
      setError("Couldn't determine your location. Check location services and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <MapBackdrop position={position} bottomInset={SHEET_SNAPS[0] + 16}>
        <View pointerEvents="box-none" style={{ gap: 10 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 10.5, letterSpacing: 1.5, color: COLORS.textSecondary }}>
                MOTIQ PROVIDER
              </Text>
              <Text numberOfLines={1} style={{ fontFamily: FONTS.display, fontSize: 18, color: COLORS.text }}>
                {profile?.businessName ?? "Loading…"}
              </Text>
            </View>
            <SosButton />
          </View>
          <OfflineBanner />
        </View>
      </MapBackdrop>

      <BottomSheet snapPoints={SHEET_SNAPS}>
        <View style={{ gap: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
              {online ? <PulseDot /> : <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.textMuted }} />}
              <Text style={{ fontFamily: FONTS.display, fontSize: 20, color: COLORS.text, flexShrink: 1 }}>
                {online ? "You're online" : "You're offline"}
              </Text>
            </View>
            {profile ? (
              <Badge
                label={profile.verificationStatus.replace("_", " ").toLowerCase()}
                tone={verificationBadgeTone(profile.verificationStatus)}
              />
            ) : null}
          </View>
          <Text style={{ fontFamily: FONTS.body, fontSize: 14, color: COLORS.textSecondary, marginTop: -8 }}>
            {online ? "Waiting for nearby jobs. Keep the app open." : "Go online to start receiving job offers."}
          </Text>

          <SlideToConfirm
            label={online ? "Slide to go offline" : "Slide to go online"}
            tone={online ? "danger" : "accent"}
            loading={submitting}
            onConfirm={handleToggle}
          />

          {error ? (
            <Text style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.danger, textAlign: "center" }}>{error}</Text>
          ) : null}

          {openJob ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={openJob.status === AssignmentStatus.OFFERED ? "View waiting job offer" : "Resume current job"}
              onPress={() => {
                const params = { assignmentId: openJob.id, serviceRequestId: openJob.serviceRequest.id };
                if (openJob.status === AssignmentStatus.OFFERED) navigation.navigate("JobOffer", params);
                else navigation.navigate("ActiveJob", params);
              }}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                padding: 14,
                borderRadius: 18,
                borderWidth: 1,
                borderColor: COLORS.accent,
                backgroundColor: COLORS.accentTint,
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <PulseDot />
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 15, color: COLORS.text }}>
                  {openJob.status === AssignmentStatus.OFFERED ? "New job offer waiting" : "Job in progress"}
                </Text>
                <Text style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.textSecondary }}>
                  {openJob.status === AssignmentStatus.OFFERED ? "Tap to view and respond" : "Tap to resume"}
                </Text>
              </View>
              <ArrowRight size={20} color={COLORS.accent} />
            </Pressable>
          ) : null}

          <View style={{ flexDirection: "row", gap: 10 }}>
            <StatTile label="Rating" value={profile ? Number(profile.ratingAverage).toFixed(1) : "–"} />
            <StatTile label="Jobs done" value={String(profile?.completedJobCount ?? 0)} />
            <StatTile
              label="Earned"
              value={totalEarnings != null ? `₹${Math.round(Number(totalEarnings)).toLocaleString("en-IN")}` : "–"}
            />
          </View>

          {fleetVehicleCount === 0 ? (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                backgroundColor: COLORS.surfaceRaised,
                borderRadius: 18,
                padding: 14,
              }}
            >
              <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: COLORS.accentTint, alignItems: "center", justifyContent: "center" }}>
                <Truck size={18} color={COLORS.accent} strokeWidth={1.8} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 14, color: COLORS.text }}>Add your first fleet vehicle</Text>
                <Text style={{ fontFamily: FONTS.bodyRegular, fontSize: 12, color: COLORS.textSecondary, marginTop: 1 }}>
                  Keep details on file from your profile
                </Text>
              </View>
              <Button
                label="Add"
                variant="outline"
                fullWidth={false}
                icon={Plus}
                accessibilityLabel={A11Y_LABELS.addFleetVehicleButton}
                onPress={() => navigation.navigate("AddFleetVehicle", undefined)}
              />
            </View>
          ) : null}

          {recentJobs.length > 0 ? (
            <View style={{ gap: 10 }}>
              <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 12.5, letterSpacing: 0.6, color: COLORS.textSecondary, textTransform: "uppercase" }}>
                Recent jobs
              </Text>
              {recentJobs.map((job) => (
                <JobCard
                  key={job.id}
                  issueType={job.serviceRequest.issueType}
                  status={job.status}
                  distanceMeters={job.distanceMeters}
                  timeLabel={formatRelativeTime(job.offeredAt)}
                />
              ))}
            </View>
          ) : null}
        </View>
      </BottomSheet>
    </View>
  );
}
