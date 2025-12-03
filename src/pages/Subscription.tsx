import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Check, Crown, Loader2, ExternalLink } from "lucide-react";
import { format } from "date-fns";

const PLANS = {
  free: {
    name: "Free",
    price: "$0",
    period: "forever",
    features: [
      "Up to 3 team members",
      "Basic performance tracking",
      "Weekly analysis reports",
      "Email support",
    ],
  },
  pro: {
    name: "ResultsBoard Pro",
    price: "$29",
    period: "/month",
    priceId: "price_1SZxYdDIDTetc1phATFXNVmU",
    features: [
      "Unlimited team members",
      "Advanced AI analysis",
      "Daily performance insights",
      "Priority support",
      "Custom metrics",
      "PDF exports",
    ],
  },
};

export default function Subscription() {
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { subscribed, planName, subscriptionEnd, loading, refresh } = useSubscription();

  useEffect(() => {
    if (searchParams.get("success") === "true") {
      toast({
        title: "Subscription successful!",
        description: "Welcome to ResultsBoard Pro. Enjoy your premium features!",
      });
      refresh();
    } else if (searchParams.get("canceled") === "true") {
      toast({
        title: "Subscription canceled",
        description: "You can subscribe anytime to unlock premium features.",
        variant: "destructive",
      });
    }
  }, [searchParams, toast, refresh]);

  const handleSubscribe = async (priceId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId },
      });

      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (err) {
      console.error("Error creating checkout:", err);
      toast({
        title: "Error",
        description: "Failed to create checkout session. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleManageSubscription = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");

      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (err) {
      console.error("Error opening customer portal:", err);
      toast({
        title: "Error",
        description: "Failed to open billing portal. Please try again.",
        variant: "destructive",
      });
    }
  };

  const currentPlan = subscribed ? "pro" : "free";

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-6 sm:py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">Subscription Plans</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Choose the plan that best fits your team's needs
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {subscribed && subscriptionEnd && (
                <Card className="mb-6 sm:mb-8 border-primary">
                  <CardContent className="pt-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <Crown className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                        <div>
                          <p className="font-semibold text-sm sm:text-base">Current Plan: {planName}</p>
                          <p className="text-xs sm:text-sm text-muted-foreground">
                            Renews on {format(new Date(subscriptionEnd), "MMMM d, yyyy")}
                          </p>
                        </div>
                      </div>
                      <Button variant="outline" onClick={handleManageSubscription} className="w-full sm:w-auto">
                        Manage Billing
                        <ExternalLink className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="grid md:grid-cols-2 gap-6">
                {/* Free Plan */}
                <Card className={currentPlan === "free" ? "border-primary" : ""}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>{PLANS.free.name}</CardTitle>
                      {currentPlan === "free" && (
                        <Badge variant="secondary">Current Plan</Badge>
                      )}
                    </div>
                    <CardDescription>
                      <span className="text-3xl font-bold text-foreground">
                        {PLANS.free.price}
                      </span>
                      <span className="text-muted-foreground"> {PLANS.free.period}</span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3 mb-6">
                      {PLANS.free.features.map((feature, index) => (
                        <li key={index} className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-500" />
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    {currentPlan === "free" ? (
                      <Button variant="outline" className="w-full" disabled>
                        Current Plan
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={handleManageSubscription}
                      >
                        Downgrade
                      </Button>
                    )}
                  </CardContent>
                </Card>

                {/* Pro Plan */}
                <Card className={currentPlan === "pro" ? "border-primary ring-2 ring-primary" : "border-primary/50"}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Crown className="h-5 w-5 text-primary" />
                        {PLANS.pro.name}
                      </CardTitle>
                      {currentPlan === "pro" && (
                        <Badge>Current Plan</Badge>
                      )}
                    </div>
                    <CardDescription>
                      <span className="text-3xl font-bold text-foreground">
                        {PLANS.pro.price}
                      </span>
                      <span className="text-muted-foreground">{PLANS.pro.period}</span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3 mb-6">
                      {PLANS.pro.features.map((feature, index) => (
                        <li key={index} className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-500" />
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    {currentPlan === "pro" ? (
                      <Button className="w-full" disabled>
                        Current Plan
                      </Button>
                    ) : (
                      <Button
                        className="w-full"
                        onClick={() => handleSubscribe(PLANS.pro.priceId!)}
                      >
                        Upgrade to Pro
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="mt-8 text-center text-sm text-muted-foreground">
                <p>
                  All plans include a 14-day money-back guarantee. Cancel anytime.
                </p>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
