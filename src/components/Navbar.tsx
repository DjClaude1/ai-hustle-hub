import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogOut, User, LayoutDashboard } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export const Navbar = () => {
  const location = useLocation();
  const isLanding = location.pathname === "/";
  const { user, signOut } = useAuth();

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
          {user ? (
            <>
              <Link to="/dashboard">
                <Button variant="ghost" size="sm">Dashboard</Button>
              </Link>
              <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary px-3 py-1.5 text-sm">
                <User className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="hidden sm:inline max-w-[120px] truncate text-muted-foreground">
                  {user.email}
                </span>
              </div>
              <Button variant="ghost" size="icon" onClick={signOut} className="h-9 w-9">
                <LogOut className="h-4 w-4 text-muted-foreground" />
              </Button>
            </>
          ) : isLanding ? (
            <>
              <Link to="/auth">
                <Button variant="ghost" size="sm">Sign In</Button>
              </Link>
              <Link to="/auth">
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
