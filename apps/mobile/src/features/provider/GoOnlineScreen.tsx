import React, { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import * as Location from "expo-location";
import { CheckCircle2, IndianRupee, Plus, Star, Truck } from "lucide-react-native";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AssignmentStatus, IssueType, PresenceStatus, ProviderVerificationStatus } from "@motiq/types";
import { ProviderStackParamList, ProviderTabParamList } from "../../navigation/types";
import { providerApi } from "../../api/providerApi";
import { providerFleetVehicleApi } from "../../api/providerFleetVehicleApi";
import { consentApi } from "../../api/consentApi";
import { connectTrackingSocket, disconnectTrackingSocket, sendPresenceHeartbeat } from "../../realtime/trackingSocket";
import { startForegroundLocationTracking, stopLocationTracking } from "./locationTracking";
import { registerForPushNotifications } from "../../notifications/pushRegistration";
import { usePendingOfferStore } from "../../store/pendingOfferStore";
import { A11Y_LABELS } from "../../accessibility/a11y";
import { Badge, Button } from "../../components/ui";
import { verificationBadgeTone } from "./verificationBadgeTone";
import { SosButton } from "../sos/SosButton";
import { OnlineStatusHero } from "./OnlineStatusHero";
import { StatChip } from "./StatChip";
import { RecentJobRow } from "./RecentJobRow";
import { formatRelativeTime } from "./relativeTime";
import { COLORS, FONTS } from "../../theme/colors";

type Props = CompositeScreenProps<
  BottomTabScreenProps<ProviderTabParamList, "Home">,
  NativeStackScreenProps<ProviderStackParamList>
>;

const HEARTBEAT_INTERVAL_MS = 20_000;
const RECENT_JOBS_LIMIT = 3;

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
  serviceRequest: { issueType: IssueType };
}

/**
 * Ch72's Home tab — redesigned (see the "Provider Home Redesign" design
 * canvas) from a bare status button + unlabeled tabs into a real dashboard:
 * a gradient status hero with a live pulse while online, three glanceable
 * stat cards, and a richer recent-jobs list. The underlying presence/
 * tracking/heartbeat logic (mirroring the server's PresenceStatus state
 * machine, Ch76) is unchanged — this pass only replaces the presentation.
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

      providerApi
        .listOwnJobs({ limit: RECENT_JOBS_LIMIT })
        .then((response) => setRecentJobs((response.data as { data: RecentJob[] }).data))
        .catch(() => undefined);
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
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.logoMark}>
            <Text style={styles.logoGlyph}>M</Text>
          </View>
          <View>
            <Text style={styles.eyebrow}>MOTIQ PROVIDER</Text>
            <View style={styles.nameRow}>
              <Text style={styles.greeting} numberOfLines={1}>
                {profile?.businessName ?? "Loading…"}
              </Text>
              {profile ? (
                <Badge
                  label={profile.verificationStatus.replace("_", " ")}
                  tone={verificationBadgeTone(profile.verificationStatus)}
                />
              ) : null}
            </View>
          </View>
        </View>
        <SosButton />
      </View>

      <OnlineStatusHero online={online} submitting={submitting} onToggle={handleToggle} />

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.statsRow}>
        <StatChip
          icon={Star}
          iconColor={COLORS.warning}
          iconBg="#FEF3C7"
          value={profile ? Number(profile.ratingAverage) : 0}
          format={(v) => v.toFixed(1)}
          label="Rating"
        />
        <StatChip
          icon={CheckCircle2}
          iconColor={COLORS.success}
          iconBg="#DCFCE7"
          value={profile?.completedJobCount ?? 0}
          label="Jobs done"
        />
        <StatChip
          icon={IndianRupee}
          iconColor={COLORS.primaryDark}
          iconBg="#E0E7FF"
          value={totalEarnings != null ? Number(totalEarnings) : 0}
          format={(v) => `₹${Math.round(v).toLocaleString("en-IN")}`}
          label="This week"
        />
      </View>

      {fleetVehicleCount === 0 ? (
        <View style={styles.fleetCard}>
          <View style={styles.fleetIconBadge}>
            <Truck size={18} color={COLORS.primary} strokeWidth={1.8} />
          </View>
          <View style={styles.fleetTextCol}>
            <Text style={styles.fleetTitle}>Add your first fleet vehicle</Text>
            <Text style={styles.fleetSubtitle}>Keep details on file from your profile</Text>
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
        <View style={styles.jobsSection}>
          <Text style={styles.sectionTitle}>Recent jobs</Text>
          <View style={styles.jobsList}>
            {recentJobs.map((job, index) => (
              <RecentJobRow
                key={job.id}
                issueType={job.serviceRequest.issueType}
                status={job.status}
                relativeTime={formatRelativeTime(job.offeredAt)}
                index={index}
              />
            ))}
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bgTint },
  content: { padding: 20, paddingBottom: 40, gap: 20 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10, flexShrink: 1 },
  logoMark: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  logoGlyph: { fontFamily: FONTS.display, fontSize: 15, color: "#FFFFFF" },
  eyebrow: { fontFamily: FONTS.bodyBold, fontSize: 10.5, letterSpacing: 1.5, color: COLORS.textMuted },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 1, flexShrink: 1 },
  greeting: { fontFamily: FONTS.bodyBold, fontSize: 14.5, color: COLORS.textPrimary, flexShrink: 1 },
  errorText: { fontFamily: FONTS.bodyRegular, fontSize: 13, color: COLORS.danger, textAlign: "center" },
  statsRow: { flexDirection: "row", gap: 10 },
  fleetCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 14,
  },
  fleetIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: COLORS.bgTint,
    alignItems: "center",
    justifyContent: "center",
  },
  fleetTextCol: { flex: 1 },
  fleetTitle: { fontFamily: FONTS.bodyBold, fontSize: 13.5, color: COLORS.textPrimary },
  fleetSubtitle: { fontFamily: FONTS.bodyRegular, fontSize: 11.5, color: COLORS.textMuted, marginTop: 1 },
  jobsSection: { gap: 12 },
  sectionTitle: { fontFamily: FONTS.display, fontSize: 15.5, color: COLORS.textPrimary },
  jobsList: { gap: 8 },
});
