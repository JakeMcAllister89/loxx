import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type SettingsMap = Record<string, string>;

const ALL_KEYS = [
  "supplier_name", "supplier_email", "supplier_account",
  "company_name", "company_address", "company_phone", "company_email",
  "po_notes", "quote_validity_days",
  "quote_terms", "quote_footer",
  "vat_rate", "vat_number",
];

export default function AdminSettings() {
  const [values, setValues] = useState<SettingsMap>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("admin_settings").select("key,value").in("key", ALL_KEYS).then(({ data }) => {
      const m: SettingsMap = {};
      (data ?? []).forEach((r: any) => (m[r.key] = r.value ?? ""));
      setValues(m);
      setLoading(false);
    });
  }, []);

  const set = (k: string, v: string) => setValues((s) => ({ ...s, [k]: v }));

  const save = async (keys: string[], label: string) => {
    const rows = keys.map((k) => ({ key: k, value: values[k] ?? "" }));
    const { error } = await supabase.from("admin_settings").upsert(rows, { onConflict: "key" });
    if (error) return toast.error(error.message);
    toast.success(`${label} saved`);
  };

  if (loading) return <DashboardLayout><div className="p-8 text-muted-foreground">Loading…</div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="p-8 max-w-3xl">
        <div className="mb-6">
          <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
          <p className="text-muted-foreground text-sm">Configure supplier, company, PO, quote and VAT details.</p>
        </div>

        <Section title="Supplier details" onSave={() => save(["supplier_name", "supplier_email", "supplier_account"], "Supplier details")}>
          <Field label="Supplier name"><Input value={values.supplier_name ?? ""} onChange={(e) => set("supplier_name", e.target.value)} /></Field>
          <Field label="Supplier email" help="Where POs will be sent."><Input type="email" value={values.supplier_email ?? ""} onChange={(e) => set("supplier_email", e.target.value)} /></Field>
          <Field label="Supplier account number"><Input value={values.supplier_account ?? ""} onChange={(e) => set("supplier_account", e.target.value)} /></Field>
        </Section>

        <Section title="Company details" help="Appears on the PO header." onSave={() => save(["company_name", "company_address", "company_phone", "company_email"], "Company details")}>
          <Field label="Company name"><Input value={values.company_name ?? ""} onChange={(e) => set("company_name", e.target.value)} /></Field>
          <Field label="Company address"><Textarea rows={3} value={values.company_address ?? ""} onChange={(e) => set("company_address", e.target.value)} /></Field>
          <Field label="Company phone"><Input value={values.company_phone ?? ""} onChange={(e) => set("company_phone", e.target.value)} /></Field>
          <Field label="Company email"><Input type="email" value={values.company_email ?? ""} onChange={(e) => set("company_email", e.target.value)} /></Field>
        </Section>

        <Section title="Purchase order defaults" onSave={() => save(["po_notes", "quote_validity_days"], "PO defaults")}>
          <Field label="Default PO notes"><Textarea rows={3} value={values.po_notes ?? ""} onChange={(e) => set("po_notes", e.target.value)} /></Field>
          <Field label="Quote validity (days)"><Input type="number" value={values.quote_validity_days ?? ""} onChange={(e) => set("quote_validity_days", e.target.value)} /></Field>
        </Section>

        <Section title="Quote terms" onSave={() => save(["quote_terms", "quote_footer"], "Quote terms")}>
          <Field label="Quote terms"><Textarea rows={6} value={values.quote_terms ?? ""} onChange={(e) => set("quote_terms", e.target.value)} /></Field>
          <Field label="Quote footer"><Input value={values.quote_footer ?? ""} onChange={(e) => set("quote_footer", e.target.value)} /></Field>
        </Section>

        <Section title="VAT" onSave={() => save(["vat_rate", "vat_number"], "VAT settings")}>
          <Field label="VAT rate (%)"><Input type="number" value={values.vat_rate ?? ""} onChange={(e) => set("vat_rate", e.target.value)} /></Field>
          <Field label="VAT number"><Input value={values.vat_number ?? ""} onChange={(e) => set("vat_number", e.target.value)} /></Field>
        </Section>
      </div>
    </DashboardLayout>
  );
}

function Section({ title, help, children, onSave }: { title: string; help?: string; children: React.ReactNode; onSave: () => void }) {
  return (
    <div className="rounded-[10px] border bg-card shadow-card mb-6">
      <div className="px-5 py-4 border-b">
        <h2 className="text-sm font-semibold uppercase tracking-wide">{title}</h2>
        {help && <p className="text-xs text-muted-foreground mt-1">{help}</p>}
      </div>
      <div className="p-5 space-y-4">{children}</div>
      <div className="px-5 py-3 border-t flex justify-end">
        <Button size="sm" onClick={onSave} className="bg-primary hover:bg-primary/90">Save</Button>
      </div>
    </div>
  );
}

function Field({ label, help, children }: { label: string; help?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
      {children}
      {help && <p className="text-xs text-muted-foreground">{help}</p>}
    </div>
  );
}
