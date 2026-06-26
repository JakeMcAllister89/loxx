import { DashboardLayout } from "@/components/DashboardLayout";
import { Link } from "react-router-dom";

export default function Returns() {
  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto px-6 py-10 space-y-4">
        <h1 className="text-3xl font-semibold tracking-tight">Returns Policy</h1>
        <p className="text-sm text-muted-foreground">
          Ironworx Ltd T/A My LOXX — Company No. 14698937
        </p>

        <p className="text-sm leading-relaxed mt-4">
          My LOXX supplies master key cylinders and keys that are manufactured to order and keyed to your specific
          system profile. For this reason:
        </p>

        <ul className="list-disc pl-6 space-y-2 text-sm leading-relaxed">
          <li>
            We do not accept returns on cylinders or keys that have been manufactured to your specification, unless they
            are faulty or were supplied in error.
          </li>
          <li>
            Faulty products must be reported within 7 days of receipt with supporting photographs where possible. We
            will assess the claim and arrange replacement or credit if the fault is confirmed.
          </li>
          <li>
            Incorrectly supplied products (wrong product, wrong specification) must be reported within 7 days. We will
            arrange collection and replacement at no cost to you.
          </li>
          <li>Delivery charges are non-refundable except where we have made an error.</li>
        </ul>

        <p className="text-sm leading-relaxed mt-4">
          To report a faulty or incorrect order, please contact us via the platform or at the email address on your
          order confirmation.
        </p>

        <div className="flex gap-4 pt-6 text-sm">
          <Link to="/terms" className="text-amber-600 hover:underline">Terms &amp; Conditions</Link>
          <Link to="/dashboard" className="text-amber-600 hover:underline">Back to dashboard</Link>
        </div>
      </div>
    </DashboardLayout>
  );
}
