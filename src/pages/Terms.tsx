import { DashboardLayout } from "@/components/DashboardLayout";
import { Link } from "react-router-dom";

export default function Terms() {
  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto px-6 py-10 space-y-4">
        <h1 className="text-3xl font-semibold tracking-tight">Terms &amp; Conditions</h1>
        <p className="text-sm text-muted-foreground">
          Ironworx Ltd T/A My LOXX — Company No. 14698937
        </p>

        <h2 className="text-xl font-semibold mt-6">1. About Us</h2>
        <p className="text-sm leading-relaxed">
          My LOXX is a trading name of Ironworx Ltd, a company registered in England and Wales (Company No. 14698937).
          References to "we", "us" or "our" in these terms refer to Ironworx Ltd T/A My LOXX.
        </p>

        <h2 className="text-xl font-semibold mt-6">2. These Terms</h2>
        <p className="text-sm leading-relaxed">
          These terms govern your use of the My LOXX platform and any orders placed through it. By placing an order you
          agree to these terms. These terms apply to business customers only — My LOXX does not sell to consumers.
        </p>

        <h2 className="text-xl font-semibold mt-6">3. Orders</h2>
        <p className="text-sm leading-relaxed">
          All orders are subject to acceptance by us. We reserve the right to decline any order. Once an order is
          confirmed and payment taken, it enters production and cannot be amended or cancelled.
        </p>

        <h2 className="text-xl font-semibold mt-6">4. Custom Manufactured Products</h2>
        <p className="text-sm leading-relaxed">
          All cylinders and keys supplied through My LOXX are manufactured to order, keyed to your specific master key
          system profile. Because these products are custom-made to your specification, they are non-returnable and
          non-refundable once production has commenced, except where the products are faulty or not as specified.
        </p>

        <h2 className="text-xl font-semibold mt-6">5. Pricing</h2>
        <p className="text-sm leading-relaxed">
          All prices are shown exclusive of VAT unless stated otherwise. VAT will be added at the prevailing rate at the
          point of order. Delivery charges are applied to every order and shown clearly before payment.
        </p>

        <h2 className="text-xl font-semibold mt-6">6. Delivery</h2>
        <p className="text-sm leading-relaxed">
          We aim to despatch orders within the lead time indicated at the time of order. Delivery timescales are
          estimates only and we accept no liability for delays outside our reasonable control.
        </p>

        <h2 className="text-xl font-semibold mt-6">7. Faulty or Incorrect Products</h2>
        <p className="text-sm leading-relaxed">
          If products arrive faulty or do not match the specification on your order, please notify us within 7 days of
          receipt. We will arrange replacement or credit at our discretion.
        </p>

        <h2 className="text-xl font-semibold mt-6">8. Liability</h2>
        <p className="text-sm leading-relaxed">
          Our liability to you shall not exceed the value of the order in question. We accept no liability for indirect
          or consequential losses.
        </p>

        <h2 className="text-xl font-semibold mt-6">9. Platform</h2>
        <p className="text-sm leading-relaxed">
          The My LOXX platform is provided free of charge. We reserve the right to suspend or terminate access at our
          discretion. We are not liable for any loss arising from platform downtime or unavailability.
        </p>

        <h2 className="text-xl font-semibold mt-6">10. Governing Law</h2>
        <p className="text-sm leading-relaxed">
          These terms are governed by the laws of England and Wales.
        </p>

        <div className="flex gap-4 pt-6 text-sm">
          <Link to="/returns" className="text-amber-600 hover:underline">Returns Policy</Link>
          <Link to="/dashboard" className="text-amber-600 hover:underline">Back to dashboard</Link>
        </div>
      </div>
    </DashboardLayout>
  );
}
