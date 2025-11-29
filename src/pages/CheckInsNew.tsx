import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Header } from "@/components/Header";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Trash2, TrendingUp } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface TeamMember {
  id: string;
  name: string;
  role: string;
  target_metrics: any;
}

interface UnreadReport {
  id: string;
  report_text: string;
  date: string;
  created_at: string;
  team_member_id: string;
  team_members?: {
    name: string;
    role: string;
  };
}

const CheckIns = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [selectedMember, setSelectedMember] = useState<string>("");
  const [selectedReport, setSelectedReport] = useState<UnreadReport | null>(null);
  const [metrics, setMetrics] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [unreadReports, setUnreadReports] = useState<UnreadReport[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [reportToDelete, setReportToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [analyzing, setAnalyzing] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchTeamMembers();
      fetchUnreadReports();

      // Set up realtime subscription for new reports
      const channel = supabase
        .channel('new-reports')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'team_member_reports'
          },
          () => {
            fetchUnreadReports();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const fetchTeamMembers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("team_members")
        .select("*")
        .order("name");

      if (error) throw error;
      setTeamMembers(data || []);
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

  const fetchUnreadReports = async () => {
    try {
      const { data, error } = await supabase
        .from("team_member_reports")
        .select(`
          *,
          team_members!team_member_id (name, role)
        `)
        .eq("is_read", false)
        .eq("is_from_ceo", false)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setUnreadReports(data || []);
    } catch (error: any) {
      console.error("Error fetching reports:", error);
    }
  };

  const handleReportSelect = async (report: UnreadReport) => {
    setSelectedReport(report);
    setSelectedMember(report.team_member_id);
    setNotes(report.report_text);

    // Initialize metrics for the selected team member
    const member = teamMembers.find((m) => m.id === report.team_member_id);
    if (member?.target_metrics) {
      const initialMetrics: Record<string, string> = {};
      Object.keys(member.target_metrics).forEach((key) => {
        initialMetrics[key] = "";
      });
      setMetrics(initialMetrics);
    }

    // Mark as read
    await supabase
      .from("team_member_reports")
      .update({ is_read: true })
      .eq("id", report.id);

    // Refresh reports
    fetchUnreadReports();
  };

  const handleMemberSelect = (memberId: string) => {
    setSelectedMember(memberId);
    setSelectedReport(null);
    setNotes("");
    const member = teamMembers.find((m) => m.id === memberId);
    if (member?.target_metrics) {
      const initialMetrics: Record<string, string> = {};
      Object.keys(member.target_metrics).forEach((key) => {
        initialMetrics[key] = "";
      });
      setMetrics(initialMetrics);
    }
  };

  const handleMetricChange = (key: string, value: string) => {
    setMetrics((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) {
      toast({
        title: "Error",
        description: "Please select a team member",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const member = teamMembers.find((m) => m.id === selectedMember);
      if (!member) throw new Error("Team member not found");

      // Insert check-in
      const { data: checkIn, error: checkInError } = await supabase
        .from("check_ins")
        .insert({
          user_id: user!.id,
          team_member_id: selectedMember,
          metrics,
          notes,
          date: new Date().toISOString().split('T')[0],
        })
        .select()
        .single();

      if (checkInError) throw checkInError;

      // Call AI analysis edge function
      const { data: analysis, error: analysisError } = await supabase.functions.invoke(
        "analyze-performance",
        {
          body: {
            checkInId: checkIn.id,
            teamMemberName: member.name,
            role: member.role,
            metrics,
            notes,
            language: "en",
          },
        }
      );

      if (analysisError) throw analysisError;

      toast({
        title: "Success",
        description: "Check-in submitted and analyzed successfully",
      });

      // Reset form
      setSelectedMember("");
      setSelectedReport(null);
      setMetrics({});
      setNotes("");
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

  const handleDeleteReport = async () => {
    if (!reportToDelete) return;

    setDeleting(true);
    try {
      const { error } = await supabase
        .from("team_member_reports")
        .delete()
        .eq("id", reportToDelete);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Report deleted successfully",
      });

      fetchUnreadReports();
      if (selectedReport?.id === reportToDelete) {
        setSelectedReport(null);
        setSelectedMember("");
        setNotes("");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setReportToDelete(null);
    }
  };

  const handleAnalyzeReport = async (report: UnreadReport) => {
    setAnalyzing(report.id);
    
    try {
      const member = teamMembers.find((m) => m.id === report.team_member_id);
      if (!member) throw new Error("Team member not found");

      // Create metrics object with empty values since we're analyzing the report text
      const emptyMetrics: Record<string, string> = {};
      if (member.target_metrics) {
        Object.keys(member.target_metrics).forEach((key) => {
          emptyMetrics[key] = "N/A";
        });
      }

      // Insert check-in
      const { data: checkIn, error: checkInError } = await supabase
        .from("check_ins")
        .insert({
          user_id: user!.id,
          team_member_id: report.team_member_id,
          metrics: emptyMetrics,
          notes: report.report_text,
          date: new Date().toISOString().split('T')[0],
        })
        .select()
        .single();

      if (checkInError) throw checkInError;

      // Call AI analysis edge function
      const { data: analysis, error: analysisError } = await supabase.functions.invoke(
        "analyze-performance",
        {
          body: {
            checkInId: checkIn.id,
            teamMemberName: member.name,
            role: member.role,
            metrics: emptyMetrics,
            notes: report.report_text,
            language: "en",
          },
        }
      );

      if (analysisError) throw analysisError;

      // Mark report as read
      await supabase
        .from("team_member_reports")
        .update({ is_read: true })
        .eq("id", report.id);

      toast({
        title: "Success",
        description: "Report analyzed successfully. Check the Analysis page for results.",
      });

      fetchUnreadReports();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setAnalyzing(null);
    }
  };

  const selectedMemberData = teamMembers.find((m) => m.id === selectedMember);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Daily Check-ins</h2>
          <p className="text-muted-foreground">Submit daily performance metrics for team members</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Team Member Reports List */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Team Member Reports</CardTitle>
              <CardDescription>Click to review and analyze</CardDescription>
            </CardHeader>
            <CardContent>
              {unreadReports.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No new reports</p>
              ) : (
                <div className="space-y-2">
                  {unreadReports.map((report) => (
                    <div
                      key={report.id}
                      className={`border rounded-lg p-3 transition-colors ${
                        selectedReport?.id === report.id ? 'bg-muted border-primary' : ''
                      }`}
                    >
                      <div 
                        className="cursor-pointer mb-2"
                        onClick={() => handleReportSelect(report)}
                      >
                        <div className="font-semibold text-sm mb-1">
                          {report.team_members?.name || "Unknown"}
                        </div>
                        <div className="text-xs text-muted-foreground mb-1">
                          {report.team_members?.role}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(report.created_at).toLocaleDateString()} • {new Date(report.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      <div className="flex gap-2 mt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => handleAnalyzeReport(report)}
                          disabled={analyzing === report.id}
                        >
                          {analyzing === report.id ? (
                            <>
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              Analyzing...
                            </>
                          ) : (
                            <>
                              <TrendingUp className="h-3 w-3 mr-1" />
                              Analyze
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="flex-1"
                          onClick={() => {
                            setReportToDelete(report.id);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Check-in Form */}
          {loading ? (
            <div className="lg:col-span-2 flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Submit Check-in & Analyze</CardTitle>
                <CardDescription>Enter daily metrics and notes for AI performance analysis</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="member">Team Member</Label>
                    <Select value={selectedMember} onValueChange={handleMemberSelect}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a team member" />
                      </SelectTrigger>
                      <SelectContent>
                        {teamMembers.map((member) => (
                          <SelectItem key={member.id} value={member.id}>
                            {member.name} - {member.role}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedMemberData?.target_metrics && (
                    <div className="space-y-4">
                      <h3 className="font-semibold">Metrics</h3>
                      {Object.entries(selectedMemberData.target_metrics).map(([key, target]) => (
                        <div key={key} className="space-y-2">
                          <Label htmlFor={key}>
                            {key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())} (Target: {String(target)})
                          </Label>
                          <Input
                            id={key}
                            type="text"
                            value={metrics[key] || ""}
                            onChange={(e) => handleMetricChange(key, e.target.value)}
                            placeholder={`Enter ${key}`}
                            required
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Additional context or team member's report..."
                      rows={6}
                    />
                  </div>

                  <Button type="submit" disabled={submitting || !selectedMember} className="w-full">
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      "Submit & Analyze"
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Report?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this report. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteReport} 
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Report"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CheckIns;
