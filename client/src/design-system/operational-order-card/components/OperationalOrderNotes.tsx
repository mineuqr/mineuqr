/**
 * OPERATIONAL-ORDER-CARD-PLATFORM-1 — item / order notes chrome.
 */
import { StickyNote } from "lucide-react";
import { cn } from "@/lib/utils";

export function OperationalOrderNotes({
  notes,
  notesClass,
  variant = "item",
  className,
}: {
  notes: string | null | undefined;
  notesClass: string;
  variant?: "item" | "order";
  className?: string;
}) {
  if (!notes) return null;

  if (variant === "order") {
    return (
      <p
        className={cn(
          "mt-1.5 flex items-start gap-1.5",
          notesClass,
          className
        )}
      >
        <StickyNote
          className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/70"
          aria-hidden
        />
        <span className="line-clamp-4 break-words whitespace-pre-wrap">{notes}</span>
      </p>
    );
  }

  return (
    <p
      className={cn(
        notesClass,
        "mt-0.5 break-words whitespace-pre-wrap text-muted-foreground",
        className
      )}
    >
      {notes}
    </p>
  );
}
