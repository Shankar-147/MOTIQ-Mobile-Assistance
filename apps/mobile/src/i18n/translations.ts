export type AppLanguage = "en" | "hi" | "ta";

export const LANGUAGES: { code: AppLanguage; label: string }[] = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिन्दी" },
  { code: "ta", label: "தமிழ்" },
];

/**
 * Ch16's multi-language requirement, scoped honestly: only the Welcome
 * screen's copy is translated for now (its first real usage), not the whole
 * app — see LanguageContext's doc comment for why the picker here doesn't
 * silently imply full i18n coverage yet.
 */
export const TRANSLATIONS: Record<AppLanguage, Record<string, string>> = {
  en: {
    tagline: "Roadside assistance, on demand.",
    valuePropVerified: "Verified providers",
    valuePropTracking: "Live tracking",
    valuePropAvailability: "24/7 availability",
    liveBadge: "Now live in Bengaluru",
    consentPrefix: "By continuing, you agree to our ",
    termsAndPrivacy: "Terms & Privacy Policy",
    consentSuffix: ".",
    needAssistance: "I need assistance",
    provideAssistance: "I provide roadside assistance",
  },
  hi: {
    tagline: "मांगने पर सड़क किनारे सहायता।",
    valuePropVerified: "सत्यापित प्रदाता",
    valuePropTracking: "लाइव ट्रैकिंग",
    valuePropAvailability: "24/7 उपलब्धता",
    liveBadge: "अब बेंगलुरु में उपलब्ध",
    consentPrefix: "जारी रखकर, आप हमारी ",
    termsAndPrivacy: "नियम व शर्तों व गोपनीयता नीति",
    consentSuffix: " से सहमत हैं।",
    needAssistance: "मुझे सहायता चाहिए",
    provideAssistance: "मैं सड़क किनारे सहायता प्रदान करता हूँ",
  },
  ta: {
    tagline: "தேவைப்படும்போது சாலையோர உதவி.",
    valuePropVerified: "சரிபார்க்கப்பட்ட வழங்குநர்கள்",
    valuePropTracking: "நேரடி கண்காணிப்பு",
    valuePropAvailability: "24/7 கிடைக்கும்",
    liveBadge: "இப்போது பெங்களூருவில் உள்ளது",
    consentPrefix: "தொடர்வதன் மூலம், எங்கள் ",
    termsAndPrivacy: "விதிமுறைகள் & தனியுரிமைக் கொள்கையை",
    consentSuffix: " ஏற்கிறீர்கள்.",
    needAssistance: "எனக்கு உதவி தேவை",
    provideAssistance: "நான் சாலையோர உதவி வழங்குகிறேன்",
  },
};
