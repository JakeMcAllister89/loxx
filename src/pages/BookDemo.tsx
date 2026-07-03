import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LoxxLogo } from "@/components/LoxxLogo";

export default function BookDemo() {
  useEffect(() => {
    const link = document.createElement("link");
    link.href = "https://assets.calendly.com/assets/external/widget.css";
    link.rel = "stylesheet";
    document.head.appendChild(link);

    const script = document.createElement("script");
    script.src = "https://assets.calendly.com/assets/external/widget.js";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.head.removeChild(link);
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-6 py-16">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold tracking-tight text-foreground mb-4">
            Book a Demo
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            See My LOXX in action. Pick a time that works for you and we'll walk you through the platform.
          </p>
        </div>
        <div
          className="calendly-inline-widget"
          data-url="https://calendly.com/iron-worx-sales/30min"
          style={{ minWidth: "320px", height: "700px" }}
        />
      </div>
    </div>
  );
}
