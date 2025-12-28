import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const today = new Date().toISOString().split("T")[0];

    console.log(`Checking for team members who haven't submitted reports on ${today}`);

    // Get all team members with email
    const { data: teamMembers, error: teamError } = await supabase
      .from("team_members")
      .select("id, name, email, auth_user_id")
      .not("email", "is", null);

    if (teamError) {
      console.error("Error fetching team members:", teamError);
      throw teamError;
    }

    console.log(`Found ${teamMembers?.length || 0} team members with emails`);

    // Get today's submitted reports
    const { data: submittedReports, error: reportsError } = await supabase
      .from("team_member_reports")
      .select("team_member_id")
      .eq("date", today)
      .eq("is_from_ceo", false);

    if (reportsError) {
      console.error("Error fetching reports:", reportsError);
      throw reportsError;
    }

    const submittedIds = new Set(submittedReports?.map((r) => r.team_member_id) || []);

    // Filter members who haven't submitted today
    const membersToRemind = teamMembers?.filter(
      (m) => !submittedIds.has(m.id) && m.email
    ) || [];

    console.log(`${membersToRemind.length} members need report reminders`);

    const results = [];

    for (const member of membersToRemind) {
      try {
        const emailResponse = await resend.emails.send({
          from: "WorkChief <noreply@workchief.ai>",
          to: [member.email],
          subject: "⏰ Daily Reminder: Submit Your Report",
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
                    <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); border-radius: 12px; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                      <span style="font-size: 28px;">📝</span>
                    </div>
                    <h1 style="color: #1e293b; font-size: 24px; margin: 0 0 10px;">Daily Report Reminder</h1>
                    <p style="color: #64748b; font-size: 16px; margin: 0;">Don't forget to submit your update!</p>
                  </div>

                  <!-- Greeting -->
                  <p style="color: #334155; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                    Hi ${member.name},
                  </p>
                  <p style="color: #334155; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
                    This is your friendly reminder to submit your daily report. Your updates help keep the team aligned and ensure any issues are addressed promptly.
                  </p>

                  <!-- What to include -->
                  <div style="background-color: #fffbeb; border-radius: 12px; padding: 25px; margin-bottom: 25px; border-left: 4px solid #f59e0b;">
                    <h2 style="color: #1e293b; font-size: 16px; margin: 0 0 15px;">Include in your report:</h2>
                    <ul style="color: #475569; font-size: 15px; line-height: 1.8; padding-left: 20px; margin: 0;">
                      <li>✅ Your progress and accomplishments today</li>
                      <li>🚧 Any blockers or challenges you're facing</li>
                      <li>📋 Your plans for tomorrow</li>
                    </ul>
                  </div>

                  <!-- CTA Button -->
                  <div style="text-align: center; margin-bottom: 25px;">
                    <a href="https://workchief.ai/dashboard" 
                       style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 14px rgba(245, 158, 11, 0.4);">
                      Submit Report Now →
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

        console.log(`Report reminder sent to ${member.email}:`, emailResponse);
        results.push({ member: member.name, email: member.email, status: "sent" });
      } catch (emailError) {
        console.error(`Error sending email to ${member.name}:`, emailError);
        results.push({ member: member.name, email: member.email, status: "failed" });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Sent ${results.filter((r) => r.status === "sent").length} report reminders`,
        results,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in send-report-reminders:", error);
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
