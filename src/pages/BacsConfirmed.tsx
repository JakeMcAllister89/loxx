import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";

export default function BacsConfirmed() {
  const [params] = useSearchParams();
  const ref = params.get("ref");

  return (
    <DashboardLayout>
      <div className="max-w-xl mx-auto py-12 px-4 flex flex-col items-center text-center space-y-6">
        <CheckCircle2 className="h-16 w-16 text-green-500" />
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Pro-forma invoice sent</h1>
          <p className="text-muted-foreground">
            Check your email — your pro-forma invoice is on its way.
          </p>
        </div>

        {ref && (
          <div className="w-full bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="text-xs uppercase tracking-wide text-amber-800 mb-1">
              Your order reference
            </div>
            <div className="text-2xl font-bold tracking-[0.15em] text-amber-900">
              {ref}
            </div>
          </div>
        )}

        <div className="w-full bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm text-blue-900 text-left">
          Please use your order reference as the payment reference when making
          your bank transfer. Your order will be confirmed and dispatched
          within 3–5 working days of payment clearing.
        </div>

        <div className="w-full flex flex-col gap-2 pt-2">
          <Button asChild className="w-full bg-amber-500 hover:bg-amber-600 text-white">
            <Link to="/orders">View my orders</Link>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link to="/dashboard">Back to dashboard</Link>
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
