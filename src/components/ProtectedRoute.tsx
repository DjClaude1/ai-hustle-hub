import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>;
  if (!user) return <Navigate to={`/auth?redirect=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  return <>{children}</>;
};
