import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import logo from "@/assets/logo.png";
import { LogOut } from "lucide-react";
import { NotificationBell } from "./NotificationBell";

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
        <nav className="flex items-center space-x-4">
          {userRole === 'ceo' && (
            <>
              <Button variant="ghost" asChild>
                <Link to="/dashboard">Dashboard</Link>
              </Button>
              <Button variant="ghost" asChild>
                <Link to="/team">Team</Link>
              </Button>
              <Button variant="ghost" asChild>
                <Link to="/check-ins">Check-ins</Link>
              </Button>
              <Button variant="ghost" asChild>
                <Link to="/analysis">Analysis</Link>
              </Button>
              <Button variant="ghost" asChild>
                <Link to="/reports">Reports</Link>
              </Button>
              <NotificationBell />
            </>
          )}
          {userRole === 'team_member' && (
            <Button variant="ghost" asChild>
              <Link to="/reports">Reports</Link>
            </Button>
          )}
          {user && (
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
};