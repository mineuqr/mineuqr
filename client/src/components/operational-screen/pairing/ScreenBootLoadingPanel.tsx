import { Loader2 } from "lucide-react";

export function ScreenBootLoadingPanel({
  message,
}: {
  message: string;
}) {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#0b0e14] px-6 text-center text-foreground"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <Loader2 className="h-10 w-10 animate-spin text-primary" aria-hidden />
      <p className="text-base text-muted-foreground">{message}</p>
    </div>
  );
}
