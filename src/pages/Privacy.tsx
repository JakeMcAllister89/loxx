import { DashboardLayout } from "@/components/DashboardLayout";
import { Link } from "react-router-dom";

export default function Privacy() {
  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto px-6 py-10 space-y-4">
        <h1 className="text-3xl font-semibold tracking-tight">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground">
          Ironworx Ltd T/A My LOXX — Company No. 14698937
        </p>

        <h2 className="text-xl font-semibold mt-6">1. Who We Are</h2>
        <p className="text-sm leading-relaxed">
          My LOXX is a trading name of Ironworx Ltd, a company registered in England and Wales
          (Company No. 14698937). We are the data controller for the personal data described in
          this policy.
        </p>

        <h2 className="text-xl font-semibold mt-6">2. What We Collect</h2>
        <p className="text-sm leading-relaxed">
          When you create an account or use My LOXX, we collect: your name, email address, phone
          number and organisation details; delivery and billing addresses you provide for orders;
          records of the master key systems, orders and quotes you create on the platform; and
          basic usage data such as sign-in times.
        </p>

        <h2 className="text-xl font-semibold mt-6">3. How We Use It</h2>
        <p className="text-sm leading-relaxed">
          We use this data to operate your account, process and fulfil hardware orders, generate
          purchase orders and invoices, provide customer support, and manually approve new
          organisation accounts before granting access to the platform.
        </p>

        <h2 className="text-xl font-semibold mt-6">4. Who We Share It With</h2>
        <p className="text-sm leading-relaxed">
          We share order data with DOM-UK, our hardware supplier, in order to fulfil your orders.
          We use Stripe to process card payments, and Resend to send transactional emails such as
          order confirmations and invitations. We do not sell your personal data to third parties.
        </p>

        <h2 className="text-xl font-semibold mt-6">5. Data Retention</h2>
        <p className="text-sm leading-relaxed">
          We retain account and order data for as long as your account is active, and afterwards
          for as long as necessary to meet our legal, accounting and tax obligations.
        </p>

        <h2 className="text-xl font-semibold mt-6">6. Your Rights</h2>
        <p className="text-sm leading-relaxed">
          Under UK GDPR, you have the right to access, correct, or request deletion of your
          personal data, and to object to or restrict certain processing. To exercise these
          rights, contact us at hello@myloxx.co.uk.
        </p>

        <h2 className="text-xl font-semibold mt-6">7. Cookies</h2>
        <p className="text-sm leading-relaxed">
          My LOXX uses only essential cookies required to keep you signed in and to operate the
          platform. We do not use advertising or third-party tracking cookies.
        </p>

        <h2 className="text-xl font-semibold mt-6">8. Contact</h2>
        <p className="text-sm leading-relaxed">
          Questions about this policy can be sent to hello@myloxx.co.uk.
        </p>

        <div className="flex gap-4 pt-6 text-sm">
          <Link to="/terms" className="text-amber-600 hover:underline">Terms &amp; Conditions</Link>
          <Link to="/dashboard" className="text-amber-600 hover:underline">Back to dashboard</Link>
        </div>
      </div>
    </DashboardLayout>
  );
}
