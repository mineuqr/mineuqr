import React, { createContext, useContext, useEffect, useState } from "react";
import ar from "../locales/ar.json";
import en from "../locales/en.json";

export type Language = "ar" | "en";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  dir: "rtl" | "ltr";
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations = {
  ar,
  en,
};

/**
 * Helper function to get nested translation values using dot notation
 * e.g., "common.save" -> translations[language]["common"]["save"]
 */
export function translateIn(lang: Language, key: string): string {
  return getNestedTranslation(translations[lang], key);
}

function getNestedTranslation(obj: any, path: string): string {
  const keys = path.split(".");
  let current = obj;
  for (const key of keys) {
    if (current && typeof current === "object" && key in current) {
      current = current[key];
    } else {
      return path; // Return the key if translation not found
    }
  }
  return typeof current === "string" ? current : path;
}

// Get initial language from localStorage immediately
function getInitialLanguage(): Language {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("app-language");
    if (stored === "ar" || stored === "en") {
      return stored;
    }
  }
  return "ar";
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(getInitialLanguage);

  // Update localStorage and document direction when language changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("app-language", language);
      const dir = language === "ar" ? "rtl" : "ltr";
      document.documentElement.dir = dir;
      document.documentElement.lang = language;
      document.documentElement.classList.toggle("rtl", language === "ar");
      document.documentElement.classList.toggle("ltr", language === "en");
    }
  }, [language]);

  // Sync language across tabs/windows
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "app-language" && (e.newValue === "ar" || e.newValue === "en")) {
        setLanguageState(e.newValue);
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener("storage", handleStorageChange);
      return () => window.removeEventListener("storage", handleStorageChange);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const t = (key: string): string => {
    return getNestedTranslation(translations[language], key);
  };

  const dir = language === "ar" ? "rtl" : "ltr";

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, dir }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextType {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return context;
}
