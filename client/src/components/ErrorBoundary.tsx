import { cn } from "@/lib/utils";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

// Since class components can't use hooks, we detect language from localStorage
function getStoredLanguage(): "ar" | "en" {
  try {
    return (localStorage.getItem("language") as "ar" | "en") || "ar";
  } catch {
    return "ar";
  }
}

const translations = {
  ar: {
    errorOccurred: "حدث خطأ",
    errorDescription: "عذراً، حدثت مشكلة أثناء تحميل التطبيق",
    reload: "إعادة تحميل",
    homePage: "الصفحة الرئيسية",
  },
  en: {
    errorOccurred: "An Error Occurred",
    errorDescription: "Sorry, a problem occurred while loading the application",
    reload: "Reload",
    homePage: "Home Page",
  },
};

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      const lang = getStoredLanguage();
      const t = translations[lang];
      const dir = lang === "ar" ? "rtl" : "ltr";

      return (
        <div className="flex items-center justify-center min-h-screen p-4 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" dir={dir}>
          <div className="flex flex-col items-center w-full max-w-sm bg-slate-800 border border-slate-700 rounded-lg shadow-2xl p-6 sm:p-8">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-6">
              <AlertTriangle size={32} className="text-red-400" />
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-white mb-2 text-center">{t.errorOccurred}</h2>
            <p className="text-slate-400 text-sm text-center mb-6">{t.errorDescription}</p>

            {this.state.error && (
              <div className="p-3 w-full rounded bg-red-500/10 border border-red-500/30 mb-6 overflow-auto max-h-32">
                <pre className="text-xs text-red-400 whitespace-pre-wrap break-words font-mono">
                  {this.state.error.message}
                </pre>
              </div>
            )}

            <div className="w-full space-y-3">
              <button
                onClick={() => window.location.reload()}
                className={cn(
                  "w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg",
                  "bg-cyan-500 hover:bg-cyan-600 text-white font-semibold transition"
                )}
              >
                <RotateCcw size={16} />
                {t.reload}
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className={cn(
                  "w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg",
                  "border border-slate-600 text-slate-300 hover:bg-slate-700 transition"
                )}
              >
                <Home size={16} />
                {t.homePage}
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
