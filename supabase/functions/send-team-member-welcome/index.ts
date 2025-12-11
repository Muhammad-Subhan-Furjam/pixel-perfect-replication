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

    const emailResponse = await resend.emails.send({
      from: "ResultsBoard <onboarding@resend.dev>",
      to: [email],
      subject: "Welcome to the Team - ResultsBoard",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Welcome to the Team, ${name}!</h1>
          <p>You have been added as a team member by the CEO.</p>
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Your Role:</strong> ${role}</p>
            ${department ? `<p><strong>Department:</strong> ${department}</p>` : ""}
          </div>
          <p>As a team member, you will be expected to submit daily reports to keep the CEO updated on your progress and any blockers you may have.</p>
          <p>Please log in to ResultsBoard to get started.</p>
          <br>
          <p>Best regards,<br>ResultsBoard Team</p>
        </div>
      `,
    });

    console.log("Welcome email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, message: "Welcome email sent" }),
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
