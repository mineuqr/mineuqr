import type { ReactNode } from "react";

/**
 * WAITER-SCREEN-IDENTITY-PRESENTATION-1 —
 * Displays Business Identity + Screen Identity forwarded from Runtime Public APIs.
 * Presentation only — no identity derivation.
 */
type Props = {
  restaurantName: string;
  screenName?: string | null;
  roleLabel?: string | null;
  trailing?: ReactNode;
};

export function WaiterScreenIdentityHeader({
  restaurantName,
  screenName,
  roleLabel,
  trailing,
}: Props) {
  const screen = screenName?.trim() || null;
  const role = roleLabel?.trim() || null;

  return (
    <header className="sticky top-0 z-10 border-b border-white/10 bg-slate-900/95 px-4 py-4 flex items-center justify-between gap-3">
      <div className="min-w-0">
        {role ? (
          <p className="text-xs uppercase tracking-wide text-white/50 truncate">
            {role}
          </p>
        ) : null}
        <h1 className="text-2xl font-bold truncate">{restaurantName}</h1>
        {screen ? (
          <p className="mt-1 text-sm text-teal-300/90 truncate" title={screen}>
            {screen}
          </p>
        ) : null}
      </div>
      {trailing}
    </header>
  );
}
