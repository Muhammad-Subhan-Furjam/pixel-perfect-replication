import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, ClipboardCheck, TrendingUp, AlertCircle } from "lucide-react";
import logo from "@/assets/logo.png";

const Dashboard = () => {
  const stats = [
    { label: "Team Members", value: "12", icon: Users, color: "text-primary" },
    { label: "Today's Check-ins", value: "8/12", icon: ClipboardCheck, color: "text-success" },
    { label: "Green Performance", value: "67%", icon: TrendingUp, color: "text-success" },
    { label: "Active Blockers", value: "3", icon: AlertCircle, color: "text-warning" },
  ];

  const recentActivity = [
    { member: "Sarah Johnson", role: "Nursing", status: "green", time: "2 hours ago" },
    { member: "Michael Chen", role: "Pharmacy", status: "yellow", time: "3 hours ago" },
    { member: "Aisha Mohammed", role: "Reception", status: "green", time: "4 hours ago" },
    { member: "Carlos Rivera", role: "Lab Tech", status: "red", time: "5 hours ago" },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "green": return "bg-success";
      case "yellow": return "bg-warning";
      case "red": return "bg-destructive";
      default: return "bg-muted";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img src={logo} alt="ResultsBoard" className="h-8 w-8" />
            <h1 className="text-xl font-bold">ResultsBoard</h1>
          </div>
          <nav className="flex items-center space-x-4">
            <Button variant="ghost">Dashboard</Button>
            <Button variant="ghost">Team</Button>
            <Button variant="ghost">Check-ins</Button>
            <Button variant="ghost">Analysis</Button>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Good morning, CEO</h2>
          <p className="text-muted-foreground">Here's what's happening with your team today</p>
        </div>

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
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>CEO Brief</CardTitle>
              <CardDescription>Today's executive summary</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-success/10 border border-success/20">
                  <p className="text-sm font-medium text-success-foreground">Top Performers</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Sarah and Aisha consistently hitting targets. Consider bonus.
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-warning/10 border border-warning/20">
                  <p className="text-sm font-medium text-warning-foreground">Needs Attention</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Michael's pharmacy turnaround time increasing. Check workload.
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                  <p className="text-sm font-medium text-destructive-foreground">Critical Issues</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Carlos reporting equipment failure in lab. SYSTEM blocker - needs immediate action.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
