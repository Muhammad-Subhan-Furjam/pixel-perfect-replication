import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const today = new Date().toISOString().split("T")[0];

    console.log(`Checking for missing metrics on ${today}`);

    // Get all team members with auth_user_id (linked to an account)
    const { data: teamMembers, error: teamError } = await supabase
      .from("team_members")
      .select("id, name, auth_user_id")
      .not("auth_user_id", "is", null);

    if (teamError) {
      console.error("Error fetching team members:", teamError);
      throw teamError;
    }

    console.log(`Found ${teamMembers?.length || 0} team members with accounts`);

    // Get today's submitted metrics
    const { data: submittedMetrics, error: metricsError } = await supabase
      .from("daily_metrics")
      .select("team_member_id")
      .eq("date", today);

    if (metricsError) {
      console.error("Error fetching metrics:", metricsError);
      throw metricsError;
    }

    const submittedIds = new Set(submittedMetrics?.map((m) => m.team_member_id) || []);

    // Get reminders already sent today
    const { data: sentReminders, error: reminderError } = await supabase
      .from("reminder_logs")
      .select("team_member_id")
      .eq("reminder_date", today);

    if (reminderError) {
      console.error("Error fetching reminders:", reminderError);
      throw reminderError;
    }

    const alreadyReminded = new Set(sentReminders?.map((r) => r.team_member_id) || []);

    // Find members who haven't submitted and haven't been reminded
    const membersToRemind = teamMembers?.filter(
      (m) => !submittedIds.has(m.id) && !alreadyReminded.has(m.id)
    ) || [];

    console.log(`${membersToRemind.length} members need reminders`);

    const results = [];

    for (const member of membersToRemind) {
      // Get user email from profiles
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("email")
        .eq("id", member.auth_user_id)
        .maybeSingle();

      if (profileError || !profile?.email) {
        console.log(`No email found for member ${member.name}`);
        continue;
      }

      try {
        // Send reminder email
        const emailResponse = await resend.emails.send({
          from: "WorkChief <notifications@workchief.ai>",
          to: [profile.email],
          subject: "Reminder: Submit Your Daily Metrics",
          html: `
            <h2>Hi ${member.name},</h2>
            <p>This is a friendly reminder to submit your daily metrics for today.</p>
            <p>Your performance data helps the team track progress and identify areas for improvement.</p>
            <p>Please log in to ResultsBoard and submit your metrics as soon as possible.</p>
            <br>
            <p>Best regards,<br>ResultsBoard Team</p>
          `,
        });

        console.log(`Email sent to ${profile.email}:`, emailResponse);

        // Log the reminder
        const { error: logError } = await supabase
          .from("reminder_logs")
          .insert({
            team_member_id: member.id,
            reminder_date: today,
          });

        if (logError) {
          console.error(`Error logging reminder for ${member.name}:`, logError);
        }

        results.push({ member: member.name, email: profile.email, status: "sent" });
      } catch (emailError) {
        console.error(`Error sending email to ${member.name}:`, emailError);
        results.push({ member: member.name, email: profile.email, status: "failed" });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Sent ${results.filter((r) => r.status === "sent").length} reminders`,
        results,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in send-metric-reminders:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);