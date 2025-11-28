import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

interface UnreadReport {
  id: string;
  report_text: string;
  date: string;
  created_at: string;
  team_members: {
    name: string;
  };
}

export const NotificationBell = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadReports, setUnreadReports] = useState<UnreadReport[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (user) {
      fetchUnreadReports();

      // Set up realtime subscription
      const channel = supabase
        .channel('reports-changes')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'team_member_reports'
          },
          () => {
            fetchUnreadReports();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const fetchUnreadReports = async () => {
    try {
      const { data, error } = await supabase
        .from("team_member_reports")
        .select(`
          id,
          report_text,
          date,
          created_at,
          team_members (
            name
          )
        `)
        .eq("is_read", false)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setUnreadReports(data as any || []);
      setUnreadCount(data?.length || 0);
    } catch (error) {
      console.error("Error fetching unread reports:", error);
    }
  };

  const handleViewReport = async (reportId: string) => {
    // Mark as read
    await supabase
      .from("team_member_reports")
      .update({ is_read: true })
      .eq("id", reportId);

    // Navigate to check-ins page
    navigate("/check-ins");
    setOpen(false);
    fetchUnreadReports();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <h3 className="font-semibold">New Reports</h3>
          {unreadReports.length === 0 ? (
            <p className="text-sm text-muted-foreground">No new reports</p>
          ) : (
            <div className="space-y-3">
              {unreadReports.map((report) => (
                <div
                  key={report.id}
                  className="border rounded-lg p-3 cursor-pointer hover:bg-muted"
                  onClick={() => handleViewReport(report.id)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-medium text-sm">
                      {report.team_members?.name || "Unknown"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(report.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {report.report_text}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
