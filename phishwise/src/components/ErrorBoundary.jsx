import { Component } from "react";
import { Icon, Button } from "./ui.jsx";

/**
 * Catches render errors in its subtree so a single broken page shows a
 * recoverable message instead of blanking the entire app. Reset key lets
 * the boundary clear its error state on navigation.
 */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Surface the real error in the console for debugging.
    console.error("Caught by ErrorBoundary:", error, info);
  }

  componentDidUpdate(prevProps) {
    // Clear the error when the route changes so navigation recovers.
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-[60vh] items-center justify-center p-6">
          <div className="max-w-md text-center">
            <div className="mx-auto mb-4 inline-flex rounded-2xl bg-rose-500/10 p-4">
              <Icon name="AlertTriangle" className="w-8 h-8 text-rose-500" />
            </div>
            <h2 className="font-display text-lg font-bold text-ink-900 dark:text-white">
              Something went wrong on this page
            </h2>
            <p className="mt-2 text-sm text-ink-500 dark:text-ink-400">
              This view hit an unexpected error. You can try again, or head back to your dashboard.
            </p>
            {this.state.error?.message && (
              <pre className="mt-4 overflow-x-auto rounded-lg bg-ink-100 p-3 text-left text-xs text-ink-600 dark:bg-ink-800 dark:text-ink-300">
                {String(this.state.error.message)}
              </pre>
            )}
            <div className="mt-5 flex justify-center gap-2">
              <Button onClick={() => this.setState({ error: null })} variant="secondary">
                <Icon name="RotateCcw" size={16} /> Try again
              </Button>
              <Button onClick={() => { window.location.href = "/dashboard"; }}>
                <Icon name="LayoutDashboard" size={16} /> Go to dashboard
              </Button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
