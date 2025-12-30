import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Header } from "@/components/Header";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, AlertCircle, Users, Calendar, Download } from "lucide-react";
import { format } from "date-fns";
import Footer from "@/components/Footer";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import jsPDF from "jspdf";

interface TeamMember {
  id: string;
  name: string;
  role: string;
  department_type: string | null;
  target_metrics: Record<string, string | number> | null;
}

interface TodayMetrics {
  id: string;
  metrics: Record<string, string | number>;
  notes: string | null;
  submitted_at: string;
}

interface TeamMemberMetrics {
  id: string;
  name: string;
  role: string;
  department_type: string | null;
  metrics: Record<string, string | number> | null;
  notes: string | null;
  submitted_at: string | null;
}

// Type guard for metrics
const isValidMetrics = (data: unknown): data is Record<string, string | number> => {
  return typeof data === 'object' && data !== null && !Array.isArray(data);
};

const techMetricDefaults = {
  "Code Commits": "",
  "Pull Requests": "",
  "Code Reviews": "",
  "Tickets Completed": "",
  "Bugs Fixed": "",
  "Sprint Velocity": "",
};

const Metrics = () => {
  const { user } = useAuth();
  const { role, loading: roleLoading } = useUserRole();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [teamMember, setTeamMember] = useState<TeamMember | null>(null);
  const [todayMetrics, setTodayMetrics] = useState<TodayMetrics | null>(null);
  const [metrics, setMetrics] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");
  
  // CEO view state
  const [teamMetrics, setTeamMetrics] = useState<TeamMemberMetrics[]>([]);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const isCEO = role === "ceo";

  useEffect(() => {
    if (user && !roleLoading) {
      if (isCEO) {
        fetchTeamMetrics();
      } else {
        fetchTeamMemberData();
      }
    }
  }, [user, roleLoading, isCEO, selectedDate]);

  const fetchTeamMetrics = async () => {
    setLoading(true);
    try {
      // Get all team members
      const { data: members, error: membersError } = await supabase
        .from("team_members")
        .select("id, name, role, department_type")
        .eq("user_id", user?.id);

      if (membersError) throw membersError;

      // Get today's metrics for all team members
      const { data: metricsData, error: metricsError } = await supabase
        .from("daily_metrics")
        .select("team_member_id, metrics, notes, submitted_at")
        .eq("date", selectedDate);

      if (metricsError) throw metricsError;

      // Combine data
      const combined: TeamMemberMetrics[] = (members || []).map(member => {
        const memberMetrics = metricsData?.find(m => m.team_member_id === member.id);
        return {
          id: member.id,
          name: member.name,
          role: member.role,
          department_type: member.department_type,
          metrics: memberMetrics && isValidMetrics(memberMetrics.metrics) ? memberMetrics.metrics : null,
          notes: memberMetrics?.notes || null,
          submitted_at: memberMetrics?.submitted_at || null,
        };
      });

      setTeamMetrics(combined);
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

  const fetchTeamMemberData = async () => {
    setLoading(true);
    try {
      // Find the team member linked to this auth user
      const { data: memberData, error: memberError } = await supabase
        .from("team_members")
        .select("*")
        .eq("auth_user_id", user?.id)
        .maybeSingle();

      if (memberError) throw memberError;

      if (memberData) {
        const parsedMember: TeamMember = {
          id: memberData.id,
          name: memberData.name,
          role: memberData.role,
          department_type: memberData.department_type,
          target_metrics: isValidMetrics(memberData.target_metrics) ? memberData.target_metrics : null,
        };
        setTeamMember(parsedMember);

        // Check if metrics already submitted today
        const { data: metricsData, error: metricsError } = await supabase
          .from("daily_metrics")
          .select("*")
          .eq("team_member_id", memberData.id)
          .eq("date", format(new Date(), "yyyy-MM-dd"))
          .maybeSingle();

        if (metricsError) throw metricsError;

        if (metricsData && isValidMetrics(metricsData.metrics)) {
          setTodayMetrics({
            id: metricsData.id,
            metrics: metricsData.metrics,
            notes: metricsData.notes,
            submitted_at: metricsData.submitted_at,
          });
          setMetrics(metricsData.metrics as Record<string, string>);
          setNotes(metricsData.notes || "");
        } else {
          // Initialize with target metrics or tech defaults
          const initialMetrics: Record<string, string> = {};
          
          if (parsedMember.department_type === "tech") {
            Object.keys(techMetricDefaults).forEach(key => {
              initialMetrics[key] = "";
            });
          }
          
          if (parsedMember.target_metrics) {
            Object.keys(parsedMember.target_metrics).forEach(key => {
              initialMetrics[key] = "";
            });
          }
          
          setMetrics(initialMetrics);
        }
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

  const handleMetricChange = (key: string, value: string) => {
    setMetrics(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamMember || !user) return;

    setSubmitting(true);
    try {
      const metricsData = {
        team_member_id: teamMember.id,
        user_id: user.id,
        date: format(new Date(), "yyyy-MM-dd"),
        metrics,
        notes: notes || null,
      };

      if (todayMetrics) {
        // Update existing
        const { error } = await supabase
          .from("daily_metrics")
          .update({ metrics, notes: notes || null })
          .eq("id", todayMetrics.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Your metrics have been updated",
        });
      } else {
        // Insert new
        const { error } = await supabase
          .from("daily_metrics")
          .insert(metricsData);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Your daily metrics have been submitted",
        });
      }

      fetchTeamMemberData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    const dateStr = format(new Date(selectedDate), "MMMM d, yyyy");
    
    // Title
    doc.setFontSize(20);
    doc.text("Daily Metrics Report", 20, 20);
    
    doc.setFontSize(12);
    doc.text(`Date: ${dateStr}`, 20, 30);
    
    const submittedCount = teamMetrics.filter(m => m.metrics !== null).length;
    doc.text(`Submitted: ${submittedCount} of ${teamMetrics.length} team members`, 20, 38);
    
    let yPos = 50;
    
    teamMetrics.forEach((member) => {
      // Check if we need a new page
      if (yPos > 260) {
        doc.addPage();
        yPos = 20;
      }
      
      // Member header
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(member.name, 20, yPos);
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const roleText = `${member.role}${member.department_type === "tech" ? " • Tech Team" : ""}`;
      doc.text(roleText, 20, yPos + 6);
      
      yPos += 12;
      
      if (member.metrics) {
        doc.setFontSize(10);
        doc.text(`Submitted at ${format(new Date(member.submitted_at!), "h:mm a")}`, 20, yPos);
        yPos += 8;
        
        // Metrics table
        Object.entries(member.metrics).forEach(([key, value]) => {
          if (yPos > 270) {
            doc.addPage();
            yPos = 20;
          }
          doc.text(`${key}: ${value || "-"}`, 25, yPos);
          yPos += 6;
        });
        
        // Notes
        if (member.notes) {
          if (yPos > 250) {
            doc.addPage();
            yPos = 20;
          }
          doc.setFont("helvetica", "italic");
          doc.text(`Notes: ${member.notes}`, 25, yPos);
          doc.setFont("helvetica", "normal");
          yPos += 8;
        }
      } else {
        doc.setTextColor(150, 150, 150);
        doc.text("Not submitted", 20, yPos);
        doc.setTextColor(0, 0, 0);
        yPos += 6;
      }
      
      yPos += 10;
    });
    
    doc.save(`metrics-report-${selectedDate}.pdf`);
    
    toast({
      title: "PDF Exported",
      description: `Metrics report for ${dateStr} has been downloaded`,
    });
  };

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

  // CEO View - Team Metrics Dashboard
  if (isCEO) {
    const submittedCount = teamMetrics.filter(m => m.metrics !== null).length;
    const totalCount = teamMetrics.length;

    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-6 sm:py-8">
          <div className="mb-6 sm:mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">Team Metrics</h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              View daily performance metrics submitted by your team
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-auto"
              />
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {submittedCount} of {totalCount} submitted
              </span>
            </div>
            <Button 
              variant="outline" 
              onClick={exportToPDF}
              disabled={teamMetrics.length === 0}
              className="ml-auto"
            >
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
          </div>

          {teamMetrics.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-center">
                  No team members found. Add team members to see their metrics.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {teamMetrics.map((member) => (
                <Card key={member.id}>
                  <CardHeader className="pb-3">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div>
                        <CardTitle className="text-lg">{member.name}</CardTitle>
                        <CardDescription>
                          {member.role}
                          {member.department_type === "tech" && " • Tech Team"}
                        </CardDescription>
                      </div>
                      {member.metrics ? (
                        <Badge variant="default" className="w-fit bg-success hover:bg-success/90">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Submitted at {format(new Date(member.submitted_at!), "h:mm a")}
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="w-fit">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Not submitted
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  {member.metrics && (
                    <CardContent>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Metric</TableHead>
                              <TableHead>Value</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {Object.entries(member.metrics).map(([key, value]) => (
                              <TableRow key={key}>
                                <TableCell className="font-medium">{key}</TableCell>
                                <TableCell>{value || "-"}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                      {member.notes && (
                        <div className="mt-4 p-3 bg-muted rounded-md">
                          <p className="text-sm font-medium mb-1">Notes:</p>
                          <p className="text-sm text-muted-foreground">{member.notes}</p>
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          )}
        </main>
        <Footer />
      </div>
    );
  }

  // Team Member View - Submit Own Metrics
  if (!teamMember) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-6 sm:py-8">
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
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-6 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">Daily Metrics</h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            Submit your performance metrics for {format(new Date(), "MMMM d, yyyy")}
          </p>
        </div>

        {todayMetrics && (
          <Card className="mb-6 border-success/50 bg-success/5">
            <CardContent className="flex items-center gap-3 py-4">
              <CheckCircle className="h-5 w-5 text-success" />
              <p className="text-sm text-success">
                You've already submitted metrics today at{" "}
                {format(new Date(todayMetrics.submitted_at), "h:mm a")}. You can update them below.
              </p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Your Metrics</CardTitle>
            <CardDescription>
              {teamMember.name} • {teamMember.role}
              {teamMember.department_type === "tech" && " • Tech Team"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                {Object.keys(metrics).map((key) => (
                  <div key={key} className="space-y-2">
                    <Label htmlFor={key}>{key}</Label>
                    <Input
                      id={key}
                      type="text"
                      value={metrics[key]}
                      onChange={(e) => handleMetricChange(key, e.target.value)}
                      placeholder={`Enter ${key.toLowerCase()}`}
                    />
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any additional notes about your day..."
                  rows={4}
                />
              </div>

              <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : todayMetrics ? (
                  "Update Metrics"
                ) : (
                  "Submit Metrics"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default Metrics;