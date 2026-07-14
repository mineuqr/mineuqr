import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Clock, Tag } from "lucide-react";
import AddToCartButton from "@/components/AddToCartButton";
import { OfferImagePlaceholder } from "@/components/offers/OfferImagePlaceholder";
import { resolveOfferImageUrl } from "@/lib/offers/offerImage";
import { useLanguage } from "@/contexts/LanguageContext";

const OFFER_TYPE_MAP: Record<string, { label: string; icon: typeof Tag }> = {
  daily: { label: "عرض يومي", icon: Clock },
  weekly: { label: "عرض أسبوعي", icon: Calendar },
  monthly: { label: "عرض شهري", icon: Tag },
};

function CountdownTimer({
  endDate,
  accentColor,
  textColor,
}: {
  endDate: string | Date;
  accentColor: string;
  textColor: string;
}) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    const end = new Date(endDate).getTime();
    const update = () => {
      const diff = end - Date.now();
      if (diff <= 0) {
        setExpired(true);
        return;
      }
      setTimeLeft({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      });
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [endDate]);

  if (expired) {
    return <span className="text-xs font-medium text-red-500">انتهى العرض</span>;
  }

  const parts = [
    { value: timeLeft.days, label: "يوم" },
    { value: timeLeft.hours, label: "ساعة" },
    { value: timeLeft.minutes, label: "دقيقة" },
    { value: timeLeft.seconds, label: "ثانية" },
  ];

  return (
    <div className="flex items-center gap-1.5">
      <Clock className="w-3 h-3" style={{ color: accentColor }} />
      <div className="flex gap-1">
        {parts.map((p, i) => (
          <span
            key={i}
            className="text-[10px] font-mono font-bold px-1 py-0.5 rounded"
            style={{ background: `${accentColor}20`, color: textColor }}
          >
            {String(p.value).padStart(2, "0")}
            <span className="text-[8px] opacity-50 mr-0.5">{p.label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export type OffersTabPanelProps = {
  offers: any[];
  accentColor: string;
  textColor: string;
  cardBg?: string;
  currencySymbol?: string;
  fontStyles?: {
    arStyle: React.CSSProperties;
    enStyle: React.CSSProperties;
    headingColor?: string;
    bodyColor?: string;
    priceColor?: string;
    headingScale?: string;
    bodyScale?: string;
    priceScale?: string;
  };
  tableNumber?: number;
  /**
   * KIOSK-PRESENTATION-ADOPTION-1 — when set, controls Add to Cart without
   * requiring a table number (kiosk / non-table channels).
   */
  canAddToCart?: boolean;
};

export function OffersTabPanel({
  offers,
  accentColor,
  textColor,
  cardBg,
  currencySymbol,
  fontStyles,
  tableNumber,
  canAddToCart,
}: OffersTabPanelProps) {
  const { language } = useLanguage();
  const [activeFilter, setActiveFilter] = useState<"all" | "daily" | "weekly" | "monthly">("all");
  const locale = language === "ar" ? "ar-SA" : "en-US";
  const cs = currencySymbol || "ر.س";

  if (!offers.length) {
    return null;
  }

  const filteredOffers =
    activeFilter === "all" ? offers : offers.filter((o: any) => o.offerType === activeFilter);
  const offerTypes = Array.from(new Set(offers.map((o: any) => o.offerType)));

  return (
    <main className="container py-4 pb-8">
      {offerTypes.length > 1 && (
        <div className="flex gap-2 mb-4 flex-wrap">
          {(["all", "daily", "weekly", "monthly"] as const)
            .filter((key) => key === "all" || offerTypes.includes(key))
            .map((key) => {
              const count =
                key === "all"
                  ? offers.length
                  : offers.filter((o: any) => o.offerType === key).length;
              const labels: Record<string, string> = {
                all: language === "ar" ? `الكل (${count})` : `All (${count})`,
                daily: language === "ar" ? `يومي (${count})` : `Daily (${count})`,
                weekly: language === "ar" ? `أسبوعي (${count})` : `Weekly (${count})`,
                monthly: language === "ar" ? `شهري (${count})` : `Monthly (${count})`,
              };
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveFilter(key)}
                  className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                  style={{
                    background: activeFilter === key ? accentColor : `${accentColor}15`,
                    color: activeFilter === key ? "#000" : textColor,
                  }}
                >
                  {labels[key]}
                </button>
              );
            })}
        </div>
      )}

      <div className="flex flex-col gap-3">
        <AnimatePresence mode="popLayout">
          {filteredOffers.map((offer: any, index: number) => {
            const discount =
              offer.originalPrice && offer.offerPrice
                ? Math.round(
                    (1 - parseFloat(offer.offerPrice) / parseFloat(offer.originalPrice)) * 100
                  )
                : 0;
            const typeInfo = OFFER_TYPE_MAP[offer.offerType] || OFFER_TYPE_MAP.daily;
            const TypeIcon = typeInfo.icon;
            const coverUrl = resolveOfferImageUrl(offer);
            const validityLabel = `${new Date(offer.startDate).toLocaleDateString(locale)} — ${new Date(offer.endDate).toLocaleDateString(locale)}`;

            return (
              <motion.article
                key={offer.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, delay: index * 0.03 }}
                className="rounded-xl overflow-hidden border flex flex-col sm:flex-row"
                style={{
                  background: cardBg || `${accentColor}10`,
                  borderColor: `${accentColor}30`,
                }}
              >
                <div className="relative w-full sm:w-40 md:w-44 shrink-0">
                  {discount > 0 && (
                    <div
                      className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
                      style={{ background: "#ef4444" }}
                    >
                      -{discount}%
                    </div>
                  )}
                  {coverUrl ? (
                    <img
                      src={coverUrl}
                      alt={offer.titleAr}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-28 sm:h-full sm:min-h-[6.5rem] object-cover aspect-[16/9] sm:aspect-auto"
                    />
                  ) : (
                    <OfferImagePlaceholder
                      size="sm"
                      accentColor={accentColor}
                      className="h-28 sm:min-h-[6.5rem] rounded-none"
                    />
                  )}
                </div>

                <div className="p-3 sm:p-4 flex flex-col flex-1 min-w-0 gap-2">
                  <div className="flex-1 min-w-0">
                    <h3
                      className="font-bold text-base truncate"
                      style={{
                        color: fontStyles?.headingColor || textColor,
                        ...fontStyles?.arStyle,
                      }}
                    >
                      {offer.titleAr}
                    </h3>
                    {offer.titleEn && (
                      <p
                        className="text-xs opacity-60 truncate"
                        style={{ color: textColor, ...fontStyles?.enStyle }}
                      >
                        {offer.titleEn}
                      </p>
                    )}
                    <div className="flex items-center gap-1.5 mt-1">
                      <TypeIcon className="w-3.5 h-3.5" style={{ color: accentColor }} />
                      <span className="text-xs" style={{ color: `${textColor}99` }}>
                        {typeInfo.label}
                      </span>
                    </div>
                    {offer.descriptionAr && (
                      <p
                        className="text-sm line-clamp-2 opacity-70 mt-2"
                        style={{
                          color: fontStyles?.bodyColor || textColor,
                          ...fontStyles?.arStyle,
                        }}
                      >
                        {offer.descriptionAr}
                      </p>
                    )}
                    <p className="text-xs opacity-60 mt-2" style={{ color: textColor }}>
                      {validityLabel}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-end justify-between gap-2 pt-1">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className="text-lg font-bold"
                          style={{
                            color: fontStyles?.priceColor || accentColor,
                            ...fontStyles?.enStyle,
                            fontSize: fontStyles?.priceScale
                              ? `calc(1.125rem * ${fontStyles.priceScale})`
                              : undefined,
                          }}
                        >
                          {offer.offerPrice}{" "}
                          <span className="text-xs font-normal opacity-60" style={{ color: textColor }}>
                            {cs}
                          </span>
                        </span>
                        <span className="text-sm line-through opacity-40" style={{ color: textColor }}>
                          {offer.originalPrice} {cs}
                        </span>
                      </div>
                      <CountdownTimer
                        endDate={offer.endDate}
                        accentColor={accentColor}
                        textColor={textColor}
                      />
                    </div>
                    {(canAddToCart ?? (tableNumber != null && tableNumber > 0)) && (
                      <AddToCartButton
                        offerId={offer.id}
                        nameAr={offer.titleAr}
                        nameEn={offer.titleEn}
                        price={String(offer.offerPrice)}
                        imageUrl={coverUrl ?? offer.imageUrl}
                      />
                    )}
                  </div>
                </div>
              </motion.article>
            );
          })}
        </AnimatePresence>
      </div>
    </main>
  );
}
