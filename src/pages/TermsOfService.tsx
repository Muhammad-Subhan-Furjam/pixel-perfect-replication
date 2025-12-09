import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.png";

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-card">
      <header className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-3">
            <img src={logo} alt="WorkChief" className="h-10 w-10" />
            <span className="text-2xl font-bold">WorkChief.ai</span>
          </Link>
          <Link to="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="bg-card rounded-xl border border-border p-8 md:p-12 shadow-lg">
          <h1 className="text-4xl font-bold mb-2 text-foreground">Terms of Service</h1>
          <p className="text-muted-foreground mb-8">Last Updated: December 2025</p>

          <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">1. Acceptance</h2>
              <p className="text-muted-foreground">
                By accessing or using WorkChief.ai, you agree to these Terms. If you do not agree, do not use the platform.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">2. License to Use</h2>
              <p className="text-muted-foreground mb-4">
                We grant you a non-transferable, limited license to use our Services for business operations and workflow management.
              </p>
              <p className="text-muted-foreground">
                You, the customer, must ensure lawful and ethical use of the platform.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">3. Prohibited Use</h2>
              <p className="text-muted-foreground mb-2">You may not:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>Reverse-engineer, copy, or resell the platform without permission</li>
                <li>Upload harmful code or attempt to access restricted systems</li>
                <li>Use the platform to violate employment, labor, or privacy laws</li>
                <li>Use the platform to discriminate or engage in unlawful surveillance</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">4. AI & Automation Disclaimer</h2>
              <p className="text-muted-foreground">
                WorkChief provides analytics and recommendations. Decisions, hiring actions, performance evaluations, disciplinary actions, and business outcomes remain solely your responsibility. WorkChief is not liable for business or HR decisions made using its AI outputs.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">5. Payment & Billing</h2>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>Subscription fees are billed as stated at signup.</li>
                <li>Fees are non-refundable unless required by law.</li>
                <li>Failure to pay may result in suspension or termination of service.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">6. Termination</h2>
              <p className="text-muted-foreground mb-2">We may suspend or terminate your account:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-4">
                <li>For non-payment</li>
                <li>For violation of these Terms</li>
                <li>For misuse or security threats</li>
              </ul>
              <p className="text-muted-foreground">
                You may terminate anytime by contacting support. Upon termination, your data can be deleted upon request.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">7. Warranty Disclaimer</h2>
              <p className="text-muted-foreground">
                WorkChief is provided "AS IS" without warranties, explicit or implied. We do not guarantee specific business results, accuracy, metrics, or uptime.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">8. Limitation of Liability</h2>
              <p className="text-muted-foreground mb-2">To the fullest extent allowed by law:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>WorkChief is not liable for indirect, consequential, or punitive damages.</li>
                <li>Maximum liability is limited to the amount paid in the prior 12 months.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">9. Intellectual Property</h2>
              <p className="text-muted-foreground mb-2">WorkChief owns:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-4">
                <li>All software, UI/UX components, analytics tools, models, dashboards, algorithms, and documentation.</li>
              </ul>
              <p className="text-muted-foreground">
                You may not copy or replicate our technology without authorization.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">10. Governing Law</h2>
              <p className="text-muted-foreground">
                These terms are governed by the laws of the jurisdiction where WorkChief is incorporated (U.S., Delaware, unless otherwise specified). Disputes may be resolved through arbitration.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">11. Contact</h2>
              <p className="text-muted-foreground">
                For questions or legal concerns, contact us at{" "}
                <a href="mailto:support@workchief.ai" className="text-primary hover:underline">support@workchief.ai</a>
              </p>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
};

export default TermsOfService;
