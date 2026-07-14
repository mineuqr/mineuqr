import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, info: ErrorInfo) => void;
};

type State = { error: Error | null };

/**
 * ORDERING-CLIENT-RUNTIME-1 — shared ordering experience error boundary.
 * Presentation only; no business recovery.
 */
export class OrderingClientErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    this.props.onError?.(error, info);
  }

  render() {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex min-h-[40vh] items-center justify-center p-6 text-center text-sm text-muted-foreground">
          Something went wrong loading the ordering experience.
        </div>
      );
    }
    return this.props.children;
  }
}
