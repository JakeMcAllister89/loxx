import { AppSidebar } from "./AppSidebar";
import { ImpersonationBanner } from "./ImpersonationBanner";

export function DashboardLayout({
  children,
  noScroll = false,
}: {
  children: React.ReactNode;
  noScroll?: boolean;
}) {
  return (
    <div className={`flex flex-col w-full bg-background ${noScroll ? "h-screen overflow-hidden" : "min-h-screen"}`}>
      <ImpersonationBanner />
      <div className={`flex flex-1 min-h-0 w-full ${noScroll ? "overflow-hidden" : ""}`}>
        <AppSidebar />
        <main className={`flex-1 min-w-0 ${noScroll ? "overflow-hidden flex flex-col" : "overflow-auto"}`}>
          {children}
        </main>
      </div>
    </div>
  );
}
