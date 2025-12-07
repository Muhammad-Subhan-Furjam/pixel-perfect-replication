import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Header } from "@/components/Header";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, TrendingUp, Users, Target, BarChart3 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { format, subDays, subMonths, startOfWeek, startOfMonth, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval } from "date-fns";

interface AnalysisData {
  id: string;
  score: string;
  created_at: string;
  check_in_id: string;
}

interface TeamMember {
  id: string;
  name: string;
  role: string;
  department_type: string | null;
}

type TimeRange = "weekly" | "monthly" | "quarterly" | "yearly";

const Analytics = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [analyses, setAnalyses] = useState<AnalysisData[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [timeRange, setTimeRange] = useState<TimeRange>("weekly");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, timeRange]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const dateFrom = getDateFrom(timeRange);

      const [analysesResult, teamResult] = await Promise.all([
        supabase
          .from("analyses")
          .select("*")
          .gte("created_at", dateFrom.toISOString())
          .order("created_at", { ascending: true }),
        supabase
          .from("team_members")
          .select("id, name, role, department_type")
          .order("name"),
      ]);

      if (analysesResult.error) throw analysesResult.error;
      if (teamResult.error) throw teamResult.error;

      setAnalyses(analysesResult.data || []);
      setTeamMembers(teamResult.data || []);
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

  const getDateFrom = (range: TimeRange): Date => {
    const now = new Date();
    switch (range) {
      case "weekly":
        return subDays(now, 7);
      case "monthly":
        return subMonths(now, 1);
      case "quarterly":
        return subMonths(now, 3);
      case "yearly":
        return subMonths(now, 12);
      default:
        return subDays(now, 7);
    }
  };

  const getChartData = () => {
    const dateFrom = getDateFrom(timeRange);
    const now = new Date();
    
    let intervals: Date[];
    let formatStr: string;
    
    switch (timeRange) {
      case "weekly":
        intervals = eachDayOfInterval({ start: dateFrom, end: now });
        formatStr = "EEE";
        break;
      case "monthly":
        intervals = eachDayOfInterval({ start: dateFrom, end: now });
        formatStr = "MMM d";
        break;
      case "quarterly":
        intervals = eachWeekOfInterval({ start: dateFrom, end: now });
        formatStr = "MMM d";
        break;
      case "yearly":
        intervals = eachMonthOfInterval({ start: dateFrom, end: now });
        formatStr = "MMM";
        break;
      default:
        intervals = eachDayOfInterval({ start: dateFrom, end: now });
        formatStr = "EEE";
    }

    return intervals.map((date) => {
      const dayAnalyses = analyses.filter((a) => {
        const analysisDate = new Date(a.created_at);
        if (timeRange === "yearly") {
          return (
            analysisDate.getMonth() === date.getMonth() &&
            analysisDate.getFullYear() === date.getFullYear()
          );
        }
        if (timeRange === "quarterly") {
          const weekStart = startOfWeek(date);
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekEnd.getDate() + 6);
          return analysisDate >= weekStart && analysisDate <= weekEnd;
        }
        return analysisDate.toDateString() === date.toDateString();
      });

      const green = dayAnalyses.filter((a) => a.score === "green").length;
      const yellow = dayAnalyses.filter((a) => a.score === "yellow").length;
      const red = dayAnalyses.filter((a) => a.score === "red").length;

      return {
        date: format(date, formatStr),
        green,
        yellow,
        red,
        total: green + yellow + red,
      };
    });
  };

  const getDepartmentStats = () => {
    const departments = ["tech", "hr", "executive_assistant", "general", "sales", "marketing", "operations"];
    
    return departments.map((dept) => {
      const deptMembers = teamMembers.filter((m) => m.department_type === dept);
      return {
        department: dept.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase()),
        memberCount: deptMembers.length,
        departmentType: dept,
      };
    }).filter((d) => d.memberCount > 0);
  };

  const chartData = getChartData();
  const departmentStats = getDepartmentStats();
  
  const totalGreen = analyses.filter((a) => a.score === "green").length;
  const totalYellow = analyses.filter((a) => a.score === "yellow").length;
  const totalRed = analyses.filter((a) => a.score === "red").length;
  const totalAnalyses = analyses.length;
  const greenPercentage = totalAnalyses > 0 ? Math.round((totalGreen / totalAnalyses) * 100) : 0;

  const techMembers = teamMembers.filter((m) => m.department_type === "tech");
  const hrMembers = teamMembers.filter((m) => m.department_type === "hr");
  const eaMembers = teamMembers.filter((m) => m.department_type === "executive_assistant");

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-6 sm:py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">Performance Analytics</h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              Comprehensive team performance insights
            </p>
          </div>
          <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Select time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="quarterly">Quarterly (3 months)</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <>
            {/* Summary Stats */}
            <div className="grid gap-4 md:grid-cols-4 mb-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Analyses</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalAnalyses}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Green Performance</CardTitle>
                  <TrendingUp className="h-4 w-4 text-success" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-success">{greenPercentage}%</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Tech Team</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{techMembers.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">HR & EA Team</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{hrMembers.length + eaMembers.length}</div>
                </CardContent>
              </Card>
            </div>

            {/* Performance Chart */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Performance Trends</CardTitle>
                <CardDescription>
                  Team performance scores over {timeRange === "quarterly" ? "3 months" : timeRange} period
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis 
                        dataKey="date" 
                        className="text-muted-foreground"
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis 
                        className="text-muted-foreground"
                        tick={{ fontSize: 12 }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: "hsl(var(--card))",
                          borderColor: "hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="green" 
                        stroke="hsl(142, 76%, 36%)" 
                        strokeWidth={2}
                        name="Green"
                        dot={{ fill: "hsl(142, 76%, 36%)" }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="yellow" 
                        stroke="hsl(45, 93%, 47%)" 
                        strokeWidth={2}
                        name="Yellow"
                        dot={{ fill: "hsl(45, 93%, 47%)" }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="red" 
                        stroke="hsl(0, 84%, 60%)" 
                        strokeWidth={2}
                        name="Red"
                        dot={{ fill: "hsl(0, 84%, 60%)" }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Department Breakdown */}
            <Tabs defaultValue="tech" className="space-y-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="tech">Tech Team</TabsTrigger>
                <TabsTrigger value="hr">HR Team</TabsTrigger>
                <TabsTrigger value="ea">EA Team</TabsTrigger>
              </TabsList>

              <TabsContent value="tech">
                <Card>
                  <CardHeader>
                    <CardTitle>Tech Team Performance</CardTitle>
                    <CardDescription>Productivity metrics for technical staff</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {techMembers.length > 0 ? (
                      <div className="space-y-4">
                        {techMembers.map((member) => (
                          <div key={member.id} className="flex items-center justify-between p-4 rounded-lg bg-secondary/50">
                            <div>
                              <p className="font-medium">{member.name}</p>
                              <p className="text-sm text-muted-foreground">{member.role}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-muted-foreground">KPIs tracked:</p>
                              <p className="font-medium">Commits, PRs, Reviews, Tickets</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-8">No tech team members</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="hr">
                <Card>
                  <CardHeader>
                    <CardTitle>HR Team Performance</CardTitle>
                    <CardDescription>Human resources KPI tracking</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {hrMembers.length > 0 ? (
                      <div className="space-y-4">
                        {hrMembers.map((member) => (
                          <div key={member.id} className="flex items-center justify-between p-4 rounded-lg bg-secondary/50">
                            <div>
                              <p className="font-medium">{member.name}</p>
                              <p className="text-sm text-muted-foreground">{member.role}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-muted-foreground">KPIs tracked:</p>
                              <p className="font-medium">Hiring, Onboarding, Retention</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-8">No HR team members</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="ea">
                <Card>
                  <CardHeader>
                    <CardTitle>Executive Assistant Performance</CardTitle>
                    <CardDescription>EA productivity and support metrics</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {eaMembers.length > 0 ? (
                      <div className="space-y-4">
                        {eaMembers.map((member) => (
                          <div key={member.id} className="flex items-center justify-between p-4 rounded-lg bg-secondary/50">
                            <div>
                              <p className="font-medium">{member.name}</p>
                              <p className="text-sm text-muted-foreground">{member.role}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-muted-foreground">KPIs tracked:</p>
                              <p className="font-medium">Tasks, Scheduling, Support</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-8">No EA team members</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </main>
    </div>
  );
};

export default Analytics;