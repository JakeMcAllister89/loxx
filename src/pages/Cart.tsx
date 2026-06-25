import { DashboardLayout } from "@/components/DashboardLayout";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, KeyRound, ArrowLeft, Lock, ShieldCheck, Truck, Minus, Plus } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useMemo } from "react";
import { toast } from "sonner";

interface GroupKey { system_id: string | null | undefined; system_name: string | null | undefined; system_reference: string | null | undefined }

export default function Cart() {
  const { items, remove, updateQty, cylindersSubtotal, keysSubtotal, subtotal, vat, total, meta, setMeta } = useCart();
  const navigate = useNavigate();

  const grouped = useMemo(() => {
    const map = new Map<string, { key: GroupKey; lines: { line: typeof items[number]; index: number }[] }>();
    items.forEach((line, index) => {
      const id = line.system_id ?? "__none__";
      if (!map.has(id)) map.set(id, { key: { system_id: line.system_id, system_name: line.system_name, system_reference: line.system_reference }, lines: [] });
      map.get(id)!.lines.push({ line, index });
    });
    return Array.from(map.values());
  }, [items]);

  const systemRefs = useMemo(() => grouped.map(g => g.key).filter(k => k.system_id), [grouped]);

  if (items.length === 0) {
    return (
      <DashboardLayout>
        <div className="p-8 max-w-3xl mx-auto">
          <h1 className="text-3xl font-semibold tracking-tight">Your basket</h1>
          <div className="mt-10 rounded-[10px] border-2 border-dashed bg-card p-12 text-center">
            <KeyRound className="h-12 w-12 mx-auto text-muted-foreground" />
            <p className="mt-4 text-lg font-medium">Your basket is empty</p>
            <p className="mt-1 text-sm text-muted-foreground">Build a master-key system and export it to your basket to order cylinders.</p>
            <Button asChild className="mt-6 bg-amber-500 hover:bg-amber-600 text-white">
              <Link to="/dashboard">Go to your systems →</Link>
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const canReview = items.length > 0;
  const proceed = () => {
    const d = meta.delivery;
    if (!meta.companyName.trim()) {
      toast.error("Please enter your company name");
      return;
    }
    if (!d.contact_name || !d.contact_phone || !d.line1 || !d.city || !d.postcode) {
      toast.error("Please complete all required delivery fields including contact name and telephone");
      return;
    }
    navigate("/cart/review");
  };

  return (
    <DashboardLayout>
      <div className="p-8 max-w-7xl">
        <h1 className="text-3xl font-semibold tracking-tight">Your basket</h1>
        <p className="text-muted-foreground text-sm mt-1">Review your items and continue to confirm before payment.</p>

        <div className="mt-6 grid lg:grid-cols-[1fr_400px] gap-6">
          {/* LEFT — items */}
          <div className="space-y-6">
            {grouped.map(({ key, lines }) => (
              <section key={key.system_id ?? "none"} className="rounded-[10px] border bg-card shadow-card overflow-hidden">
                <header className="bg-muted/40 px-4 py-3 flex items-center justify-between">
                  <div>
                    <div className="font-semibold">{key.system_name ?? "Ad-hoc items"}</div>
                    {key.system_reference && (
                      <div className="text-[11px] text-muted-foreground">System reference</div>
                    )}
                  </div>
                  {key.system_reference && (
                    <span className="text-xs px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-200 font-medium">
                      {key.system_reference}
                    </span>
                  )}
                </header>
                <ul className="divide-y">
                  {lines.map(({ line, index }) => (
                    <li key={index} className="p-4 flex gap-4 items-start">
                      {line.kind === "cylinder" ? (
                        <>
                          {line.image_url ? (
                            <img src={line.image_url} alt="" className="h-12 w-12 rounded object-cover bg-muted shrink-0" />
                          ) : (
                            <div className="h-12 w-12 rounded bg-muted flex items-center justify-center shrink-0">
                              <Lock className="h-5 w-5 text-muted-foreground" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              {line.differ_ref && (
                                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-200">{line.differ_ref}</span>
                              )}
                              <div className="font-semibold">{line.room_label || line.product_name || line.product_code}</div>
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {[line.cylinder_profile, line.finish, line.size].filter(Boolean).join(" · ") || line.cylinder_type}
                            </div>
                            {line.product_name && (
                              <div className="text-[11px] text-muted-foreground mt-0.5">{line.product_name}</div>
                            )}
                            <div className="text-[11px] text-amber-700/70 mt-1">
                              {[line.system_reference, ...(line.hierarchy_refs ?? []), line.differ_ref].filter(Boolean).join(" · ")}
                            </div>
                            <div className="text-[11px] italic text-muted-foreground mt-0.5">Includes 2x standard differ keys with each lock</div>
                          </div>
                        </>
                      ) : line.is_extra_key || line.key_reference?.startsWith("Extra keys") ? (
                        <>
                          <div className="h-12 w-12 rounded bg-amber-50 flex items-center justify-center shrink-0">
                            <KeyRound className="h-5 w-5 text-amber-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-sm">
                              Extra keys — {line.room_label}{line.differ_ref ? ` (${line.differ_ref})` : ""}
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">Additional keys beyond the 2 standard included</div>
                          </div>
                        </>
                      ) : (
                        (() => {
                          const ref = line.key_reference ?? "";
                          const derivedLabel = line.key_type_label
                            ?? (ref === "GMK" || ref.startsWith("GMK") ? "Grand Master Key"
                              : ref.startsWith("MK-") ? "Master Key"
                              : ref.startsWith("SMK-") ? "Sub Master Key"
                              : "Key");
                          return (
                            <>
                              <div className="h-12 w-12 rounded bg-amber-50 flex items-center justify-center shrink-0">
                                <KeyRound className="h-5 w-5 text-amber-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold text-sm">{ref}</div>
                                <div className="text-xs text-muted-foreground mt-0.5">{derivedLabel}</div>
                                {line.location && (
                                  <div className="text-xs text-muted-foreground italic mt-0.5">{line.location}</div>
                                )}
                                <div className="text-[11px] text-amber-700/70 mt-1">
                                  {[line.system_reference, ...(line.hierarchy_refs ?? (ref ? [ref] : []))].filter(Boolean).join(" · ")}
                                </div>
                              </div>
                            </>
                          );
                        })()
                      )}


                      <div className="flex items-center gap-1 shrink-0">
                        <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => updateQty(index, line.quantity - 1)} disabled={line.quantity <= 1}>
                          <Minus className="h-3 w-3" />
                        </Button>
                        <Input type="number" min={1} value={line.quantity} onChange={(e) => updateQty(index, parseInt(e.target.value) || 1)} className="h-8 w-14 text-center" />
                        <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => updateQty(index, line.quantity + 1)}>
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>

                      <div className="text-right shrink-0 w-24">
                        <div className="text-xs text-muted-foreground">£{line.unit_price.toFixed(2)}</div>
                        <div className="font-semibold">£{(line.unit_price * line.quantity).toFixed(2)}</div>
                      </div>

                      <Button size="icon" variant="ghost" onClick={() => remove(index)} className="shrink-0">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </li>
                  ))}
                </ul>
                {key.system_id && (
                  <div className="border-t px-4 py-2 bg-muted/20">
                    <Link to={`/builder/${key.system_id}`} className="text-xs text-primary hover:underline inline-flex items-center gap-1">
                      <ArrowLeft className="h-3 w-3" /> Continue building this system
                    </Link>
                  </div>
                )}
              </section>
            ))}
          </div>

          {/* RIGHT — summary */}
          <aside className="space-y-4">
            <div className="rounded-[10px] border bg-card shadow-card p-5">
              <h2 className="font-semibold mb-3">Order details</h2>
              <Label className="text-xs">Company name *</Label>
              <Input
                value={meta.companyName}
                onChange={(e) => setMeta({ companyName: e.target.value })}
                placeholder="Your company / organisation"
                className="mb-3"
              />
              <Label className="text-xs">Your PO / order reference (optional)</Label>
              <Input
                value={meta.customerPoRef}
                onChange={(e) => setMeta({ customerPoRef: e.target.value })}
                placeholder="e.g. PO-2024-001 or your internal reference"
              />
              <p className="text-[11px] text-muted-foreground mt-1">This will appear on your order confirmation and delivery note.</p>

              {systemRefs.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">Systems in this order</div>
                  <ul className="space-y-1">
                    {systemRefs.map((s) => (
                      <li key={s.system_id} className="flex items-center justify-between text-sm">
                        <span>{s.system_name}</span>
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">{s.system_reference}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="rounded-[10px] border bg-card shadow-card p-5">
              <h2 className="font-semibold mb-3">Pricing</h2>
              {(() => {
                const cylQty = items.filter(i => i.kind === "cylinder").reduce((s, i) => s + i.quantity, 0);
                const keyQty = items.filter(i => i.kind === "key").reduce((s, i) => s + i.quantity, 0);
                return (
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between text-muted-foreground"><span>Cylinders ×{cylQty}</span><span>£{cylindersSubtotal.toFixed(2)}</span></div>
                    {keysSubtotal > 0 && <div className="flex justify-between text-muted-foreground"><span>Keys ×{keyQty}</span><span>£{keysSubtotal.toFixed(2)}</span></div>}
                    <div className="flex justify-between border-t pt-2 mt-2"><span>Subtotal (ex VAT)</span><span>£{subtotal.toFixed(2)}</span></div>
                    <div className="flex justify-between text-muted-foreground"><span>VAT (20%)</span><span>£{vat.toFixed(2)}</span></div>
                    <div className="flex justify-between text-lg font-bold text-amber-600 border-t pt-2 mt-2"><span>Total inc VAT</span><span>£{total.toFixed(2)}</span></div>
                  </div>
                );
              })()}
            </div>

            <div className="rounded-[10px] border bg-card shadow-card p-5">
              <h2 className="font-semibold mb-3">Delivery address</h2>
              <div className="space-y-2">
                <div><Label className="text-xs">Delivery contact name *</Label><Input placeholder="e.g. John Smith" value={meta.delivery.contact_name} onChange={(e) => setMeta({ delivery: { ...meta.delivery, contact_name: e.target.value } })} /></div>
                <div><Label className="text-xs">Contact telephone *</Label><Input type="tel" placeholder="e.g. 07700 900000" value={meta.delivery.contact_phone} onChange={(e) => setMeta({ delivery: { ...meta.delivery, contact_phone: e.target.value } })} /></div>
                <div><Label className="text-xs">Address line 1 *</Label><Input value={meta.delivery.line1} onChange={(e) => setMeta({ delivery: { ...meta.delivery, line1: e.target.value } })} /></div>
                <div><Label className="text-xs">Address line 2</Label><Input value={meta.delivery.line2} onChange={(e) => setMeta({ delivery: { ...meta.delivery, line2: e.target.value } })} /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label className="text-xs">City *</Label><Input value={meta.delivery.city} onChange={(e) => setMeta({ delivery: { ...meta.delivery, city: e.target.value } })} /></div>
                  <div><Label className="text-xs">County</Label><Input value={meta.delivery.county} onChange={(e) => setMeta({ delivery: { ...meta.delivery, county: e.target.value } })} /></div>
                </div>
                <div><Label className="text-xs">Postcode *</Label><Input value={meta.delivery.postcode} onChange={(e) => setMeta({ delivery: { ...meta.delivery, postcode: e.target.value } })} /></div>
              </div>
            </div>

            <div className="rounded-[10px] border bg-card shadow-card p-5">
              <Label className="text-xs">Special instructions (optional)</Label>
              <Textarea
                value={meta.notes}
                onChange={(e) => setMeta({ notes: e.target.value })}
                placeholder="e.g. Please deliver to the facilities office. Contact John Smith on arrival."
                rows={3}
              />
            </div>

            <Button onClick={proceed} disabled={!canReview} className="w-full bg-amber-500 hover:bg-amber-600 text-white text-base h-12">
              Review order → £{total.toFixed(2)}
            </Button>

            <div className="text-xs text-muted-foreground space-y-1.5 px-1">
              <div className="flex items-center gap-2"><Lock className="h-3.5 w-3.5" /> Secure payment via Stripe</div>
              <div className="flex items-center gap-2"><ShieldCheck className="h-3.5 w-3.5" /> BS EN 1303 compliant cylinders</div>
              <div className="flex items-center gap-2"><Truck className="h-3.5 w-3.5" /> Dispatched within 3–5 working days</div>
            </div>
          </aside>
        </div>
      </div>
    </DashboardLayout>
  );
}
