import { DashboardLayout } from "@/components/DashboardLayout";
import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Network } from "lucide-react";

export default function Builder() {
  const { id } = useParams();
  const [system, setSystem] = useState<any>(null);
  const [name, setName] = useState("");

  useEffect(() => {
    if (!id) return;
    supabase.from("key_systems").select("*").eq("id", id).single().then(({ data }) => {
      setSystem(data); setName(data?.name ?? "");
    });
  }, [id]);

  const saveName = async () => {
    if (!id) return;
    await supabase.from("key_systems").update({ name }).eq("id", id);
  };

  if (!id) {
    return (
      <DashboardLayout>
        <div className="p-12 text-center">
          <Network className="h-12 w-12 mx-auto text-muted-foreground" />
          <h2 className="text-xl font-semibold mt-4">Open a system to start building</h2>
          <p className="text-sm text-muted-foreground mt-1">Select one from the sidebar or create a new system.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col h-screen">
        <div className="border-b bg-card px-6 py-3 flex items-center gap-4">
          <Input value={name} onChange={(e) => setName(e.target.value)} onBlur={saveName} className="max-w-sm font-semibold" />
          <span className="font-mono text-xs px-2 py-1 rounded bg-muted text-muted-foreground">{system?.reference}</span>
          <div className="flex-1" />
          <Button variant="outline">Validate</Button>
          <Button className="bg-primary hover:bg-primary/90">Export to order</Button>
        </div>

        <div className="flex-1 flex items-center justify-center bg-background">
          <div className="text-center max-w-md">
            <div className="inline-flex h-14 w-14 rounded-full bg-accent-light items-center justify-center mb-4">
              <Network className="h-7 w-7 text-primary" />
            </div>
            <h2 className="text-xl font-semibold">System builder — coming in Phase 2</h2>
            <p className="text-sm text-muted-foreground mt-2">
              The interactive react-flow tree with GMK → SMK → CK → Cylinder hierarchy, drag-to-reorder,
              inline rename, and live validation is being built next.
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
