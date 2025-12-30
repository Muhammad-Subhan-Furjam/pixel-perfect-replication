import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

type AppRole = "ceo" | "team_member" | "executive_assistant" | "hr";

export const useRoleRedirect = () => {
  const getRedirectPath = useCallback(async (userId: string): Promise<string> => {
    try {
      const { data: roleData, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        console.error("Error fetching user role:", error);
        return "/reports"; // Default to team member view
      }

      const role = roleData?.role as AppRole | null;

      // CEO, HR, and Executive Assistant go to dashboard
      if (role === "ceo" || role === "hr" || role === "executive_assistant") {
        return "/dashboard";
      }

      // Team members go to reports
      return "/reports";
    } catch (error) {
      console.error("Error in getRedirectPath:", error);
      return "/reports";
    }
  }, []);

  return { getRedirectPath };
};
