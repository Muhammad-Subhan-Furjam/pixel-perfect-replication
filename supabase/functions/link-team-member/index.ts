import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[LINK-TEAM-MEMBER] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);

    const user = userData.user;
    if (!user?.id || !user.email) throw new Error("User not authenticated or email not available");

    logStep("User authenticated", { userId: user.id, email: user.email });

    // Don't attempt to link for CEOs (they manage the org, not a team member profile)
    const { data: roleRow } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (roleRow?.role === "ceo") {
      logStep("Skipping link attempt for CEO", { userId: user.id });
      return new Response(JSON.stringify({ linked: false, skipped: true, reason: "ceo" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Find team member(s) with matching email (case-insensitive)
    const { data: matches, error: matchError } = await supabaseAdmin
      .from("team_members")
      .select("id, auth_user_id")
      .ilike("email", user.email);

    if (matchError) throw new Error(`Failed to search team members: ${matchError.message}`);

    const normalized = (matches ?? []).filter(Boolean);

    if (normalized.length === 0) {
      logStep("No team member match", { email: user.email });
      return new Response(JSON.stringify({ linked: false, reason: "no_match" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    if (normalized.length > 1) {
      logStep("Multiple team member matches", { email: user.email, count: normalized.length });
      return new Response(JSON.stringify({ linked: false, reason: "multiple_matches" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 409,
      });
    }

    const match = normalized[0] as { id: string; auth_user_id: string | null };

    if (match.auth_user_id) {
      if (match.auth_user_id === user.id) {
        logStep("Already linked", { teamMemberId: match.id, userId: user.id });
        return new Response(JSON.stringify({ linked: true, alreadyLinked: true, team_member_id: match.id }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      logStep("Email match already linked to different user", {
        teamMemberId: match.id,
        existingAuthUserId: match.auth_user_id,
      });
      return new Response(JSON.stringify({ linked: false, reason: "email_already_linked" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 409,
      });
    }

    // Link by setting auth_user_id
    const { data: updated, error: updateError } = await supabaseAdmin
      .from("team_members")
      .update({ auth_user_id: user.id })
      .eq("id", match.id)
      .is("auth_user_id", null)
      .select("id")
      .maybeSingle();

    if (updateError) throw new Error(`Failed to link team member: ${updateError.message}`);

    if (!updated) {
      // Could happen if a race updated auth_user_id between match and update
      logStep("Link update returned no row (possible race)", { teamMemberId: match.id });
      return new Response(JSON.stringify({ linked: false, reason: "not_updated" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 409,
      });
    }

    logStep("Linked successfully", { teamMemberId: updated.id, userId: user.id });

    return new Response(JSON.stringify({ linked: true, team_member_id: updated.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });

    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
