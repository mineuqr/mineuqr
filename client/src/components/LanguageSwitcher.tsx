import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

type LanguageSwitcherProps = {
  variant?: "default" | "landing";
  compact?: boolean;
};

export function LanguageSwitcher({ variant = "default", compact = false }: LanguageSwitcherProps) {
  const { language, setLanguage } = useLanguage();

  const isLanding = variant === "landing";

  return (
    <div
      className={cn(
        "flex items-center gap-0.5 rounded-xl p-0.5",
        isLanding
          ? "border border-border/40 bg-background/40"
          : "border border-border/30 rounded-lg p-1"
      )}
      role="group"
      aria-label="Language"
    >
      <Button
        variant={language === "ar" ? "default" : "ghost"}
        size="sm"
        onClick={() => setLanguage("ar")}
        className={cn(
          "rounded-lg font-semibold",
          compact ? "h-7 px-2 text-[10px]" : "text-xs",
          isLanding && language !== "ar" && "text-muted-foreground hover:text-foreground"
        )}
      >
        {compact ? "ع" : "العربية"}
      </Button>
      <Button
        variant={language === "en" ? "default" : "ghost"}
        size="sm"
        onClick={() => setLanguage("en")}
        className={cn(
          "rounded-lg font-semibold",
          compact ? "h-7 px-2 text-[10px]" : "text-xs",
          isLanding && language !== "en" && "text-muted-foreground hover:text-foreground"
        )}
      >
        {compact ? "En" : "English"}
      </Button>
    </div>
  );
}
