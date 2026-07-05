import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode; onReset?: () => void };
type State = { hasError: boolean; message: string | null };

/** Isolated error boundary — never redirects to dashboard login. */
export class ScreenErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[OperationalScreen]", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#0b0e14] p-8 text-center text-white">
          <h1 className="text-2xl font-semibold">Screen runtime error</h1>
          <p className="max-w-md text-sm text-white/70">{this.state.message}</p>
          <button
            type="button"
            className="rounded-lg bg-white/10 px-4 py-2 text-sm hover:bg-white/20"
            onClick={() => {
              this.setState({ hasError: false, message: null });
              this.props.onReset?.();
              window.location.reload();
            }}
          >
            Reload screen
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
