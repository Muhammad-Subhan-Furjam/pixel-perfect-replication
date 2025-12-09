import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?dts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[LIST-SUBSCRIBERS] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");

    // Check if user is CEO
    const { data: roleData } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "ceo")
      .maybeSingle();

    if (!roleData) {
      throw new Error("Unauthorized: CEO access required");
    }

    logStep("CEO authorization confirmed");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Fetch all active subscriptions
    const subscriptions = await stripe.subscriptions.list({
      status: "active",
      limit: 100,
      expand: ["data.customer"],
    });

    logStep("Fetched subscriptions", { count: subscriptions.data.length });

    const subscribers = await Promise.all(subscriptions.data.map(async (sub: Stripe.Subscription) => {
      const customer = sub.customer as Stripe.Customer;
      const priceItem = sub.items.data[0];
      
      let planName = "Unknown Plan";
      if (priceItem?.price?.product) {
        const productId = typeof priceItem.price.product === 'string' 
          ? priceItem.price.product 
          : priceItem.price.product.id;
        const product = await stripe.products.retrieve(productId);
        planName = product.name;
      }
      
      return {
        id: sub.id,
        customer_id: customer.id,
        customer_email: customer.email,
        customer_name: customer.name,
        plan_name: planName,
        status: sub.status,
        current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
        current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
        created: new Date(sub.created * 1000).toISOString(),
        amount: priceItem?.price?.unit_amount ? priceItem.price.unit_amount / 100 : 0,
        currency: priceItem?.price?.currency || "usd",
        interval: priceItem?.price?.recurring?.interval || "month",
      };
    }));

    logStep("Processed subscribers", { count: subscribers.length });

    return new Response(JSON.stringify({ subscribers }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
