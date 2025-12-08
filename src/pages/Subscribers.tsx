import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, Users, DollarSign, Calendar } from "lucide-react";
import { format } from "date-fns";
import { Header } from "@/components/Header";

interface Subscriber {
  id: string;
  customer_id: string;
  customer_email: string;
  customer_name: string | null;
  plan_name: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  created: string;
  amount: number;
  currency: string;
  interval: string;
}

const Subscribers = () => {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { toast } = useToast();

  const fetchSubscribers = async (showRefreshToast = false) => {
    try {
      if (showRefreshToast) setRefreshing(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: "Error", description: "Not authenticated", variant: "destructive" });
        return;
      }

      const { data, error } = await supabase.functions.invoke("list-subscribers", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;
      
      setSubscribers(data.subscribers || []);
      
      if (showRefreshToast) {
        toast({ title: "Refreshed", description: "Subscriber list updated" });
      }
    } catch (error: any) {
      console.error("Error fetching subscribers:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch subscribers",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSubscribers();
  }, []);

  const totalMRR = subscribers.reduce((acc, sub) => {
    if (sub.interval === "month") return acc + sub.amount;
    if (sub.interval === "year") return acc + sub.amount / 12;
    return acc;
  }, 0);

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Paid Subscribers</h1>
            <p className="text-muted-foreground mt-1">View and manage your paying customers</p>
          </div>
          <Button
            variant="outline"
            onClick={() => fetchSubscribers(true)}
            disabled={refreshing}
            className="w-fit"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Subscribers
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <p className="text-2xl font-bold">{subscribers.length}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Monthly Recurring Revenue
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <p className="text-2xl font-bold">{formatCurrency(totalMRR, "usd")}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active Plans
              </CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <p className="text-2xl font-bold">
                  {new Set(subscribers.map((s) => s.plan_name)).size}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Subscribers Table */}
        <Card>
          <CardHeader>
            <CardTitle>Subscriber List</CardTitle>
            <CardDescription>
              All users with active paid subscriptions
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : subscribers.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No paid subscribers yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Started</TableHead>
                      <TableHead>Renews</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subscribers.map((subscriber) => (
                      <TableRow key={subscriber.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {subscriber.customer_name || "N/A"}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {subscriber.customer_email}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{subscriber.plan_name}</Badge>
                        </TableCell>
                        <TableCell>
                          {formatCurrency(subscriber.amount, subscriber.currency)}
                          <span className="text-muted-foreground text-sm">
                            /{subscriber.interval}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={subscriber.status === "active" ? "default" : "secondary"}
                            className={subscriber.status === "active" ? "bg-green-500" : ""}
                          >
                            {subscriber.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(subscriber.created), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(subscriber.current_period_end), "MMM d, yyyy")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Subscribers;
