import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { UserRole } from "@motiq/types";
import { AuthStackParamList } from "../../navigation/types";
import { authApi } from "../../api/authApi";
import { useAuthStore } from "../../store/authStore";
import { Button } from "../../components/ui";
import { COLORS, FONTS } from "../../theme/colors";
import { LANGUAGES } from "../../i18n/translations";
import { useLanguage } from "../../i18n/LanguageContext";

type Props = NativeStackScreenProps<AuthStackParamList, "Welcome">;

// Presentation tool: only builds made with EXPO_PUBLIC_DEMO_TOOLS=true show the demo sign-in.
const DEMO_TOOLS = process.env.EXPO_PUBLIC_DEMO_TOOLS === "true";

/**
 * Ch65's first screen — deliberately almost empty: the name, one line, one primary action and a
 * quiet link for providers. Language (Ch16) is three small text toggles; nothing else competes
 * for attention.
 */
export function WelcomeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { language, setLanguage, t } = useLanguage();
  const setSession = useAuthStore((state) => state.setSession);
  const [demoBusy, setDemoBusy] = useState<UserRole | null>(null);
  const [demoError, setDemoError] = useState<string | null>(null);

  async function demoSignIn(role: UserRole.CUSTOMER | UserRole.PROVIDER) {
    setDemoBusy(role);
    setDemoError(null);
    try {
      const response = await authApi.demoLogin(role);
      await setSession({ accessToken: response.data.accessToken, refreshToken: response.data.refreshToken });
    } catch {
      setDemoError("Demo sign-in failed — is the server reachable?");
    } finally {
      setDemoBusy(null);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 20, paddingHorizontal: 24 }}>
      <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 4 }}>
        {LANGUAGES.map(({ code, label }) => (
          <Pressable
            key={code}
            accessibilityRole="button"
            accessibilityLabel={`Language: ${label}`}
            onPress={() => setLanguage(code)}
            hitSlop={8}
            style={{ minHeight: 44, minWidth: 44, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 }}
          >
            <Text
              style={{
                fontFamily: language === code ? FONTS.bodyBold : FONTS.body,
                fontSize: 14,
                color: language === code ? COLORS.accent : COLORS.textMuted,
              }}
            >
              {label}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={{ flex: 1, justifyContent: "center" }}>
        <View style={{ flexDirection: "row" }}>
          <Text style={{ fontFamily: FONTS.display, fontSize: 60, color: COLORS.accent, letterSpacing: -1 }}>M</Text>
          <Text style={{ fontFamily: FONTS.display, fontSize: 60, color: COLORS.text, letterSpacing: -1 }}>OTIQ</Text>
        </View>
        <Text style={{ fontFamily: FONTS.body, fontSize: 18, color: COLORS.textSecondary, marginTop: 8, lineHeight: 26 }}>
          {t("tagline")}
        </Text>
      </View>

      <View style={{ gap: 12 }}>
        <Button
          label={t("getHelp")}
          accessibilityLabel="Continue as a customer"
          onPress={() => navigation.navigate("PhoneEntry", { intendedRole: UserRole.CUSTOMER })}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Continue as a provider"
          onPress={() => navigation.navigate("PhoneEntry", { intendedRole: UserRole.PROVIDER })}
          style={{ minHeight: 48, alignItems: "center", justifyContent: "center" }}
        >
          <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 15, color: COLORS.textSecondary }}>{t("providerLink")}</Text>
        </Pressable>

        {DEMO_TOOLS ? (
          <View style={{ alignItems: "center", gap: 6, marginTop: 4 }}>
            <Text style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.textMuted }}>Demo sign-in</Text>
            <View style={{ flexDirection: "row", gap: 12 }}>
              {([UserRole.CUSTOMER, UserRole.PROVIDER] as const).map((role) => (
                <Pressable
                  key={role}
                  accessibilityRole="button"
                  accessibilityLabel={`Demo sign-in as ${role.toLowerCase()}`}
                  disabled={demoBusy !== null}
                  onPress={() => demoSignIn(role)}
                  style={{
                    minHeight: 44,
                    paddingHorizontal: 18,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: COLORS.border,
                    backgroundColor: COLORS.surface,
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: demoBusy !== null ? 0.5 : 1,
                  }}
                >
                  <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 13, color: COLORS.text }}>
                    {demoBusy === role ? "Signing in…" : role === UserRole.CUSTOMER ? "Customer" : "Provider"}
                  </Text>
                </Pressable>
              ))}
            </View>
            {demoError ? <Text style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.warning }}>{demoError}</Text> : null}
          </View>
        ) : null}

        <Text style={{ fontFamily: FONTS.body, fontSize: 11.5, color: COLORS.textMuted, textAlign: "center", marginTop: 4 }}>
          {t("consentPrefix")}
          <Text style={{ color: COLORS.textSecondary }}>{t("termsAndPrivacy")}</Text>
          {t("consentSuffix")}
        </Text>
      </View>
    </View>
  );
}
