import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { DateRangePicker } from "@/components/admin/DateRangePicker";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { presetRange, RangePreset } from "@/lib/dateRanges";
import { Download, FileText, ArrowLeft } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface Partner { id: string; name: string; company: string; default_commission_pct: number; }
interface Row {
  partner_id: string;
  partner_name: string;
  partner_company: string;
  system_id: string;
  system_name: string;
  system_reference: string | null;
  order_id: string;
  order_po: string | null;
  order_date: string;
  revenue: number;
  commission_pct: number;
  commission: number;
}

const gbp = (n: number) => `£${Number(n ?? 0).toFixed(2)}`;
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-GB");

export default function AdminPartnersReport() {
  const navigate = useNavigate();
  const initial = presetRange("quarter");
  const [from, setFrom] = useState<Date>(initial.from);
  const [to, setTo] = useState<Date>(initial.to);
  const [preset, setPreset] = useState<RangePreset>("quarter");
  const [partners, setPartners] = useState<Partner[]>([]);
  const [filterPartner, setFilterPartner] = useState<string>("all");
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    supabase.from("partners").select("id, name, company, default_commission_pct").order("name")
      .then(({ data }) => setPartners((data as any) ?? []));
  }, []);

  useEffect(() => {
    const load = async () => {
      const { data: sys } = await supabase
        .from("key_systems")
        .select("id, name, reference, partner_id")
        .not("partner_id", "is", null);
      const partnerScoped = (sys ?? []).filter((s: any) => filterPartner === "all" || s.partner_id === filterPartner);
      const sysIds = partnerScoped.map((s: any) => s.id);
      if (!sysIds.length) { setRows([]); return; }
      const { data: ords } = await supabase
        .from("orders")
        .select("id, system_id, created_at, po_number, status")
        .in("system_id", sysIds)
        .gte("created_at", from.toISOString())
        .lte("created_at", to.toISOString())
        .neq("status", "cancelled");
      const orderIds = (ords ?? []).map((o: any) => o.id);
      if (!orderIds.length) { setRows([]); return; }
      const { data: items } = await supabase
        .from("order_items")
        .select("order_id, line_total, commission_pct, commission_amount")
        .in("order_id", orderIds);

      // Aggregate per (order, system)
      const itemsByOrder = new Map<string, { revenue: number; commission: number; commission_pct: number }>();
      (items ?? []).forEach((it: any) => {
        const a = itemsByOrder.get(it.order_id) ?? { revenue: 0, commission: 0, commission_pct: 0 };
        a.revenue += Number(it.line_total ?? 0);
        a.commission += Number(it.commission_amount ?? 0);
        a.commission_pct = Number(it.commission_pct ?? 0);
        itemsByOrder.set(it.order_id, a);
      });
      const sysById = new Map<string, any>(partnerScoped.map((s: any) => [s.id, s]));
      const partnerById = new Map<string, Partner>(partners.map((p) => [p.id, p]));
      const out: Row[] = [];
      (ords ?? []).forEach((o: any) => {
        const agg = itemsByOrder.get(o.id);
        if (!agg) return;
        const s = sysById.get(o.system_id);
        if (!s) return;
        const partner = partnerById.get(s.partner_id);
        out.push({
          partner_id: s.partner_id,
          partner_name: partner?.name ?? "—",
          partner_company: partner?.company ?? "",
          system_id: s.id,
          system_name: s.name,
          system_reference: s.reference,
          order_id: o.id,
          order_po: o.po_number,
          order_date: o.created_at,
          revenue: agg.revenue,
          commission_pct: agg.commission_pct,
          commission: agg.commission,
        });
      });
      out.sort((a, b) => (a.order_date < b.order_date ? 1 : -1));
      setRows(out);
    };
    if (partners.length) load();
  }, [from, to, filterPartner, partners]);

  const summary = useMemo(() => {
    const revenue = rows.reduce((s, r) => s + r.revenue, 0);
    const commission = rows.reduce((s, r) => s + r.commission, 0);
    const systems = new Set(rows.map((r) => r.system_id)).size;
    const orders = new Set(rows.map((r) => r.order_id)).size;
    return { revenue, commission, systems, orders };
  }, [rows]);

  const exportCsv = () => {
    const header = ["Partner", "System name", "System ref", "Order PO", "Order date", "Revenue (ex VAT)", "Commission %", "Commission £"];
    const lines = [header.join(",")];
    rows.forEach((r) => {
      lines.push([
        `"${r.partner_name.replace(/"/g, '""')}"`,
        `"${r.system_name.replace(/"/g, '""')}"`,
        r.system_reference ?? "",
        r.order_po ?? "",
        fmtDate(r.order_date),
        r.revenue.toFixed(2),
        r.commission_pct.toFixed(2),
        r.commission.toFixed(2),
      ].join(","));
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `partner-report-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const exportPdf = () => {
    const doc = new jsPDF();
    const byPartner = new Map<string, Row[]>();
    rows.forEach((r) => {
      if (!byPartner.has(r.partner_id)) byPartner.set(r.partner_id, []);
      byPartner.get(r.partner_id)!.push(r);
    });
    let first = true;
    byPartner.forEach((pRows, pid) => {
      if (!first) doc.addPage();
      first = false;
      const p = partners.find((x) => x.id === pid);
      // Header
      doc.setFontSize(20); doc.setTextColor(23, 23, 26);
      doc.text("LOXX", 14, 18);
      doc.setFontSize(10); doc.setTextColor(120);
      doc.text("Partner commission statement", 14, 24);

      doc.setFontSize(14); doc.setTextColor(23, 23, 26);
      doc.text(p?.name ?? "Partner", 14, 38);
      doc.setFontSize(10); doc.setTextColor(80);
      doc.text(p?.company ?? "", 14, 44);
      doc.text(`Period: ${fmtDate(from.toISOString())} – ${fmtDate(to.toISOString())}`, 14, 50);

      const totalRev = pRows.reduce((s, r) => s + r.revenue, 0);
      const totalCom = pRows.reduce((s, r) => s + r.commission, 0);
      const sysCount = new Set(pRows.map((r) => r.system_id)).size;

      doc.setFontSize(10);
      doc.text(`Total revenue (ex VAT):  ${gbp(totalRev)}`, 14, 62);
      doc.text(`Total commission:  ${gbp(totalCom)}`, 14, 68);
      doc.text(`Systems:  ${sysCount}`, 14, 74);

      autoTable(doc, {
        startY: 82,
        head: [["System", "Ref", "PO", "Date", "Revenue (ex VAT)", "%", "Commission"]],
        body: pRows.map((r) => [
          r.system_name, r.system_reference ?? "", r.order_po ?? "",
          fmtDate(r.order_date), gbp(r.revenue), r.commission_pct.toFixed(2), gbp(r.commission),
        ]),
        styles: { fontSize: 9 },
        headStyles: { fillColor: [23, 23, 26], textColor: 255 },
      });

      const finalY = (doc as any).lastAutoTable.finalY + 10;
      doc.setFontSize(11); doc.setTextColor(23, 23, 26);
      doc.text(`Total commission due: ${gbp(totalCom)}`, 14, finalY);
      doc.setFontSize(8); doc.setTextColor(140);
      doc.text("Generated by LOXX", 14, 285);
    });
    doc.save(`partner-statements-${Date.now()}.pdf`);
  };

  return (
    <DashboardLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate("/admin/partners")}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <h1 className="text-2xl font-semibold tracking-tight">Partner report</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportCsv}><Download className="h-4 w-4 mr-1" /> CSV</Button>
            <Button onClick={exportPdf} className="bg-[#d4820a] hover:bg-[#b86d08] text-white"><FileText className="h-4 w-4 mr-1" /> PDF statements</Button>
          </div>
        </div>

        <DateRangePicker
          from={from} to={to} preset={preset}
          onChange={(f, t, p) => { setFrom(f); setTo(t); setPreset(p); }}
        />

        <div className="mt-4 flex items-center gap-3">
          <label className="text-xs uppercase text-muted-foreground">Partner</label>
          <Select value={filterPartner} onValueChange={setFilterPartner}>
            <SelectTrigger className="w-[280px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All partners</SelectItem>
              {partners.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name} — {p.company}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-6">
          <Card label="Revenue attributed (ex VAT)" value={gbp(summary.revenue)} />
          <Card label="Commission owed" value={gbp(summary.commission)} />
          <Card label="Systems" value={String(summary.systems)} />
          <Card label="Orders" value={String(summary.orders)} />
        </div>

        <div className="rounded-[10px] border bg-card shadow-card overflow-hidden mt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Partner</TableHead>
                <TableHead>System</TableHead>
                <TableHead>Ref</TableHead>
                <TableHead>PO</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Revenue (ex VAT)</TableHead>
                <TableHead className="text-right">%</TableHead>
                <TableHead className="text-right">Commission</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r, i) => (
                <TableRow key={i}>
                  <TableCell>{r.partner_name}</TableCell>
                  <TableCell>{r.system_name}</TableCell>
                  <TableCell className="font-mono text-xs">{r.system_reference}</TableCell>
                  <TableCell className="font-mono text-xs">{r.order_po}</TableCell>
                  <TableCell>{fmtDate(r.order_date)}</TableCell>
                  <TableCell className="text-right font-mono">{gbp(r.revenue)}</TableCell>
                  <TableCell className="text-right font-mono">{r.commission_pct.toFixed(2)}</TableCell>
                  <TableCell className="text-right font-mono">{gbp(r.commission)}</TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No attributed orders in this period.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </DashboardLayout>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[10px] border bg-card p-4 shadow-card">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-2xl font-semibold mt-1 font-mono">{value}</div>
    </div>
  );
}
