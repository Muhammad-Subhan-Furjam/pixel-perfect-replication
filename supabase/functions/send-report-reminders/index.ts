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
          from: "WorkChief <notifications@workchief.ai>",
          to: [member.email],
          subject: "Daily Reminder: Submit Your Report to CEO",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">Hi ${member.name},</h2>
              <p>This is your daily reminder to submit your report to the CEO.</p>
              <p>Please log in to ResultsBoard and submit your daily report with:</p>
              <ul>
                <li>Your progress and accomplishments for today</li>
                <li>Any blockers or challenges you're facing</li>
                <li>Your plans for tomorrow</li>
              </ul>
              <p>Your daily updates help keep the team aligned and ensure any issues are addressed promptly.</p>
              <br>
              <p>Best regards,<br>ResultsBoard Team</p>
            </div>
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
