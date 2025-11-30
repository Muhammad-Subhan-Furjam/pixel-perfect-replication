import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Mail } from "lucide-react";
import logo from "@/assets/logo.png";

const Team = () => {
  const teamMembers = [
    {
      name: "Sarah Johnson",
      role: "Nursing - Patient Care",
      kpi: "20 patients/day",
      language: "English",
      status: "active",
    },
    {
      name: "Michael Chen",
      role: "Pharmacy - Dispensing",
      kpi: "30 min avg turnaround",
      language: "English",
      status: "active",
    },
    {
      name: "Aisha Mohammed",
      role: "Reception - Patient Intake",
      kpi: "40 check-ins/day",
      language: "English",
      status: "active",
    },
    {
      name: "Carlos Rivera",
      role: "Lab Technician",
      kpi: "25 tests/day",
      language: "Spanish",
      status: "active",
    },
  ];

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
            <h2 className="text-3xl font-bold mb-2">Team Management</h2>
            <p className="text-muted-foreground">Manage team members, roles, and KPI targets</p>
          </div>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Member
          </Button>
        </div>

        <div className="grid gap-6">
          {teamMembers.map((member, index) => (
            <Card key={index}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{member.name}</CardTitle>
                    <CardDescription>{member.role}</CardDescription>
                  </div>
                  <Badge variant="secondary">{member.status}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">KPI Target</p>
                    <p className="font-medium">{member.kpi}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Language</p>
                    <p className="font-medium">{member.language}</p>
                  </div>
                  <div className="flex items-end justify-end space-x-2">
                    <Button variant="outline" size="sm">
                      Edit
                    </Button>
                    <Button variant="outline" size="sm">
                      <Mail className="h-4 w-4 mr-1" />
                      Send Prompt
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
};

export default Team;
