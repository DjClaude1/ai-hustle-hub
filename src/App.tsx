import { lazy, Suspense, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/Navbar";
import { Sidebar } from "@/components/Sidebar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const ToolPage = lazy(() => import("./pages/ToolPage"));
const ImageGeneratorPage = lazy(() => import("./pages/ImageGeneratorPage"));
const HistoryPage = lazy(() => import("./pages/HistoryPage"));
const Blueprint = lazy(() => import("./pages/Blueprint"));
const FacelessVideoPage = lazy(() => import("./pages/FacelessVideoPage"));
const Growth = lazy(() => import("./pages/Growth"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 2, refetchOnWindowFocus: false } } });
const Chrome = () => { const { user } = useAuth(); const location = useLocation(); const publicPaths=["/","/auth","/reset-password"]; return user && !publicPaths.includes(location.pathname) ? <Sidebar /> : null; };
const Protected = ({ children }: { children: ReactNode }) => <ProtectedRoute>{children}</ProtectedRoute>;
const Loading = () => <div className="min-h-[60vh] flex items-center justify-center text-sm text-muted-foreground">Loading…</div>;

const App = () => (
  <ErrorBoundary><QueryClientProvider client={queryClient}><TooltipProvider><Toaster /><Sonner /><BrowserRouter><AuthProvider><Navbar /><Chrome />
    <Suspense fallback={<Loading />}><Routes>
      <Route path="/" element={<Index />} /><Route path="/auth" element={<Auth />} /><Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
      <Route path="/growth" element={<Protected><Growth /></Protected>} />
      <Route path="/blueprint" element={<Protected><Blueprint /></Protected>} />
      <Route path="/tool/ai-image-generator" element={<Protected><ImageGeneratorPage /></Protected>} />
      <Route path="/tool/faceless-video-studio" element={<Protected><FacelessVideoPage /></Protected>} />
      <Route path="/tool/:toolId" element={<Protected><ToolPage /></Protected>} />
      <Route path="/history" element={<Protected><HistoryPage /></Protected>} />
      <Route path="*" element={<NotFound />} />
    </Routes></Suspense>
  </AuthProvider></BrowserRouter></TooltipProvider></QueryClientProvider></ErrorBoundary>
);
export default App;
