import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Header } from "@/components/Header";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, AlertCircle, Users, Calendar, Download, FileCheck, FileText } from "lucide-react";
import { format } from "date-fns";
import Footer from "@/components/Footer";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import jsPDF from "jspdf";
import { useNavigate } from "react-router-dom";

interface TeamMemberMetrics {
  id: string;
  name: string;
  role: string;
  department_type: string | null;
  metrics: Record<string, string | number> | null;
  notes: string | null;
  submitted_at: string | null;
  hasCheckIn: boolean;
  checkInTime: string | null;
  hasReport: boolean;
  reportTime: string | null;
}

// Type guard for metrics
const isValidMetrics = (data: unknown): data is Record<string, string | number> => {
  return typeof data === 'object' && data !== null && !Array.isArray(data);
};

const Metrics = () => {
  const { user } = useAuth();
  const { role, loading: roleLoading } = useUserRole();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  
  // CEO view state
  const [teamMetrics, setTeamMetrics] = useState<TeamMemberMetrics[]>([]);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const isCEO = role === "ceo";

  useEffect(() => {
    // Redirect non-CEO users to Reports page
    if (!roleLoading && !isCEO) {
      navigate("/reports", { replace: true });
      return;
    }
    
    if (user && !roleLoading && isCEO) {
      fetchTeamMetrics();
    }
  }, [user, roleLoading, isCEO, selectedDate, navigate]);

  // Real-time subscription for report updates
  useEffect(() => {
    if (!user || !isCEO) return;

    const channel = supabase
      .channel('metrics-reports-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'team_member_reports'
        },
        () => {
          // Refetch when a new report is submitted
          fetchTeamMetrics();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'check_ins'
        },
        () => {
          // Refetch when a new check-in is created
          fetchTeamMetrics();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, isCEO, selectedDate]);

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

      // Get check-ins for the selected date
      const { data: checkInsData, error: checkInsError } = await supabase
        .from("check_ins")
        .select("team_member_id, created_at")
        .eq("date", selectedDate);

      if (checkInsError) throw checkInsError;

      // Get team member reports for the selected date (submitted by team members, not CEO)
      const { data: reportsData, error: reportsError } = await supabase
        .from("team_member_reports")
        .select("team_member_id, created_at")
        .eq("date", selectedDate)
        .eq("is_from_ceo", false);

      if (reportsError) throw reportsError;

      // Combine data
      const combined: TeamMemberMetrics[] = (members || []).map(member => {
        const memberMetrics = metricsData?.find(m => m.team_member_id === member.id);
        const memberCheckIn = checkInsData?.find(c => c.team_member_id === member.id);
        const memberReport = reportsData?.find(r => r.team_member_id === member.id);
        return {
          id: member.id,
          name: member.name,
          role: member.role,
          department_type: member.department_type,
          metrics: memberMetrics && isValidMetrics(memberMetrics.metrics) ? memberMetrics.metrics : null,
          notes: memberMetrics?.notes || null,
          submitted_at: memberMetrics?.submitted_at || null,
          hasCheckIn: !!memberCheckIn,
          checkInTime: memberCheckIn?.created_at || null,
          hasReport: !!memberReport,
          reportTime: memberReport?.created_at || null,
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
                      <div className="flex flex-wrap gap-2">
                        {member.hasReport ? (
                          <Badge variant="default" className="w-fit bg-green-600 hover:bg-green-700">
                            <FileText className="h-3 w-3 mr-1" />
                            Submitted
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="w-fit">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Report not submitted
                          </Badge>
                        )}
                        {member.hasCheckIn && (
                          <Badge variant="default" className="w-fit bg-primary hover:bg-primary/90">
                            <FileCheck className="h-3 w-3 mr-1" />
                            Analyzed at {format(new Date(member.checkInTime!), "h:mm a")}
                          </Badge>
                        )}
                        {member.metrics && (
                          <Badge variant="default" className="w-fit bg-success hover:bg-success/90">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Metrics at {format(new Date(member.submitted_at!), "h:mm a")}
                          </Badge>
                        )}
                      </div>
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
};

export default Metrics;