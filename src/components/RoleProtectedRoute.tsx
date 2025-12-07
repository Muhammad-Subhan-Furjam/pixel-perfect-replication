import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";
import { Loader2 } from "lucide-react";

interface RoleProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: Array<"ceo" | "team_member" | "executive_assistant" | "hr">;
  requireTeamManagement?: boolean;
}

const RoleProtectedRoute = ({
  children,
  allowedRoles,
  requireTeamManagement = false,
}: RoleProtectedRouteProps) => {
  const { role, canManageTeam, loading } = useUserRole();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Check role access
  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return <Navigate to={role === "ceo" ? "/dashboard" : "/metrics"} replace />;
  }

  // Check team management permission
  if (requireTeamManagement && !canManageTeam) {
    return <Navigate to={role === "ceo" ? "/dashboard" : "/metrics"} replace />;
  }

  return <>{children}</>;
};

export default RoleProtectedRoute;