import React, { useState } from "react";
import { LayoutChangeEvent, ScrollView, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Clock3, MapPinned, Send, ShieldCheck, Wrench } from "lucide-react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { UserRole } from "@motiq/types";
import { AuthStackParamList } from "../../navigation/types";
import { Badge, Button, Chip } from "../../components/ui";
import { COLORS, FONTS } from "../../theme/colors";
import { LANGUAGES } from "../../i18n/translations";
import { useLanguage } from "../../i18n/LanguageContext";
import { ToolRouteIllustration } from "./ToolRouteIllustration";

type Props = NativeStackScreenProps<AuthStackParamList, "Welcome">;

const VALUE_PROPS = [
  { key: "valuePropVerified", icon: ShieldCheck },
  { key: "valuePropTracking", icon: MapPinned },
  { key: "valuePropAvailability", icon: Clock3 },
] as const;

// A reasonable guess for the action sheet's height before its real one is
// measured on first layout — avoids a flash of scroll content hidden under
// it, without hardcoding a number that silently drifts from the real sheet.
const ESTIMATED_SHEET_HEIGHT = 230;

/**
 * Ch65's first screen. Composed as two clearly separated zones — a gradient
 * hero (brand, illustration, trust signals) and a white bottom sheet
 * (consent + the two role actions) — rather than one long stack of
 * similarly-styled blocks. The sheet's real height is measured via onLayout
 * and fed back into the ScrollView's bottom padding, so its content can
 * never end up hidden or overlapped underneath the sheet regardless of
 * screen size or font-scale settings (a fixed guessed padding was the bug in
 * an earlier pass of this screen). ToolRouteIllustration (wrench badge +
 * dotted route + pin) replaced an earlier car render per direct feedback;
 * the value-prop strip and language picker (Ch16) share one opaque card
 * with a divider instead of floating as separate translucent elements.
 */
export function WelcomeScreen({ navigation }: Props) {
  const { language, setLanguage, t } = useLanguage();
  const [sheetHeight, setSheetHeight] = useState(ESTIMATED_SHEET_HEIGHT);

  const onSheetLayout = (event: LayoutChangeEvent) => {
    setSheetHeight(event.nativeEvent.layout.height);
  };

  return (
    <View style={styles.screen}>
      <LinearGradient
        colors={["#E0E7FF", "#EEF2FF", "#F8FAFF"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient colors={["rgba(129,140,248,0.32)", "rgba(129,140,248,0)"]} style={styles.glowTopRight} />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: sheetHeight + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.eyebrow}>AI-POWERED ROADSIDE ASSISTANCE</Text>
        <View style={styles.wordmarkRow}>
          <Text style={[styles.wordmark, { color: COLORS.primary }]}>M</Text>
          <Text style={[styles.wordmark, { color: COLORS.primaryDeep }]}>OTIQ</Text>
        </View>
        <Text style={styles.tagline}>
          Roadside assistance, <Text style={{ color: COLORS.primary, fontFamily: FONTS.bodyBold }}>on demand.</Text>
        </Text>
        <View style={styles.badgeRow}>
          <Badge label={t("liveBadge")} tone="info" />
        </View>

        <View style={styles.illustrationCard}>
          <ToolRouteIllustration />
        </View>

        <View style={styles.infoCard}>
          <View style={styles.valuePropRow}>
            {VALUE_PROPS.map(({ key, icon: Icon }) => (
              <View key={key} style={styles.valuePropItem}>
                <View style={styles.valuePropIconWrap}>
                  <Icon size={20} color={COLORS.primary} strokeWidth={2} />
                </View>
                <Text style={styles.valuePropLabel}>{t(key)}</Text>
              </View>
            ))}
          </View>

          <View style={styles.divider} />

          <View style={styles.languageRow}>
            {LANGUAGES.map(({ code, label }) => (
              <Chip key={code} label={label} selected={language === code} onPress={() => setLanguage(code)} />
            ))}
          </View>
        </View>
      </ScrollView>

      <View style={styles.actionSheet} onLayout={onSheetLayout}>
        <View style={styles.sheetHandle} />
        <View style={styles.consentRow}>
          <ShieldCheck size={14} color={COLORS.textMuted} strokeWidth={2} />
          <Text style={styles.consentLine}>
            {t("consentPrefix")}
            <Text style={styles.consentLink}>{t("termsAndPrivacy")}</Text>
            {t("consentSuffix")}
          </Text>
        </View>
        <Button
          label={t("needAssistance")}
          icon={Send}
          accessibilityLabel="Continue as a customer"
          onPress={() => navigation.navigate("PhoneEntry", { intendedRole: UserRole.CUSTOMER })}
        />
        <Button
          label={t("provideAssistance")}
          variant="outline"
          icon={Wrench}
          accessibilityLabel="Continue as a provider"
          onPress={() => navigation.navigate("PhoneEntry", { intendedRole: UserRole.PROVIDER })}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bgTint, overflow: "hidden" },
  glowTopRight: { position: "absolute", top: -70, right: -100, width: 320, height: 320, borderRadius: 200 },

  scrollContent: { flexGrow: 1, paddingTop: 48, paddingHorizontal: 24 },
  eyebrow: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
    letterSpacing: 1.6,
    color: COLORS.primary,
    textAlign: "center",
    opacity: 0.75,
  },
  wordmarkRow: { flexDirection: "row", justifyContent: "center", marginTop: 8 },
  wordmark: { fontFamily: FONTS.display, fontSize: 38, letterSpacing: 0.5 },
  tagline: { fontFamily: FONTS.bodyRegular, fontSize: 15, color: COLORS.textSecondary, textAlign: "center", marginTop: 6 },
  badgeRow: { alignItems: "center", marginTop: 12 },

  illustrationCard: { alignItems: "center", marginTop: 20 },

  infoCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    paddingVertical: 20,
    paddingHorizontal: 16,
    marginTop: 4,
    shadowColor: COLORS.primaryDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  valuePropRow: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  valuePropItem: { flex: 1, alignItems: "center", gap: 8 },
  valuePropIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
  },
  valuePropLabel: {
    fontFamily: FONTS.bodyRegular,
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: "center",
  },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 18 },

  languageRow: { flexDirection: "row", justifyContent: "center", gap: 8 },

  actionSheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 24,
    gap: 14,
    shadowColor: COLORS.primaryDark,
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 12,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: "center",
    marginBottom: 2,
  },
  consentRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "center", gap: 6 },
  consentLine: {
    fontFamily: FONTS.bodyRegular,
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: "center",
    flexShrink: 1,
  },
  consentLink: { color: COLORS.primary, fontFamily: FONTS.bodyBold },
});
