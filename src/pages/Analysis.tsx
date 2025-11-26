import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, AlertTriangle } from "lucide-react";
import logo from "@/assets/logo.png";

const Analysis = () => {
  const analysisResults = [
    {
      name: "Sarah Johnson",
      role: "Nursing",
      score: "green",
      blocker: "NONE",
      reason: "Exceeded patient care target by 15%. Excellent bedside manner reported.",
      message: "Amazing work, Sarah! Keep it up - you're making a real difference.",
      nextStep: "Consider for Employee of the Month bonus",
    },
    {
      name: "Michael Chen",
      role: "Pharmacy",
      score: "yellow",
      blocker: "EMPLOYEE",
      reason: "Turnaround time slipping from 30min to 45min average. Needs attention.",
      message: "Michael, I noticed the dispensing time is up. Can we chat about what's slowing things down? Need to get back to 30min by Friday.",
      nextStep: "Schedule 1-on-1 to discuss workload and support needs",
    },
    {
      name: "Carlos Rivera",
      role: "Lab Tech",
      score: "red",
      blocker: "SYSTEM",
      reason: "Equipment failure preventing test completion. Not staff issue - infrastructure problem.",
      message: "Carlos, thanks for reporting the equipment issue. We're addressing this immediately - not your fault. Expect repair by tomorrow.",
      nextStep: "Emergency maintenance call - equipment must be fixed today",
    },
  ];

  const getScoreColor = (score: string) => {
    switch (score) {
      case "green": return "success";
      case "yellow": return "warning";
      case "red": return "destructive";
      default: return "secondary";
    }
  };

  const getBlockerIcon = (blocker: string) => {
    if (blocker === "SYSTEM" || blocker === "EXTERNAL") {
      return <AlertTriangle className="h-4 w-4" />;
    }
    return null;
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
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold mb-2">Today's Analysis</h2>
            <p className="text-muted-foreground">AI-powered performance insights and recommendations</p>
          </div>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>

        <Card className="mb-8 bg-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle>CEO Executive Brief</CardTitle>
            <CardDescription>Daily summary and action items</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-4 rounded-lg bg-success/10 border border-success/20">
                <p className="text-2xl font-bold text-success">1</p>
                <p className="text-sm text-muted-foreground">Top Performers</p>
              </div>
              <div className="p-4 rounded-lg bg-warning/10 border border-warning/20">
                <p className="text-2xl font-bold text-warning">1</p>
                <p className="text-sm text-muted-foreground">Needs Coaching</p>
              </div>
              <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                <p className="text-2xl font-bold text-destructive">1</p>
                <p className="text-sm text-muted-foreground">System Issues</p>
              </div>
            </div>
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
              <p className="font-medium mb-2">Priority Action</p>
              <p className="text-sm text-muted-foreground">
                Critical equipment failure in lab needs immediate attention. Contact maintenance now.
                This is a SYSTEM blocker - not staff performance issue.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          {analysisResults.map((result, index) => (
            <Card key={index} className="overflow-hidden">
              <CardHeader className="bg-card">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <CardTitle>{result.name}</CardTitle>
                      <Badge variant={getScoreColor(result.score)}>
                        {result.score.toUpperCase()}
                      </Badge>
                      {result.blocker !== "NONE" && (
                        <Badge variant="outline" className="flex items-center gap-1">
                          {getBlockerIcon(result.blocker)}
                          {result.blocker}
                        </Badge>
                      )}
                    </div>
                    <CardDescription>{result.role}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">AI Analysis</p>
                  <p className="text-sm">{result.reason}</p>
                </div>
                <div className="p-4 rounded-lg bg-muted">
                  <p className="text-sm font-medium mb-2">Message for Employee</p>
                  <p className="text-sm italic">"{result.message}"</p>
                  <Button size="sm" variant="outline" className="mt-3">
                    Copy to Clipboard
                  </Button>
                </div>
                <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <p className="text-sm font-medium mb-1">Next Step for CEO</p>
                  <p className="text-sm">{result.nextStep}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
};

export default Analysis;
