import { KeyRound } from "lucide-react";

export function LoxxLogo({ className = "", size = "md" }: { className?: string; size?: "sm" | "md" | "lg" }) {
  const text = size === "lg" ? "text-2xl" : size === "sm" ? "text-base" : "text-xl";
  const icon = size === "lg" ? "h-7 w-7" : size === "sm" ? "h-4 w-4" : "h-5 w-5";
  return (
    <div className={`flex items-center gap-2 font-semibold tracking-tight ${text} ${className}`}>
      <span className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground" style={{ padding: size === "lg" ? 6 : 4 }}>
        <KeyRound className={icon} strokeWidth={2.5} />
      </span>
      <span>My LOXX</span>
    </div>
  );
}
