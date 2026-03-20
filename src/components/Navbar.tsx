import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Zap } from "lucide-react";

export const Navbar = () => {
  const location = useLocation();
  const isLanding = location.pathname === "/";

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-display text-xl font-bold">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Zap className="h-4 w-4 text-primary-foreground" />
          </div>
          AI Hustle Studio
        </Link>

        <div className="flex items-center gap-3">
          {isLanding ? (
            <>
              <Link to="/dashboard">
                <Button variant="ghost" size="sm">Dashboard</Button>
              </Link>
              <Link to="/dashboard">
                <Button variant="hero" size="sm">Start Free</Button>
              </Link>
            </>
          ) : (
            <Link to="/">
              <Button variant="ghost" size="sm">Home</Button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
};
