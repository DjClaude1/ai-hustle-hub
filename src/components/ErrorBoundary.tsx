import { Component, type ErrorInfo, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props { children: ReactNode }
interface State { hasError: boolean; message?: string }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };
  static getDerivedStateFromError(error: Error): State { return { hasError: true, message: error.message }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error("AI Hustle Hub UI error", error, info); }
  reset = () => this.setState({ hasError: false, message: undefined });
  render() {
    if (!this.state.hasError) return this.props.children;
    return <div className="min-h-screen flex items-center justify-center bg-background px-6"><div className="max-w-md text-center space-y-4">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive"><AlertTriangle className="h-7 w-7" /></div>
      <h1 className="font-display text-2xl font-bold text-foreground">Something went wrong</h1>
      <p className="text-sm text-muted-foreground">Your work is kept locally where possible. Try again or return to the dashboard.</p>
      {this.state.message && <p className="text-xs text-muted-foreground/70 break-words">{this.state.message}</p>}
      <div className="flex justify-center gap-2"><Button onClick={this.reset}><RefreshCw className="h-4 w-4" /> Try again</Button><Link to="/dashboard"><Button variant="outline">Dashboard</Button></Link></div>
    </div></div>;
  }
}
