import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Header } from "@/components/Header";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Shield, Users, Crown, Briefcase } from "lucide-react";
import Footer from "@/components/Footer";

interface UserWithRole {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  can_manage_team: boolean;
}

type AppRole = "team_member" | "executive_assistant" | "hr";

const Permissions = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [savingRole, setSavingRole] = useState<string | null>(null);
  const [users, setUsers] = useState<UserWithRole[]>([]);

  // Track current HR and EA
  const currentHR = users.find((u) => u.role === "hr");
  const currentEA = users.find((u) => u.role === "executive_assistant");

  useEffect(() => {
    if (user) {
      fetchUsersWithPermissions();
    }
  }, [user]);

  const fetchUsersWithPermissions = async () => {
    setLoading(true);
    try {
      // Get team members who have linked auth accounts
      const { data: teamMembers, error: teamError } = await supabase
        .from("team_members")
        .select("auth_user_id, name, email")
        .not("auth_user_id", "is", null);

      if (teamError) throw teamError;

      // Get the auth_user_ids of actual team members
      const teamMemberAuthIds = new Set(
        (teamMembers || []).map((tm) => tm.auth_user_id).filter(Boolean)
      );

      // Get profiles only for team members with auth accounts
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, email, full_name");

      if (profilesError) throw profilesError;

      // Get user roles
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) throw rolesError;

      // Get permissions
      const { data: permissions, error: permissionsError } = await supabase
        .from("user_permissions")
        .select("user_id, can_manage_team");

      if (permissionsError) throw permissionsError;

      // Combine data - only include users who are team members
      const usersData: UserWithRole[] = (profiles || [])
        .filter((p) => p.id !== user?.id && teamMemberAuthIds.has(p.id)) // Only team members, exclude CEO
        .map((profile) => {
          const userRole = roles?.find((r) => r.user_id === profile.id);
          const userPermission = permissions?.find((p) => p.user_id === profile.id);
          const teamMember = teamMembers?.find((tm) => tm.auth_user_id === profile.id);

          return {
            id: profile.id,
            email: profile.email || teamMember?.email || "No email",
            full_name: profile.full_name || teamMember?.name,
            role: userRole?.role || "team_member",
            can_manage_team: userPermission?.can_manage_team || false,
          };
        });

      setUsers(usersData);
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

  const handleTogglePermission = async (userId: string, currentValue: boolean) => {
    setSaving(userId);
    try {
      if (currentValue) {
        // Remove permission
        const { error } = await supabase
          .from("user_permissions")
          .delete()
          .eq("user_id", userId);

        if (error) throw error;
      } else {
        // Add or update permission
        const { error } = await supabase
          .from("user_permissions")
          .upsert({
            user_id: userId,
            can_manage_team: true,
            granted_by: user?.id,
          });

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: `Permission ${currentValue ? "revoked" : "granted"} successfully`,
      });

      // Update local state
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, can_manage_team: !currentValue } : u
        )
      );
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(null);
    }
  };

  const handleRoleChange = async (userId: string, newRole: AppRole) => {
    const targetUser = users.find((u) => u.id === userId);
    if (!targetUser) return;

    // Check if trying to assign a role that's already taken
    if (newRole === "hr" && currentHR && currentHR.id !== userId) {
      toast({
        title: "Role Already Assigned",
        description: `${currentHR.full_name || currentHR.email} is currently the HR. Please remove their role first.`,
        variant: "destructive",
      });
      return;
    }

    if (newRole === "executive_assistant" && currentEA && currentEA.id !== userId) {
      toast({
        title: "Role Already Assigned",
        description: `${currentEA.full_name || currentEA.email} is currently the Executive Assistant. Please remove their role first.`,
        variant: "destructive",
      });
      return;
    }

    setSavingRole(userId);
    try {
      if (newRole === "team_member") {
        // Remove the role entry entirely (they become a regular team member)
        const { error } = await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", userId);

        if (error) throw error;
      } else {
        // Upsert the new role
        const { error } = await supabase
          .from("user_roles")
          .upsert({
            user_id: userId,
            role: newRole,
          }, { onConflict: "user_id" });

        if (error) throw error;

        // Send role assignment notification email
        try {
          const { data: ceoProfile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", user?.id)
            .single();

          await supabase.functions.invoke("send-role-assignment-email", {
            body: {
              user_id: userId,
              role: newRole,
              assigned_by_name: ceoProfile?.full_name || "CEO",
            },
          });
        } catch (emailError) {
          console.error("Failed to send role assignment email:", emailError);
          // Don't fail the role change if email fails
        }
      }

      toast({
        title: "Success",
        description: `Role updated to ${formatRole(newRole)} successfully`,
      });

      // Update local state
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, role: newRole } : u
        )
      );
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSavingRole(null);
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "ceo":
        return "default";
      case "executive_assistant":
        return "secondary";
      case "hr":
        return "outline";
      default:
        return "outline";
    }
  };

  const formatRole = (role: string) => {
    return role
      .replace("_", " ")
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "executive_assistant":
        return <Crown className="h-4 w-4" />;
      case "hr":
        return <Briefcase className="h-4 w-4" />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-6 sm:py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">Access Permissions</h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              Manage roles and team management permissions
            </p>
          </div>
        </div>

        {/* Role Assignment Info */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Role & Permission Management
                </CardTitle>
                <CardDescription>
                  Assign HR or Executive Assistant roles and grant team management access
                </CardDescription>
              </div>
              <Badge variant="secondary">Active</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Executive Assistant</p>
                <div className="flex items-center gap-2">
                  <Crown className="h-4 w-4 text-primary" />
                  <p className="font-medium">{currentEA ? (currentEA.full_name || currentEA.email) : "Not assigned"}</p>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">HR</p>
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-primary" />
                  <p className="font-medium">{currentHR ? (currentHR.full_name || currentHR.email) : "Not assigned"}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : users.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">
                No other users found.
                <br />
                Users will appear here after they sign up.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {users.map((userData) => (
              <Card key={userData.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{userData.full_name || userData.email}</CardTitle>
                      <CardDescription>{userData.email}</CardDescription>
                    </div>
                    <Badge variant={getRoleBadgeVariant(userData.role)} className="flex items-center gap-1">
                      {getRoleIcon(userData.role)}
                      {formatRole(userData.role)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Role Assignment</p>
                      {savingRole === userData.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Select
                          value={userData.role}
                          onValueChange={(value) => handleRoleChange(userData.id, value as AppRole)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="team_member">Team Member</SelectItem>
                            <SelectItem 
                              value="executive_assistant"
                              disabled={!!currentEA && currentEA.id !== userData.id}
                            >
                              Executive Assistant {currentEA && currentEA.id !== userData.id ? "(Assigned)" : ""}
                            </SelectItem>
                            <SelectItem 
                              value="hr"
                              disabled={!!currentHR && currentHR.id !== userData.id}
                            >
                              HR {currentHR && currentHR.id !== userData.id ? "(Assigned)" : ""}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Team Management</p>
                      <div className="flex items-center gap-3 pt-2">
                        {saving === userData.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Switch
                              id={`permission-${userData.id}`}
                              checked={userData.can_manage_team}
                              onCheckedChange={() =>
                                handleTogglePermission(userData.id, userData.can_manage_team)
                              }
                            />
                            <Label htmlFor={`permission-${userData.id}`} className="text-sm">
                              {userData.can_manage_team ? "Enabled" : "Disabled"}
                            </Label>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Permissions;
