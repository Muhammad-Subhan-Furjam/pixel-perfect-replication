import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Header } from "@/components/Header";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { UserGreeting } from "@/components/UserGreeting";

interface Report {
  id: string;
  report_text: string;
  date: string;
  created_at: string;
  is_from_ceo: boolean;
}

const ReportsTeamMember = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [reportText, setReportText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [previousReports, setPreviousReports] = useState<Report[]>([]);
  const [currentTeamMemberId, setCurrentTeamMemberId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchCurrentTeamMember();
    }
  }, [user]);

  const fetchCurrentTeamMember = async () => {
    try {
      const { data, error } = await supabase
        .from("team_members")
        .select("id")
        .eq("auth_user_id", user!.id)
        .maybeSingle();

      if (error) throw error;
      setCurrentTeamMemberId(data?.id || null);
      
      if (data?.id) {
        fetchPreviousReports(data.id);
      } else {
        setLoading(false);
      }
    } catch (error: any) {
      console.error("Error fetching team member:", error);
      setLoading(false);
    }
  };

  const fetchPreviousReports = async (teamMemberId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("team_member_reports")
        .select("*")
        .or(`team_member_id.eq.${teamMemberId},recipient_team_member_id.eq.${teamMemberId}`)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      setPreviousReports(data || []);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportText.trim()) {
      toast({
        title: "Error",
        description: "Please enter your report",
        variant: "destructive",
      });
      return;
    }

    if (!currentTeamMemberId) {
      toast({
        title: "Error",
        description: "Team member profile not found. Please contact administrator.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const { error: insertError } = await supabase
        .from("team_member_reports")
        .insert({
          team_member_id: currentTeamMemberId,
          report_text: reportText,
          date: new Date().toISOString().split('T')[0],
          is_from_ceo: false,
          is_read: false,
        });

      if (insertError) throw insertError;

      // Send email notification to CEO
      try {
        await supabase.functions.invoke('notify-ceo-new-report', {
          body: { teamMemberId: currentTeamMemberId }
        });
      } catch (emailError) {
        console.error('Error sending email notification:', emailError);
      }

      toast({
        title: "Success",
        description: "Your report has been submitted successfully",
      });

      setReportText("");
      fetchPreviousReports(currentTeamMemberId);
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

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <UserGreeting />
        
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Daily Reports</h2>
          <p className="text-muted-foreground">
            Submit your daily work updates and view feedback from CEO
          </p>
        </div>

        <div className="grid gap-6 max-w-4xl">
          <Card>
            <CardHeader>
              <CardTitle>Today's Report</CardTitle>
              <CardDescription>
                Submit your daily work report for CEO review
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <Textarea
                  value={reportText}
                  onChange={(e) => setReportText(e.target.value)}
                  placeholder="Describe your work, achievements, challenges, and blockers..."
                  rows={10}
                  required
                />
                <Button type="submit" disabled={submitting} className="w-full">
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Report'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Previous Reports</CardTitle>
              <CardDescription>
                Your recent submissions and CEO feedback
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : previousReports.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No reports yet</p>
              ) : (
                <div className="space-y-4">
                  {previousReports.map((report) => (
                    <div key={report.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <span className={`text-sm font-medium ${report.is_from_ceo ? 'text-primary' : 'text-foreground'}`}>
                          {report.is_from_ceo ? 'From CEO' : 'Sent to CEO'}
                        </span>
                        <div className="text-sm text-muted-foreground">
                          {new Date(report.created_at).toLocaleDateString()} at{" "}
                          {new Date(report.created_at).toLocaleTimeString()}
                        </div>
                      </div>
                      <p className="whitespace-pre-wrap">{report.report_text}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default ReportsTeamMember;
