import { AppSidebar } from "./AppSidebar";

export function DashboardLayout({
  children,
  noScroll = false,
}: {
  children: React.ReactNode;
  noScroll?: boolean;
}) {
  return (
    <div className={`flex w-full bg-background ${noScroll ? "h-screen overflow-hidden" : "min-h-screen"}`}>
      <AppSidebar />
      <main className={`flex-1 min-w-0 ${noScroll ? "overflow-hidden flex flex-col" : "overflow-auto"}`}>
        {children}
      </main>
    </div>
  );
}
