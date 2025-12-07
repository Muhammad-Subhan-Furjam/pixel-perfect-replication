import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type AppRole = "ceo" | "team_member" | "executive_assistant" | "hr";

interface UserRoleData {
  role: AppRole | null;
  canManageTeam: boolean;
  loading: boolean;
}

export const useUserRole = (): UserRoleData => {
  const { user } = useAuth();
  const [role, setRole] = useState<AppRole | null>(null);
  const [canManageTeam, setCanManageTeam] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setRole(null);
      setCanManageTeam(false);
      setLoading(false);
      return;
    }

    const fetchUserRole = async () => {
      setLoading(true);
      try {
        // Fetch user role
        const { data: roleData, error: roleError } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .maybeSingle();

        if (roleError) throw roleError;

        const userRole = (roleData?.role as AppRole) || "team_member";
        setRole(userRole);

        // CEO always has team management access
        if (userRole === "ceo") {
          setCanManageTeam(true);
        } else {
          // Check for delegated permissions
          const { data: permData, error: permError } = await supabase
            .from("user_permissions")
            .select("can_manage_team")
            .eq("user_id", user.id)
            .maybeSingle();

          if (permError) throw permError;

          setCanManageTeam(permData?.can_manage_team || false);
        }
      } catch (error) {
        console.error("Error fetching user role:", error);
        setRole("team_member");
        setCanManageTeam(false);
      } finally {
        setLoading(false);
      }
    };

    fetchUserRole();
  }, [user]);

  return { role, canManageTeam, loading };
};