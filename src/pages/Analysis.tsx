import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, AlertTriangle, Copy, Check } from "lucide-react";
import { Header } from "@/components/Header";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";

interface AnalysisResult {
  id: string;
  name: string;
  role: string;
  score: string;
  blocker: string;
  reason: string;
  message: string;
  nextStep: string;
}

const Analysis = () => {
  const [analyses, setAnalyses] = useState<AnalysisResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    loadAnalyses();
  }, [user, navigate]);

  const loadAnalyses = async () => {
    try {
      const { data: analysesData, error: analysesError } = await supabase
        .from('analyses')
        .select(`
          id,
          score,
          blocker,
          reason,
          message,
          next_step,
          check_ins (
            team_members (
              name,
              role
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (analysesError) throw analysesError;

      const formattedAnalyses = analysesData.map((analysis: any) => ({
        id: analysis.id,
        name: analysis.check_ins.team_members.name,
        role: analysis.check_ins.team_members.role,
        score: analysis.score,
        blocker: analysis.blocker,
        reason: analysis.reason,
        message: analysis.message,
        nextStep: analysis.next_step,
      }));

      setAnalyses(formattedAnalyses);
    } catch (error: any) {
      toast({
        title: "Error loading analyses",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: string) => {
    switch (score) {
      case "green": return "success";
      case "yellow": return "warning";
      case "red": return "destructive";
      default: return "secondary";
    }
  };

  const getBlockerIcon = (blocker: string) => {
    if (blocker === "SYSTEM" || blocker === "EXTERNAL") {
      return <AlertTriangle className="h-4 w-4" />;
    }
    return null;
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
      toast({
        title: "Copied!",
        description: "Message copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const exportToPDF = () => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      let yPos = margin;

      // Title
      doc.setFontSize(20);
      doc.text("Performance Analysis Report", margin, yPos);
      yPos += 15;

      // Stats
      doc.setFontSize(12);
      doc.text(`Total Analyses: ${analyses.length}`, margin, yPos);
      yPos += 7;
      doc.text(`Green: ${stats.green} | Yellow: ${stats.yellow} | Red: ${stats.red}`, margin, yPos);
      yPos += 15;

      // Analyses
      doc.setFontSize(14);
      doc.text("Detailed Analyses", margin, yPos);
      yPos += 10;

      analyses.forEach((result, index) => {
        if (yPos > pageHeight - 40) {
          doc.addPage();
          yPos = margin;
        }

        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text(`${index + 1}. ${result.name} - ${result.role}`, margin, yPos);
        yPos += 6;

        doc.setFont("helvetica", "normal");
        doc.text(`Score: ${result.score.toUpperCase()}`, margin + 5, yPos);
        yPos += 6;
        doc.text(`Blocker: ${result.blocker}`, margin + 5, yPos);
        yPos += 6;

        const reasonLines = doc.splitTextToSize(`Reason: ${result.reason}`, pageWidth - 2 * margin - 5);
        doc.text(reasonLines, margin + 5, yPos);
        yPos += reasonLines.length * 6;

        const messageLines = doc.splitTextToSize(`Message: ${result.message}`, pageWidth - 2 * margin - 5);
        doc.text(messageLines, margin + 5, yPos);
        yPos += messageLines.length * 6;

        const nextStepLines = doc.splitTextToSize(`Next Step: ${result.nextStep}`, pageWidth - 2 * margin - 5);
        doc.text(nextStepLines, margin + 5, yPos);
        yPos += nextStepLines.length * 6 + 10;
      });

      doc.save("performance-analysis-report.pdf");
      toast({
        title: "Success",
        description: "PDF report exported successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to export PDF",
        variant: "destructive",
      });
    }
  };

  const stats = {
    green: analyses.filter(a => a.score === 'green').length,
    yellow: analyses.filter(a => a.score === 'yellow').length,
    red: analyses.filter(a => a.score === 'red').length,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-6 sm:py-8">
          <p className="text-center text-muted-foreground">Loading analyses...</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-6 sm:py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">Today's Analysis</h2>
            <p className="text-sm sm:text-base text-muted-foreground">AI-powered performance insights and recommendations</p>
          </div>
          <Button variant="outline" onClick={exportToPDF} className="w-full sm:w-auto">
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>

        <Card className="mb-6 sm:mb-8 bg-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">CEO Executive Brief</CardTitle>
            <CardDescription>Daily summary and action items</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:gap-4 grid-cols-3">
              <div className="p-3 sm:p-4 rounded-lg bg-success/10 border border-success/20">
                <p className="text-xl sm:text-2xl font-bold text-success">{stats.green}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Top Performers</p>
              </div>
              <div className="p-3 sm:p-4 rounded-lg bg-warning/10 border border-warning/20">
                <p className="text-xl sm:text-2xl font-bold text-warning">{stats.yellow}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Needs Coaching</p>
              </div>
              <div className="p-3 sm:p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                <p className="text-xl sm:text-2xl font-bold text-destructive">{stats.red}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">System Issues</p>
              </div>
            </div>
            {stats.red > 0 && (
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                <p className="font-medium mb-2">Priority Action</p>
                <p className="text-sm text-muted-foreground">
                  {stats.red} critical issue{stats.red > 1 ? 's' : ''} requiring immediate attention. Review red-flagged items below.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {analyses.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No analyses yet. Run check-ins first!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {analyses.map((result) => (
            <Card key={result.id} className="overflow-hidden">
              <CardHeader className="bg-card">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <CardTitle className="text-base sm:text-lg">{result.name}</CardTitle>
                      <Badge variant={getScoreColor(result.score)}>
                        {result.score.toUpperCase()}
                      </Badge>
                      {result.blocker !== "NONE" && (
                        <Badge variant="outline" className="flex items-center gap-1">
                          {getBlockerIcon(result.blocker)}
                          {result.blocker}
                        </Badge>
                      )}
                    </div>
                    <CardDescription>{result.role}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">AI Analysis</p>
                  <p className="text-sm">{result.reason}</p>
                </div>
                <div className="p-4 rounded-lg bg-muted">
                  <p className="text-sm font-medium mb-2">Message for Employee</p>
                  <p className="text-sm italic">"{result.message}"</p>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="mt-3"
                    onClick={() => copyToClipboard(result.message, result.id)}
                  >
                    {copiedId === result.id ? (
                      <>
                        <Check className="h-3 w-3 mr-1" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3 mr-1" />
                        Copy to Clipboard
                      </>
                    )}
                  </Button>
                </div>
                <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <p className="text-sm font-medium mb-1">Next Step for CEO</p>
                  <p className="text-sm">{result.nextStep}</p>
                </div>
              </CardContent>
            </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Analysis;
