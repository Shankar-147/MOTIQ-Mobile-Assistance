import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppLanguage, TRANSLATIONS } from "./translations";

const LANGUAGE_STORAGE_KEY = "motiq.language";

interface LanguageContextValue {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => void;
  t: (key: keyof (typeof TRANSLATIONS)["en"]) => string;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

/**
 * Real, working language switching — scoped honestly to the strings in
 * `translations.ts` (currently just the Welcome screen's copy, its first
 * usage) rather than claiming full app-wide i18n coverage that doesn't exist
 * yet. The choice persists across app restarts via AsyncStorage, the same
 * mechanism offlineQueue.ts already uses.
 */
export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>("en");

  useEffect(() => {
    AsyncStorage.getItem(LANGUAGE_STORAGE_KEY).then((stored) => {
      if (stored === "en" || stored === "hi" || stored === "ta") {
        setLanguageState(stored);
      }
    });
  }, []);

  const setLanguage = (next: AppLanguage) => {
    setLanguageState(next);
    AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, next).catch(() => undefined);
  };

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      setLanguage,
      t: (key) => TRANSLATIONS[language][key] ?? TRANSLATIONS.en[key],
    }),
    [language],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return ctx;
}
