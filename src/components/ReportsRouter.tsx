import { useAuth } from "@/contexts/AuthContext";
import ReportsCEO from "@/pages/ReportsCEO";
import ReportsTeamMember from "@/pages/ReportsTeamMember";
import { Loader2 } from "lucide-react";

export const ReportsRouter = () => {
  const { userRole, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (userRole === 'ceo') {
    return <ReportsCEO />;
  }

  return <ReportsTeamMember />;
};
