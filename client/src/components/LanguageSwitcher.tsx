import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="flex items-center gap-1 border border-border/30 rounded-lg p-1">
      <Button
        variant={language === "ar" ? "default" : "ghost"}
        size="sm"
        onClick={() => setLanguage("ar")}
        className="text-xs font-semibold"
      >
        العربية
      </Button>
      <Button
        variant={language === "en" ? "default" : "ghost"}
        size="sm"
        onClick={() => setLanguage("en")}
        className="text-xs font-semibold"
      >
        English
      </Button>
    </div>
  );
}
