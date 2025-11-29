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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface TeamMember {
  id: string;
  name: string;
  role: string;
  auth_user_id: string | null;
}

interface TeamMemberWithEmail extends TeamMember {
  email?: string;
}

const ReportsCEO = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [reportText, setReportText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [teamMembers, setTeamMembers] = useState<TeamMemberWithEmail[]>([]);
  const [selectedTeamMember, setSelectedTeamMember] = useState<string>("");

  useEffect(() => {
    if (user) {
      fetchTeamMembers();
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

      // Fetch emails for team members with auth_user_id
      const membersWithEmails = await Promise.all(
        (data || []).map(async (member) => {
          if (member.auth_user_id) {
            const { data: authData } = await supabase.auth.admin.getUserById(member.auth_user_id);
            return { ...member, email: authData.user?.email };
          }
          return member;
        })
      );

      setTeamMembers(membersWithEmails);
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
    if (!reportText.trim() || !selectedTeamMember) {
      toast({
        title: "Error",
        description: "Please select a team member and enter a report",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
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

      setReportText("");
      setSelectedTeamMember("");
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

  const handleAnalyze = async (memberId: string) => {
    try {
      const { data: reports, error } = await supabase
        .from("team_member_reports")
        .select("*")
        .eq("team_member_id", memberId)
        .eq("is_from_ceo", false)
        .order("created_at", { ascending: false })
        .limit(1);

      if (error) throw error;

      if (reports && reports.length > 0) {
        // Navigate to check-ins with this report
        window.location.href = `/check-ins?report=${reports[0].id}`;
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Team Reports</h2>
          <p className="text-muted-foreground">
            Send reports to team members and manage submissions
          </p>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Send Report to Team Member</CardTitle>
              <CardDescription>
                Select a team member and write a report for them
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
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
                <Textarea
                  value={reportText}
                  onChange={(e) => setReportText(e.target.value)}
                  placeholder="Write feedback or instructions for the team member..."
                  rows={10}
                  required
                />
                <Button type="submit" disabled={submitting} className="w-full">
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    'Send Report'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Team Members</CardTitle>
              <CardDescription>
                View all team members and their latest reports
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {teamMembers.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell className="font-medium">{member.name}</TableCell>
                        <TableCell>{member.role}</TableCell>
                        <TableCell>{member.email || 'Not registered'}</TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            onClick={() => handleAnalyze(member.id)}
                          >
                            Analyze
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default ReportsCEO;
