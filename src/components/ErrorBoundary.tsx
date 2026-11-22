import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  failed: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("Unhandled error in the app", error, info.componentStack);
  }

  render() {
    if (this.state.failed) {
      return (
        <main role="alert" style={{ maxWidth: 480, margin: "4rem auto", padding: "0 1rem" }}>
          <h1>Something went wrong</h1>
          <p>
            Your boards are stored in this browser, and this error doesn't delete them. Reloading
            usually fixes it.
          </p>
          <button type="button" onClick={() => window.location.reload()}>
            Reload the page
          </button>
        </main>
      );
    }
    return this.props.children;
  }
}