function TemplateHeader({ restaurant, accentColor, textColor, titleExtra }: { restaurant: any; accentColor: string; textColor?: string; titleExtra?: React.ReactNode }) {
  const tc = textColor || "white";
  const [showHours, setShowHours] = useState(false);
  const [showContact, setShowContact] = useState(false);

  // Calculate open/closed status
  const getOpenStatus = () => {
    if (!restaurant.workingHours) return null;
    try {
      const hours = typeof restaurant.workingHours === 'string' ? JSON.parse(restaurant.workingHours) : restaurant.workingHours;
      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const hasAnyOpen = days.some(d => hours[d] && !hours[d].closed);
      if (!hasAnyOpen) return null;
      const now = new Date();
      const currentDay = days[now.getDay()];
      const currentHour = hours[currentDay];
      let isOpenNow = false;
      if (currentHour && !currentHour.closed) {
        const nowTime = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
        isOpenNow = nowTime >= currentHour.open && nowTime <= currentHour.close;
      }
      return { isOpenNow, hours, days, currentDay };
    } catch { return null; }
  };

  const openStatus = getOpenStatus();
  const hasContactInfo = restaurant.phone || restaurant.address || restaurant.whatsapp || restaurant.instagram || restaurant.snapchat || restaurant.xTwitter || restaurant.locationUrl;

  return (
    <header className="relative">
      {restaurant.coverUrl ? (
        <div className="h-48 sm:h-56 relative overflow-hidden">
          <img src={restaurant.coverUrl} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0" style={{ background: `linear-gradient(to top, rgba(0,0,0,0.9), rgba(0,0,0,0.3), transparent)` }} />
        </div>
      ) : (
        <div className="h-32 sm:h-40 relative" style={{ background: `linear-gradient(135deg, ${accentColor}15, ${accentColor}05)` }}>
          <div className="absolute inset-0" style={{ background: `linear-gradient(to top, rgba(0,0,0,0.5), transparent)` }} />
        </div>
      )}
      <div className="container relative -mt-16 pb-4">
        <div className="flex items-end gap-4">
          {restaurant.logoUrl ? (
            <img src={restaurant.logoUrl} alt="" className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover shadow-xl" style={{ border: `3px solid ${accentColor}40` }} />
          ) : (
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl shadow-xl flex items-center justify-center" style={{ background: `${accentColor}15`, border: `3px solid ${accentColor}40` }}>
              <Store className="w-10 h-10" style={{ color: accentColor }} />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold truncate" style={{ color: tc }}>
              {titleExtra}{restaurant.nameAr}
            </h1>
            {restaurant.descriptionAr && (
              <p className="text-sm mt-1 opacity-60 line-clamp-1" style={{ color: tc }}>{restaurant.descriptionAr}</p>
            )}
          </div>
        </div>

        {/* Compact Status Row: Open/Closed badge + Contact info button */}
        <div className="flex flex-wrap items-center gap-2 mt-3">
          {/* Temporary Closure Banner - compact */}
          {restaurant.temporaryClosure && (() => {
            try {
              const closure = typeof restaurant.temporaryClosure === 'string' ? JSON.parse(restaurant.temporaryClosure) : restaurant.temporaryClosure;
              if (!closure.active) return null;
              return (
                <div className="w-full p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <span className="text-xs font-bold text-amber-400">المطعم مغلق مؤقتاً</span>
                  {closure.message && <span className="text-xs opacity-70 mr-1" style={{ color: tc }}>- {closure.message}</span>}
                </div>
              );
            } catch { return null; }
          })()}

          {/* Open/Closed Badge - clickable to expand hours */}
          {openStatus && (
            <button
              onClick={() => setShowHours(!showHours)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all hover:scale-105"
              style={{ background: openStatus.isOpenNow ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)', border: `1px solid ${openStatus.isOpenNow ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}` }}
            >
              <Clock className="w-3.5 h-3.5" style={{ color: openStatus.isOpenNow ? '#22c55e' : '#ef4444' }} />
              <span style={{ color: openStatus.isOpenNow ? '#22c55e' : '#ef4444' }}>
                {openStatus.isOpenNow ? 'مفتوح الآن' : 'مغلق الآن'}
              </span>
              <ChevronDown className={`w-3 h-3 transition-transform ${showHours ? 'rotate-180' : ''}`} style={{ color: tc, opacity: 0.5 }} />
            </button>
          )}

          {/* Contact Info Button */}
          {hasContactInfo && (
            <button
              onClick={() => setShowContact(!showContact)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all hover:scale-105"
              style={{ background: `${accentColor}15`, border: `1px solid ${accentColor}25` }}
            >
              <Info className="w-3.5 h-3.5" style={{ color: accentColor }} />
              <span style={{ color: tc, opacity: 0.8 }}>معلومات التواصل</span>
              <ChevronDown className={`w-3 h-3 transition-transform ${showContact ? 'rotate-180' : ''}`} style={{ color: tc, opacity: 0.5 }} />
            </button>
          )}
        </div>

        {/* Expandable: Working Hours */}
        <AnimatePresence>
          {showHours && openStatus && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="mt-3 p-3 rounded-xl" style={{ background: `${accentColor}10`, border: `1px solid ${accentColor}20` }}>
                <div className="grid grid-cols-1 gap-1">
                  {(() => {
                    const dayNamesAr: Record<string, string> = { sunday: 'الأحد', monday: 'الاثنين', tuesday: 'الثلاثاء', wednesday: 'الأربعاء', thursday: 'الخميس', friday: 'الجمعة', saturday: 'السبت' };
                    return openStatus.days.map(day => {
                      const h = openStatus.hours[day];
                      const isToday = day === openStatus.currentDay;
                      return (
                        <div key={day} className={`flex items-center justify-between text-xs py-1 px-2 rounded ${isToday ? 'bg-white/10' : ''}`} style={{ color: tc }}>
                          <span className={isToday ? 'font-semibold' : 'opacity-60'}>{dayNamesAr[day]}</span>
                          {h?.closed ? (
                            <span className="opacity-40">مغلق</span>
                          ) : (
                            <span className={isToday ? 'font-medium' : 'opacity-70'} dir="ltr">{h?.open} - {h?.close}</span>
                          )}
                        </div>
                      );
                    });
                  })()}
                </div>
                {/* Upcoming Holidays inside hours section */}
                {restaurant.holidays && restaurant.holidays.length > 0 && (() => {
                  const today = new Date().toISOString().split('T')[0];
                  const upcoming = restaurant.holidays.filter((h: any) => h.date >= today).slice(0, 3);
                  if (upcoming.length === 0) return null;
                  return (
                    <div className="mt-2 pt-2 border-t" style={{ borderColor: `${accentColor}20` }}>
                      <div className="flex items-center gap-1.5 mb-1">
                        <Calendar className="w-3 h-3" style={{ color: accentColor }} />
                        <span className="text-[10px] font-semibold opacity-70" style={{ color: tc }}>عطلات قادمة</span>
                      </div>
                      {upcoming.map((h: any) => (
                        <div key={h.id} className="flex items-center justify-between text-xs py-0.5 px-2" style={{ color: tc }}>
                          <span className="opacity-70">{h.titleAr}</span>
                          <div className="flex items-center gap-2">
                            <span className="opacity-50 text-[10px]">{h.date}</span>
                            {h.isFullDayClosed ? (
                              <span className="text-amber-400 text-[10px] font-medium">مغلق</span>
                            ) : (
                              <span className="opacity-60 text-[10px]" dir="ltr">{h.openTime} - {h.closeTime}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Expandable: Contact Info */}
        <AnimatePresence>
          {showContact && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="mt-3 p-3 rounded-xl" style={{ background: `${accentColor}10`, border: `1px solid ${accentColor}20` }}>
                {/* Phone & Address */}
                <div className="space-y-2">
                  {restaurant.phone && (
                    <a href={`tel:${restaurant.phone}`} className="flex items-center gap-2 text-sm opacity-80 hover:opacity-100 transition-opacity" style={{ color: tc }}>
                      <Phone className="w-4 h-4" style={{ color: accentColor }} />
                      <span dir="ltr">{restaurant.phone}</span>
                    </a>
                  )}
                  {restaurant.address && (
                    <div className="flex items-center gap-2 text-sm opacity-80" style={{ color: tc }}>
                      <MapPin className="w-4 h-4" style={{ color: accentColor }} />
                      <span>{restaurant.address}</span>
                    </div>
                  )}
                </div>
                {/* Social Media Icons */}
                {(restaurant.whatsapp || restaurant.instagram || restaurant.snapchat || restaurant.xTwitter || restaurant.locationUrl) && (
                  <div className="flex flex-wrap gap-2.5 mt-3 pt-2 border-t" style={{ borderColor: `${accentColor}20` }}>
                    {restaurant.whatsapp && (
                      <a href={`https://wa.me/${restaurant.whatsapp}`} target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full flex items-center justify-center transition-transform hover:scale-110" style={{ background: '#25D366' }} title="WhatsApp">
                        <MessageCircle className="w-5 h-5 text-white" />
                      </a>
                    )}
                    {restaurant.instagram && (
                      <a href={`https://instagram.com/${restaurant.instagram}`} target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full flex items-center justify-center transition-transform hover:scale-110" style={{ background: 'linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)' }} title="Instagram">
                        <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                      </a>
                    )}
                    {restaurant.snapchat && (
                      <a href={`https://snapchat.com/add/${restaurant.snapchat}`} target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full flex items-center justify-center transition-transform hover:scale-110" style={{ background: '#FFFC00' }} title="Snapchat">
                        <svg className="w-5 h-5 text-black" fill="currentColor" viewBox="0 0 24 24"><path d="M12.206.793c.99 0 4.347.276 5.93 3.821.529 1.193.403 3.219.299 4.847l-.003.06c-.012.18-.022.345-.03.51.075.045.203.09.401.09.3-.016.659-.12.922-.214.04-.012.06-.012.08-.012.16 0 .3.075.36.18.08.12.08.27.019.39-.12.21-.481.39-.764.45l-.009.003c-.09.03-.18.06-.27.09-.21.06-.45.12-.57.18-.12.06-.18.15-.18.27 0 .03.003.06.009.09.45 1.62 1.86 2.79 3.15 3.06.12.03.18.12.18.21 0 .12-.12.24-.36.3-.48.12-1.02.18-1.38.27-.12.03-.18.09-.18.18 0 .03.003.06.009.09.06.18.12.36.12.54 0 .12-.06.24-.18.3-.12.06-.27.09-.42.09-.18 0-.36-.03-.54-.09-.27-.09-.57-.15-.84-.15-.09 0-.18.003-.27.009-.6.06-1.2.48-2.1.96-.84.45-1.77.96-3.21.96h-.03c-1.44 0-2.37-.51-3.21-.96-.9-.48-1.5-.9-2.1-.96-.09-.006-.18-.009-.27-.009-.27 0-.57.06-.84.15-.18.06-.36.09-.54.09-.15 0-.3-.03-.42-.09-.12-.06-.18-.18-.18-.3 0-.18.06-.36.12-.54.006-.03.009-.06.009-.09 0-.09-.06-.15-.18-.18-.36-.09-.9-.15-1.38-.27-.24-.06-.36-.18-.36-.3 0-.09.06-.18.18-.21 1.29-.27 2.7-1.44 3.15-3.06.006-.03.009-.06.009-.09 0-.12-.06-.21-.18-.27-.12-.06-.36-.12-.57-.18-.09-.03-.18-.06-.27-.09l-.009-.003c-.283-.06-.644-.24-.764-.45-.061-.12-.061-.27.019-.39.06-.105.2-.18.36-.18.02 0 .04 0 .08.012.263.094.622.198.922.214.198 0 .326-.045.401-.09-.008-.165-.018-.33-.03-.51l-.003-.06c-.104-1.628-.23-3.654.299-4.847C7.653 1.069 11.016.793 12.006.793h.2z"/></svg>
                      </a>
                    )}
                    {restaurant.xTwitter && (
                      <a href={`https://x.com/${restaurant.xTwitter}`} target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full flex items-center justify-center transition-transform hover:scale-110" style={{ background: '#000000' }} title="X">
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                      </a>
                    )}
                    {restaurant.locationUrl && (
                      <a href={restaurant.locationUrl} target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full flex items-center justify-center transition-transform hover:scale-110" style={{ background: '#4285F4' }} title="Location">
                        <MapPin className="w-5 h-5 text-white" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
