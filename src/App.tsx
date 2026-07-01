import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/Navbar";
import { Sidebar } from "@/components/Sidebar";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import ToolPage from "./pages/ToolPage";
import ImageGeneratorPage from "./pages/ImageGeneratorPage";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import HistoryPage from "./pages/HistoryPage";
import Blueprint from "./pages/Blueprint";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const Chrome = () => {
  const { user } = useAuth();
  const location = useLocation();
  const publicPaths = ["/", "/auth", "/reset-password"];
  const showSidebar = user && !publicPaths.includes(location.pathname);
  return showSidebar ? <Sidebar /> : null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Navbar />
          <Chrome />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/blueprint" element={<Blueprint />} />
            <Route path="/tool/ai-image-generator" element={<ImageGeneratorPage />} />
            <Route path="/tool/:toolId" element={<ToolPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
