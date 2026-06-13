import { useAuth } from "@/_core/hooks/useAuth";
import { useEffect, useRef, useState } from "react";
import { spaNavigate } from "@/const";
import { DASHBOARD_NOTIFICATION_POLL_MS, useDevQueryRuntimeLog } from "@/lib/queryRuntime";
import { playOwnerNotificationSound } from "@/lib/notificationSound";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import { ShoppingCart, Volume2, VolumeX, X, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface OrderAlert {
  id: number;
  message: string;
  timestamp: number;
}

/**
 * OrderAlertSystem - Polls for new unread 'new_order' notifications
 * and shows a custom popup + plays a sound when a new order arrives.
 */
export default function OrderAlertSystem() {
  const { isAuthenticated, authPending } = useAuth();
  const { language } = useLanguage();
  const notifyEnabled = !authPending && isAuthenticated;

  useDevQueryRuntimeLog("notification.getUnread", {
    enabled: notifyEnabled,
    authPending,
    isAuthenticated,
    pollMs: DASHBOARD_NOTIFICATION_POLL_MS,
  });
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [alerts, setAlerts] = useState<OrderAlert[]>([]);
  const lastSeenIdRef = useRef<number>(0);
  const initialLoadDoneRef = useRef(false);
  const soundEnabledRef = useRef(soundEnabled);

  // Keep ref in sync with state
  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  const { data: unreadNotifications } = trpc.notification.getUnread.useQuery(undefined, {
    enabled: notifyEnabled,
    refetchInterval: notifyEnabled ? DASHBOARD_NOTIFICATION_POLL_MS : false,
  });

  // Process notifications when data changes
  useEffect(() => {
    if (!unreadNotifications || !Array.isArray(unreadNotifications)) return;

    // Filter only new_order notifications
    const orderNotifs = unreadNotifications.filter((n: any) => n.notificationType === "new_order");
    
    if (orderNotifs.length === 0) return;

    // Find the highest ID
    const maxId = Math.max(...orderNotifs.map((n: any) => n.id));

    // On initial load, just record the current state
    if (!initialLoadDoneRef.current) {
      lastSeenIdRef.current = maxId;
      initialLoadDoneRef.current = true;
      return;
    }

    // Check for new notifications since last check
    const newOrders = orderNotifs.filter((n: any) => n.id > lastSeenIdRef.current);
    
    if (newOrders.length > 0) {
      // Play sound
      if (soundEnabledRef.current) {
        playOwnerNotificationSound();
      }

      // Show custom popup alerts
      const newAlerts: OrderAlert[] = newOrders.map((order: any) => ({
        id: order.id,
        message: order.message || (language === "ar" ? "وصل طلب جديد" : "A new order has arrived"),
        timestamp: Date.now(),
      }));

      setAlerts(prev => [...prev, ...newAlerts].slice(-5)); // Keep max 5 alerts

      // Also try browser notification
      if ("Notification" in window && Notification.permission === "granted") {
        newOrders.forEach((order: any) => {
          new Notification(
            language === "ar" ? "🍽️ طلب جديد!" : "🍽️ New Order!",
            {
              body: order.message || (language === "ar" ? "وصل طلب جديد" : "A new order has arrived"),
              tag: `order-${order.id}`,
            }
          );
        });
      }

      // Update last seen ID
      lastSeenIdRef.current = maxId;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unreadNotifications]);

  // Auto-dismiss alerts after 20 seconds
  useEffect(() => {
    if (alerts.length === 0) return;
    const timer = setTimeout(() => {
      setAlerts(prev => {
        if (prev.length === 0) return prev;
        return prev.slice(1); // Remove oldest
      });
    }, 20000);
    return () => clearTimeout(timer);
  }, [alerts]);

  // Request browser notification permission on mount
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  const dismissAlert = (id: number) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  };

  return (
    <>
      {/* Sound toggle button (floating, bottom-left) */}
      <div className="fixed bottom-4 left-4 z-50">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setSoundEnabled(!soundEnabled)}
          className={`rounded-full w-10 h-10 shadow-lg border-border/50 backdrop-blur-sm ${
            soundEnabled 
              ? "bg-background/80 text-green-500 hover:text-green-400" 
              : "bg-background/80 text-muted-foreground hover:text-foreground"
          }`}
          title={soundEnabled 
            ? (language === "ar" ? "إيقاف صوت التنبيهات" : "Mute notifications") 
            : (language === "ar" ? "تشغيل صوت التنبيهات" : "Unmute notifications")
          }
        >
          {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </Button>
      </div>

      {/* Custom alert popups */}
      {alerts.length > 0 && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-3 w-full max-w-md px-4">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className="animate-in slide-in-from-top-2 fade-in duration-300 bg-gradient-to-r from-orange-500/10 to-amber-500/10 border border-orange-500/30 rounded-xl p-4 shadow-2xl backdrop-blur-md"
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center">
                  <ShoppingCart className="w-5 h-5 text-orange-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-foreground text-sm">
                    {language === "ar" ? "🍽️ طلب جديد!" : "🍽️ New Order!"}
                  </p>
                  <p className="text-muted-foreground text-xs mt-1 line-clamp-2">
                    {alert.message}
                  </p>
                  <button
                    onClick={() => {
                      spaNavigate("/dashboard?section=orders");
                    }}
                    className="mt-2 inline-flex items-center gap-1 text-xs text-orange-400 hover:text-orange-300 font-medium transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                    {language === "ar" ? "عرض الطلبات" : "View Orders"}
                  </button>
                </div>
                <button
                  onClick={() => dismissAlert(alert.id)}
                  className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
