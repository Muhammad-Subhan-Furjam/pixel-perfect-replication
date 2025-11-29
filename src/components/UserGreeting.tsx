import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export const UserGreeting = () => {
  const { user, userRole } = useAuth();
  const [userName, setUserName] = useState("");

  useEffect(() => {
    if (user && userRole === 'team_member') {
      fetchUserName();
    }
  }, [user, userRole]);

  const fetchUserName = async () => {
    try {
      const { data, error } = await supabase
        .from("team_members")
        .select("name")
        .eq("auth_user_id", user!.id)
        .maybeSingle();

      if (error) throw error;
      setUserName(data?.name || "");
    } catch (error) {
      console.error("Error fetching user name:", error);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  if (userRole !== 'team_member' || !userName) return null;

  return (
    <div className="mb-6">
      <h2 className="text-2xl font-semibold">
        {getGreeting()}, {userName}
      </h2>
    </div>
  );
};
