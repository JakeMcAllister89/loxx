import { useEffect, useMemo, useRef, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Search, Save, Download, Upload, ArrowLeft } from "lucide-react";

interface OrgRow { id: string; name: string }
interface MemberRow { org_id: string; email: string | null; org_role: string; status: string }
interface DefaultRow { org_id: string; default_margin_pct: number | null }
interface ProductRow { id: string; code: string; name: string; is_active: boolean; price_gbp: number | null; cost_price: number | null }
interface OverrideRow { id: string; org_id: string; product_id: string; margin_pct: number }

const fmtGbp = (n: number | null | undefined) => n == null ? "—" : `£${Number(n).toFixed(2)}`;
const fmtPct = (n: number | null | undefined) => n == null || !Number.isFinite(Number(n)) ? "—" : `${Number(n).toFixed(1)}%`;

// Catalogue margin across all products where both cost and price are usable.
function catalogueAvgMargin(products: ProductRow[]): number | null {
  let num = 0, den = 0;
  for (const p of products) {
    const price = Number(p.price_gbp);
    const cost = Number(p.cost_price);
    if (!Number.isFinite(price) || !Number.isFinite(cost) || price <= 0) continue;
    num += (price - cost);
    den += price;
  }
  if (den <= 0) return null;
  return (num / den) * 100;
}

// Product's own catalogue margin (single product).
function productCatalogueMargin(p: ProductRow): number | null {
  const price = Number(p.price_gbp);
  const cost = Number(p.cost_price);
  if (!Number.isFinite(price) || !Number.isFinite(cost) || price <= 0) return null;
  return ((price - cost) / price) * 100;
}

function sellFromMargin(cost: number | null, marginPct: number): number | null {
  if (cost == null || !Number.isFinite(cost)) return null;
  if (!Number.isFinite(marginPct) || marginPct >= 100) return null;
  return Math.round((cost / (1 - marginPct / 100)) * 100) / 100;
}

export default function AdminPriceLists() {
  const { user: me } = useAuth();
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [defaults, setDefaults] = useState<DefaultRow[]>([]);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [overrides, setOverrides] = useState<OverrideRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [edits, setEdits] = useState<Record<string, string>>({});

  // View 2 state
  const [openOrg, setOpenOrg] = useState<OrgRow | null>(null);
  const [rowMargins, setRowMargins] = useState<Record<string, string>>({}); // productId -> margin string
  const [rowDirty, setRowDirty] = useState<Record<string, boolean>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  const loadAll = async () => {
    setLoading(true);
    const [o, m, d, p, ov] = await Promise.all([
      supabase.from("organisations").select("id,name").order("name"),
      supabase.from("org_members").select("org_id,email,org_role,status").eq("status", "active"),
      supabase.from("customer_pricing").select("org_id,default_margin_pct"),
      supabase.from("products").select("id,code,name,is_active,price_gbp,cost_price").eq("is_active", true).order("code"),
      supabase.from("customer_product_pricing").select("id,org_id,product_id,margin_pct"),
    ]);
    setOrgs(((o.data as any) ?? []) as OrgRow[]);
    setMembers(((m.data as any) ?? []) as MemberRow[]);
    setDefaults(((d.data as any) ?? []) as DefaultRow[]);
    setProducts(((p.data as any) ?? []) as ProductRow[]);
    setOverrides(((ov.data as any) ?? []) as OverrideRow[]);
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, []);

  const orgContact = (orgId: string) => {
    const master = members.find(m => m.org_id === orgId && m.org_role === "master_admin");
    if (master?.email) return master.email;
    return members.find(m => m.org_id === orgId)?.email ?? "—";
  };
  const defaultFor = (orgId: string): number | null => {
    const v = defaults.find(d => d.org_id === orgId)?.default_margin_pct;
    return v == null ? null : Number(v);
  };

  const catalogueAvg = useMemo(() => catalogueAvgMargin(products), [products]);

  const filteredOrgs = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return orgs;
    return orgs.filter(o => o.name.toLowerCase().includes(q));
  }, [orgs, search]);

  const saveDefault = async (orgId: string) => {
    const raw = edits[orgId];
    if (raw === undefined) return;
    const trimmed = raw.trim();
    if (trimmed === "") {
      const { error } = await supabase.from("customer_pricing").delete().eq("org_id", orgId);
      if (error) { toast.error(error.message); return; }
      toast.success("Reverted to catalogue pricing");
    } else {
      const num = Number(trimmed);
      if (!Number.isFinite(num) || num < 1 || num > 99) { toast.error("Margin must be between 1 and 99"); return; }
      const { error } = await supabase.from("customer_pricing").upsert({
        org_id: orgId, default_margin_pct: num, updated_by: me?.id, updated_at: new Date().toISOString(),
      } as any, { onConflict: "org_id" });
      if (error) { toast.error(error.message); return; }
      toast.success("Margin saved");
    }
    setEdits(prev => { const n = { ...prev }; delete n[orgId]; return n; });
    loadAll();
  };

  // ----- View 2 helpers -----
  const openCustomer = (org: OrgRow) => {
    setOpenOrg(org);
    // Precompute row margins for this org
    const orgDefault = defaultFor(org.id);
    const map: Record<string, string> = {};
    for (const p of products) {
      const override = overrides.find(o => o.org_id === org.id && o.product_id === p.id);
      let m: number | null = null;
      if (override) m = Number(override.margin_pct);
      else if (orgDefault != null) m = orgDefault;
      else m = productCatalogueMargin(p);
      map[p.id] = m == null ? "" : m.toFixed(1);
    }
    setRowMargins(map);
    setRowDirty({});
  };

  const closeCustomer = () => {
    setOpenOrg(null);
    setRowMargins({});
    setRowDirty({});
  };

  const setRowMargin = (productId: string, val: string) => {
    setRowMargins(prev => ({ ...prev, [productId]: val }));
    setRowDirty(prev => ({ ...prev, [productId]: true }));
  };

  const avgMarginView2 = useMemo(() => {
    if (!openOrg) return null;
    let num = 0, den = 0;
    for (const p of products) {
      const marginStr = rowMargins[p.id];
      const margin = Number(marginStr);
      const cost = Number(p.cost_price);
      if (!Number.isFinite(margin) || !Number.isFinite(cost) || cost <= 0 || margin >= 100) continue;
      const sell = cost / (1 - margin / 100);
      num += (sell - cost);
      den += sell;
    }
    if (den <= 0) return null;
    return (num / den) * 100;
  }, [rowMargins, products, openOrg]);

  const saveRow = async (p: ProductRow) => {
    if (!openOrg) return;
    const raw = rowMargins[p.id];
    const num = Number(raw);
    if (!Number.isFinite(num) || num < 1 || num > 99) { toast.error("Margin must be between 1 and 99"); return; }
    const { error } = await supabase.from("customer_product_pricing").upsert({
      org_id: openOrg.id, product_id: p.id, margin_pct: num, updated_by: me?.id, updated_at: new Date().toISOString(),
    } as any, { onConflict: "org_id,product_id" });
    if (error) { toast.error(error.message); return; }
    toast.success(`Saved ${p.code}`);
    setRowDirty(prev => { const n = { ...prev }; delete n[p.id]; return n; });
    // Reload overrides in background
    const { data } = await supabase.from("customer_product_pricing").select("id,org_id,product_id,margin_pct");
    setOverrides(((data as any) ?? []) as OverrideRow[]);
  };

  const exportCsv = () => {
    if (!openOrg) return;
    const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
    const rows: string[] = ["product_code,product_name,cost_price,selling_price,margin_pct"];
    for (const p of products) {
      const margin = Number(rowMargins[p.id]);
      const sell = sellFromMargin(p.cost_price == null ? null : Number(p.cost_price), margin);
      rows.push([
        esc(p.code),
        esc(p.name),
        p.cost_price == null ? "" : String(Number(p.cost_price).toFixed(2)),
        sell == null ? "" : sell.toFixed(2),
        Number.isFinite(margin) ? margin.toFixed(2) : "",
      ].join(","));
    }
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const safe = openOrg.name.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
    a.href = url; a.download = `price-list-${safe}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const parseCsv = (text: string): string[][] => {
    const rows: string[][] = []; let cur: string[] = []; let cell = ""; let inQ = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (inQ) {
        if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
        else if (c === '"') inQ = false;
        else cell += c;
      } else {
        if (c === '"') inQ = true;
        else if (c === ",") { cur.push(cell); cell = ""; }
        else if (c === "\n") { cur.push(cell); rows.push(cur); cur = []; cell = ""; }
        else if (c === "\r") { /* skip */ }
        else cell += c;
      }
    }
    if (cell.length || cur.length) { cur.push(cell); rows.push(cur); }
    return rows.filter(r => r.some(v => v !== ""));
  };

  const importCsv = async (file: File) => {
    if (!openOrg) return;
    const text = await file.text();
    const rows = parseCsv(text);
    if (rows.length === 0) { toast.error("Empty CSV"); return; }
    const header = rows[0].map(h => h.trim().toLowerCase());
    const iCode = header.indexOf("product_code");
    const iMargin = header.indexOf("margin_pct");
    if (iCode < 0 || iMargin < 0) { toast.error("CSV needs product_code and margin_pct columns"); return; }

    const productByCode = new Map(products.map(p => [p.code.toLowerCase(), p]));
    let imported = 0, skipped = 0;
    const payload: any[] = [];
    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      const code = (row[iCode] ?? "").trim();
      const margin = Number((row[iMargin] ?? "").trim());
      const prod = productByCode.get(code.toLowerCase());
      if (!prod || !Number.isFinite(margin) || margin < 1 || margin > 99) { skipped++; continue; }
      imported++;
      payload.push({ org_id: openOrg.id, product_id: prod.id, margin_pct: margin, updated_by: me?.id, updated_at: new Date().toISOString() });
    }
    if (payload.length) {
      const { error } = await supabase.from("customer_product_pricing").upsert(payload as any, { onConflict: "org_id,product_id" });
      if (error) { toast.error(error.message); return; }
    }
    toast.success(`Imported ${imported} rows · ${skipped} skipped`);
    // Reload and re-open to refresh margins
    await loadAll();
    const org = openOrg;
    // Wait tick then reopen with fresh data
    setTimeout(() => openCustomer(org), 0);
  };

  // ============ RENDER ============

  if (openOrg) {
    return (
      <DashboardLayout>
        <div className="p-6 max-w-7xl mx-auto">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <Button variant="ghost" size="icon" onClick={closeCustomer} aria-label="Back">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">{openOrg.name}</h1>
                <p className="text-sm text-muted-foreground">{orgContact(openOrg.id)}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Avg margin: <span className="font-medium text-foreground">{fmtPct(avgMarginView2)}</span>
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={exportCsv}><Download className="h-4 w-4 mr-1" /> Export CSV</Button>
              <Button variant="outline" onClick={() => fileRef.current?.click()}><Upload className="h-4 w-4 mr-1" /> Import CSV</Button>
              <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) importCsv(f); e.currentTarget.value = ""; }} />
            </div>
          </div>

          <div className="rounded-[10px] border bg-card shadow-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-40">Code</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead className="w-32">Cost price</TableHead>
                  <TableHead className="w-32">Selling price</TableHead>
                  <TableHead className="w-36">Margin %</TableHead>
                  <TableHead className="w-20 text-right">Save</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Loading…</TableCell></TableRow>}
                {!loading && products.map(p => {
                  const margin = Number(rowMargins[p.id]);
                  const cost = p.cost_price == null ? null : Number(p.cost_price);
                  const sell = sellFromMargin(cost, margin);
                  const dirty = !!rowDirty[p.id];
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-xs">{p.code}</TableCell>
                      <TableCell>{p.name}</TableCell>
                      <TableCell className="text-muted-foreground">{fmtGbp(cost)}</TableCell>
                      <TableCell>{fmtGbp(sell)}</TableCell>
                      <TableCell>
                        <Input
                          type="number" step="0.1" min="1" max="99"
                          value={rowMargins[p.id] ?? ""}
                          onChange={e => setRowMargin(p.id, e.target.value)}
                          className="h-8 w-28"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant={dirty ? "default" : "outline"}
                          onClick={() => saveRow(p)}
                          disabled={!dirty}
                        >
                          <Save className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // View 1
  return (
    <DashboardLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Price Lists</h1>
          <p className="text-sm text-muted-foreground">Customer-specific pricing. Open a customer to manage their full price list.</p>
        </div>

        <div className="relative max-w-md mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search organisation" className="pl-9" />
        </div>

        <div className="rounded-[10px] border bg-card shadow-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organisation</TableHead>
                <TableHead>Contact email</TableHead>
                <TableHead className="w-44">Margin</TableHead>
                <TableHead className="w-40 text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Loading…</TableCell></TableRow>}
              {!loading && filteredOrgs.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No organisations found.</TableCell></TableRow>}
              {filteredOrgs.map(o => {
                const current = defaultFor(o.id);
                const editing = edits[o.id] !== undefined;
                const value = editing ? edits[o.id] : (current != null ? String(current) : "");
                const placeholder = catalogueAvg != null ? catalogueAvg.toFixed(1) : "—";
                return (
                  <TableRow key={o.id}>
                    <TableCell className="font-medium">{o.name}</TableCell>
                    <TableCell className="text-muted-foreground">{orgContact(o.id)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number" step="0.1" min="1" max="99"
                          placeholder={placeholder}
                          value={value}
                          onChange={e => setEdits(prev => ({ ...prev, [o.id]: e.target.value }))}
                          className="h-8 w-24"
                        />
                        <Button size="sm" variant="outline" onClick={() => saveDefault(o.id)} disabled={!editing}>
                          <Save className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => openCustomer(o)}>
                        Open
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </DashboardLayout>
  );
}
