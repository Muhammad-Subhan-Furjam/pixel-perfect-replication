import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

interface WelcomeEmailRequest {
  email: string;
  fullName: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, fullName }: WelcomeEmailRequest = await req.json();

    if (!email) {
      throw new Error("Email is required");
    }

    const name = fullName || "there";

    console.log(`Sending welcome email to ${email} for ${name}`);

    const emailResponse = await resend.emails.send({
      from: "WorkChief <onboarding@resend.dev>",
      to: [email],
      subject: "Welcome to ResultsBoard! 🎉",
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
                <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); border-radius: 12px; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                  <span style="font-size: 28px;">📊</span>
                </div>
                <h1 style="color: #1e293b; font-size: 28px; margin: 0 0 10px;">Welcome to ResultsBoard!</h1>
                <p style="color: #64748b; font-size: 16px; margin: 0;">Your journey to better team management starts here</p>
              </div>

              <!-- Greeting -->
              <p style="color: #334155; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                Hi ${name},
              </p>
              <p style="color: #334155; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
                Thank you for signing up for ResultsBoard! We're excited to have you on board. 
                ResultsBoard is designed to help you track your team's performance, manage daily check-ins, 
                and gain valuable insights into your organization's productivity.
              </p>

              <!-- Features -->
              <div style="background-color: #f8fafc; border-radius: 12px; padding: 25px; margin-bottom: 25px;">
                <h2 style="color: #1e293b; font-size: 18px; margin: 0 0 15px;">Here's what you can do:</h2>
                <ul style="color: #475569; font-size: 15px; line-height: 1.8; padding-left: 20px; margin: 0;">
                  <li>📈 Track team performance with detailed metrics</li>
                  <li>✅ Manage daily check-ins and reports</li>
                  <li>👥 Build and organize your team structure</li>
                  <li>🔔 Get real-time notifications and updates</li>
                  <li>📊 View AI-powered performance analyses</li>
                </ul>
              </div>

              <!-- CTA Button -->
              <div style="text-align: center; margin-bottom: 25px;">
                <a href="https://resultsboard.lovable.app/dashboard" 
                   style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 14px rgba(59, 130, 246, 0.4);">
                  Get Started Now →
                </a>
              </div>

              <!-- Footer -->
              <div style="border-top: 1px solid #e2e8f0; padding-top: 25px; text-align: center;">
                <p style="color: #64748b; font-size: 14px; margin: 0 0 10px;">
                  Need help? Reply to this email and we'll be happy to assist.
                </p>
                <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                  © 2024 ResultsBoard by WorkChief. All rights reserved.
                </p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Welcome email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, message: "Welcome email sent", data: emailResponse }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error sending welcome email:", error);
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
