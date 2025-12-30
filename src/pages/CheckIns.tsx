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
import { Loader2, FileText, Clock, Copy, Check } from "lucide-react";
import { format } from "date-fns";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TeamMember {
  id: string;
  name: string;
  role: string;
  target_metrics: any;
}

interface TeamMemberReport {
  id: string;
  team_member_id: string;
  report_text: string;
  created_at: string;
  is_read: boolean;
  team_member_name?: string;
}

const CheckIns = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [selectedMember, setSelectedMember] = useState<string>("");
  const [metrics, setMetrics] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [todayReports, setTodayReports] = useState<TeamMemberReport[]>([]);
  const [copiedReportId, setCopiedReportId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchTeamMembers();
      fetchTodayReports();
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

  const fetchTodayReports = async () => {
    try {
      const today = new Date().toISOString().split("T")[0];
      
      // Get today's reports submitted by team members (not from CEO)
      const { data: reports, error } = await supabase
        .from("team_member_reports")
        .select("id, team_member_id, report_text, created_at, is_read")
        .eq("date", today)
        .eq("is_from_ceo", false)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Get team member names
      const { data: members } = await supabase
        .from("team_members")
        .select("id, name");

      const memberMap = new Map((members || []).map(m => [m.id, m.name]));
      
      const reportsWithNames = (reports || []).map(r => ({
        ...r,
        team_member_name: memberMap.get(r.team_member_id) || "Unknown",
      }));

      setTodayReports(reportsWithNames);
    } catch (error: any) {
      console.error("Error fetching today's reports:", error);
    }
  };

  const handleCopyToNotes = async (report: TeamMemberReport) => {
    // Set the notes field with the report text
    setNotes(report.report_text);
    
    // Select the team member who submitted the report
    const member = teamMembers.find(m => m.id === report.team_member_id);
    if (member) {
      handleMemberSelect(member.id);
    }

    // Mark report as read
    await supabase
      .from("team_member_reports")
      .update({ is_read: true })
      .eq("id", report.id);

    setCopiedReportId(report.id);
    setTimeout(() => setCopiedReportId(null), 2000);

    toast({
      title: "Report copied",
      description: `${report.team_member_name}'s report has been copied to the notes field`,
    });

    // Refresh reports to update read status
    fetchTodayReports();
  };

  const handleMemberSelect = (memberId: string) => {
    setSelectedMember(memberId);
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

      const today = new Date().toISOString().split('T')[0];

      // Insert check-in
      const { data: checkIn, error: checkInError } = await supabase
        .from("check_ins")
        .insert({
          user_id: user!.id,
          team_member_id: selectedMember,
          metrics,
          notes,
          date: today,
        })
        .select()
        .single();

      if (checkInError) throw checkInError;

      // Update or insert daily_metrics for this team member
      const { data: existingMetrics, error: fetchError } = await supabase
        .from("daily_metrics")
        .select("id")
        .eq("team_member_id", selectedMember)
        .eq("date", today)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (existingMetrics) {
        // Update existing metrics
        const { error: updateError } = await supabase
          .from("daily_metrics")
          .update({ 
            metrics, 
            notes: notes || null,
            submitted_at: new Date().toISOString()
          })
          .eq("id", existingMetrics.id);

        if (updateError) throw updateError;
      } else {
        // Insert new metrics
        const { error: insertError } = await supabase
          .from("daily_metrics")
          .insert({
            team_member_id: selectedMember,
            user_id: user!.id,
            date: today,
            metrics,
            notes: notes || null,
          });

        if (insertError) throw insertError;
      }

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
        description: "Check-in submitted, metrics updated, and analyzed successfully",
      });

      // Reset form
      setSelectedMember("");
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

  const selectedMemberData = teamMembers.find((m) => m.id === selectedMember);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-6 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">Daily Check-ins</h2>
          <p className="text-sm sm:text-base text-muted-foreground">Submit daily performance metrics for team members</p>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Today's Team Reports */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Today's Reports
                </CardTitle>
                <CardDescription>
                  Reports submitted by team members today
                </CardDescription>
              </CardHeader>
              <CardContent>
                {todayReports.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No reports submitted today</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[400px] pr-4">
                    <div className="space-y-4">
                      {todayReports.map((report) => (
                        <div
                          key={report.id}
                          className={`p-4 rounded-lg border ${
                            report.is_read ? "bg-muted/50" : "bg-primary/5 border-primary/20"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div>
                              <p className="font-medium">{report.team_member_name}</p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                {format(new Date(report.created_at), "h:mm a")}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {!report.is_read && (
                                <Badge variant="default" className="text-xs">New</Badge>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleCopyToNotes(report)}
                                className="h-8"
                              >
                                {copiedReportId === report.id ? (
                                  <>
                                    <Check className="h-3 w-3 mr-1" />
                                    Copied
                                  </>
                                ) : (
                                  <>
                                    <Copy className="h-3 w-3 mr-1" />
                                    Use
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                          <p className="text-sm whitespace-pre-wrap">{report.report_text}</p>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>

            {/* Check-in Form */}
            <Card>
              <CardHeader>
                <CardTitle>Submit Check-in</CardTitle>
                <CardDescription>Enter daily metrics and notes for performance analysis</CardDescription>
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
                      placeholder="Any additional context or observations..."
                      rows={4}
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
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default CheckIns;
