import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const today = new Date().toISOString().split('T')[0];

    // Get all team members who haven't submitted a report today
    const { data: allTeamMembers, error: membersError } = await supabaseClient
      .from("team_members")
      .select("id, name, auth_user_id")
      .not("auth_user_id", "is", null);

    if (membersError) throw membersError;

    const notifications = [];

    for (const member of allTeamMembers || []) {
      // Check if team member submitted report today
      const { data: reports, error: reportError } = await supabaseClient
        .from("team_member_reports")
        .select("id")
        .eq("team_member_id", member.id)
        .eq("date", today)
        .eq("is_from_ceo", false);

      if (reportError) {
        console.error(`Error checking reports for ${member.name}:`, reportError);
        continue;
      }

      if (!reports || reports.length === 0) {
        // Get team member email
        const { data: profile, error: profileError } = await supabaseClient
          .from("profiles")
          .select("email")
          .eq("id", member.auth_user_id)
          .single();

        if (profileError || !profile?.email) {
          console.error(`No email found for ${member.name}`);
          continue;
        }

        // Send reminder email
        const emailResponse = await resend.emails.send({
          from: "ResultsBoard <onboarding@resend.dev>",
          to: [profile.email],
          subject: "Daily Report Reminder",
          html: `
            <h1>Daily Report Reminder</h1>
            <p>Hi ${member.name},</p>
            <p>You haven't submitted your daily report yet. Please submit your report as soon as possible.</p>
            <br>
            <p>Best regards,<br>ResultsBoard Team</p>
          `,
        });

        console.log(`Reminder sent to ${member.name}:`, emailResponse);
        notifications.push({ member: member.name, status: "sent" });
      }
    }

    return new Response(
      JSON.stringify({ 
        message: "Notifications processed",
        notifications 
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in notify-team-member-missing-report function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
