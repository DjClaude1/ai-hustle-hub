import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogOut, User, LayoutDashboard, History, Moon, Sun, Zap } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/hooks/useTheme";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isLanding = location.pathname === "/";
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [usage, setUsage] = useState<{ used: number; limit: number } | null>(null);

  useEffect(() => {
    if (!user) { setUsage(null); return; }
    const load = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("generations_today, last_generation_date, subscription_tier, is_premium")
        .eq("id", user.id)
        .single();
      if (!data) return;
      const limit = data.subscription_tier === "business" || data.is_premium ? 999999 : data.subscription_tier === "pro" ? 50 : 5;
      const today = new Date().toISOString().split("T")[0];
      const used = data.last_generation_date === today ? data.generations_today : 0;
      setUsage({ used, limit });
    };
    load();
  }, [user, location.pathname]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-card/80 backdrop-blur-xl">
      <div className="container flex h-14 items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 font-display text-lg font-bold tracking-tight">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary shadow-soft">
            <LayoutDashboard className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-foreground">AI Hustle Studio</span>
        </Link>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-9 w-9">
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          {user ? (
            <>
              {usage && usage.limit < 999999 && (
                <div className="hidden sm:flex items-center gap-1.5 rounded-lg border border-border bg-secondary px-2.5 py-1.5 text-xs font-medium text-muted-foreground">
                  <Zap className="h-3 w-3 text-primary" />
                  {usage.used}/{usage.limit}
                </div>
              )}
              <Link to="/dashboard">
                <Button variant="ghost" size="sm">Dashboard</Button>
              </Link>
              <Link to="/history">
                <Button variant="ghost" size="sm" className="gap-1.5">
                  <History className="h-3.5 w-3.5" /> History
                </Button>
              </Link>
              <div className="hidden sm:flex items-center gap-2 rounded-lg border border-border bg-secondary px-3 py-1.5 text-sm">
                <User className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="max-w-[120px] truncate text-muted-foreground">{user.email}</span>
              </div>
              <Button variant="ghost" size="icon" onClick={handleSignOut} className="h-9 w-9">
                <LogOut className="h-4 w-4 text-muted-foreground" />
              </Button>
            </>
          ) : isLanding ? (
            <>
              <Link to="/auth">
                <Button variant="ghost" size="sm">Sign In</Button>
              </Link>
              <Link to="/auth?mode=signup">
                <Button variant="hero" size="sm">Get Started</Button>
              </Link>
            </>
          ) : (
            <>
              <Link to="/">
                <Button variant="ghost" size="sm">Home</Button>
              </Link>
              <Link to="/auth">
                <Button variant="hero" size="sm">Sign In</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};
