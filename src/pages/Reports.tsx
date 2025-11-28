import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Header } from "@/components/Header";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Report {
  id: string;
  report_text: string;
  date: string;
  created_at: string;
}

const Reports = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [reportText, setReportText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [previousReports, setPreviousReports] = useState<Report[]>([]);

  useEffect(() => {
    if (user) {
      fetchPreviousReports();
    }
  }, [user]);

  const fetchPreviousReports = async () => {
    setLoading(true);
    try {
      // Get team member linked to this user
      const { data: teamMember, error: teamError } = await supabase
        .from("team_members")
        .select("id")
        .eq("auth_user_id", user!.id)
        .single();

      if (teamError) throw teamError;

      if (!teamMember) {
        toast({
          title: "Error",
          description: "You are not linked to a team member profile",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase
        .from("team_member_reports")
        .select("*")
        .eq("team_member_id", teamMember.id)
        .order("created_at", { ascending: false })
        .limit(10);

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

    setSubmitting(true);
    try {
      // Get team member linked to this user
      const { data: teamMember, error: teamError } = await supabase
        .from("team_members")
        .select("id")
        .eq("auth_user_id", user!.id)
        .single();

      if (teamError) throw teamError;

      if (!teamMember) {
        toast({
          title: "Error",
          description: "You are not linked to a team member profile",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from("team_member_reports")
        .insert({
          team_member_id: teamMember.id,
          report_text: reportText,
          date: new Date().toISOString().split('T')[0],
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Your report has been submitted successfully",
      });

      setReportText("");
      fetchPreviousReports();
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
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Submit Daily Report</h2>
          <p className="text-muted-foreground">Share your daily work updates and achievements</p>
        </div>

        <div className="grid gap-6 max-w-4xl">
          <Card>
            <CardHeader>
              <CardTitle>Today's Report</CardTitle>
              <CardDescription>Submit your daily work report for review</CardDescription>
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
                    "Submit Report"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Previous Reports</CardTitle>
              <CardDescription>Your recent submissions</CardDescription>
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
                      <div className="text-sm text-muted-foreground mb-2">
                        {new Date(report.created_at).toLocaleDateString()} at{" "}
                        {new Date(report.created_at).toLocaleTimeString()}
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

export default Reports;