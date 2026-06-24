import { DashboardLayout } from "@/components/DashboardLayout";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { LoxxLogo } from "@/components/LoxxLogo";
import { Mail, Download, Pencil, ArrowRightCircle, Loader2 } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { STATUS_BADGE, STATUS_LABEL, totals } from "@/lib/quote";
import type { CartLine } from "@/contexts/CartContext";
import { toast } from "sonner";
import { logAction } from "@/lib/audit";

interface Quote {
  id: string;
  quote_number: string | null;
  status: string;
  valid_until: string | null;
  customer_name: string | null;
  customer_email: string | null;
  company: string | null;
  delivery_address: any;
  customer_po_ref: string | null;
  notes: string | null;
  items: CartLine[];
  subtotal: number;
  vat: number;
  total: number;
  system_id: string | null;
  created_at: string;
  sent_at: string | null;
  sent_to: string | null;
}

export default function QuoteDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { replace } = useCart();
  const [q, setQ] = useState<Quote | null>(null);
  const [systemRef, setSystemRef] = useState<string | null>(null);
  const [settings, setSettings] = useState<{ terms?: string; footer?: string; company?: string; address?: string }>({});
  const [loading, setLoading] = useState(true);
  const [emailOpen, setEmailOpen] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [emailTo, setEmailTo] = useState("");
  const [emailCc, setEmailCc] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const [{ data }, { data: s }] = await Promise.all([
          (supabase.from("quotes" as any) as any).select("*").eq("id", id).maybeSingle(),
          (supabase.from("admin_settings" as any) as any).select("key,value").in("key", ["quote_terms", "quote_footer", "company_name", "company_address"]),
        ]);
        if (data) {
          const today = new Date().toISOString().slice(0, 10);
          if (data.status === "sent" && data.valid_until && data.valid_until < today) {
            await (supabase.from("quotes" as any) as any).update({ status: "expired" }).eq("id", data.id);
            data.status = "expired";
          }
          setQ(data);
          if (data.system_id) {
            const { data: sys } = await supabase.from("key_systems").select("reference").eq("id", data.system_id).maybeSingle();
            setSystemRef(sys?.reference ?? null);
          }
        }
        const sm: Record<string, string> = {};
        (s ?? []).forEach((r: any) => { try { sm[r.key] = JSON.parse(r.value); } catch { sm[r.key] = r.value; } });
        setSettings({
          terms: sm["quote_terms"],
          footer: sm["quote_footer"] ?? "LOXX — Master key systems made simple",
          company: sm["company_name"] ?? "LOXX",
          address: sm["company_address"] ?? "",
        });
      } catch (e) {
        console.error("QuoteDetail load error:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  useEffect(() => {
    if (!q) return;
    setEmailTo(q.customer_email ?? "");
    setEmailSubject(`Quotation ${q.quote_number ?? ""} — Master Key System${systemRef ? ` ${systemRef}` : ""}`.trim());
    setEmailBody(
      `Dear ${q.customer_name ?? "customer"},\n\n` +
      `Please find attached your quotation for the above master key system. ` +
      `This quote is valid until ${q.valid_until ? new Date(q.valid_until).toLocaleDateString("en-GB") : "—"}.\n\n` +
      `To proceed, please reply to this email or visit your account to convert your quote to an order.\n\n` +
      `Kind regards,\nLOXX`,
    );
  }, [q, systemRef]);

  const t = useMemo(() => (q ? totals(q.items) : { cylSub: 0, keySub: 0, subtotal: 0, vat: 0, total: 0 }), [q]);

  if (loading) return <DashboardLayout><div className="h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div></DashboardLayout>;
  if (!q) return <DashboardLayout><div className="p-12 text-center text-muted-foreground">Quote not found.</div></DashboardLayout>;

  const markSent = async () => {
    setSending(true);
    try {
      await (supabase.from("quotes" as any) as any).update({
        status: "sent",
        sent_at: new Date().toISOString(),
        sent_to: emailTo,
      }).eq("id", q.id);
      logAction({ action: "quote_sent", node_label: q.quote_number ?? "", new_value: emailTo, metadata: { cc: emailCc } });
      setQ({ ...q, status: "sent", sent_to: emailTo, sent_at: new Date().toISOString() });
      setEmailOpen(false);
      toast.success("Quote marked as sent. A copy of this page can be downloaded as PDF below.");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to update quote");
    } finally {
      setSending(false);
    }
  };

  const convert = async () => {
    if (!q.items?.length) { toast.error("No items"); return; }
    // Replace any existing basket lines for this system with quote items
    replace(q.items);
    await (supabase.from("quotes" as any) as any).update({ status: "converted" }).eq("id", q.id);
    logAction({ action: "quote_converted", node_label: q.quote_number ?? "", metadata: { total: q.total } });
    setQ({ ...q, status: "converted" });
    setConvertOpen(false);
    toast.success("Quote converted to order. Review your basket.");
    navigate("/cart");
  };

  const cylinders = q.items.filter((i) => i.kind === "cylinder");
  const keys = q.items.filter((i) => i.kind === "key");

  return (
    <DashboardLayout>
      <div className="p-8 max-w-5xl mx-auto">
        {/* Actions bar */}
        <div className="flex items-center justify-between mb-6 no-print">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={`${STATUS_BADGE[q.status] ?? ""}`}>{STATUS_LABEL[q.status] ?? q.status}</Badge>
            {q.sent_to && q.status !== "draft" && (
              <span className="text-xs text-muted-foreground">Sent to {q.sent_to}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setEmailOpen(true)}><Mail className="h-4 w-4" /> Email quote</Button>
            <Button variant="outline" onClick={() => window.print()}><Download className="h-4 w-4" /> Download PDF</Button>
            <Button variant="outline" onClick={() => navigate(`/quotes/new?edit=${q.id}`)}><Pencil className="h-4 w-4" /> Edit</Button>
            <Button onClick={() => setConvertOpen(true)} disabled={q.status === "converted"} className="bg-primary hover:bg-primary/90">
              <ArrowRightCircle className="h-4 w-4" /> Convert to order
            </Button>
          </div>
        </div>

        {/* The document */}
        <article className="bg-card border rounded-[10px] shadow-card p-10 print:shadow-none print:border-0">
          <div className="flex items-start justify-between border-b pb-6">
            <div>
              <LoxxLogo />
              <div className="mt-3 text-sm text-muted-foreground whitespace-pre-line">{settings.address}</div>
            </div>
            <div className="text-right">
              <h1 className="text-3xl font-bold tracking-tight uppercase">Quotation</h1>
              <div className="font-semibold text-amber-700 mt-1">{q.quote_number}</div>
              <div className="text-xs text-muted-foreground mt-2">
                Issued: {new Date(q.created_at).toLocaleDateString("en-GB")}
                <br />
                Valid until: {q.valid_until ? new Date(q.valid_until).toLocaleDateString("en-GB") : "—"}
              </div>
            </div>
          </div>

          <section className="grid grid-cols-2 gap-8 mt-6">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Prepared for</div>
              <div className="font-semibold mt-1">{q.customer_name}{q.company ? `, ${q.company}` : ""}</div>
              {q.customer_email && <div className="text-sm text-muted-foreground">{q.customer_email}</div>}
              {q.delivery_address && (
                <div className="text-sm mt-2 whitespace-pre-line">
                  {[q.delivery_address.line1, q.delivery_address.line2, q.delivery_address.city, q.delivery_address.county, q.delivery_address.postcode].filter(Boolean).join("\n")}
                </div>
              )}
              {q.customer_po_ref && <div className="text-xs text-muted-foreground mt-2">Customer ref: <span className="font-medium">{q.customer_po_ref}</span></div>}
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">From</div>
              <div className="font-semibold mt-1">{settings.company}</div>
              {settings.address && <div className="text-sm text-muted-foreground whitespace-pre-line">{settings.address}</div>}
            </div>
          </section>

          <section className="mt-8">
            {(() => {
              const zoneMap = new Map<string, { zoneLabel: string; items: CartLine[] }>();
              cylinders.forEach((c) => {
                const refs = c.hierarchy_refs ?? [];
                const zoneRef = refs[refs.length - 1] ?? "General";
                const zoneLabel = (c as any).location ?? zoneRef;
                const existing = zoneMap.get(zoneRef);
                if (existing) existing.items.push(c);
                else zoneMap.set(zoneRef, { zoneLabel, items: [c] });
              });
              const zones = Array.from(zoneMap.values());
              const isGrouped = zones.length > 1;

              return (
                <table className="w-full text-sm">
                  <thead className="border-b">
                    <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      <th className="text-left py-2">Differ</th>
                      <th className="text-left py-2">Room / Door</th>
                      <th className="text-left py-2">Product code</th>
                      <th className="text-left py-2">Lock function</th>
                      <th className="text-left py-2">Finish</th>
                      <th className="text-left py-2">Size</th>
                      <th className="text-right py-2">Qty</th>
                      <th className="text-right py-2">Unit</th>
                      <th className="text-right py-2">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {zones.map((zone, zi) => (
                      <React.Fragment key={`z${zi}`}>
                        {isGrouped && (
                          <tr className="bg-muted/30">
                            <td colSpan={9} className="py-2 px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                              {zone.zoneLabel}
                            </td>
                          </tr>
                        )}
                        {zone.items.map((c, i) => (
                          <tr key={`c${zi}-${i}`}>
                            <td className="py-2 text-amber-700 font-medium">{c.differ_ref}</td>
                            <td className="py-2">{c.room_label}</td>
                            <td className="py-2 text-[11px] text-muted-foreground">{c.product_code ?? "—"}</td>
                            <td className="py-2 text-xs">{c.cylinder_profile ?? "—"}</td>
                            <td className="py-2 text-xs">{c.finish ?? "—"}</td>
                            <td className="py-2 text-xs">{c.size ?? "—"}</td>
                            <td className="py-2 text-right">{c.quantity}</td>
                            <td className="py-2 text-right">£{c.unit_price.toFixed(2)}</td>
                            <td className="py-2 text-right font-semibold">£{(c.unit_price * c.quantity).toFixed(2)}</td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                    {keys.length > 0 && (
                      <tr className="bg-muted/30">
                        <td colSpan={9} className="py-2 px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Keys
                        </td>
                      </tr>
                    )}
                    {keys.map((k, i) => (
                      <tr key={`k${i}`}>
                        <td className="py-2 text-amber-700 font-medium">{k.differ_ref ?? "—"}</td>
                        <td className="py-2" colSpan={5}>{k.key_reference}</td>
                        <td className="py-2 text-right">{k.quantity}</td>
                        <td className="py-2 text-right">£{k.unit_price.toFixed(2)}</td>
                        <td className="py-2 text-right font-semibold">£{(k.unit_price * k.quantity).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr><td colSpan={8} className="text-right text-muted-foreground pt-3">Subtotal (ex VAT)</td><td className="text-right font-medium pt-3">£{t.subtotal.toFixed(2)}</td></tr>
                    <tr><td colSpan={8} className="text-right text-muted-foreground">VAT (20%)</td><td className="text-right font-medium">£{t.vat.toFixed(2)}</td></tr>
                    <tr className="text-lg font-bold text-amber-700"><td colSpan={8} className="text-right pt-2 border-t">Total inc VAT</td><td className="text-right font-semibold pt-2 border-t">£{t.total.toFixed(2)}</td></tr>
                  </tfoot>
                </table>
              );
            })()}
          </section>


          {systemRef && (
            <section className="mt-8 p-4 bg-muted/30 rounded">
              <div className="text-sm">
                This quote covers master key system reference: <span className="font-semibold text-amber-700">{systemRef}</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1 leading-relaxed">
                All cylinders will be supplied keyed to the master key system above. Each cylinder's differ
                reference is shown against the relevant door. Keys are priced per copy at the unit price shown.
              </div>
            </section>
          )}

          {q.notes && (
            <section className="mt-6">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Notes</div>
              <p className="text-sm mt-1 whitespace-pre-line">{q.notes}</p>
            </section>
          )}

          {settings.terms && (
            <section className="mt-6">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Terms</div>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{settings.terms}</p>
            </section>
          )}

          <div className="mt-10 pt-4 border-t text-center text-xs text-muted-foreground">
            {settings.footer}
          </div>
        </article>
      </div>

      {/* Email modal */}
      <Dialog open={emailOpen} onOpenChange={setEmailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Email quote</DialogTitle>
            <DialogDescription>Send this quotation. Marking it as sent locks the version that was emailed.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">To</Label><Input value={emailTo} onChange={(e) => setEmailTo(e.target.value)} /></div>
            <div><Label className="text-xs">CC (optional)</Label><Input value={emailCc} onChange={(e) => setEmailCc(e.target.value)} placeholder="procurement@…" /></div>
            <div><Label className="text-xs">Subject</Label><Input value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} /></div>
            <div><Label className="text-xs">Message</Label><Textarea rows={6} value={emailBody} onChange={(e) => setEmailBody(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailOpen(false)}>Cancel</Button>
            <Button onClick={markSent} disabled={sending} className="bg-primary hover:bg-primary/90">{sending ? "Saving…" : "Send quote"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Convert modal */}
      <Dialog open={convertOpen} onOpenChange={setConvertOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convert {q.quote_number} to a live order?</DialogTitle>
            <DialogDescription>This will replace your basket with all items from this quote and take you to the basket ready for payment.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConvertOpen(false)}>Cancel</Button>
            <Button onClick={convert} className="bg-primary hover:bg-primary/90">Convert to order</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
