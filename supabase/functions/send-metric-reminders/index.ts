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
          from: "WorkChief <noreply@workchief.ai>",
          to: [profile.email],
          subject: "⏰ Reminder: Submit Your Daily Metrics",
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f4f7fa;">
              <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
                <div style="background-color: #ffffff; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
                  <!-- Header -->
                  <div style="text-align: center; margin-bottom: 30px;">
                    <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); border-radius: 12px; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                      <span style="font-size: 28px;">📊</span>
                    </div>
                    <h1 style="color: #1e293b; font-size: 24px; margin: 0 0 10px;">Metrics Reminder</h1>
                    <p style="color: #64748b; font-size: 16px; margin: 0;">Time to log your daily performance!</p>
                  </div>

                  <!-- Greeting -->
                  <p style="color: #334155; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                    Hi ${member.name},
                  </p>
                  <p style="color: #334155; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
                    This is a friendly reminder to submit your daily metrics. Your performance data helps the team track progress and identify areas for improvement.
                  </p>

                  <!-- Info box -->
                  <div style="background-color: #f5f3ff; border-radius: 12px; padding: 25px; margin-bottom: 25px; border-left: 4px solid #8b5cf6;">
                    <p style="color: #475569; font-size: 15px; margin: 0;">
                      📈 Tracking your metrics daily helps you see patterns, celebrate wins, and address challenges early.
                    </p>
                  </div>

                  <!-- CTA Button -->
                  <div style="text-align: center; margin-bottom: 25px;">
                    <a href="https://workchief.ai/metrics" 
                       style="display: inline-block; background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 14px rgba(139, 92, 246, 0.4);">
                      Submit Metrics Now →
                    </a>
                  </div>

                  <!-- Footer -->
                  <div style="border-top: 1px solid #e2e8f0; padding-top: 25px; text-align: center;">
                    <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                      © 2024 WorkChief. All rights reserved.
                    </p>
                  </div>
                </div>
              </div>
            </body>
            </html>
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
