import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, ClipboardCheck, TrendingUp, AlertCircle, Loader2, FileText, Calendar, CheckCircle } from "lucide-react";
import { Header } from "@/components/Header";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow, format } from "date-fns";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

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

interface TeamMemberData {
  id: string;
  name: string;
  role: string;
}

interface TeamMemberMetrics {
  date: string;
  metrics: unknown;
  submitted_at: string;
}

interface TeamMemberReport {
  id: string;
  report_text: string;
  created_at: string;
  is_from_ceo: boolean;
}

const Dashboard = () => {
  const { user } = useAuth();
  const { role, loading: roleLoading } = useUserRole();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  
  // CEO state
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [teamMemberCount, setTeamMemberCount] = useState(0);
  
  // Team member state
  const [teamMember, setTeamMember] = useState<TeamMemberData | null>(null);
  const [recentMetrics, setRecentMetrics] = useState<TeamMemberMetrics[]>([]);
  const [recentReports, setRecentReports] = useState<TeamMemberReport[]>([]);
  const [todayMetricsSubmitted, setTodayMetricsSubmitted] = useState(false);

  const isCEO = role === "ceo";

  useEffect(() => {
    if (user && !roleLoading) {
      if (isCEO) {
        fetchCEODashboardData();
      } else {
        fetchTeamMemberDashboardData();
      }
    }
  }, [user, roleLoading, isCEO]);

  const fetchCEODashboardData = async () => {
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

  const fetchTeamMemberDashboardData = async () => {
    setLoading(true);
    try {
      // Find the team member linked to this auth user
      const { data: memberData, error: memberError } = await supabase
        .from("team_members")
        .select("id, name, role")
        .eq("auth_user_id", user?.id)
        .maybeSingle();

      if (memberError) throw memberError;

      if (memberData) {
        setTeamMember(memberData);

        const today = format(new Date(), "yyyy-MM-dd");

        // Fetch recent metrics
        const { data: metricsData, error: metricsError } = await supabase
          .from("daily_metrics")
          .select("date, metrics, submitted_at")
          .eq("team_member_id", memberData.id)
          .order("date", { ascending: false })
          .limit(7);

        if (metricsError) throw metricsError;
        setRecentMetrics(metricsData || []);
        setTodayMetricsSubmitted(metricsData?.some(m => m.date === today) || false);

        // Fetch recent reports (both sent and received)
        const { data: myReports, error: myError } = await supabase
          .from("team_member_reports")
          .select("id, report_text, created_at, is_from_ceo")
          .eq("team_member_id", memberData.id)
          .eq("is_from_ceo", false)
          .order("created_at", { ascending: false })
          .limit(3);

        if (myError) throw myError;

        const { data: ceoReports, error: ceoError } = await supabase
          .from("team_member_reports")
          .select("id, report_text, created_at, is_from_ceo")
          .eq("recipient_team_member_id", memberData.id)
          .eq("is_from_ceo", true)
          .order("created_at", { ascending: false })
          .limit(3);

        if (ceoError) throw ceoError;

        const allReports = [...(myReports || []), ...(ceoReports || [])]
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 5);

        setRecentReports(allReports);
      }
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

  // CEO Dashboard calculations
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

  const ceoStats = [
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

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <div className="flex-1 flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
        <Footer />
      </div>
    );
  }

  // Team Member Dashboard
  if (!isCEO) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-6 sm:py-8">
          <div className="mb-6 sm:mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold mb-2">
              Welcome back{teamMember ? `, ${teamMember.name}` : ""}
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              {teamMember ? `${teamMember.role}` : "Your personal dashboard"}
            </p>
          </div>

          {!teamMember ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-center">
                  Your account is not linked to a team member profile.
                  <br />
                  Please contact your manager to set up your profile.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Quick Actions */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8">
                <Card className={todayMetricsSubmitted ? "border-success/50" : "border-warning/50"}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Today's Metrics
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {todayMetricsSubmitted ? (
                      <div className="flex items-center gap-2 text-success">
                        <CheckCircle className="h-4 w-4" />
                        <span className="text-sm">Submitted</span>
                      </div>
                    ) : (
                      <Button asChild size="sm" className="w-full">
                        <Link to="/metrics">Submit Now</Link>
                      </Button>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Daily Report
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Button asChild size="sm" variant="outline" className="w-full">
                      <Link to="/reports">Submit Report</Link>
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Metrics Streak
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{recentMetrics.length} days</div>
                    <p className="text-xs text-muted-foreground">Recent submissions</p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                {/* Recent Metrics */}
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Metrics</CardTitle>
                    <CardDescription>Your last 7 days of submissions</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {recentMetrics.length > 0 ? (
                      <div className="space-y-3">
                        {recentMetrics.map((metric, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-md">
                            <span className="text-sm font-medium">
                              {format(new Date(metric.date), "EEE, MMM d")}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(metric.submitted_at), "h:mm a")}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        No metrics submitted yet
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Recent Reports */}
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Reports</CardTitle>
                    <CardDescription>Your reports and manager feedback</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {recentReports.length > 0 ? (
                      <div className="space-y-3">
                        {recentReports.map((report) => (
                          <div 
                            key={report.id} 
                            className={`p-3 rounded-md ${
                              report.is_from_ceo 
                                ? "bg-primary/10 border border-primary/20" 
                                : "bg-muted"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-medium">
                                {report.is_from_ceo ? "From Manager" : "Your Report"}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}
                              </span>
                            </div>
                            <p className="text-sm line-clamp-2">{report.report_text}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        No reports yet
                      </p>
                    )}
                    <Button asChild variant="outline" size="sm" className="w-full mt-4">
                      <Link to="/reports">View All Reports</Link>
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </main>
        <Footer />
      </div>
    );
  }

  // CEO Dashboard
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-6 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold mb-2">Good morning, CEO</h2>
          <p className="text-sm sm:text-base text-muted-foreground">Here's what's happening with your team today</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          {ceoStats.map((stat) => (
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
      </main>
      <Footer />
    </div>
  );
};

export default Dashboard;
