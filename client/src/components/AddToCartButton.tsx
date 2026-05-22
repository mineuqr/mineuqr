import { useCart } from "@/contexts/CartContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Plus, Check } from "lucide-react";
import { useState } from "react";

interface AddToCartButtonProps {
  menuItemId: number;
  nameAr: string;
  nameEn?: string;
  price: string;
  imageUrl?: string;
}

export default function AddToCartButton({ menuItemId, nameAr, nameEn, price, imageUrl }: AddToCartButtonProps) {
  const { addItem, items } = useCart();
  const { language } = useLanguage();
  const [justAdded, setJustAdded] = useState(false);

  const existingItem = items.find((i) => i.menuItemId === menuItemId);

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    addItem({ menuItemId, nameAr, nameEn, price, imageUrl });
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1000);
  };

  return (
    <button
      onClick={handleAdd}
      className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
        justAdded
          ? "bg-green-500 text-white scale-110"
          : "bg-orange-500 hover:bg-orange-600 text-white hover:scale-105"
      }`}
    >
      {justAdded ? (
        <>
          <Check className="w-3.5 h-3.5" />
          <span>{language === "ar" ? "تمت الإضافة" : "Added"}</span>
        </>
      ) : (
        <>
          <Plus className="w-3.5 h-3.5" />
          <span>
            {existingItem
              ? `${existingItem.quantity}`
              : language === "ar"
              ? "أضف"
              : "Add"}
          </span>
        </>
      )}
    </button>
  );
}
