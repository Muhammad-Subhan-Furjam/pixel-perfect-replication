import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Plus, Trash2 } from "lucide-react";

interface TeamMember {
  id?: string;
  name: string;
  role: string;
  department: string;
  target_metrics: Record<string, string | number>;
}

interface TeamMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member?: TeamMember | null;
  onSuccess: () => void;
}

export const TeamMemberDialog = ({ open, onOpenChange, member, onSuccess }: TeamMemberDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<TeamMember>({
    name: "",
    role: "",
    department: "",
    target_metrics: {},
  });
  const [metricKey, setMetricKey] = useState("");
  const [metricValue, setMetricValue] = useState("");

  useEffect(() => {
    if (member) {
      setFormData(member);
    } else {
      setFormData({
        name: "",
        role: "",
        department: "",
        target_metrics: {},
      });
    }
  }, [member, open]);

  const handleAddMetric = () => {
    if (metricKey && metricValue) {
      setFormData((prev) => ({
        ...prev,
        target_metrics: {
          ...prev.target_metrics,
          [metricKey]: metricValue,
        },
      }));
      setMetricKey("");
      setMetricValue("");
    }
  };

  const handleRemoveMetric = (key: string) => {
    setFormData((prev) => {
      const newMetrics = { ...prev.target_metrics };
      delete newMetrics[key];
      return { ...prev, target_metrics: newMetrics };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (member?.id) {
        // Update existing member
        const { error } = await supabase
          .from("team_members")
          .update({
            name: formData.name,
            role: formData.role,
            department: formData.department,
            target_metrics: formData.target_metrics,
          })
          .eq("id", member.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Team member updated successfully",
        });
      } else {
        // Create new member
        const { error } = await supabase.from("team_members").insert({
          user_id: user!.id,
          name: formData.name,
          role: formData.role,
          department: formData.department,
          target_metrics: formData.target_metrics,
        });

        if (error) throw error;

        toast({
          title: "Success",
          description: "Team member added successfully",
        });
      }

      onSuccess();
      onOpenChange(false);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{member ? "Edit Team Member" : "Add Team Member"}</DialogTitle>
          <DialogDescription>
            {member ? "Update team member details and KPI targets" : "Add a new team member with their role and KPI targets"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role *</Label>
              <Input
                id="role"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="department">Department</Label>
            <Input
              id="department"
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
            />
          </div>

          <div className="space-y-4">
            <Label>KPI Targets</Label>
            <div className="space-y-2">
              {Object.entries(formData.target_metrics).map(([key, value]) => (
                <div key={key} className="flex items-center gap-2 p-2 bg-muted rounded-md">
                  <span className="flex-1 font-medium">{key}:</span>
                  <span className="flex-1">{value}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveMetric(key)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="grid gap-2 md:grid-cols-3">
              <Input
                placeholder="Metric name (e.g., patients_per_day)"
                value={metricKey}
                onChange={(e) => setMetricKey(e.target.value)}
              />
              <Input
                placeholder="Target value (e.g., 20)"
                value={metricValue}
                onChange={(e) => setMetricValue(e.target.value)}
              />
              <Button type="button" variant="outline" onClick={handleAddMetric}>
                <Plus className="h-4 w-4 mr-2" />
                Add Metric
              </Button>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : member ? (
                "Update Member"
              ) : (
                "Add Member"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
