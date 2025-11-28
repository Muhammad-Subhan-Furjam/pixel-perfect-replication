import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Header } from "@/components/Header";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface Report {
  id: string;
  report_text: string;
  date: string;
  created_at: string;
  is_from_ceo: boolean;
  team_member_id: string;
  recipient_team_member_id: string | null;
}

interface TeamMember {
  id: string;
  name: string;
  role: string;
  auth_user_id: string | null;
}

const Reports = () => {
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const [reportText, setReportText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [previousReports, setPreviousReports] = useState<Report[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [selectedTeamMember, setSelectedTeamMember] = useState<string>("");
  const [currentTeamMemberId, setCurrentTeamMemberId] = useState<string | null>(null);

  useEffect(() => {
    if (user && userRole) {
      if (userRole === 'ceo') {
        fetchTeamMembers();
      } else {
        fetchCurrentTeamMember();
      }
      fetchPreviousReports();
    }
  }, [user, userRole]);

  const fetchCurrentTeamMember = async () => {
    try {
      const { data, error } = await supabase
        .from("team_members")
        .select("id")
        .eq("auth_user_id", user!.id)
        .single();

      if (error) throw error;
      setCurrentTeamMemberId(data?.id || null);
    } catch (error: any) {
      console.error("Error fetching team member:", error);
    }
  };

  const fetchTeamMembers = async () => {
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
    }
  };

  const fetchPreviousReports = async () => {
    setLoading(true);
    try {
      if (userRole === 'ceo') {
        // CEO sees all reports
        const { data, error } = await supabase
          .from("team_member_reports")
          .select(`
            *,
            team_members!team_member_id (name, role),
            recipient:team_members!recipient_team_member_id (name)
          `)
          .order("created_at", { ascending: false })
          .limit(20);

        if (error) throw error;
        setPreviousReports(data || []);
      } else {
        // Team member sees only their own reports and reports sent to them
        const { data: teamMember, error: teamError } = await supabase
          .from("team_members")
          .select("id")
          .eq("auth_user_id", user!.id)
          .single();

        if (teamError) throw teamError;

        const { data, error } = await supabase
          .from("team_member_reports")
          .select("*")
          .or(`team_member_id.eq.${teamMember.id},recipient_team_member_id.eq.${teamMember.id}`)
          .order("created_at", { ascending: false })
          .limit(20);

        if (error) throw error;
        setPreviousReports(data || []);
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

    if (userRole === 'ceo' && !selectedTeamMember) {
      toast({
        title: "Error",
        description: "Please select a team member",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      if (userRole === 'ceo') {
        // CEO sending report to team member
        const { error } = await supabase
          .from("team_member_reports")
          .insert({
            team_member_id: selectedTeamMember,
            recipient_team_member_id: selectedTeamMember,
            report_text: reportText,
            date: new Date().toISOString().split('T')[0],
            is_from_ceo: true,
            is_read: false,
          });

        if (error) throw error;

        toast({
          title: "Success",
          description: "Report sent to team member successfully",
        });
      } else {
        // Team member sending report to CEO
        if (!currentTeamMemberId) {
          throw new Error("Team member profile not found");
        }

        const { error } = await supabase
          .from("team_member_reports")
          .insert({
            team_member_id: currentTeamMemberId,
            report_text: reportText,
            date: new Date().toISOString().split('T')[0],
            is_from_ceo: false,
            is_read: false,
          });

        if (error) throw error;

        toast({
          title: "Success",
          description: "Your report has been submitted successfully",
        });
      }

      setReportText("");
      setSelectedTeamMember("");
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

  const getReportLabel = (report: Report) => {
    if (userRole === 'ceo') {
      if (report.is_from_ceo) {
        return `Sent to ${(report as any).recipient?.name || 'Team Member'}`;
      }
      return `From ${(report as any).team_members?.name || 'Team Member'}`;
    } else {
      return report.is_from_ceo ? 'From CEO' : 'Sent to CEO';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">
            {userRole === 'ceo' ? 'Team Reports' : 'Daily Reports'}
          </h2>
          <p className="text-muted-foreground">
            {userRole === 'ceo' 
              ? 'Send reports to team members and view submitted reports' 
              : 'Submit your daily work updates and view feedback from CEO'}
          </p>
        </div>

        <div className="grid gap-6 max-w-4xl">
          <Card>
            <CardHeader>
              <CardTitle>
                {userRole === 'ceo' ? 'Send Report to Team Member' : "Today's Report"}
              </CardTitle>
              <CardDescription>
                {userRole === 'ceo'
                  ? 'Select a team member and write a report for them'
                  : 'Submit your daily work report for CEO review'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {userRole === 'ceo' && (
                  <div className="space-y-2">
                    <Select value={selectedTeamMember} onValueChange={setSelectedTeamMember}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select team member" />
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
                )}
                <Textarea
                  value={reportText}
                  onChange={(e) => setReportText(e.target.value)}
                  placeholder={
                    userRole === 'ceo'
                      ? "Write feedback or instructions for the team member..."
                      : "Describe your work, achievements, challenges, and blockers..."
                  }
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
                    userRole === 'ceo' ? 'Send Report' : 'Submit Report'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Previous Reports</CardTitle>
              <CardDescription>
                {userRole === 'ceo' ? 'All team reports' : 'Your recent submissions and CEO feedback'}
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
                        <div>
                          <span className={`text-sm font-medium ${report.is_from_ceo ? 'text-primary' : 'text-foreground'}`}>
                            {getReportLabel(report)}
                          </span>
                          {userRole === 'ceo' && !report.is_from_ceo && (
                            <span className="ml-2 text-xs text-muted-foreground">
                              ({(report as any).team_members?.role})
                            </span>
                          )}
                        </div>
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

export default Reports;
