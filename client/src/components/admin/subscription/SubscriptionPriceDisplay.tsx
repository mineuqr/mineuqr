import { cn } from "@/lib/utils";

type SubscriptionPriceDisplayProps = {
  priceDisplay: string;
  className?: string;
  size?: "sm" | "md";
};

/** Isolated LTR for numeric currency strings in RTL layouts. */
export function SubscriptionPriceDisplay({
  priceDisplay,
  className,
  size = "md",
}: SubscriptionPriceDisplayProps) {
  return (
    <span
      dir="ltr"
      className={cn(
        "inline-block unicode-bidi-plaintext tabular-nums text-foreground",
        size === "sm" ? "text-sm" : "text-base font-semibold",
        className
      )}
    >
      {priceDisplay}
    </span>
  );
}
