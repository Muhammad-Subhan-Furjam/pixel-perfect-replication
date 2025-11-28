import { ReactNode, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: Array<"ceo" | "team_member">;
}

export const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate("/auth");
      } else if (allowedRoles && userRole && !allowedRoles.includes(userRole)) {
        // Redirect based on role
        if (userRole === "team_member") {
          navigate("/reports");
        } else {
          navigate("/dashboard");
        }
      }
    }
  }, [user, userRole, loading, navigate, allowedRoles]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user || (allowedRoles && userRole && !allowedRoles.includes(userRole))) {
    return null;
  }

  return <>{children}</>;
};
