/**
 * OPERATIONAL-ORDER-CARD-PLATFORM-1 — modifiers under item name.
 */
import { cn } from "@/lib/utils";

export function OperationalOrderModifiers({
  modifiers,
  notesClass,
}: {
  modifiers: readonly string[];
  notesClass: string;
}) {
  if (modifiers.length === 0) return null;
  return (
    <p className={cn(notesClass, "mt-0.5 break-words text-muted-foreground")}>
      {modifiers.join(", ")}
    </p>
  );
}
