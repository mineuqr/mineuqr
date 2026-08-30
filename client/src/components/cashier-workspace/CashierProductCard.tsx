/**
 * CASHIER-UX-REDESIGN-1 / CASHIER-UX-REDESIGN-2 — POS product card.
 * Presentation only. Card body is the primary add target; + is secondary.
 */

import { cashierPos } from "@/lib/cashier-workspace/cashierPosStyles";
import { cn, resolveImageUrl } from "@/lib/utils";
import { Heart, Plus } from "lucide-react";
import type { KeyboardEvent, MouseEvent } from "react";

export type CashierProductCardItem = {
  menuItemId: number;
  name: string;
  price: string;
  imageUrl: string | null;
  isAvailable: boolean;
};

type Props = {
  item: CashierProductCardItem;
  currencyLabel: (price: string) => string;
  availableLabel: string;
  unavailableLabel: string;
  addLabel: string;
  favorite: boolean;
  flash: boolean;
  disabled: boolean;
  onAdd: () => void;
  onToggleFavorite: () => void;
};

export function CashierProductCard({
  item,
  currencyLabel,
  availableLabel,
  unavailableLabel,
  addLabel,
  favorite,
  flash,
  disabled,
  onAdd,
  onToggleFavorite,
}: Props) {
  const imageSrc = resolveImageUrl(item.imageUrl);
  const unavailable = !item.isAvailable;
  const addDisabled = disabled || unavailable;

  function handleAdd() {
    if (addDisabled) return;
    onAdd();
  }

  function handleCardKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (addDisabled) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onAdd();
    }
  }

  function handleFavoriteClick(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    event.preventDefault();
    onToggleFavorite();
  }

  function handlePlusClick(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    handleAdd();
  }

  return (
    <article
      role="button"
      tabIndex={addDisabled ? -1 : 0}
      aria-disabled={addDisabled || undefined}
      aria-label={`${addLabel}: ${item.name}`}
      className={cn(
        unavailable ? cashierPos.productCardUnavailable : cashierPos.productCard,
        !addDisabled && "cursor-pointer",
        addDisabled && "cursor-not-allowed",
        flash && cashierPos.productCardFlash
      )}
      data-menu-item-id={item.menuItemId}
      onClick={handleAdd}
      onKeyDown={handleCardKeyDown}
    >
      <button
        type="button"
        className={cn(
          cashierPos.productFav,
          favorite && cashierPos.productFavActive
        )}
        aria-label={favorite ? "favorite" : "favorite-off"}
        aria-pressed={favorite}
        onClick={handleFavoriteClick}
      >
        <Heart className={cn("size-4", favorite && "fill-current")} />
      </button>
      {imageSrc ? (
        <img src={imageSrc} alt="" className={cashierPos.productImage} />
      ) : (
        <span aria-hidden className={cashierPos.productFallback}>
          {item.name.slice(0, 1)}
        </span>
      )}
      <div className={cashierPos.productBody}>
        <span className={cashierPos.productName}>{item.name}</span>
        <span className={cashierPos.productPrice}>{currencyLabel(item.price)}</span>
        <span className={unavailable ? cashierPos.productUnavail : cashierPos.productAvail}>
          {unavailable ? unavailableLabel : availableLabel}
        </span>
        <div className="mt-auto flex items-center justify-end pt-0.5">
          <button
            type="button"
            className={cashierPos.productAdd}
            aria-label={addLabel}
            disabled={addDisabled}
            tabIndex={-1}
            onClick={handlePlusClick}
          >
            <Plus className="size-4" />
          </button>
        </div>
      </div>
    </article>
  );
}
