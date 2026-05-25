import { MINEUQR_LOGO_SRC } from "@/const/branding";
import { cn } from "@/lib/utils";

type LandingLogoProps = {
  onClick?: () => void;
  className?: string;
  imageClassName?: string;
  ariaLabel?: string;
};

export function LandingLogo({
  onClick,
  className,
  imageClassName,
  ariaLabel,
}: LandingLogoProps) {
  const img = (
    <img
      src={MINEUQR_LOGO_SRC}
      alt="MineuQR"
      draggable={false}
      className={cn("h-auto w-auto object-contain drop-shadow-[0_2px_12px_rgba(0,0,0,0.45)]", imageClassName)}
    />
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={ariaLabel}
        className={cn(
          "brand-mark flex shrink-0 items-center gap-2.5 rounded-lg transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
          className
        )}
      >
        {img}
      </button>
    );
  }

  return <div className={cn("flex shrink-0 items-center", className)}>{img}</div>;
}
