import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  teamMemberId: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { teamMemberId }: NotificationRequest = await req.json();

    // Get team member details
    const { data: teamMember, error: teamMemberError } = await supabaseClient
      .from("team_members")
      .select("name, role")
      .eq("id", teamMemberId)
      .single();

    if (teamMemberError) throw teamMemberError;

    // Get CEO email from user_roles and profiles
    const { data: ceoRole, error: ceoError } = await supabaseClient
      .from("user_roles")
      .select("user_id")
      .eq("role", "ceo")
      .single();

    if (ceoError) throw ceoError;

    const { data: ceoProfile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("email")
      .eq("id", ceoRole.user_id)
      .single();

    if (profileError) throw profileError;

    if (!ceoProfile.email) {
      throw new Error("CEO email not found");
    }

    // Send email to CEO
    const emailResponse = await resend.emails.send({
      from: "ResultsBoard <onboarding@resend.dev>",
      to: [ceoProfile.email],
      subject: "New Team Member Report Submitted",
      html: `
        <h1>New Report Submitted</h1>
        <p><strong>${teamMember.name}</strong> (${teamMember.role}) has submitted a new daily report.</p>
        <p>Please review it in the Check-ins page.</p>
        <br>
        <p>Best regards,<br>ResultsBoard Team</p>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in notify-ceo-new-report function:", error);
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
