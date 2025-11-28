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
import { Loader2, Copy } from "lucide-react";

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
  const [unreadReports, setUnreadReports] = useState<UnreadReport[]>([]);

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
        .select("*")
        .eq("is_read", false)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setUnreadReports(data || []);
    } catch (error: any) {
      console.error("Error fetching reports:", error);
    }
  };

  const handleCopyReport = async (report: UnreadReport) => {
    // Copy to notes
    setNotes(report.report_text);
    
    // Select the team member
    setSelectedMember(report.team_member_id);
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

    toast({
      title: "Report Copied",
      description: "The report has been copied to the notes field",
    });
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

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Daily Check-ins</h2>
          <p className="text-muted-foreground">Submit daily performance metrics for team members</p>
        </div>

        {unreadReports.length > 0 && (
          <Card className="mb-6 border-primary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="animate-pulse">🔔</span> New Team Member Reports
              </CardTitle>
              <CardDescription>Click to copy and analyze reports</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {unreadReports.map((report) => {
                  const member = teamMembers.find(m => m.id === report.team_member_id);
                  return (
                    <div
                      key={report.id}
                      className="border rounded-lg p-4 hover:bg-muted cursor-pointer transition-colors"
                      onClick={() => handleCopyReport(report)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-semibold">{member?.name || "Unknown"}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {new Date(report.created_at).toLocaleString()}
                          </span>
                          <Copy className="h-4 w-4 text-primary" />
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {report.report_text}
                      </p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <Card className="max-w-2xl">
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
                  <Label htmlFor="notes">Notes (Optional)</Label>
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
        )}
      </main>
    </div>
  );
};

export default CheckIns;
