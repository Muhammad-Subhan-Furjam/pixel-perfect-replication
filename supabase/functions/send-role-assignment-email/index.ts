import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RoleAssignmentRequest {
  user_id: string;
  role: "executive_assistant" | "hr";
  assigned_by_name?: string;
}

const getRoleDisplayName = (role: string): string => {
  switch (role) {
    case "executive_assistant":
      return "Executive Assistant";
    case "hr":
      return "HR Manager";
    default:
      return role;
  }
};

const handler = async (req: Request): Promise<Response> => {
  console.log("Send role assignment email function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { user_id, role, assigned_by_name }: RoleAssignmentRequest = await req.json();
    console.log("Request data:", { user_id, role, assigned_by_name });

    if (!user_id || !role) {
      return new Response(
        JSON.stringify({ error: "user_id and role are required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
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
        JSON.stringify({ error: "No email found for user" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const roleDisplayName = getRoleDisplayName(role);
    const userName = profile.full_name || "Team Member";

    console.log(`Sending role assignment email to ${profile.email} for role ${roleDisplayName}`);

    const { data, error: resendError } = await resend.emails.send({
      from: "WorkChief <noreply@workchief.ai>",
      to: [profile.email],
      subject: `You've Been Assigned as ${roleDisplayName}! 🎉`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">New Role Assignment</h1>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="font-size: 18px; margin-bottom: 20px;">Hello ${userName},</p>
            
            <p style="font-size: 16px; margin-bottom: 20px;">
              Great news! You have been assigned the role of <strong style="color: #667eea;">${roleDisplayName}</strong> in WorkChief${assigned_by_name ? ` by ${assigned_by_name}` : ''}.
            </p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #667eea;">Your New Responsibilities:</h3>
              ${role === "executive_assistant" ? `
              <ul style="padding-left: 20px; margin: 0;">
                <li>Manage team members on behalf of the CEO</li>
                <li>View and manage check-ins and reports</li>
                <li>Access team analytics and performance data</li>
                <li>Help coordinate team activities</li>
              </ul>
              ` : `
              <ul style="padding-left: 20px; margin: 0;">
                <li>Manage team member records and information</li>
                <li>View and manage check-ins and reports</li>
                <li>Access team analytics and performance data</li>
                <li>Oversee HR-related activities</li>
              </ul>
              `}
            </div>
            
            <p style="font-size: 16px; margin-bottom: 20px;">
              Log in to WorkChief to start using your new capabilities.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://workchief.ai" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">
                Go to WorkChief
              </a>
            </div>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            
            <p style="color: #666; font-size: 14px; margin-bottom: 0;">
              Best regards,<br>
              <strong>The WorkChief Team</strong>
            </p>
          </div>
          
          <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
            <p>© 2024 WorkChief. All rights reserved.</p>
          </div>
        </body>
        </html>
      `,
    });

    if (resendError) {
      console.error("Resend error:", resendError);
      return new Response(
        JSON.stringify({ success: false, error: resendError.message }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Role assignment email sent successfully:", data);

    return new Response(
      JSON.stringify({ success: true, data }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-role-assignment-email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
