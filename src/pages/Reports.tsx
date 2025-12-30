import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Header } from "@/components/Header";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Send, MessageSquare, User, Clock } from "lucide-react";
import { format } from "date-fns";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface TeamMember {
  id: string;
  name: string;
}

interface Report {
  id: string;
  report_text: string;
  date: string;
  created_at: string;
  is_from_ceo: boolean;
  is_read: boolean;
}

const Reports = () => {
  const { user } = useAuth();
  const { role, loading: roleLoading } = useUserRole();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [teamMember, setTeamMember] = useState<TeamMember | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [reportText, setReportText] = useState("");

  const isCEO = role === "ceo";

  useEffect(() => {
    if (user && !roleLoading && !isCEO) {
      fetchTeamMemberData();
    } else if (!roleLoading && isCEO) {
      setLoading(false);
    }
  }, [user, roleLoading, isCEO]);

  const fetchTeamMemberData = async () => {
    setLoading(true);
    try {
      // Find the team member linked to this auth user
      const { data: memberData, error: memberError } = await supabase
        .from("team_members")
        .select("id, name")
        .eq("auth_user_id", user?.id)
        .maybeSingle();

      if (memberError) throw memberError;

      if (memberData) {
        setTeamMember(memberData);
        await fetchReports(memberData.id);
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

  const fetchReports = async (teamMemberId: string) => {
    try {
      // Get reports submitted by this team member
      const { data: myReports, error: myError } = await supabase
        .from("team_member_reports")
        .select("*")
        .eq("team_member_id", teamMemberId)
        .eq("is_from_ceo", false)
        .order("created_at", { ascending: false });

      if (myError) throw myError;

      // Get reports sent to this team member from CEO
      const { data: ceoReports, error: ceoError } = await supabase
        .from("team_member_reports")
        .select("*")
        .eq("recipient_team_member_id", teamMemberId)
        .eq("is_from_ceo", true)
        .order("created_at", { ascending: false });

      if (ceoError) throw ceoError;

      // Combine and sort by date
      const allReports = [...(myReports || []), ...(ceoReports || [])].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setReports(allReports);

      // Mark unread CEO reports as read
      const unreadReports = (ceoReports || []).filter(r => !r.is_read);
      if (unreadReports.length > 0) {
        await supabase
          .from("team_member_reports")
          .update({ is_read: true })
          .in("id", unreadReports.map(r => r.id));
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamMember || !reportText.trim()) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("team_member_reports")
        .insert({
          team_member_id: teamMember.id,
          report_text: reportText.trim(),
          is_from_ceo: false,
        });

      if (error) throw error;

      toast({
        title: "Report Submitted",
        description: "Your daily report has been sent to your manager",
      });

      setReportText("");
      await fetchReports(teamMember.id);
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

  // CEO redirect message
  if (isCEO) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-6 sm:py-8">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">
                This page is for team members to submit their reports.
                <br />
                View team member reports in the Dashboard.
              </p>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  // Team member not linked
  if (!teamMember) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-6 sm:py-8">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <User className="h-12 w-12 text-muted-foreground mb-4" />
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
          <h2 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">Daily Reports</h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            Submit your daily update and view feedback from your manager
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Submit Report Card */}
          <Card>
            <CardHeader>
              <CardTitle>Submit Today's Report</CardTitle>
              <CardDescription>
                Share your daily progress, blockers, and updates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitReport} className="space-y-4">
                <Textarea
                  value={reportText}
                  onChange={(e) => setReportText(e.target.value)}
                  placeholder="What did you accomplish today? Any blockers or updates to share?"
                  rows={6}
                  required
                />
                <Button type="submit" disabled={submitting || !reportText.trim()} className="w-full">
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Submit Report
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Reports History Card */}
          <Card>
            <CardHeader>
              <CardTitle>Report History</CardTitle>
              <CardDescription>
                Your submitted reports and feedback
              </CardDescription>
            </CardHeader>
            <CardContent>
              {reports.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No reports yet. Submit your first report!</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                  {reports.map((report, index) => (
                    <div key={report.id}>
                      <div className={`p-3 rounded-lg ${
                        report.is_from_ceo 
                          ? "bg-primary/10 border border-primary/20" 
                          : "bg-muted"
                      }`}>
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant={report.is_from_ceo ? "default" : "secondary"}>
                            {report.is_from_ceo ? "From Manager" : "Your Report"}
                          </Badge>
                          <div className="flex items-center text-xs text-muted-foreground">
                            <Clock className="h-3 w-3 mr-1" />
                            {format(new Date(report.created_at), "MMM d, h:mm a")}
                          </div>
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{report.report_text}</p>
                      </div>
                      {index < reports.length - 1 && <Separator className="my-4" />}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Reports;
