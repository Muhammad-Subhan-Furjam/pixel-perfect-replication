import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, ClipboardCheck, TrendingUp, AlertCircle, Loader2 } from "lucide-react";
import { Header } from "@/components/Header";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

interface Analysis {
  id: string;
  score: string;
  blocker: string;
  created_at: string;
  check_in_id: string;
}

interface CheckIn {
  id: string;
  team_member_id: string;
  created_at: string;
  team_members: {
    name: string;
    role: string;
  };
}

const Dashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [teamMemberCount, setTeamMemberCount] = useState(0);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch team members count
      const { count: membersCount } = await supabase
        .from("team_members")
        .select("*", { count: "exact", head: true });

      setTeamMemberCount(membersCount || 0);

      // Fetch recent analyses
      const { data: analysesData, error: analysesError } = await supabase
        .from("analyses")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);

      if (analysesError) throw analysesError;
      setAnalyses(analysesData || []);

      // Fetch recent check-ins with team member info
      const { data: checkInsData, error: checkInsError } = await supabase
        .from("check_ins")
        .select("*, team_members(name, role)")
        .order("created_at", { ascending: false })
        .limit(10);

      if (checkInsError) throw checkInsError;
      setCheckIns(checkInsData || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const greenCount = analyses.filter((a) => a.score === "green").length;
  const yellowCount = analyses.filter((a) => a.score === "yellow").length;
  const redCount = analyses.filter((a) => a.score === "red").length;
  const totalAnalyses = analyses.length;
  const greenPercentage = totalAnalyses > 0 ? Math.round((greenCount / totalAnalyses) * 100) : 0;
  const activeBlockers = analyses.filter((a) => a.blocker !== "NONE").length;

  const todayCheckIns = checkIns.filter((ci) => {
    const checkInDate = new Date(ci.created_at);
    const today = new Date();
    return checkInDate.toDateString() === today.toDateString();
  }).length;

  const stats = [
    { label: "Team Members", value: String(teamMemberCount), icon: Users, color: "text-primary" },
    { label: "Today's Check-ins", value: `${todayCheckIns}/${teamMemberCount}`, icon: ClipboardCheck, color: "text-success" },
    { label: "Green Performance", value: `${greenPercentage}%`, icon: TrendingUp, color: "text-success" },
    { label: "Active Blockers", value: String(activeBlockers), icon: AlertCircle, color: "text-warning" },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "green": return "bg-success";
      case "yellow": return "bg-warning";
      case "red": return "bg-destructive";
      default: return "bg-muted";
    }
  };

  const recentActivity = checkIns.slice(0, 4).map((checkIn) => {
    const analysis = analyses.find((a) => a.check_in_id === checkIn.id);
    return {
      member: checkIn.team_members?.name || "Unknown",
      role: checkIn.team_members?.role || "Unknown",
      status: analysis?.score || "pending",
      time: formatDistanceToNow(new Date(checkIn.created_at), { addSuffix: true }),
    };
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Good morning, CEO</h2>
          <p className="text-muted-foreground">Here's what's happening with your team today</p>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
              {stats.map((stat) => (
                <Card key={stat.label}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
                    <stat.icon className={`h-4 w-4 ${stat.color}`} />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stat.value}</div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Check-ins</CardTitle>
                  <CardDescription>Latest team member updates</CardDescription>
                </CardHeader>
                <CardContent>
                  {recentActivity.length > 0 ? (
                    <div className="space-y-4">
                      {recentActivity.map((activity, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className={`h-2 w-2 rounded-full ${getStatusColor(activity.status)}`} />
                            <div>
                              <p className="font-medium">{activity.member}</p>
                              <p className="text-sm text-muted-foreground">{activity.role}</p>
                            </div>
                          </div>
                          <span className="text-sm text-muted-foreground">{activity.time}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">No recent check-ins</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Performance Summary</CardTitle>
                  <CardDescription>Overall team performance breakdown</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 rounded-lg bg-success/10 border border-success/20">
                      <p className="text-sm font-medium text-success-foreground">Green Performance</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {greenCount} team members exceeding expectations
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-warning/10 border border-warning/20">
                      <p className="text-sm font-medium text-warning-foreground">Needs Attention</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {yellowCount} team members require monitoring
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                      <p className="text-sm font-medium text-destructive-foreground">Critical Issues</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {redCount} team members need immediate attention
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
