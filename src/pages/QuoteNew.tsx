import { DashboardLayout } from "@/components/DashboardLayout";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, Lock, KeyRound, Minus, Plus, FileText } from "lucide-react";
import { peekQuoteDraft, clearQuoteDraft, totals } from "@/lib/quote";
import type { CartLine } from "@/contexts/CartContext";
import type { TreeData } from "@/lib/keytree";
import { toast } from "sonner";

interface DeliveryAddress {
  line1: string; line2: string; city: string; county: string; postcode: string;
}

export default function QuoteNew() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [params] = useSearchParams();
  const editingId = params.get("edit");

  const [items, setItems] = useState<CartLine[]>([]);
  const [systemId, setSystemId] = useState<string | null>(null);
  const [systemName, setSystemName] = useState<string | null>(null);
  const [systemRef, setSystemRef] = useState<string | null>(null);
  const [treeSnapshot, setTreeSnapshot] = useState<TreeData | null>(null);

  const [validityDays, setValidityDays] = useState(30);
  const [validUntil, setValidUntil] = useState<string>("");
  const [customerName, setCustomerName] = useState("");
  const [company, setCompany] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [delivery, setDelivery] = useState<DeliveryAddress>({ line1: "", line2: "", city: "", county: "", postcode: "" });
  const [poRef, setPoRef] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // Load defaults: profile + admin_settings + (edit OR draft)
  useEffect(() => {
    (async () => {
      if (!user) return;
      const [{ data: profile }, { data: settings }] = await Promise.all([
        supabase.from("profiles").select("name,company,email").eq("id", user.id).maybeSingle(),
        (supabase.from("admin_settings" as any) as any).select("key,value").eq("key", "quote_validity_days").maybeSingle(),
      ]);
      const days = Number(JSON.parse(settings?.value ?? "30")) || 30;
      setValidityDays(days);
      const d = new Date(); d.setDate(d.getDate() + days);
      setValidUntil(d.toISOString().slice(0, 10));
      if (profile) {
        setCustomerName(profile.name ?? "");
        setCompany(profile.company ?? "");
        setCustomerEmail(profile.email ?? user.email ?? "");
      } else {
        setCustomerEmail(user.email ?? "");
      }

      if (editingId) {
        const { data: q } = await (supabase.from("quotes" as any) as any).select("*").eq("id", editingId).maybeSingle();
        if (q) {
          setItems((q.items as CartLine[]) ?? []);
          setSystemId(q.system_id);
          setTreeSnapshot(q.tree_snapshot ?? null);
          if (q.valid_until) setValidUntil(q.valid_until);
          setCustomerName(q.customer_name ?? "");
          setCompany(q.company ?? "");
          setCustomerEmail(q.customer_email ?? "");
          setDelivery({ line1: "", line2: "", city: "", county: "", postcode: "", ...(q.delivery_address ?? {}) });
          setPoRef(q.customer_po_ref ?? "");
          setNotes(q.notes ?? "");
          if (q.system_id) {
            const { data: sys } = await supabase.from("key_systems").select("name,reference").eq("id", q.system_id).maybeSingle();
            if (sys) { setSystemName(sys.name); setSystemRef(sys.reference); }
          }
        }
        return;
      }

      const draft = peekQuoteDraft();
      if (draft) {
        setItems(draft.items);
        setSystemId(draft.system_id);
        setSystemName(draft.system_name);
        setSystemRef(draft.system_reference);
        setTreeSnapshot(draft.tree_snapshot);
        clearQuoteDraft();
      }
    })();
  }, [user, editingId]);

  const t = useMemo(() => totals(items), [items]);

  const updateQty = (i: number, q: number) =>
    setItems((p) => p.map((it, idx) => (idx === i ? { ...it, quantity: Math.max(1, q) } : it)));
  const removeItem = (i: number) => setItems((p) => p.filter((_, idx) => idx !== i));

  const save = async () => {
    if (!user) return;
    if (items.length === 0) { toast.error("Add at least one item"); return; }
    setSaving(true);
    try {
      let quote_number: string | null = null;
      if (!editingId) {
        const { data: num } = await (supabase as any).rpc("assign_quote_number");
        quote_number = (num as string) ?? null;
      }
      const payload: any = {
        user_id: user.id,
        system_id: systemId,
        valid_until: validUntil || null,
        customer_name: customerName || null,
        customer_email: customerEmail || null,
        company: company || null,
        delivery_address: delivery,
        customer_po_ref: poRef || null,
        notes: notes || null,
        items,
        subtotal: t.subtotal,
        vat: t.vat,
        total: t.total,
        tree_snapshot: treeSnapshot,
      };
      if (quote_number) payload.quote_number = quote_number;

      let id = editingId;
      if (editingId) {
        const { error } = await (supabase.from("quotes" as any) as any).update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { data, error } = await (supabase.from("quotes" as any) as any).insert(payload).select("id").single();
        if (error) throw error;
        id = data.id;
      }
      toast.success(editingId ? "Quote updated" : "Quote created");
      navigate(`/quotes/${id}`);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to save quote");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-8 max-w-7xl">
        <div className="flex items-center gap-3">
          <FileText className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-semibold tracking-tight">{editingId ? "Edit quote" : "Create quote"}</h1>
          {systemRef && (
            <span className="font-mono text-xs px-2 py-1 rounded bg-amber-100 text-amber-900 border border-amber-200">{systemRef}</span>
          )}
        </div>
        <p className="text-muted-foreground text-sm mt-1">Generate a formal quotation to share with procurement for approval before ordering.</p>

        {items.length === 0 ? (
          <div className="mt-10 rounded-[10px] border-2 border-dashed bg-card p-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground" />
            <p className="mt-4 text-lg font-medium">No items in this quote yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Open a system in the Builder and click <em>Get quote</em> to populate one.</p>
          </div>
        ) : (
        <div className="mt-6 grid lg:grid-cols-[1fr_400px] gap-6">
          {/* LEFT — items */}
          <div className="space-y-6">
            <section className="rounded-[10px] border bg-card shadow-card overflow-hidden">
              <header className="bg-muted/40 px-4 py-3 flex items-center justify-between">
                <div>
                  <div className="font-semibold">{systemName ?? "Quote items"}</div>
                  {systemRef && <div className="text-[11px] text-muted-foreground">System reference</div>}
                </div>
              </header>
              <ul className="divide-y">
                {items.map((line, index) => (
                  <li key={index} className="p-4 flex gap-4 items-start">
                    {line.kind === "cylinder" ? (
                      <>
                        {line.image_url ? (
                          <img src={line.image_url} alt="" className="h-12 w-12 rounded object-cover bg-muted shrink-0" />
                        ) : (
                          <div className="h-12 w-12 rounded bg-muted flex items-center justify-center shrink-0"><Lock className="h-5 w-5 text-muted-foreground" /></div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            {line.differ_ref && (
                              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-200">{line.differ_ref}</span>
                            )}
                            <div className="font-semibold">{line.room_label || line.product_name || line.product_code}</div>
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {[line.cylinder_profile, line.finish, line.size].filter(Boolean).join(" · ") || line.cylinder_type}
                          </div>
                          <div className="text-[11px] text-muted-foreground font-mono mt-0.5">{line.product_name} · {line.product_code}</div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="h-12 w-12 rounded bg-amber-50 flex items-center justify-center shrink-0"><KeyRound className="h-5 w-5 text-amber-600" /></div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm">{line.key_reference ?? `Extra keys${line.differ_ref ? ` (${line.differ_ref})` : ""}`}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">2 standard keys are included per cylinder</div>
                        </div>
                      </>
                    )}
                    <div className="flex items-center gap-1 shrink-0">
                      <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => updateQty(index, line.quantity - 1)} disabled={line.quantity <= 1}><Minus className="h-3 w-3" /></Button>
                      <Input type="number" min={1} value={line.quantity} onChange={(e) => updateQty(index, parseInt(e.target.value) || 1)} className="h-8 w-14 text-center font-mono" />
                      <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => updateQty(index, line.quantity + 1)}><Plus className="h-3 w-3" /></Button>
                    </div>
                    <div className="text-right shrink-0 w-24">
                      <div className="text-xs text-muted-foreground font-mono">£{line.unit_price.toFixed(2)}</div>
                      <div className="font-mono font-semibold">£{(line.unit_price * line.quantity).toFixed(2)}</div>
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => removeItem(index)} className="shrink-0"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          {/* RIGHT — quote details */}
          <aside className="space-y-4">
            <div className="rounded-[10px] border bg-card shadow-card p-5 space-y-3">
              <h2 className="font-semibold">Quote details</h2>
              <div><Label className="text-xs">Valid until</Label><Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} /></div>
              <div><Label className="text-xs">Contact name</Label><Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} /></div>
              <div><Label className="text-xs">Company</Label><Input value={company} onChange={(e) => setCompany(e.target.value)} /></div>
              <div><Label className="text-xs">Contact email</Label><Input type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} /></div>
            </div>

            <div className="rounded-[10px] border bg-card shadow-card p-5">
              <h2 className="font-semibold mb-3">Delivery address</h2>
              <div className="space-y-2">
                <div><Label className="text-xs">Address line 1</Label><Input value={delivery.line1} onChange={(e) => setDelivery({ ...delivery, line1: e.target.value })} /></div>
                <div><Label className="text-xs">Address line 2</Label><Input value={delivery.line2} onChange={(e) => setDelivery({ ...delivery, line2: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label className="text-xs">City</Label><Input value={delivery.city} onChange={(e) => setDelivery({ ...delivery, city: e.target.value })} /></div>
                  <div><Label className="text-xs">County</Label><Input value={delivery.county} onChange={(e) => setDelivery({ ...delivery, county: e.target.value })} /></div>
                </div>
                <div><Label className="text-xs">Postcode</Label><Input value={delivery.postcode} onChange={(e) => setDelivery({ ...delivery, postcode: e.target.value })} /></div>
              </div>
            </div>

            <div className="rounded-[10px] border bg-card shadow-card p-5 space-y-3">
              <div>
                <Label className="text-xs">Customer PO / reference (optional)</Label>
                <Input value={poRef} onChange={(e) => setPoRef(e.target.value)} placeholder="e.g. PO-2024-001" />
              </div>
              <div>
                <Label className="text-xs">Notes (optional)</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4}
                  placeholder="e.g. Please review and approve this quote for our master key system. Valid for 30 days. Contact me with any questions." />
              </div>
            </div>

            <div className="rounded-[10px] border bg-card shadow-card p-5">
              <h2 className="font-semibold mb-3">Pricing</h2>
              <div className="space-y-1 text-sm font-mono">
                <div className="flex justify-between text-muted-foreground"><span>Cylinders</span><span>£{t.cylSub.toFixed(2)}</span></div>
                {t.keySub > 0 && <div className="flex justify-between text-muted-foreground"><span>Extra keys</span><span>£{t.keySub.toFixed(2)}</span></div>}
                <div className="flex justify-between border-t pt-2 mt-2"><span>Subtotal (ex VAT)</span><span>£{t.subtotal.toFixed(2)}</span></div>
                <div className="flex justify-between text-muted-foreground"><span>VAT (20%)</span><span>£{t.vat.toFixed(2)}</span></div>
                <div className="flex justify-between text-lg font-bold text-amber-600 border-t pt-2 mt-2"><span>Total inc VAT</span><span>£{t.total.toFixed(2)}</span></div>
              </div>
            </div>

            <div className="space-y-2">
              <Button onClick={save} disabled={saving} className="w-full bg-primary hover:bg-primary/90 text-base h-12">
                {saving ? "Saving…" : editingId ? "Update quote →" : "Generate quote →"}
              </Button>
              {!editingId && (
                <Button
                  variant="outline"
                  disabled={saving}
                  className="w-full"
                  onClick={async () => {
                    if (!user) return;
                    if (items.length === 0) { toast.error("Add at least one item"); return; }
                    setSaving(true);
                    try {
                      const { data: num } = await (supabase as any).rpc("assign_quote_number");
                      const payload: any = {
                        user_id: user.id,
                        system_id: systemId,
                        status: "draft",
                        valid_until: validUntil || null,
                        customer_name: customerName || null,
                        customer_email: customerEmail || null,
                        company: company || null,
                        delivery_address: delivery,
                        customer_po_ref: poRef || null,
                        notes: notes || null,
                        items,
                        subtotal: t.subtotal,
                        vat: t.vat,
                        total: t.total,
                        tree_snapshot: treeSnapshot,
                        quote_number: num ?? null,
                      };
                      const { error } = await (supabase.from("quotes" as any) as any).insert(payload);
                      if (error) throw error;
                      toast.success("Quote saved as draft");
                      navigate("/quotes");
                    } catch (e: any) {
                      toast.error(e?.message ?? "Failed to save draft");
                    } finally {
                      setSaving(false);
                    }
                  }}
                >
                  Save as draft
                </Button>
              )}
            </div>
          </aside>
        </div>
        )}
      </div>
    </DashboardLayout>
  );
}
