/**
 * CASHIER-UX-REDESIGN-1 / CASHIER-UX-REDESIGN-2 — POS product card.
 * Presentation only.
 */

import { cashierPos } from "@/lib/cashier-workspace/cashierPosStyles";
import { cn, resolveImageUrl } from "@/lib/utils";
import { Heart, Plus } from "lucide-react";

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

  return (
    <article
      className={cn(
        unavailable ? cashierPos.productCardUnavailable : cashierPos.productCard,
        flash && cashierPos.productCardFlash
      )}
      data-menu-item-id={item.menuItemId}
    >
      <button
        type="button"
        className={cn(
          cashierPos.productFav,
          favorite && cashierPos.productFavActive
        )}
        aria-label={favorite ? "favorite" : "favorite-off"}
        aria-pressed={favorite}
        onClick={(event) => {
          event.stopPropagation();
          onToggleFavorite();
        }}
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
        <div className="mt-auto flex items-center pt-1">
          <button
            type="button"
            className={cashierPos.productAdd}
            aria-label={addLabel}
            disabled={addDisabled}
            onClick={() => {
              if (addDisabled) return;
              onAdd();
            }}
          >
            <Plus className="size-5" />
          </button>
        </div>
      </div>
    </article>
  );
}
