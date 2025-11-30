import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import logo from "@/assets/logo.png";
import { LogOut, Menu, LayoutDashboard, Users, ClipboardCheck, BarChart3, FileText } from "lucide-react";
import { NotificationBell } from "./NotificationBell";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Header = () => {
  const { user, userRole, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <header className="border-b border-border bg-card">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <img src={logo} alt="ResultsBoard" className="h-8 w-8" />
          <h1 className="text-xl font-bold">ResultsBoard</h1>
        </div>
        <div className="flex items-center gap-3">
          {userRole === 'ceo' && <NotificationBell />}
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {userRole === 'ceo' && (
                  <>
                    <DropdownMenuItem asChild>
                      <Link to="/dashboard" className="flex items-center cursor-pointer">
                        <LayoutDashboard className="h-4 w-4 mr-2" />
                        Dashboard
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/team" className="flex items-center cursor-pointer">
                        <Users className="h-4 w-4 mr-2" />
                        Team
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/check-ins" className="flex items-center cursor-pointer">
                        <ClipboardCheck className="h-4 w-4 mr-2" />
                        Check-ins
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/analysis" className="flex items-center cursor-pointer">
                        <BarChart3 className="h-4 w-4 mr-2" />
                        Analysis
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/reports" className="flex items-center cursor-pointer">
                        <FileText className="h-4 w-4 mr-2" />
                        Reports
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                {userRole === 'team_member' && (
                  <>
                    <DropdownMenuItem asChild>
                      <Link to="/reports" className="flex items-center cursor-pointer">
                        <FileText className="h-4 w-4 mr-2" />
                        Reports
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
};