import { DashboardLayout } from "@/components/DashboardLayout";
import { Clock } from "lucide-react";

export default function PendingApproval() {
  return (
    <DashboardLayout>
      <div className="p-8 max-w-2xl mx-auto">
        <div className="rounded-[10px] border bg-card p-10 text-center shadow-card">
          <Clock className="h-12 w-12 mx-auto text-amber-500" />
          <h1 className="text-2xl font-semibold tracking-tight mt-4">Account pending approval</h1>
          <p className="text-muted-foreground text-sm mt-3">
            Thanks for signing up to LOXX. Your account is being reviewed and you'll get an email once it's approved — this is usually quick.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
