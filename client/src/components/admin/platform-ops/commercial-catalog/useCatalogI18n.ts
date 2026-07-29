import { useLanguage } from "@/contexts/LanguageContext";

const PREFIX = "admin.platformOps.commercialCatalog.";

export function useCatalogI18n() {
  const { t, language, dir } = useLanguage();
  const cc = (key: string) => t(PREFIX + key);
  return { t, cc, language, dir };
}
