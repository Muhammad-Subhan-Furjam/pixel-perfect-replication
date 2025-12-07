import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Header } from "@/components/Header";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { format } from "date-fns";

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
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [teamMember, setTeamMember] = useState<TeamMember | null>(null);
  const [todayMetrics, setTodayMetrics] = useState<TodayMetrics | null>(null);
  const [metrics, setMetrics] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (user) {
      fetchTeamMemberData();
    }
  }, [user]);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  if (!teamMember) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-6 sm:py-8">
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
    </div>
  );
};

export default Metrics;