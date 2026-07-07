import { Tag } from "lucide-react";

type OfferImagePlaceholderProps = {
  className?: string;
  accentColor?: string;
  size?: "sm" | "md" | "lg";
};

const SIZE_CLASS = {
  sm: "w-20 h-20",
  md: "w-32 h-32",
  lg: "w-full aspect-[16/10]",
} as const;

const ICON_SIZE = {
  sm: "w-8 h-8",
  md: "w-10 h-10",
  lg: "w-14 h-14",
} as const;

/** Default offer cover when no image is set — never blocks menu render. */
export function OfferImagePlaceholder({
  className = "",
  accentColor = "var(--primary)",
  size = "md",
}: OfferImagePlaceholderProps) {
  return (
    <div
      className={`flex items-center justify-center shrink-0 ${SIZE_CLASS[size]} ${className}`}
      style={{ background: `${accentColor}15` }}
      aria-hidden
    >
      <Tag className={`${ICON_SIZE[size]} opacity-30`} style={{ color: accentColor }} />
    </div>
  );
}
