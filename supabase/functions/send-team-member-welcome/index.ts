import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

interface WelcomeEmailRequest {
  email: string;
  name: string;
  role: string;
  department?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, name, role, department }: WelcomeEmailRequest = await req.json();

    if (!email || !name) {
      throw new Error("Email and name are required");
    }

    console.log(`Sending welcome email to ${email} for ${name}`);

    const { data, error: resendError } = await resend.emails.send({
      from: "WorkChief <noreply@workchief.ai>",
      to: [email],
      subject: "Welcome to the Team! 🎉",
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
                <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 12px; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                  <span style="font-size: 28px;">👋</span>
                </div>
                <h1 style="color: #1e293b; font-size: 28px; margin: 0 0 10px;">Welcome to the Team!</h1>
                <p style="color: #64748b; font-size: 16px; margin: 0;">You've been added to WorkChief</p>
              </div>

              <!-- Greeting -->
              <p style="color: #334155; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                Hi ${name},
              </p>
              <p style="color: #334155; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
                Great news! You've been added as a team member on WorkChief. 
                This platform helps track performance, manage daily check-ins, and keep everyone aligned on goals.
              </p>

              <!-- Role Info -->
              <div style="background-color: #f8fafc; border-radius: 12px; padding: 25px; margin-bottom: 25px; border-left: 4px solid #10b981;">
                <h2 style="color: #1e293b; font-size: 16px; margin: 0 0 15px;">Your Details</h2>
                <p style="color: #475569; font-size: 15px; margin: 0 0 8px;"><strong>Role:</strong> ${role}</p>
                ${department ? `<p style="color: #475569; font-size: 15px; margin: 0;"><strong>Department:</strong> ${department}</p>` : ""}
              </div>

              <!-- What to expect -->
              <div style="background-color: #f8fafc; border-radius: 12px; padding: 25px; margin-bottom: 25px;">
                <h2 style="color: #1e293b; font-size: 18px; margin: 0 0 15px;">What's Expected</h2>
                <ul style="color: #475569; font-size: 15px; line-height: 1.8; padding-left: 20px; margin: 0;">
                  <li>📊 Submit daily metrics and progress updates</li>
                  <li>📝 Report any blockers or challenges</li>
                  <li>✅ Track your KPIs and targets</li>
                  <li>💬 Stay connected with your team</li>
                </ul>
              </div>

              <!-- CTA Button -->
              <div style="text-align: center; margin-bottom: 25px;">
                <a href="https://workchief.ai/auth" 
                   style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4);">
                  Log In to Get Started →
                </a>
              </div>

              <!-- Footer -->
              <div style="border-top: 1px solid #e2e8f0; padding-top: 25px; text-align: center;">
                <p style="color: #64748b; font-size: 14px; margin: 0 0 10px;">
                  Questions? Reply to this email and we'll help you out.
                </p>
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

    if (resendError) {
      console.error("Resend send failed:", resendError);
      return new Response(
        JSON.stringify({ success: false, error: resendError.message }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Welcome email queued successfully:", data);

    return new Response(
      JSON.stringify({ success: true, id: data?.id, message: "Welcome email queued" }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error sending welcome email:", error);
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
