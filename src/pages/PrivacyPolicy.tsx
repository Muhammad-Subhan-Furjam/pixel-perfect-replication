import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.png";

const PrivacyPolicy = () => {
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
          <h1 className="text-4xl font-bold mb-2 text-foreground">Privacy Policy</h1>
          <p className="text-muted-foreground mb-8">Last Updated: December 2025</p>

          <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
            <p className="text-muted-foreground leading-relaxed">
              WorkChief.ai ("WorkChief," "we," "our," or "us") provides an AI-powered operations platform that helps businesses monitor productivity, automate workflows, and support decision-making. This Privacy Policy explains how we collect, use, store, and protect your information when you use our website, application, APIs, or services (collectively, the "Services").
            </p>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">1. Information We Collect</h2>
              <p className="text-muted-foreground mb-4">We may collect the following categories of data:</p>
              
              <h3 className="text-xl font-medium text-foreground mb-3">A. Information You Provide</h3>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>Account details (name, email, phone, organization name & role)</li>
                <li>Payment details (billing address, transaction information)</li>
                <li>Files, messages, productivity metrics, and other content you upload to the platform</li>
              </ul>

              <h3 className="text-xl font-medium text-foreground mb-3 mt-6">B. Automatically Collected Information</h3>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>Device identifiers, browser type, IP address</li>
                <li>Usage data (pages visited, time spent, interactions, activity logs)</li>
                <li>Cookies and tracking technologies (see Section 8)</li>
              </ul>

              <h3 className="text-xl font-medium text-foreground mb-3 mt-6">C. Business Data</h3>
              <p className="text-muted-foreground ml-4">
                Users may submit organization or employee-related data for analytics and automation. The organization is responsible for obtaining any necessary employee consent required by applicable law.
              </p>

              <h3 className="text-xl font-medium text-foreground mb-3 mt-6">D. AI Data Processing</h3>
              <p className="text-muted-foreground ml-4">
                To enhance accuracy, user input, organizational workflow metrics, and anonymized operational data may be used to train models unless you request an opt-out.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">2. How We Use Your Information</h2>
              <p className="text-muted-foreground mb-2">We use your information to:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>Provide and improve the WorkChief platform</li>
                <li>Personalize AI recommendations and automation</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">3. Data Ownership</h2>
              <p className="text-muted-foreground mb-2"><strong>You retain ownership of:</strong></p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-4">
                <li>All business information, documents, messages, employee data, and operational metrics uploaded to the platform.</li>
              </ul>
              <p className="text-muted-foreground mb-2"><strong>WorkChief retains ownership of:</strong></p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>Algorithms, AI models, software architecture, anonymized insights, and statistical aggregate data.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">4. Data Sharing</h2>
              <p className="text-muted-foreground mb-2">We may share data only with:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-4">
                <li>Authorized service providers (cloud hosting, analytics, payment processors)</li>
                <li>Legal and regulatory authorities if required by law</li>
                <li>Third parties only with your explicit consent (e.g., integration partners)</li>
              </ul>
              <p className="text-muted-foreground">We do not share customer data for marketing without permission.</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">5. Data Security</h2>
              <p className="text-muted-foreground mb-2">We use industry-grade safeguards:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-4">
                <li>AES-256 encryption at rest</li>
                <li>HTTPS/TLS in transit</li>
                <li>Role-based access control</li>
                <li>Audit logs and authentication protocols</li>
                <li>Optional multi-factor authentication (MFA)</li>
              </ul>
              <p className="text-muted-foreground">If a breach occurs, you will be notified within legally required timelines.</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">6. Retention & Deletion</h2>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>We retain data while your account is active or required for legal purposes.</li>
                <li>You may request data deletion at any time by contacting support@workchief.ai.</li>
                <li>Deleted data cannot be recovered.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">7. International Transfers</h2>
              <p className="text-muted-foreground">
                Data may be transferred and processed in countries where WorkChief or its vendors operate. We ensure compliance through Standard Contractual Clauses (SCCs), GDPR, and applicable privacy frameworks.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">8. Cookies & Tracking</h2>
              <p className="text-muted-foreground mb-2">We use cookies for:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-4">
                <li>Authentication</li>
                <li>Analytics</li>
                <li>Personalization</li>
                <li>User experience</li>
              </ul>
              <p className="text-muted-foreground">You can opt out via your browser settings. Some features may not function without cookies.</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">9. Children's Privacy</h2>
              <p className="text-muted-foreground">
                WorkChief is intended for business use only and is not directed toward children under 16. We do not knowingly collect data from minors.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">10. Your Rights</h2>
              <p className="text-muted-foreground mb-2">Depending on your jurisdiction (e.g., GDPR, CCPA), you may have rights to:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-4">
                <li>Access your data</li>
                <li>Correct or delete data</li>
                <li>Restrict or object to processing</li>
                <li>Request data portability</li>
                <li>Opt out of AI training</li>
              </ul>
              <p className="text-muted-foreground">Contact: <a href="mailto:support@workchief.ai" className="text-primary hover:underline">support@workchief.ai</a></p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">11. Updates</h2>
              <p className="text-muted-foreground">
                We may update this Privacy Policy from time to time. We will notify you of material changes by posting the new Privacy Policy on this page with a revised "Last Updated" date.
              </p>
            </section>

            <section className="pt-4 border-t border-border">
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

export default PrivacyPolicy;
