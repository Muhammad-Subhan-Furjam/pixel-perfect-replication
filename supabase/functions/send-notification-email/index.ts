import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  user_id: string;
  type: "check_in" | "analysis";
  data: {
    team_member_name?: string;
    score?: string;
    message?: string;
  };
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Send notification email function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { user_id, type, data }: NotificationRequest = await req.json();
    console.log("Request data:", { user_id, type, data });

    // Check user's notification preferences
    const { data: preferences, error: prefError } = await supabase
      .from("notification_preferences")
      .select("email_check_ins, email_analyses")
      .eq("user_id", user_id)
      .single();

    if (prefError && prefError.code !== "PGRST116") {
      console.log("Error fetching preferences:", prefError);
      throw prefError;
    }

    // Default to true if no preferences set
    const emailCheckIns = preferences?.email_check_ins ?? true;
    const emailAnalyses = preferences?.email_analyses ?? true;

    // Check if user wants this notification type
    if (type === "check_in" && !emailCheckIns) {
      console.log("User has disabled check-in notifications");
      return new Response(
        JSON.stringify({ message: "Notification disabled by user" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (type === "analysis" && !emailAnalyses) {
      console.log("User has disabled analysis notifications");
      return new Response(
        JSON.stringify({ message: "Notification disabled by user" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get user email from profiles
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("id", user_id)
      .single();

    if (profileError || !profile?.email) {
      console.log("Error fetching profile or no email:", profileError);
      return new Response(
        JSON.stringify({ message: "No email found for user" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    let subject: string;
    let htmlContent: string;

    if (type === "check_in") {
      subject = `New Check-in: ${data.team_member_name || "Team Member"}`;
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">New Check-in Submitted</h1>
          <p>Hello ${profile.full_name || "there"},</p>
          <p>A new check-in has been submitted for <strong>${data.team_member_name || "a team member"}</strong>.</p>
          <p>Log in to ResultsBoard to view the details and run an analysis.</p>
          <br/>
          <p style="color: #666; font-size: 14px;">Best regards,<br/>The ResultsBoard Team</p>
        </div>
      `;
    } else {
      subject = `Analysis Complete: Score ${data.score || "N/A"}`;
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Performance Analysis Complete</h1>
          <p>Hello ${profile.full_name || "there"},</p>
          <p>A new performance analysis has been completed.</p>
          <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Score:</strong> ${data.score || "N/A"}</p>
            ${data.message ? `<p style="margin: 10px 0 0 0;"><strong>Summary:</strong> ${data.message}</p>` : ""}
          </div>
          <p>Log in to ResultsBoard to view the full analysis.</p>
          <br/>
          <p style="color: #666; font-size: 14px;">Best regards,<br/>The ResultsBoard Team</p>
        </div>
      `;
    }

    console.log("Sending email to:", profile.email);
    
    const emailResponse = await resend.emails.send({
      from: "ResultsBoard <onboarding@resend.dev>",
      to: [profile.email],
      subject,
      html: htmlContent,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, emailResponse }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-notification-email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
