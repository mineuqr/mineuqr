import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, MessageCircle, HelpCircle, CreditCard, Sparkles } from "lucide-react";

const WHATSAPP_NUMBER = "963983933413";

const quickMessages = [
  {
    icon: Sparkles,
    label: "أريد إنشاء منيو رقمي لمطعمي",
    message: "مرحباً 👋\nأنا مهتم بإنشاء منيو رقمي لمطعمي عبر منصة mineuqr.\nهل يمكنكم مساعدتي في البدء؟",
    color: "bg-primary/10 text-primary hover:bg-primary/20",
  },
  {
    icon: CreditCard,
    label: "استفسار عن الخطط والأسعار",
    message: "مرحباً 👋\nأريد الاستفسار عن خطط الاشتراك والأسعار المتاحة في منصة mineuqr.\nشكراً لكم!",
    color: "bg-accent/10 text-accent hover:bg-accent/20",
  },
  {
    icon: HelpCircle,
    label: "أحتاج دعم فني",
    message: "مرحباً 👋\nأحتاج مساعدة فنية بخصوص حسابي على منصة mineuqr.\nهل يمكنكم مساعدتي؟",
    color: "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20",
  },
  {
    icon: MessageCircle,
    label: "رسالة أخرى",
    message: "مرحباً 👋\nأتواصل معكم من منصة mineuqr.",
    color: "bg-blue-500/10 text-blue-400 hover:bg-blue-500/20",
  },
];

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

export default function WhatsAppFloat() {
  const [isOpen, setIsOpen] = useState(false);
  const [showBubble, setShowBubble] = useState(false);

  // Show welcome bubble after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isOpen) setShowBubble(true);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  // Hide bubble when panel opens
  useEffect(() => {
    if (isOpen) setShowBubble(false);
  }, [isOpen]);

  const openWhatsApp = (message: string) => {
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
    setIsOpen(false);
  };

  return (
    <div className="fixed bottom-6 left-6 z-50 flex flex-col items-start gap-3">
      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="w-[320px] rounded-2xl overflow-hidden shadow-2xl shadow-black/30 border border-border/30"
          >
            {/* Header */}
            <div className="bg-[#075E54] p-4 flex items-center justify-between">
              <button
                onClick={() => setIsOpen(false)}
                className="text-white/70 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <h3 className="text-white font-bold text-sm">mineuqr</h3>
                  <p className="text-green-200 text-xs">متصل الآن</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <WhatsAppIcon className="w-5 h-5 text-white" />
                </div>
              </div>
            </div>

            {/* Chat Body */}
            <div className="bg-[#0b1a1e] p-4 space-y-3">
              {/* Welcome Message Bubble */}
              <div className="flex justify-end">
                <div className="bg-[#1a2e35] rounded-2xl rounded-tr-sm p-3 max-w-[85%] border border-border/20">
                  <p className="text-white text-sm font-semibold mb-1">أهلاً وسهلاً! 👋</p>
                  <p className="text-gray-300 text-xs leading-relaxed">
                    فريق mineuqr جاهز لمساعدتك. اختر أحد الخيارات أدناه أو اكتب رسالتك مباشرة.
                  </p>
                  <p className="text-gray-400 text-[10px] mt-2 text-left">
                    {new Date().toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>

              {/* Quick Action Buttons */}
              <div className="space-y-2 pt-1">
                {quickMessages.map((item, index) => (
                  <motion.button
                    key={index}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + index * 0.08 }}
                    onClick={() => openWhatsApp(item.message)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl text-right text-sm font-medium transition-all duration-200 ${item.color}`}
                  >
                    <span className="flex-1">{item.label}</span>
                    <item.icon className="w-4 h-4 shrink-0" />
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="bg-[#0b1a1e] border-t border-border/20 px-4 py-3">
              <p className="text-gray-500 text-[11px] text-center">
                مدعوم بواسطة WhatsApp Business
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Welcome Bubble */}
      <AnimatePresence>
        {showBubble && !isOpen && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="relative bg-white rounded-xl shadow-lg p-3 max-w-[220px] cursor-pointer"
            onClick={() => { setShowBubble(false); setIsOpen(true); }}
          >
            <button
              onClick={(e) => { e.stopPropagation(); setShowBubble(false); }}
              className="absolute top-1 left-1 text-gray-300 hover:text-gray-500 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
            <p className="text-gray-800 text-sm font-semibold text-right">
              👋 مرحباً! كيف نقدر نساعدك؟
            </p>
            <p className="text-gray-500 text-xs text-right mt-1">
              اضغط هنا للتواصل معنا
            </p>
            <div className="absolute -bottom-2 right-6 w-4 h-4 bg-white rotate-45 shadow-sm" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        className="relative w-14 h-14 rounded-full bg-[#25D366] hover:bg-[#20BD5A] text-white shadow-lg shadow-[#25D366]/30 flex items-center justify-center transition-colors"
        aria-label="تواصل معنا عبر واتساب"
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <X className="w-6 h-6" />
            </motion.div>
          ) : (
            <motion.div
              key="whatsapp"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <WhatsAppIcon className="w-7 h-7" />
            </motion.div>
          )}
        </AnimatePresence>
        {/* Pulse animation - only when closed */}
        {!isOpen && (
          <span className="absolute inset-0 rounded-full bg-[#25D366] animate-ping opacity-20" />
        )}
      </motion.button>
    </div>
  );
}
