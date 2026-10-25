import React, { useCallback, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { IndianRupee } from "lucide-react-native";
import { PaymentStatus } from "@motiq/types";
import { Badge, BadgeTone, EmptyState, Skeleton, StatBlock } from "../../components/ui";
import { providerApi } from "../../api/providerApi";
import { COLORS, FONTS } from "../../theme/colors";

interface RecentPayment {
  id: string;
  serviceRequestId: string;
  amount: string;
  status: PaymentStatus;
  createdAt: string;
}

interface EarningsSummary {
  totalEarnings: string;
  pendingAmount: string;
  completedPayoutCount: number;
  recentPayments: RecentPayment[];
}

const STATUS_TONE: Record<PaymentStatus, BadgeTone> = {
  [PaymentStatus.PENDING]: "warning",
  [PaymentStatus.AUTHORIZED]: "warning",
  [PaymentStatus.CAPTURED]: "success",
  [PaymentStatus.FAILED]: "danger",
  [PaymentStatus.REFUNDED]: "neutral",
};

function money(value: string | number): string {
  return `₹${Number(value).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Ch72's mobile Provider app earnings screen — new in this phase (no
 * earnings visibility existed anywhere before). See
 * PaymentService.getEarningsSummaryForProvider()'s comment: in a dev
 * environment with no live payment gateway configured, totalEarnings will
 * honestly read ₹0 until a real webhook captures a payment. */
export function EarningsScreen() {
  const [summary, setSummary] = useState<EarningsSummary | null>(null);

  useFocusEffect(
    useCallback(() => {
      providerApi
        .getEarnings()
        .then((response) => setSummary(response.data as EarningsSummary))
        .catch(() => undefined);
    }, []),
  );

  if (!summary) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.bg, padding: 20, gap: 14 }}>
        <Skeleton height={140} radius={22} />
        <Skeleton height={64} radius={22} />
        <Skeleton height={64} radius={22} />
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: COLORS.bg }} contentContainerStyle={{ padding: 20, gap: 18 }}>
      <View
        style={{
          backgroundColor: COLORS.surface,
          borderRadius: 22,
          borderWidth: 1,
          borderColor: COLORS.accent,
          padding: 18,
          gap: 8,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <IndianRupee size={14} color={COLORS.accent} />
          <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 12, letterSpacing: 1, color: COLORS.accent }}>TOTAL EARNINGS</Text>
        </View>
        <StatBlock label="Paid out" value={money(summary.totalEarnings)} accent />
        <Text style={{ fontFamily: FONTS.body, fontSize: 13.5, color: COLORS.textSecondary }}>
          {summary.completedPayoutCount} paid job{summary.completedPayoutCount === 1 ? "" : "s"} · {money(summary.pendingAmount)} pending
        </Text>
      </View>

      <Text
        style={{
          fontFamily: FONTS.bodyBold,
          fontSize: 12.5,
          letterSpacing: 0.6,
          color: COLORS.textSecondary,
          textTransform: "uppercase",
          paddingHorizontal: 4,
        }}
      >
        Recent payments
      </Text>

      {summary.recentPayments.length === 0 ? (
        <EmptyState icon={IndianRupee} title="No payments yet" description="Payments from completed jobs will show up here." />
      ) : (
        <View style={{ backgroundColor: COLORS.surface, borderRadius: 22, borderWidth: 1, borderColor: COLORS.border, overflow: "hidden" }}>
          {summary.recentPayments.map((payment, index) => (
            <View
              key={payment.id}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingHorizontal: 16,
                paddingVertical: 14,
                borderBottomWidth: index === summary.recentPayments.length - 1 ? 0 : 1,
                borderBottomColor: COLORS.border,
              }}
            >
              <View style={{ gap: 2 }}>
                <Text style={{ fontFamily: FONTS.display, fontSize: 17, color: COLORS.text }}>{money(payment.amount)}</Text>
                <Text style={{ fontFamily: FONTS.body, fontSize: 12.5, color: COLORS.textMuted }}>
                  {new Date(payment.createdAt).toLocaleDateString([], { day: "numeric", month: "short" })},{" "}
                  {new Date(payment.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                </Text>
              </View>
              <Badge label={payment.status.toLowerCase()} tone={STATUS_TONE[payment.status]} />
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}
