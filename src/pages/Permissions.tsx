import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/Header";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Shield, UserCog, Users } from "lucide-react";
import Footer from "@/components/Footer";

interface UserWithRole {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  can_manage_team: boolean;
}

const Permissions = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [users, setUsers] = useState<UserWithRole[]>([]);

  useEffect(() => {
    if (user) {
      fetchUsersWithPermissions();
    }
  }, [user]);

  const fetchUsersWithPermissions = async () => {
    setLoading(true);
    try {
      // Get all profiles with their roles and permissions
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

      // Combine data
      const usersData: UserWithRole[] = (profiles || [])
        .filter((p) => p.id !== user?.id) // Exclude current user (CEO)
        .map((profile) => {
          const userRole = roles?.find((r) => r.user_id === profile.id);
          const userPermission = permissions?.find((p) => p.user_id === profile.id);

          return {
            id: profile.id,
            email: profile.email || "No email",
            full_name: profile.full_name,
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

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-6 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">Access Permissions</h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            Manage who can add or remove team members
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-primary" />
              <div>
                <CardTitle className="text-lg">Permission Management</CardTitle>
                <CardDescription>
                  Grant team management access to Executive Assistants or HR staff
                </CardDescription>
              </div>
            </div>
          </CardHeader>
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
          <div className="space-y-4">
            {users.map((userData) => (
              <Card key={userData.id}>
                <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center">
                      <UserCog className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {userData.full_name || userData.email}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-sm text-muted-foreground">{userData.email}</p>
                        <Badge variant={getRoleBadgeVariant(userData.role)}>
                          {formatRole(userData.role)}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Label htmlFor={`permission-${userData.id}`} className="text-sm">
                      Can manage team
                    </Label>
                    {saving === userData.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Switch
                        id={`permission-${userData.id}`}
                        checked={userData.can_manage_team}
                        onCheckedChange={() =>
                          handleTogglePermission(userData.id, userData.can_manage_team)
                        }
                      />
                    )}
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