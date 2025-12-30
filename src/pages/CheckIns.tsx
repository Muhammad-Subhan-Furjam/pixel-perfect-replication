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
import { Loader2 } from "lucide-react";
import Footer from "@/components/Footer";

interface TeamMember {
  id: string;
  name: string;
  role: string;
  target_metrics: any;
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
      <Footer />
    </div>
  );
};

export default CheckIns;
