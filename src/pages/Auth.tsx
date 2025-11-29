import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import logo from "@/assets/logo.png";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"ceo" | "team_member">("team_member");
  const [jobRole, setJobRole] = useState("");
  const [department, setDepartment] = useState("");
  const [kpiTargets, setKpiTargets] = useState("");
  const [loading, setLoading] = useState(false);
  const [ceoExists, setCeoExists] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
    // Check if CEO already exists
    checkCeoExists();
  }, [user, navigate]);

  const checkCeoExists = async () => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('id')
        .eq('role', 'ceo')
        .maybeSingle();
      
      if (error) throw error;
      setCeoExists(!!data);
    } catch (error: any) {
      console.error('Error checking CEO:', error);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        toast({
          title: "Welcome back!",
          description: "You've successfully signed in.",
        });
        navigate("/dashboard");
      } else {
        const redirectUrl = `${window.location.origin}/`;
        
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectUrl,
            data: {
              full_name: fullName,
            },
          },
        });

        if (signUpError) throw signUpError;

        // Insert user role
        if (signUpData.user) {
          const { error: roleError } = await supabase
            .from('user_roles')
            .insert({
              user_id: signUpData.user.id,
              role: role,
            });

          if (roleError) throw roleError;

          // If team member, create team_members record
          if (role === 'team_member') {
            const { error: teamMemberError } = await supabase
              .from('team_members')
              .insert({
                user_id: signUpData.user.id,
                auth_user_id: signUpData.user.id,
                name: fullName,
                role: jobRole || 'Team Member',
                department: department || null,
                target_metrics: kpiTargets ? JSON.parse(kpiTargets) : {}
              });

            if (teamMemberError) throw teamMemberError;
          }
        }

        toast({
          title: "Account created!",
          description: "You can now sign in to your account.",
        });
        
        setIsLogin(true);
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

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <img src={logo} alt="ResultsBoard" className="h-12 w-12" />
          </div>
          <CardTitle>{isLogin ? "Sign In" : "Create Account"}</CardTitle>
          <CardDescription>
            {isLogin
              ? "Sign in to access your ResultsBoard"
              : "Create an account to get started"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAuth} className="space-y-4">
            {!isLogin && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="John Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Account Type</Label>
                  <Select value={role} onValueChange={(value: "ceo" | "team_member") => setRole(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your account type" />
                    </SelectTrigger>
                    <SelectContent>
                      {!ceoExists && <SelectItem value="ceo">CEO / Manager</SelectItem>}
                      <SelectItem value="team_member">Team Member</SelectItem>
                    </SelectContent>
                  </Select>
                  {ceoExists && (
                    <p className="text-xs text-muted-foreground">
                      CEO account already exists. You can only register as a Team Member.
                    </p>
                  )}
                </div>
                {role === 'team_member' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="jobRole">Role</Label>
                      <Input
                        id="jobRole"
                        type="text"
                        placeholder="e.g., Software Engineer, Designer"
                        value={jobRole}
                        onChange={(e) => setJobRole(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="department">Department</Label>
                      <Input
                        id="department"
                        type="text"
                        placeholder="e.g., Engineering, Marketing"
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="kpiTargets">KPI Targets (JSON format)</Label>
                      <Textarea
                        id="kpiTargets"
                        placeholder='e.g., {"sales": 100, "tasks": 50}'
                        value={kpiTargets}
                        onChange={(e) => setKpiTargets(e.target.value)}
                        rows={3}
                      />
                      <p className="text-xs text-muted-foreground">
                        Enter your performance targets in JSON format
                      </p>
                    </div>
                  </>
                )}
              </>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Loading..." : isLogin ? "Sign In" : "Sign Up"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => setIsLogin(!isLogin)}
            >
              {isLogin
                ? "Don't have an account? Sign Up"
                : "Already have an account? Sign In"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;