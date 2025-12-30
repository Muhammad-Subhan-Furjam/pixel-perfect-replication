import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Create admin client for auth operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Get the authorization header to verify the requesting user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    // Verify the requesting user is a CEO
    const { data: { user: requestingUser }, error: authError } = await supabaseAdmin.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !requestingUser) {
      throw new Error("Unauthorized");
    }

    // Check if requesting user is CEO
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", requestingUser.id)
      .maybeSingle();

    if (roleError || roleData?.role !== "ceo") {
      throw new Error("Only CEO can delete team members");
    }

    const { team_member_id } = await req.json();

    if (!team_member_id) {
      throw new Error("team_member_id is required");
    }

    console.log(`Deleting team member: ${team_member_id}`);

    // Get the team member's auth_user_id before deletion
    const { data: teamMember, error: fetchError } = await supabaseAdmin
      .from("team_members")
      .select("auth_user_id, name")
      .eq("id", team_member_id)
      .maybeSingle();

    if (fetchError) {
      throw new Error(`Failed to fetch team member: ${fetchError.message}`);
    }

    if (!teamMember) {
      throw new Error("Team member not found");
    }

    const authUserId = teamMember.auth_user_id;

    // If the team member has an auth account, clean up everything
    if (authUserId) {
      console.log(`Team member has auth account: ${authUserId}`);

      // Delete user roles
      await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", authUserId);

      // Delete user permissions
      await supabaseAdmin
        .from("user_permissions")
        .delete()
        .eq("user_id", authUserId);

      // Delete notification preferences
      await supabaseAdmin
        .from("notification_preferences")
        .delete()
        .eq("user_id", authUserId);
    }

    // Delete the team member (cascades to reports, metrics, check-ins, reminder_logs)
    const { error: deleteTeamMemberError } = await supabaseAdmin
      .from("team_members")
      .delete()
      .eq("id", team_member_id);

    if (deleteTeamMemberError) {
      throw new Error(`Failed to delete team member: ${deleteTeamMemberError.message}`);
    }

    // If they have an auth account, delete it (this will cascade to profiles)
    if (authUserId) {
      console.log(`Deleting auth user: ${authUserId}`);
      
      const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(authUserId);

      if (deleteAuthError) {
        console.error(`Failed to delete auth user: ${deleteAuthError.message}`);
        // Don't throw here - team member is already deleted, auth cleanup is best-effort
      } else {
        console.log(`Successfully deleted auth user: ${authUserId}`);
      }
    }

    console.log(`Successfully deleted team member: ${teamMember.name}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Team member ${teamMember.name} and all associated data deleted successfully`,
        hadAuthAccount: !!authUserId
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Error deleting team member:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
