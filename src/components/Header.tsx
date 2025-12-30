import { Button } from "@/components/ui/button";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import logo from "@/assets/logo.png";
import { LogOut, Crown, Settings, Menu } from "lucide-react";
import { NotificationBell } from "@/components/NotificationBell";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";
import { cn } from "@/lib/utils";

// CEO-only navigation items
const ceoNavItems = [
  { label: "Dashboard", path: "/dashboard" },
  { label: "Team", path: "/team" },
  { label: "Check-ins", path: "/check-ins" },
  { label: "Analysis", path: "/analysis" },
  { label: "Analytics", path: "/analytics" },
  { label: "Metrics", path: "/metrics" },
  { label: "Permissions", path: "/permissions" },
  { label: "Subscribers", path: "/subscribers" },
];

// Team member navigation items - only Reports
const teamMemberNavItems = [
  { label: "Reports", path: "/reports" },
];

// HR/EA navigation items (can manage team)
const managerNavItems = [
  { label: "Dashboard", path: "/dashboard" },
  { label: "Team", path: "/team" },
  { label: "Check-ins", path: "/check-ins" },
  { label: "Metrics", path: "/metrics" },
  { label: "Analytics", path: "/analytics" },
];

export const Header = () => {
  const { user, signOut } = useAuth();
  const { role, canManageTeam, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth', { state: { signedOut: true } });
  };

  const isActive = (path: string) => location.pathname === path;

  // Determine which nav items to show based on role
  const getNavItems = () => {
    if (role === "ceo") {
      return ceoNavItems;
    }
    if (role === "hr" || role === "executive_assistant" || canManageTeam) {
      return managerNavItems;
    }
    return teamMemberNavItems;
  };

  const navItems = getNavItems();
  const showPlans = role === "ceo";

  return (
    <header className="border-b border-border bg-card sticky top-0 z-50">
      {/* Top row: Branding and actions */}
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/dashboard" className="flex items-center space-x-2 sm:space-x-3">
          <img src={logo} alt="WorkChief" className="h-7 w-7 sm:h-8 sm:w-8" />
          <h1 className="text-lg sm:text-xl font-bold">WorkChief</h1>
        </Link>

        <div className="flex items-center space-x-2">
          {user && (
            <>
              <NotificationBell />
              <Button variant="ghost" size="icon" asChild>
                <Link to="/settings">
                  <Settings className="h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" size="sm" onClick={handleSignOut} className="hidden sm:flex">
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
              {/* Mobile menu for sign out */}
              <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild className="sm:hidden">
                  <Button variant="ghost" size="icon">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[280px]">
                  <nav className="flex flex-col space-y-2 mt-8">
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
                  </nav>
                </SheetContent>
              </Sheet>
            </>
          )}
        </div>
      </div>

      {/* Navigation row: Role-based nav items */}
      <div className="container mx-auto px-4 pb-3">
        <nav className="flex flex-wrap items-center gap-1 sm:gap-2">
          {navItems.map((item) => (
            <Button
              key={item.path}
              variant="ghost"
              size="sm"
              asChild
              className={cn(
                "text-xs sm:text-sm px-2 sm:px-3",
                isActive(item.path) && "bg-accent text-accent-foreground"
              )}
            >
              <Link to={item.path}>{item.label}</Link>
            </Button>
          ))}
          {showPlans && (
            <Button
              variant="ghost"
              size="sm"
              asChild
              className={cn(
                "text-xs sm:text-sm px-2 sm:px-3",
                isActive("/subscription") && "bg-accent text-accent-foreground"
              )}
            >
              <Link to="/subscription">
                <Crown className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                Plans
              </Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
};
