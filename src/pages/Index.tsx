import { Button } from "@/components/ui/button";
import { ArrowRight, BarChart3, Users, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import logo from "@/assets/logo.png";
import Footer from "@/components/Footer";

const Index = () => {
  const features = [
    {
      icon: Users,
      title: "Team Management",
      description: "Track every team member's daily performance with automated check-ins",
    },
    {
      icon: Zap,
      title: "AI-Powered Analysis",
      description: "Get instant insights with smart scoring and blocker detection",
    },
    {
      icon: BarChart3,
      title: "Executive Briefs",
      description: "Daily CEO summaries with actionable next steps and audit trails",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-card flex flex-col">
      <header className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img src={logo} alt="WorkChief" className="h-10 w-10" />
            <span className="text-2xl font-bold">WorkChief</span>
          </div>
          <Link to="/auth">
            <Button variant="outline">Sign In</Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 flex-1">
        <section className="py-20 text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Your AI Chief Operating Officer
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Transform daily team updates into actionable insights. Track performance, detect blockers,
            and make data-driven decisions with AI-powered analysis.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link to="/dashboard">
              <Button size="lg" className="group">
                View Demo
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
            <Link to="/auth">
              <Button size="lg" variant="outline">
                Get Started
              </Button>
            </Link>
          </div>
        </section>

        <section className="py-20">
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="p-6 rounded-lg bg-card border border-border hover:border-primary/50 transition-colors"
              >
                <feature.icon className="h-12 w-12 text-primary mb-4" />
                <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Index;
