import { Button } from "@/components/ui/button";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import logo from "@/assets/logo.png";
import { LogOut, Crown, Settings, Menu } from "lucide-react";
import { NotificationBell } from "@/components/NotificationBell";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Dashboard", path: "/dashboard" },
  { label: "Team", path: "/team" },
  { label: "Check-ins", path: "/check-ins" },
  { label: "Analysis", path: "/analysis" },
  { label: "Analytics", path: "/analytics" },
  { label: "Metrics", path: "/metrics" },
  { label: "Permissions", path: "/permissions" },
];

export const Header = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth', { state: { signedOut: true } });
  };

  const isActive = (path: string) => location.pathname === path;

  const NavLinks = ({ mobile = false }: { mobile?: boolean }) => (
    <>
      {navItems.map((item) => (
        <Button
          key={item.path}
          variant="ghost"
          asChild
          className={cn(
            mobile && "w-full justify-start",
            isActive(item.path) && "bg-accent text-accent-foreground"
          )}
          onClick={() => mobile && setOpen(false)}
        >
          <Link to={item.path}>{item.label}</Link>
        </Button>
      ))}
      <Button
        variant="ghost"
        asChild
        className={cn(
          mobile && "w-full justify-start",
          isActive("/subscription") && "bg-accent text-accent-foreground"
        )}
        onClick={() => mobile && setOpen(false)}
      >
        <Link to="/subscription">
          <Crown className="h-4 w-4 mr-2" />
          Plans
        </Link>
      </Button>
    </>
  );

  return (
    <header className="border-b border-border bg-card sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/dashboard" className="flex items-center space-x-2 sm:space-x-3">
          <img src={logo} alt="ResultsBoard" className="h-7 w-7 sm:h-8 sm:w-8" />
          <h1 className="text-lg sm:text-xl font-bold">ResultsBoard</h1>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center space-x-2">
          <NavLinks />
          {user && (
            <>
              <NotificationBell />
              <Button variant="ghost" size="icon" asChild>
                <Link to="/settings">
                  <Settings className="h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </>
          )}
        </nav>

        {/* Mobile Navigation */}
        <div className="flex lg:hidden items-center space-x-2">
          {user && <NotificationBell />}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] sm:w-[320px]">
              <nav className="flex flex-col space-y-2 mt-8">
                <NavLinks mobile />
                {user && (
                  <>
                    <Button
                      variant="ghost"
                      asChild
                      className={cn(
                        "w-full justify-start",
                        isActive("/settings") && "bg-accent text-accent-foreground"
                      )}
                      onClick={() => setOpen(false)}
                    >
                      <Link to="/settings">
                        <Settings className="h-4 w-4 mr-2" />
                        Settings
                      </Link>
                    </Button>
                    <div className="pt-4 border-t border-border">
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => {
                          handleSignOut();
                          setOpen(false);
                        }}
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        Sign Out
                      </Button>
                    </div>
                  </>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};